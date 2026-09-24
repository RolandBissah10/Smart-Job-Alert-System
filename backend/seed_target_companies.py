"""One-off script: add a fixed list of companies to a user's tiered
target_companies list. Run once from the backend/ directory (so it picks up
the existing .env for MONGO_URL), then delete - this isn't part of the app.

Usage:
    python seed_target_companies.py you@example.com
"""
import sys
from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# "Vodafone/Telecel" deduped against "Telecel Ghana" - confirmed same entity
# (Telecel Group's 2023 acquisition + full 2024 rebrand of Vodafone Ghana).
COMPANIES = [
    "M-KOPA", "Medfy", "Afrilotto Systems", "Conduit Labs", "Telecel Ghana",
    "Kudi Systems", "Canonical", "Turing", "Hubtel", "Zeepay", "Fido",
    "mPharma", "Farmerline", "Jetstream Africa", "DreamOval", "AmaliTech",
    "Esoko", "Turntabl", "XDS Data Ghana", "Standard Bank Ghana", "Ecobank",
    "MTN Ghana", "ExpressPay", "Nsano",
]

DEFAULT_TIER = "preferred"


def main():
    if len(sys.argv) != 2:
        print("Usage: python seed_target_companies.py you@example.com")
        sys.exit(1)

    email = sys.argv[1]
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=10000)
    users_collection = client["job_scraper"]["users"]

    user = users_collection.find_one({"email": email})
    if not user:
        print(f"No user found with email {email}")
        sys.exit(1)

    profile = user.get("profile", {})
    existing = profile.get("target_companies") or []
    existing_names = set()
    for entry in existing:
        name = entry if isinstance(entry, str) else entry.get("name", "")
        if name:
            existing_names.add(name.strip().lower())

    added, skipped = [], []
    updated = list(existing)
    for name in COMPANIES:
        if name.strip().lower() in existing_names:
            skipped.append(name)
            continue
        updated.append({"name": name, "tier": DEFAULT_TIER})
        added.append(name)

    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"profile.target_companies": updated},
            "$inc": {"profile_version": 1},
        },
    )

    print(f"Added {len(added)} companies (tier={DEFAULT_TIER}): {', '.join(added) or '(none)'}")
    if skipped:
        print(f"Already present, skipped: {', '.join(skipped)}")
    print(f"profile.target_companies now has {len(updated)} entries.")


if __name__ == "__main__":
    main()
