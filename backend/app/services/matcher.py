from app.db.database import users_collection


def normalize(text: str) -> str:
    return text.lower().strip() if text else ""


def _get_keywords_from_profile(profile: dict) -> list:
    keywords = []
    # Support both new "skills" field and legacy "tech_stack" field
    keywords.extend(profile.get("skills", []) or profile.get("tech_stack", []))
    keywords.extend(profile.get("roles", []))
    industry = profile.get("industry", "")
    if industry:
        keywords.append(industry.replace("_", " "))
    return keywords


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


def score_jobs_for_user(jobs, profile: dict):
    keywords = _get_keywords_from_profile(profile)
    scored = []
    for job in jobs:
        score, reasons = match_score_with_reasons(job, keywords)
        job_data = {k: (str(v) if k == "_id" else v) for k, v in job.items()}
        scored.append({"job": job_data, "score": score, "reasons": reasons})
    scored.sort(key=lambda x: x["score"], reverse=True)
    matched = [j for j in scored if j["score"] > 0]
    return matched if matched else scored[:10]


def match_jobs_to_active_users(jobs):
    matches = []
    users = list(users_collection.find({"is_active": True}))
    for user in users:
        profile = user.get("profile", {})
        if not profile.get("skills") and not profile.get("tech_stack") and not profile.get("roles"):
            continue
        keywords = _get_keywords_from_profile(profile)
        for job in jobs:
            score = match_score(job, keywords)
            if score > 0:
                matches.append({"user": user, "job": job, "score": score})
    matches.sort(key=lambda item: item["score"], reverse=True)
    return matches
