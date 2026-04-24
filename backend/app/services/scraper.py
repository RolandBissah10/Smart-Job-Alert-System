import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.db.database import jobs_collection
from app.config import ADZUNA_APP_ID, ADZUNA_APP_KEY
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
TIMEOUT = 10


def _fetch_remoteok():
    jobs = []
    try:
        r = requests.get("https://remoteok.com/remote-dev-jobs", headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        for row in soup.select("tr.job"):
            title_el = row.select_one("h2")
            company_el = row.select_one("h3")
            url_el = row.select_one("a.preventLink")
            if not title_el or not company_el:
                continue
            job_url = f"https://remoteok.com{url_el['href']}" if url_el and url_el.get("href") else None
            jobs.append({
                "title": title_el.text.strip(),
                "company": company_el.text.strip(),
                "location": row.select_one(".location").text.strip() if row.select_one(".location") else "Remote",
                "url": job_url,
                "source": "remoteok",
                "description": row.select_one(".description").text.strip() if row.select_one(".description") else "",
            })
        logger.info(f"RemoteOK: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"RemoteOK failed: {e}")
    return jobs


def _fetch_remotive():
    jobs = []
    try:
        r = requests.get("https://remotive.com/api/remote-jobs", headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        for item in r.json().get("jobs", []):
            jobs.append({
                "title": item.get("title", ""),
                "company": item.get("company_name", ""),
                "location": item.get("candidate_required_location") or "Remote",
                "url": item.get("url"),
                "source": "remotive",
                "description": BeautifulSoup(item.get("description", ""), "html.parser").get_text()[:500],
            })
        logger.info(f"Remotive: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"Remotive failed: {e}")
    return jobs



def _fetch_arbeitnow():
    jobs = []
    try:
        r = requests.get("https://arbeitnow.com/api/job-board-api", headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        for item in r.json().get("data", []):
            jobs.append({
                "title": item.get("title", ""),
                "company": item.get("company_name", ""),
                "location": item.get("location") or ("Remote" if item.get("remote") else "On-site"),
                "url": item.get("url"),
                "source": "arbeitnow",
                "description": BeautifulSoup(item.get("description", ""), "html.parser").get_text()[:500],
            })
        logger.info(f"Arbeitnow: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"Arbeitnow failed: {e}")
    return jobs


def _fetch_himalayas():
    jobs = []
    try:
        r = requests.get("https://himalayas.app/jobs/api", headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        for item in r.json().get("jobs", []):
            company = item.get("company", {})
            locations = item.get("locationRestrictions") or []
            jobs.append({
                "title": item.get("title", ""),
                "company": company.get("name", "") if isinstance(company, dict) else str(company),
                "location": ", ".join(locations) if locations else "Remote",
                "url": item.get("url"),
                "source": "himalayas",
                "description": BeautifulSoup(item.get("description", ""), "html.parser").get_text()[:500],
            })
        logger.info(f"Himalayas: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"Himalayas failed: {e}")
    return jobs


def _fetch_themuse():
    jobs = []
    try:
        r = requests.get(
            "https://www.themuse.com/api/public/jobs",
            params={"page": 1, "descending": "true"},
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        for item in r.json().get("results", []):
            locations = item.get("locations", [])
            location = locations[0].get("name", "Remote") if locations else "Remote"
            jobs.append({
                "title": item.get("name", ""),
                "company": item.get("company", {}).get("name", ""),
                "location": location,
                "url": item.get("refs", {}).get("landing_page"),
                "source": "themuse",
                "description": BeautifulSoup(item.get("contents", ""), "html.parser").get_text()[:500],
            })
        logger.info(f"The Muse: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"The Muse failed: {e}")
    return jobs


def _fetch_jobicy():
    jobs = []
    try:
        r = requests.get("https://jobicy.com/?feed=job_feed", headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        root = ET.fromstring(r.content)
        ns = {"job": "https://jobicy.com/"}
        for item in root.findall(".//item"):
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            company_el = item.find("job:company", ns)
            company = company_el.text.strip() if company_el is not None and company_el.text else ""
            location_el = item.find("job:jobLocation", ns)
            location = location_el.text.strip() if location_el is not None and location_el.text else "Remote"
            if not link:
                continue
            jobs.append({
                "title": title,
                "company": company,
                "location": location,
                "url": link,
                "source": "jobicy",
                "description": BeautifulSoup(item.findtext("description", ""), "html.parser").get_text()[:500],
            })
        logger.info(f"Jobicy: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"Jobicy failed: {e}")
    return jobs



def _fetch_adzuna():
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        return []

    import time
    queries = ["software developer", "data scientist", "frontend", "backend", "devops"]
    jobs = []

    for query in queries:
        try:
            r = requests.get(
                "https://api.adzuna.com/v1/api/jobs/us/search/1",
                params={
                    "app_id": ADZUNA_APP_ID,
                    "app_key": ADZUNA_APP_KEY,
                    "results_per_page": 20,
                    "what": query,
                    "content-type": "application/json",
                },
                headers=HEADERS,
                timeout=TIMEOUT,
            )
            if r.status_code == 429:
                logger.warning("Adzuna rate limit hit — stopping early")
                break
            r.raise_for_status()
            for item in r.json().get("results", []):
                jobs.append({
                    "title": item.get("title", ""),
                    "company": item.get("company", {}).get("display_name", ""),
                    "location": item.get("location", {}).get("display_name", ""),
                    "url": item.get("redirect_url"),
                    "source": "adzuna",
                    "description": item.get("description", "")[:500],
                })
            time.sleep(1)
        except Exception as e:
            logger.error(f"Adzuna '{query}' failed: {e}")

    logger.info(f"Adzuna: {len(jobs)} jobs")
    return jobs


def fetch_jobs():
    sources = [
        _fetch_remoteok,
        _fetch_remotive,
        _fetch_arbeitnow,
        _fetch_himalayas,
        _fetch_themuse,
        _fetch_jobicy,
        _fetch_adzuna,
    ]
    all_jobs = []
    with ThreadPoolExecutor(max_workers=len(sources)) as executor:
        futures = {executor.submit(fn): fn.__name__ for fn in sources}
        for future in as_completed(futures):
            try:
                all_jobs.extend(future.result())
            except Exception as e:
                logger.error(f"{futures[future]} unexpected error: {e}")
    logger.info(f"Total fetched: {len(all_jobs)} jobs across all sources")
    return all_jobs


def save_jobs(jobs):
    valid = [j for j in jobs if j.get("url")]
    if not valid:
        return []

    # One query to find all URLs already in the DB
    urls = [j["url"] for j in valid]
    existing_urls = {
        doc["url"]
        for doc in jobs_collection.find({"url": {"$in": urls}}, {"url": 1})
    }

    new_jobs = [j for j in valid if j["url"] not in existing_urls]
    if new_jobs:
        for job in new_jobs:
            job["created_at"] = datetime.utcnow()
        try:
            jobs_collection.insert_many(new_jobs, ordered=False)
        except Exception as e:
            logger.error(f"Bulk insert error: {e}")

    logger.info(f"save_jobs: {len(new_jobs)} new out of {len(valid)} fetched")
    return new_jobs
