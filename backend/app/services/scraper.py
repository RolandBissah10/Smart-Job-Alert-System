import requests
from bs4 import BeautifulSoup
from app.db.database import jobs_collection
from datetime import datetime


def fetch_jobs():
    url = "https://remoteok.com/remote-dev-jobs"
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    jobs = []

    for row in soup.select("tr.job"):
        title_el = row.select_one("h2")
        company_el = row.select_one("h3")
        url_el = row.select_one("a.preventLink")
        if not title_el or not company_el:
            continue

        job_url = None
        if url_el and url_el.get("href"):
            job_url = f"https://remoteok.com{url_el['href']}"

        jobs.append({
            "title": title_el.text.strip(),
            "company": company_el.text.strip(),
            "location": row.select_one(".location").text.strip() if row.select_one(".location") else "remote",
            "url": job_url,
            "source": "remoteok",
            "description": row.select_one(".description").text.strip() if row.select_one(".description") else "",
        })

    return jobs


def save_jobs(jobs):
    new_jobs = []
    for job in jobs:
        if not job.get("url"):
            continue
        existing = jobs_collection.find_one({"url": job["url"]})
        if existing:
            continue
        job["created_at"] = datetime.utcnow()
        jobs_collection.insert_one(job)
        new_jobs.append(job)
    return new_jobs
