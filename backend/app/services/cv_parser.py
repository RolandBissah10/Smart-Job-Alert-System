from io import BytesIO
import re
from datetime import datetime

from app.services.skills_taxonomy import extract_skills_from_text, extract_certifications_from_text
from app.services.seniority import classify_seniority_from_years, classify_seniority_from_title
from app.services.text_utils import clean_text as _clean_text


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into",
    "is", "it", "of", "on", "or", "that", "the", "their", "to", "with", "your",
    "work", "working", "experience", "responsible", "using", "used", "skills",
    "professional", "summary", "profile", "email", "phone", "address", "references",
    "education", "projects", "employment", "career",
}


def extract_text_from_cv(filename: str, content: bytes) -> str:
    extension = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")

    if extension in {"txt", "md"}:
        return _clean_text(content.decode("utf-8", errors="ignore"))

    if extension == "pdf":
        try:
            from pypdf import PdfReader
        except ImportError:
            try:
                from PyPDF2 import PdfReader
            except ImportError as exc:
                raise RuntimeError(
                    "PDF parsing dependency is missing. Install `pypdf` (preferred) or `PyPDF2`."
                ) from exc

        reader = PdfReader(BytesIO(content))
        parts = [page.extract_text() or "" for page in reader.pages]
        return _clean_text(" ".join(parts))

    if extension == "docx":
        from docx import Document

        document = Document(BytesIO(content))
        parts = [paragraph.text for paragraph in document.paragraphs]
        return _clean_text(" ".join(parts))

    raise ValueError("Unsupported CV format. Upload a PDF, DOCX, TXT, or MD file.")


def extract_cv_keywords(text: str, limit: int = 40) -> list[str]:
    lowered = text.lower()
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.\-/]{2,}", lowered)

    keywords = []
    seen = set()
    for token in tokens:
        if token in STOPWORDS or token.isdigit():
            continue
        if token not in seen:
            seen.add(token)
            keywords.append(token)
        if len(keywords) >= limit:
            break

    return keywords


# Ordered longest-phrase-first so e.g. "professional experience" matches before
# the bare "experience" fallback, since the text has already been flattened to
# a single line (no newlines survive `_clean_text`) and headings can't be
# located by line position alone.
SECTION_HEADER_PATTERNS = [
    ("experience", r"work experience|professional experience|employment history|career history"),
    ("education", r"education(?:al background)?"),
    ("certifications", r"licenses? (?:and|&) certifications?|certifications?"),
    ("skills", r"technical skills|core skills|key skills|skills"),
    ("projects", r"projects?"),
    # Bare "experience" last and guarded against common non-heading phrasing
    # like "5 years of experience in Python" or "experience with Docker".
    ("experience", r"(?<!years of )(?<!year of )experience(?!\s+(?:in|with|as|working|building|developing))"),
]


def split_sections(text: str) -> dict[str, str]:
    matches = []
    for section, pattern in SECTION_HEADER_PATTERNS:
        if any(s == section for s, _, _ in matches):
            continue
        found = re.search(pattern, text, re.IGNORECASE)
        if found:
            matches.append((section, found.start(), found.end()))

    matches.sort(key=lambda m: m[1])

    sections = {}
    for i, (section, _, end) in enumerate(matches):
        stop = matches[i + 1][1] if i + 1 < len(matches) else len(text)
        chunk = text[end:stop].strip()
        if section in sections:
            sections[section] += " " + chunk
        else:
            sections[section] = chunk
    return sections


