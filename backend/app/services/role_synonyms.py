import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "role_synonyms.json"

_clusters_cache = None
_index_cache = None


def load_role_clusters() -> list:
    global _clusters_cache
    if _clusters_cache is None:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            _clusters_cache = json.load(f)
    return _clusters_cache


def _build_index() -> dict:
    global _index_cache
    if _index_cache is None:
        index = {}
        for cluster in load_role_clusters():
            for term in cluster:
                index[term.strip().lower()] = cluster
        _index_cache = index
    return _index_cache


def expand_role_terms(role: str) -> list:
    """A role's whole synonym cluster (e.g. "QA Engineer" -> ["QA Engineer",
    "Automation Engineer", "SDET", ...]), case-insensitive. Falls back to just
    [role] unchanged for anything not in a known cluster - a role we don't
    recognize is still matched literally, never dropped."""
    if not role:
        return []
    cluster = _build_index().get(role.strip().lower())
    return cluster if cluster else [role]


def expand_roles(roles: list) -> list:
    """Union of expand_role_terms() across a candidate's whole role list, deduped."""
    expanded = []
    for role in roles or []:
        expanded.extend(expand_role_terms(role))
    return list(dict.fromkeys(expanded))
