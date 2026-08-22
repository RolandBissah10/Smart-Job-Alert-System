import re

from app.services.profile_utils import get_profile_skills
from app.services.role_synonyms import expand_roles
from app.services.scoring import compute_match


def normalize(text: str) -> str:
    return text.lower().strip() if text else ""


def get_match_source(profile: dict) -> str:
    match_source = (profile.get("match_source") or "profile").strip().lower()
    return match_source if match_source in {"profile", "cv", "both"} else "profile"


def profile_has_match_criteria(profile: dict) -> bool:
    has_profile = bool(get_profile_skills(profile) or profile.get("roles"))
    has_cv = bool(profile.get("cv_keywords"))
    match_source = get_match_source(profile)

    if match_source == "profile":
        return has_profile
    if match_source == "cv":
        return has_cv
    return has_profile or has_cv


def _get_keywords_from_profile(profile: dict) -> list:
    keywords = []
    match_source = get_match_source(profile)

    if match_source in {"profile", "both"}:
        keywords.extend(get_profile_skills(profile))
        keywords.extend(_get_profile_roles(profile))
        industry = profile.get("industry", "")
        if industry:
            keywords.append(industry.replace("_", " "))

    if match_source in {"cv", "both"}:
        keywords.extend(profile.get("cv_keywords", []))
    return keywords


def _get_profile_skills(profile: dict) -> list:
    if get_match_source(profile) == "cv":
        return []
    return get_profile_skills(profile)


def _get_profile_roles(profile: dict) -> list:
    if get_match_source(profile) == "cv":
        return []
    return expand_roles(profile.get("roles", []))


def _get_profile_industry_terms(profile: dict) -> list:
    if get_match_source(profile) == "cv":
        return []
    industry = profile.get("industry", "")
    if not industry:
        return []
    return [industry.replace("_", " ")]


def _get_cv_keywords(profile: dict) -> list:
    if get_match_source(profile) == "profile":
        return []
    return profile.get("cv_keywords", [])


def _match_location(job: dict, profile: dict) -> bool:
    preferred = normalize(profile.get("location", ""))
    if not preferred or preferred == "remote":
        return True

    job_location = normalize(job.get("location", ""))
    if preferred == "hybrid":
        return "hybrid" in job_location
    if preferred in {"on-premises", "on premises", "on-site", "onsite"}:
        return any(term in job_location for term in ["on-premises", "on premises", "on-site", "onsite"])
    return True


def _match_job_type(job: dict, profile: dict) -> bool:
    preferred = normalize(profile.get("job_type", ""))
    if not preferred:
        return True

    searchable = " ".join([
        normalize(job.get("title", "")),
        normalize(job.get("description", "")),
    ])

    if preferred == "full-time":
        return not any(term in searchable for term in ["part-time", "contract", "internship", "freelance"])
    if preferred == "part-time":
        return "part-time" in searchable or "part time" in searchable
    if preferred == "contract":
        return "contract" in searchable
    if preferred == "internship":
        return "intern" in searchable
    if preferred == "freelance":
        return "freelance" in searchable
    return True


_NO_SPONSORSHIP_PATTERNS = [
    r"must be authorized to work",
    r"authoriz(?:ed|ation) to work in",
    r"no sponsorship",
    r"not able to sponsor",
    r"unable to sponsor",
    r"citizens? only",
    r"work permit required",
    r"must have.{0,20}work permit",
]

# Guards against "I don't need sponsorship" / "no longer need a visa" etc. being
# read as the opposite of what they mean - each lookbehind must be fixed-width,
# so common negations are listed individually rather than as one alternation.
_NEGATION_GUARD = r"(?<!don't )(?<!do not )(?<!won't )(?<!never )(?<!not )(?<!no longer )"

_NEEDS_SPONSORSHIP_PATTERNS = [
    _NEGATION_GUARD + r"need.{0,25}sponsorship",
    _NEGATION_GUARD + r"require.{0,25}sponsorship",
    _NEGATION_GUARD + r"need.{0,25}visa",
    _NEGATION_GUARD + r"require.{0,25}visa",
    _NEGATION_GUARD + r"need.{0,25}work permit",
    _NEGATION_GUARD + r"require.{0,25}work permit",
]


def _job_requires_work_authorization(job: dict) -> bool:
    text = normalize(job.get("description", "")) + " " + normalize(job.get("title", ""))
    return any(re.search(pattern, text) for pattern in _NO_SPONSORSHIP_PATTERNS)


def _candidate_needs_sponsorship(profile: dict) -> bool:
    text = normalize(profile.get("work_authorization", ""))
    return any(re.search(pattern, text) for pattern in _NEEDS_SPONSORSHIP_PATTERNS)


