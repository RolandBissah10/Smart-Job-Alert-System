from app.db.database import users_collection


def normalize(text: str) -> str:
    return text.lower().strip() if text else ""


def profile_has_match_criteria(profile: dict) -> bool:
    return bool(profile.get("skills") or profile.get("tech_stack") or profile.get("roles"))


def _get_keywords_from_profile(profile: dict) -> list:
    keywords = []
    # Support both new "skills" field and legacy "tech_stack" field
    keywords.extend(profile.get("skills", []) or profile.get("tech_stack", []))
    keywords.extend(profile.get("roles", []))
    industry = profile.get("industry", "")
    if industry:
        keywords.append(industry.replace("_", " "))
    return keywords


def _get_profile_skills(profile: dict) -> list:
    return profile.get("skills", []) or profile.get("tech_stack", [])


def _get_profile_roles(profile: dict) -> list:
    return profile.get("roles", [])


def _get_profile_industry_terms(profile: dict) -> list:
    industry = profile.get("industry", "")
    if not industry:
        return []
    return [industry.replace("_", " ")]


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


def _count_keyword_hits(text: str, keywords: list) -> list:
    hits = []
    for keyword in keywords:
        term = normalize(keyword)
        if term and term in text:
            hits.append(keyword)
    return list(dict.fromkeys(hits))


def _job_matches_profile(job: dict, profile: dict, title_hits: list, description_hits: list) -> bool:
    if not _match_location(job, profile) or not _match_job_type(job, profile):
        return False

    title = normalize(job.get("title", ""))
    description = normalize(job.get("description", ""))
    skills = _get_profile_skills(profile)
    roles = _get_profile_roles(profile)
    industry_terms = _get_profile_industry_terms(profile)

    role_title_hits = _count_keyword_hits(title, roles)
    role_description_hits = _count_keyword_hits(description, roles)
    skill_title_hits = _count_keyword_hits(title, skills)
    skill_description_hits = _count_keyword_hits(description, skills)
    industry_title_hits = _count_keyword_hits(title, industry_terms)
    industry_description_hits = _count_keyword_hits(description, industry_terms)

    non_industry_hits = list(dict.fromkeys(
        role_title_hits + role_description_hits + skill_title_hits + skill_description_hits
    ))
    title_non_industry_hits = list(dict.fromkeys(role_title_hits + skill_title_hits))

    if roles and role_title_hits:
        return True
    if roles and role_description_hits and title_non_industry_hits:
        return True
    if len(non_industry_hits) >= 2 and title_non_industry_hits:
        return True
    if skill_title_hits and role_description_hits:
        return True
    if industry_title_hits and len(non_industry_hits) >= 1:
        return True
    if industry_description_hits and len(title_non_industry_hits) >= 1:
        return True
    return False


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
        scored.append({"job": job_data, "score": match["score"], "reasons": match["reasons"]})
    return scored


def match_jobs_to_active_users(jobs):
    matches = []
    users = list(users_collection.find({"is_active": True}))
    for user in users:
        profile = user.get("profile", {})
        if not profile_has_match_criteria(profile):
            continue
        for scored in get_matching_jobs_for_profile(jobs, profile):
            matches.append({
                "user": user,
                "job": scored["job"],
                "score": scored["score"],
            })
    matches.sort(key=lambda item: item["score"], reverse=True)
    return matches
