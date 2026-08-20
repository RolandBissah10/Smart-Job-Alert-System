import re

LEVEL_ORDER = ["intern", "junior", "mid", "senior", "lead", "manager", "director"]

# Checked in this order; first match wins. More specific/senior terms are listed
# before generic ones so e.g. "senior manager" resolves to "manager", not "senior".
TITLE_KEYWORDS = [
    ("director", ["director", "vp", "vice president", "chief", "head of"]),
    ("manager", ["manager", "mgr"]),
    ("lead", ["lead", "principal", "staff"]),
    ("senior", ["senior", "sr.", "sr "]),
    ("junior", ["junior", "jr.", "jr ", "entry level", "entry-level", "associate", "graduate"]),
    ("intern", ["intern", "internship", "trainee", "apprentice"]),
]

# Free-text experience-level labels collected on the candidate profile today
# ("Junior"/"Mid"/"Senior") map directly onto the same ladder.
PROFILE_LEVEL_ALIASES = {
    "junior": "junior",
    "mid": "mid",
    "mid-level": "mid",
    "senior": "senior",
}


def _normalize(text: str) -> str:
    return (text or "").lower()


def classify_seniority_from_title(title: str, description: str = "") -> str | None:
    haystack = _normalize(title)
    for level, keywords in TITLE_KEYWORDS:
        if any(kw in haystack for kw in keywords):
            return level

    # Titles rarely carry a level word (e.g. "Software Engineer") — fall back to
    # scanning the description, but only for the same keyword set.
    haystack = _normalize(description)
    for level, keywords in TITLE_KEYWORDS:
        if any(kw in haystack for kw in keywords):
            return level

    return None


def classify_seniority_from_years(years_experience: float | None) -> str | None:
    if years_experience is None:
        return None
    # Deliberately capped at "senior" — years of individual-contributor experience
    # alone can't imply someone is on a management/director track.
    if years_experience < 1:
        return "intern"
    if years_experience < 3:
        return "junior"
    if years_experience < 6:
        return "mid"
    return "senior"


def classify_seniority_from_profile_level(experience_level: str | None) -> str | None:
    if not experience_level:
        return None
    return PROFILE_LEVEL_ALIASES.get(experience_level.strip().lower())


def level_distance(candidate_level: str | None, job_level: str | None) -> int | None:
    if candidate_level not in LEVEL_ORDER or job_level not in LEVEL_ORDER:
        return None
    return abs(LEVEL_ORDER.index(candidate_level) - LEVEL_ORDER.index(job_level))


def explain_level_match(candidate_level: str | None, job_level: str | None) -> dict:
    distance = level_distance(candidate_level, job_level)

    if distance is None:
        return {
            "quality": "unknown",
            "reason": "Not enough information to compare experience level.",
        }
    if distance == 0:
        return {
            "quality": "excellent",
            "reason": f"Your experience level ({candidate_level}) matches this role ({job_level}).",
        }
    if distance == 1:
        return {
            "quality": "good",
            "reason": f"Your experience level ({candidate_level}) is close to what this role expects ({job_level}).",
        }
    return {
        "quality": "poor",
        "reason": f"This role expects {job_level}-level experience, which is a stretch from your level ({candidate_level}).",
    }