def _match_work_authorization(job: dict, profile: dict) -> bool:
    """Conservative by design: only excludes a job when there's an explicit
    double signal (the job says no-sponsorship/citizens-only AND the candidate's
    profile explicitly says they need sponsorship). Ambiguous or missing data on
    either side always passes - we never auto-reject on an unclear requirement."""
    if not _job_requires_work_authorization(job):
        return True
    return not _candidate_needs_sponsorship(profile)


def _count_keyword_hits(text: str, keywords: list) -> list:
    hits = []
    for keyword in keywords:
        term = normalize(keyword)
        if term and term in text:
            hits.append(keyword)
    return list(dict.fromkeys(hits))


def _job_matches_profile(job: dict, profile: dict, title_hits: list, description_hits: list) -> bool:
    if (
        not _match_location(job, profile)
        or not _match_job_type(job, profile)
        or not _match_work_authorization(job, profile)
    ):
        return False

    title = normalize(job.get("title", ""))
    description = normalize(job.get("description", ""))
    skills = _get_profile_skills(profile)
    roles = _get_profile_roles(profile)
    industry_terms = _get_profile_industry_terms(profile)
    cv_keywords = _get_cv_keywords(profile)
    match_source = get_match_source(profile)

    role_title_hits = _count_keyword_hits(title, roles)
    role_description_hits = _count_keyword_hits(description, roles)
    skill_title_hits = _count_keyword_hits(title, skills)
    skill_description_hits = _count_keyword_hits(description, skills)
    industry_title_hits = _count_keyword_hits(title, industry_terms)
    industry_description_hits = _count_keyword_hits(description, industry_terms)
    cv_title_hits = _count_keyword_hits(title, cv_keywords)
    cv_description_hits = _count_keyword_hits(description, cv_keywords)

    non_industry_hits = list(dict.fromkeys(
        role_title_hits + role_description_hits + skill_title_hits + skill_description_hits
    ))
    title_non_industry_hits = list(dict.fromkeys(role_title_hits + skill_title_hits))
    cv_hits = list(dict.fromkeys(cv_title_hits + cv_description_hits))

    profile_match = False
    cv_match = False

    if roles and role_title_hits:
        profile_match = True
    elif roles and role_description_hits and title_non_industry_hits:
        profile_match = True
    elif len(non_industry_hits) >= 2 and title_non_industry_hits:
        profile_match = True
    elif skill_title_hits and role_description_hits:
        profile_match = True
    elif industry_title_hits and len(non_industry_hits) >= 1:
        profile_match = True
    elif industry_description_hits and len(title_non_industry_hits) >= 1:
        profile_match = True

    if cv_keywords:
        if cv_title_hits:
            cv_match = True
        elif len(cv_hits) >= 2:
            cv_match = True

    if match_source == "profile":
        return profile_match
    if match_source == "cv":
        return cv_match
    return profile_match or cv_match


def match_score(job, keywords):
    title = normalize(job.get("title", ""))
    description = normalize(job.get("description", ""))
    score = 0
    for keyword in keywords:
        term = normalize(keyword)
        if term in title:
            score += 3
        elif term in description:
            score += 1
    return score


def match_score_with_reasons(job, keywords):
    title = normalize(job.get("title", ""))
    description = normalize(job.get("description", ""))
    score = 0
    reasons = []
    for keyword in keywords:
        term = normalize(keyword)
        if term in title:
            score += 3
            reasons.append(keyword)
        elif term in description:
            score += 1
            reasons.append(keyword)
    return score, list(dict.fromkeys(reasons))


def get_matching_jobs_for_profile(jobs, profile: dict):
    keywords = _get_keywords_from_profile(profile)
    matched = []
    for job in jobs:
        score, reasons = match_score_with_reasons(job, keywords)
        title_hits = _count_keyword_hits(normalize(job.get("title", "")), keywords)
        description_hits = _count_keyword_hits(normalize(job.get("description", "")), keywords)
        if score <= 0 or not _job_matches_profile(job, profile, title_hits, description_hits):
            continue
        non_industry_reasons = [
            reason for reason in reasons
            if reason not in _get_profile_industry_terms(profile)
        ]
        matched.append({
            "job": job,
            "score": score,
            "reasons": non_industry_reasons or reasons,
        })
    matched.sort(key=lambda x: x["score"], reverse=True)
    return matched


def score_jobs_for_user(jobs, profile: dict):
    scored = []
    for match in get_matching_jobs_for_profile(jobs, profile):
        job = match["job"]
        job_data = {k: (str(v) if k == "_id" else v) for k, v in job.items()}
        result = compute_match(job, profile)
        scored.append({
            "job": job_data,
            "score": result["score"],
            "reasons": result["reasons"] or match["reasons"],
            "match_breakdown": result["components"],
        })
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored
