"""Multi-dimensional match scoring, layered on top of matcher.py's existing
hard-gate inclusion logic (_match_location, _match_job_type, _job_matches_profile).
This module is purely about ranking/explaining jobs that already passed those
gates - it does not decide inclusion.
"""

from app.services.profile_utils import get_profile_skills
from app.services.seniority import (
    classify_seniority_from_title,
    classify_seniority_from_years,
    classify_seniority_from_profile_level,
    explain_level_match,
)
from app.services.skills_taxonomy import get_transferable_skills
from app.services.career_paths import classify_career_paths

# Weight given to a job-required skill the candidate doesn't have directly, but
# has evidence of via a related skill (e.g. job wants "Test Automation", candidate
# has "Selenium"). Counts for something, but less than an exact match.
TRANSFERABLE_CREDIT = 0.5

# Flat bonus for a job at one of the candidate's watch-listed companies. Additive
# only, applied after the weighted dimension score - per product requirement,
# target-company priority must never override hard eligibility (already decided
# before compute_match ever runs) or dominate the underlying match quality.
TARGET_COMPANY_BONUS = 8

DIMENSION_WEIGHTS = {"skills": 0.40, "seniority": 0.20, "education": 0.10, "location": 0.15, "role": 0.15}

# Used whenever there isn't enough data on either side (candidate or job) to score
# a dimension meaningfully - missing data should never look like a bad match.
NEUTRAL_SCORE = 60

QUALITY_SCORES = {"excellent": 100, "good": 75, "poor": 35, "unknown": NEUTRAL_SCORE}


def _normalize(text: str) -> str:
    return (text or "").lower().strip()


def _candidate_skill_set(profile: dict) -> set:
    skills = {s.lower() for s in (get_profile_skills(profile) or [])}
    skills |= {s.lower() for s in (profile.get("cv_skills") or [])}
    return skills


def score_skills_dimension(job: dict, profile: dict) -> dict:
    job_skills = job.get("skills") or []
    candidate_skills = _candidate_skill_set(profile)

    if job_skills:
        # Build a reverse lookup once: which job-required skills does each of the
        # candidate's skills transfer credit toward?
        transferable_targets = set()
        for cand_skill in candidate_skills:
            transferable_targets.update(t.lower() for t in get_transferable_skills(cand_skill))

        matched = []
        transferred = []
        missing = []
        credit = 0.0
        for skill in job_skills:
            skill_lower = skill.lower()
            if skill_lower in candidate_skills:
                matched.append(skill)
                credit += 1.0
            elif skill_lower in transferable_targets:
                transferred.append(skill)
                credit += TRANSFERABLE_CREDIT
            else:
                missing.append(skill)

        score = round((credit / len(job_skills)) * 100)
        if matched and transferred:
            explanation = f"{len(matched)}/{len(job_skills)} required skills matched directly, plus related experience in {', '.join(transferred)}"
        elif matched:
            explanation = f"{len(matched)}/{len(job_skills)} required skills matched"
        elif transferred:
            explanation = f"Related experience found for {', '.join(transferred)}, though not an exact skill match"
        else:
            explanation = "None of this job's listed skills were found on your profile/CV"
        return {
            "score": score,
            "matched": matched,
            "transferred": transferred,
            "missing_key_skills": missing,
            "explanation": explanation,
        }

    # Jobs scraped before skill extraction existed have no job["skills"] list -
    # fall back to a plain keyword-hit heuristic so they aren't penalized just
    # for predating this feature.
    text = _normalize(job.get("title", "")) + " " + _normalize(job.get("description", ""))
    keywords = list(candidate_skills) + [_normalize(r) for r in (profile.get("roles") or [])]
    keywords = list(dict.fromkeys(k for k in keywords if k))
    if not keywords:
        return {"score": NEUTRAL_SCORE, "matched": [], "missing_key_skills": [], "explanation": "Not enough skill data to compare."}

    hits = [k for k in keywords if k in text]
    score = min(100, 30 + len(hits) * 20)
    explanation = (
        f"{len(hits)} of your skills/roles appear in this job's title or description"
        if hits
        else "None of your skills/roles were found in this job's title or description"
    )
    return {"score": score, "matched": hits, "missing_key_skills": [], "explanation": explanation}


