import json
import re
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "skills.json"
TRANSFERABLE_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "transferable_skills.json"

# Common abbreviations/variants that don't derive cleanly from the canonical name itself.
EXTRA_ALIASES = {
    "javascript": ["js"],
    "typescript": ["ts"],
    "kubernetes": ["k8s"],
    "postgresql": ["postgres"],
    "machine learning": ["ml"],
    "deep learning": ["dl"],
    "natural language processing": ["nlp"],
    "node.js": ["nodejs", "node"],
    "next.js": ["nextjs"],
    "ruby on rails": ["rails"],
    "asp.net": ["dotnet", ".net"],
    "ci/cd": ["cicd"],
    "search engine optimization": ["seo"],
    "customer relationship management": ["crm"],
}

_cache = None


def _normalize(term: str) -> str:
    return re.sub(r"\s+", " ", term.strip().lower())


def _build_alias_index(canonical_terms: list[str]) -> dict[str, str]:
    index = {}
    for canonical in canonical_terms:
        key = _normalize(canonical)
        index[key] = canonical
        for alias in EXTRA_ALIASES.get(key, []):
            index[_normalize(alias)] = canonical
    return index


def load_skills() -> dict:
    global _cache
    if _cache is None:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
        _cache = {
            "skills": _build_alias_index(raw.get("skills", [])),
            "certifications": _build_alias_index(raw.get("certifications", [])),
        }
    return _cache


def _compile_patterns(alias_index: dict[str, str]) -> list[tuple[re.Pattern, str]]:
    patterns = []
    for alias, canonical in alias_index.items():
        escaped = re.escape(alias)
        pattern = re.compile(r"(?<![A-Za-z0-9])" + escaped + r"(?![A-Za-z0-9])", re.IGNORECASE)
        patterns.append((pattern, canonical))
    return patterns


_skill_patterns_cache = None
_cert_patterns_cache = None


def _extract(text: str, alias_index: dict[str, str], patterns_cache_key: str) -> list[str]:
    global _skill_patterns_cache, _cert_patterns_cache
    if patterns_cache_key == "skills":
        if _skill_patterns_cache is None:
            _skill_patterns_cache = _compile_patterns(alias_index)
        patterns = _skill_patterns_cache
    else:
        if _cert_patterns_cache is None:
            _cert_patterns_cache = _compile_patterns(alias_index)
        patterns = _cert_patterns_cache

    lowered = text or ""
    found = []
    seen = set()
    for pattern, canonical in patterns:
        if canonical in seen:
            continue
        if pattern.search(lowered):
            seen.add(canonical)
            found.append(canonical)
    return found


def extract_skills_from_text(text: str) -> list[str]:
    data = load_skills()
    return _extract(text, data["skills"], "skills")


def extract_certifications_from_text(text: str) -> list[str]:
    data = load_skills()
    return _extract(text, data["certifications"], "certifications")


_transferable_cache = None


def load_transferable_skills() -> dict:
    global _transferable_cache
    if _transferable_cache is None:
        with open(TRANSFERABLE_DATA_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
        _transferable_cache = {k.lower(): v for k, v in raw.items()}
    return _transferable_cache


def get_transferable_skills(skill: str) -> list[str]:
    """Broader/related competency terms a specific skill contributes toward
    (e.g. Selenium -> Test Automation). One-directional by design: this maps a
    specific skill up to what it's evidence of, not sideways to other specific
    tools that could substitute for it."""
    return load_transferable_skills().get((skill or "").lower(), [])
