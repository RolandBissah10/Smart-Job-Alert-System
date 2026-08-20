def get_profile_skills(profile: dict) -> list:
    """Canonical skills list for a profile. `tech_stack` is a legacy field name
    from before `skills` existed on UserProfile — read-only fallback, never written."""
    return profile.get("skills") or profile.get("tech_stack") or []


def profile_has_structured_data(profile: dict) -> bool:
    """Whether a raw profile dict (as stored on the user document) has enough
    manually-entered data to be usable for matching, independent of match_source."""
    return bool(get_profile_skills(profile) or profile.get("roles"))


def build_match_profile(user: dict) -> dict:
    """Single source of truth for turning a user document into the profile dict
    the matcher expects: the raw profile plus match_source and cv-derived fields
    folded in. Used by the job feed, the alert pipeline, and the scheduler so
    they can't silently drift from each other."""
    profile = dict(user.get("profile", {}))
    cv_data = user.get("cv_data", {}) or {}
    profile["match_source"] = user.get("match_source", "profile")
    profile["cv_keywords"] = cv_data.get("keywords", [])
    profile["cv_skills"] = cv_data.get("skills", [])
    profile["cv_certifications"] = cv_data.get("certifications", [])
    profile["cv_years_experience"] = cv_data.get("years_experience")
    profile["cv_education"] = cv_data.get("education", [])
    profile["cv_seniority"] = cv_data.get("seniority")
    return profile