def extract_years_experience(text: str) -> float | None:
    direct_matches = re.findall(
        r"(\d{1,2}(?:\.\d+)?)\s*\+?\s*years?\s+(?:of\s+)?experience",
        text,
        re.IGNORECASE,
    )
    if direct_matches:
        return max(float(m) for m in direct_matches)

    year_ranges = re.findall(r"(19|20)\d{2}\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current)", text, re.IGNORECASE)
    if not year_ranges:
        return None

    current_year = datetime.utcnow().year
    starts = []
    ends = []
    for full_match in re.finditer(r"((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current)", text, re.IGNORECASE):
        start_year = int(full_match.group(1))
        end_raw = full_match.group(2).lower()
        end_year = current_year if end_raw in {"present", "current"} else int(end_raw)
        starts.append(start_year)
        ends.append(end_year)

    if not starts:
        return None
    span = max(ends) - min(starts)
    return float(span) if span > 0 else None


DEGREE_PATTERN = re.compile(
    r"\b(Ph\.?D\.?|Doctorate|Master'?s?|M\.?Sc\.?|M\.?A\.?|M\.?B\.?A\.?|"
    r"Bachelor'?s?|B\.?Sc\.?|B\.?A\.?|B\.?Eng\.?|B\.?Tech\.?|Diploma|Associate'?s?)\b",
    re.IGNORECASE,
)
FIELD_INSTITUTION_PATTERN = re.compile(
    r"^\s*(?:of|in|degree in)?\s*([A-Z][A-Za-z&,\-\s]{2,60}?)"
    r"(?:\s+(?:at|from)\s+([A-Z][A-Za-z0-9&.,\-\s]{2,60}?))?"
    r"(?:[.,]|$)",
)


def extract_education(text: str) -> list[dict]:
    entries = []
    seen = set()
    for match in DEGREE_PATTERN.finditer(text):
        degree = match.group(1)
        rest = text[match.end():match.end() + 100]
        field = None
        institution = None
        rest_match = FIELD_INSTITUTION_PATTERN.match(rest)
        if rest_match:
            field = (rest_match.group(1) or "").strip() or None
            institution = (rest_match.group(2) or "").strip() or None

        key = (degree.lower(), (field or "").lower())
        if key in seen:
            continue
        seen.add(key)
        entries.append({"degree": degree, "field": field, "institution": institution, "source": "cv"})
    return entries


TITLE_SUFFIXES = (
    "Engineer|Developer|Manager|Analyst|Specialist|Officer|Consultant|Designer|Scientist|"
    "Nurse|Accountant|Technician|Coordinator|Director|Administrator|Assistant|Architect|"
    "Lead|Researcher|Auditor|Advisor|Representative|Tester"
)
JOB_TITLE_PATTERN = re.compile(
    r"\b([A-Z][A-Za-z/&\-]*(?:\s+[A-Z][A-Za-z/&\-]*){0,3}\s+(?:" + TITLE_SUFFIXES + r"))\s+(?:at|@)\s+"
    r"([A-Z][A-Za-z0-9&.,\-]{1,60})"
)


def extract_job_titles(text: str) -> list[str]:
    titles = []
    seen = set()
    for match in JOB_TITLE_PATTERN.finditer(text):
        title = match.group(1).strip()
        key = title.lower()
        if key not in seen:
            seen.add(key)
            titles.append(title)
    return titles


def parse_cv(text: str) -> dict:
    """Structured extraction on top of the flat keyword bag: skills/certifications
    (against the shared taxonomy), years of experience, education entries, job
    titles, and an inferred seniority level. Best-effort/regex-based - CVs vary
    too much in format for this to be exact, so callers should treat it as a
    starting point for the user to confirm/edit, not ground truth."""
    sections = split_sections(text)
    experience_text = sections.get("experience", text)
    education_text = sections.get("education", text)

    years_experience = extract_years_experience(text)
    job_titles = extract_job_titles(experience_text)

    seniority = classify_seniority_from_years(years_experience)
    if seniority is None and job_titles:
        seniority = classify_seniority_from_title(job_titles[0])

    return {
        "keywords": extract_cv_keywords(text),
        "skills": extract_skills_from_text(text),
        "certifications": extract_certifications_from_text(text),
        "years_experience": years_experience,
        "education": extract_education(education_text),
        "job_titles": job_titles,
        "seniority": seniority,
    }
