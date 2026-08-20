import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "role_skill_map.json"

# Below this confidence, a role is more noise than signal - drop it rather than
# padding the list with barely-related matches.
MIN_CONFIDENCE = 30

_cache = None


def load_role_skill_map() -> dict:
    global _cache
    if _cache is None:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache


def classify_career_paths(candidate_skills: list[str], limit: int = 6) -> list[dict]:
    """Rank known roles by how much of each role's defining skill set the
    candidate's skills cover. This is deliberately a small, extensible,
    cross-industry sample of roles (see data/role_skill_map.json) - not an
    exhaustive taxonomy - and direct skill overlap only, no transferable-skill
    credit (that's applied separately to job matching, not career classification)."""
    role_map = load_role_skill_map()
    candidate_set = {s.lower() for s in candidate_skills if s}
    if not candidate_set:
        return []

    results = []
    for role, required_skills in role_map.items():
        if not required_skills:
            continue
        required_lower = [s.lower() for s in required_skills]
        overlap = sum(1 for s in required_lower if s in candidate_set)
        confidence = round((overlap / len(required_lower)) * 100)
        if confidence >= MIN_CONFIDENCE:
            results.append({"role": role, "confidence": confidence})

    results.sort(key=lambda r: r["confidence"], reverse=True)
    return results[:limit]
