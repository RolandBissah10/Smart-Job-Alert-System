from io import BytesIO
import re


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into",
    "is", "it", "of", "on", "or", "that", "the", "their", "to", "with", "your",
    "work", "working", "experience", "responsible", "using", "used", "skills",
    "professional", "summary", "profile", "email", "phone", "address", "references",
    "education", "projects", "employment", "career",
}


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def extract_text_from_cv(filename: str, content: bytes) -> str:
    extension = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")

    if extension in {"txt", "md"}:
        return _clean_text(content.decode("utf-8", errors="ignore"))

    if extension == "pdf":
        from pypdf import PdfReader

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
