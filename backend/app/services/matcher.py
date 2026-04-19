from app.db.database import users_collection


def normalize(text: str) -> str:
    return text.lower().strip() if text else ""


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


def match_jobs_to_active_users(jobs):
    matches = []
    users = list(users_collection.find({"is_active": True}))

    for user in users:
        for job in jobs:
            score = match_score(job, user.get("keywords", []))
            if score > 0:
                matches.append({"user": user, "job": job, "score": score})

    matches.sort(key=lambda item: item["score"], reverse=True)
    return matches