def score_seniority_dimension(job: dict, profile: dict) -> dict:
    job_level = classify_seniority_from_title(job.get("title", ""), job.get("description", ""))
    candidate_level = (
        classify_seniority_from_years(profile.get("years_experience"))
        or classify_seniority_from_years(profile.get("cv_years_experience"))
        or classify_seniority_from_profile_level(profile.get("experience_level"))
        or profile.get("cv_seniority")
    )
    result = explain_level_match(candidate_level, job_level)
    return {"score": QUALITY_SCORES[result["quality"]], "quality": result["quality"], "explanation": result["reason"]}


def score_education_dimension(job: dict, profile: dict) -> dict:
    has_candidate_education = bool(profile.get("education") or profile.get("cv_education"))
    # Job postings in this dataset rarely carry structured education requirements,
    # so this stays conservative rather than inventing a signal that isn't there.
    if not has_candidate_education:
        return {"score": NEUTRAL_SCORE, "explanation": "No education info on file - not counted against you."}
    return {"score": 85, "explanation": "Your listed education was considered for this role."}


def score_location_dimension(job: dict, profile: dict) -> dict:
    from app.services.matcher import _match_location

    if _match_location(job, profile):
        return {"score": 100, "explanation": "Meets your location preference."}
    return {"score": 0, "explanation": "Does not meet your location preference."}


def score_role_dimension(job: dict, profile: dict) -> dict:
    from app.services.matcher import _get_profile_roles, _count_keyword_hits, normalize

    roles = _get_profile_roles(profile)
    if not roles:
        return {"score": NEUTRAL_SCORE, "matched": [], "explanation": "No preferred roles set."}

    title_hits = _count_keyword_hits(normalize(job.get("title", "")), roles)
    description_hits = _count_keyword_hits(normalize(job.get("description", "")), roles)
    hits = list(dict.fromkeys(title_hits + description_hits))

    if title_hits:
        score = 100
    elif description_hits:
        score = 70
    else:
        score = 30
    explanation = (
        f"Matches {len(hits)} of your preferred role(s)" if hits else "Doesn't closely match your preferred roles"
    )
    return {"score": score, "matched": hits, "explanation": explanation}


def _is_target_company(job: dict, profile: dict) -> bool:
    target_companies = {c.strip().lower() for c in (profile.get("target_companies") or []) if c and c.strip()}
    if not target_companies:
        return False
    return _normalize(job.get("company", "")) in target_companies


def compute_match(job: dict, profile: dict) -> dict:
    components = {
        "skills": score_skills_dimension(job, profile),
        "seniority": score_seniority_dimension(job, profile),
        "education": score_education_dimension(job, profile),
        "location": score_location_dimension(job, profile),
        "role": score_role_dimension(job, profile),
    }
    overall = sum(components[dim]["score"] * weight for dim, weight in DIMENSION_WEIGHTS.items())

    reasons = list(components["skills"].get("matched", [])[:4])
    reasons.extend(components["skills"].get("transferred", [])[:2])
    reasons.extend(components["role"].get("matched", [])[:2])

    is_target_company = _is_target_company(job, profile)
    if is_target_company:
        overall = min(100, overall + TARGET_COMPANY_BONUS)
        reasons.append(f"Target company: {job.get('company', '')}")

    candidate_skills = list(_candidate_skill_set(profile))
    top_paths = classify_career_paths(candidate_skills, limit=1)
    if top_paths:
        top_role = top_paths[0]["role"]
        if top_role.lower() in _normalize(job.get("title", "")):
            reasons.append(f"Matches your top career path: {top_role}")

    reasons = list(dict.fromkeys(reasons))[:8]

    return {
        "score": round(overall),
        "components": components,
        "reasons": reasons,
        "is_target_company": is_target_company,
    }
