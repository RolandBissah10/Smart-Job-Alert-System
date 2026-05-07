from dotenv import load_dotenv
import os

load_dotenv()


def _parse_csv_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    values = [item.strip().rstrip("/") for item in raw.split(",")]
    return [item for item in values if item]

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASS = os.getenv("EMAIL_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", EMAIL_USER)
SCHEDULER_INTERVAL_MINUTES = int(os.getenv("SCHEDULER_INTERVAL_MINUTES", "60"))
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4173").rstrip("/")
ALLOWED_ORIGINS = _parse_csv_env(
    "ALLOWED_ORIGINS",
    f"{FRONTEND_URL},http://localhost:4173,http://localhost:5173",
)
