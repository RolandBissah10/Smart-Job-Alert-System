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
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
# Must be the exact address verified as a Single Sender in the SendGrid
# dashboard (Settings -> Sender Authentication) - SendGrid rejects sends from
# any other address until a whole domain is verified instead.
EMAIL_FROM = os.getenv("EMAIL_FROM", "")
PIPELINE_SECRET = os.getenv("PIPELINE_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4173").rstrip("/")
ALLOWED_ORIGINS = _parse_csv_env(
    "ALLOWED_ORIGINS",
    f"{FRONTEND_URL},http://localhost:4173,http://localhost:5173",
)
