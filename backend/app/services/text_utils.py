import json
import re


def normalize(text: str) -> str:
    return text.lower().strip() if text else ""


def clean_text(value) -> str:
    if isinstance(value, (list, tuple, set)):
        value = " ".join(str(item) for item in value if item is not None)
    elif isinstance(value, dict):
        value = json.dumps(value, ensure_ascii=False)
    return re.sub(r"\s+", " ", str(value or "")).strip()
