import requests
import xml.etree.ElementTree as ET
import json
import re
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.db.database import jobs_collection
from app.config import ADZUNA_APP_ID, ADZUNA_APP_KEY
from app.cache import cache
from app.services.skills_taxonomy import extract_skills_from_text
from app.services.seniority import classify_seniority_from_title
from datetime import datetime
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin
import logging

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
TIMEOUT = 10


def _fetch_soup(url, params=None):
    response = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def _parse_date_safe(value):
    """Best-effort conversion of a source's raw date value (epoch number, ISO8601
    string, or RFC-822 string) into a naive UTC datetime. Returns None rather than
    raising - callers must treat a missing posted_date as legitimate, not an error."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.utcfromtimestamp(value)
        except (OverflowError, OSError, ValueError):
            return None
    if isinstance(value, str):
        text = value.strip()
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            pass
        try:
            return parsedate_to_datetime(text).replace(tzinfo=None)
        except (TypeError, ValueError):
            return None
    return None


def enrich_job(job: dict) -> dict:
    """Rule-based enrichment applied once per newly-discovered job: a skills list
    (against the shared taxonomy) and an inferred seniority level, both derived
    from title/description text already collected by the fetchers."""
    text = f"{job.get('title', '')} {job.get('description', '')}"
    job["skills"] = extract_skills_from_text(text)
    job["seniority"] = classify_seniority_from_title(job.get("title", ""), job.get("description", ""))
    return job


def _clean_text(value):
    if isinstance(value, (list, tuple, set)):
        value = " ".join(str(item) for item in value if item is not None)
    elif isinstance(value, dict):
        value = json.dumps(value, ensure_ascii=False)
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _extract_json_ld_jobposting(soup):
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        raw = script.string or script.get_text(strip=True)
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except Exception:
            continue

        candidates = payload if isinstance(payload, list) else [payload]
        for item in candidates:
            if isinstance(item, dict) and item.get("@graph"):
                candidates.extend(item["@graph"])
                continue
            if not isinstance(item, dict):
                continue
            if item.get("@type") == "JobPosting":
                hiring_org = item.get("hiringOrganization") or {}
                location = item.get("jobLocation") or {}
                address = location.get("address") if isinstance(location, dict) else {}
                locality = ""
                if isinstance(address, dict):
                    locality = (
                        address.get("addressLocality")
                        or address.get("addressRegion")
                        or address.get("addressCountry")
                        or ""
                    )
                return {
                    "title": _clean_text(item.get("title")),
                    "company": _clean_text(hiring_org.get("name") if isinstance(hiring_org, dict) else hiring_org),
                    "location": _clean_text(locality),
                    "description": _clean_text(BeautifulSoup(item.get("description", ""), "html.parser").get_text())[:500],
                    "employment_type": _clean_text(item.get("employmentType")) or None,
                    "posted_date": _parse_date_safe(item.get("datePosted")),
                }
    return {}


def _extract_description_block(soup):
    selectors = [
        ".job-summary",
        ".job-description",
        ".job-content",
        ".entry-content",
        "article",
        "main",
    ]
    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            text = _clean_text(node.get_text(" ", strip=True))
            if len(text) > 40:
                return text[:500]
    return ""


def _parse_generic_detail(url, source, fallback_location="", fallback_company=""):
    soup = _fetch_soup(url)
    json_ld = _extract_json_ld_jobposting(soup)
    title = json_ld.get("title") or _clean_text((soup.select_one("h1") or {}).get_text(" ", strip=True) if soup.select_one("h1") else "")
    company = json_ld.get("company") or fallback_company
    location = json_ld.get("location") or fallback_location
    description = json_ld.get("description") or _extract_description_block(soup)

    if not company:
        company_selectors = [".company", ".job-company", ".company-name", "h2", "h3"]
        for selector in company_selectors:
            node = soup.select_one(selector)
            if node:
                text = _clean_text(node.get_text(" ", strip=True))
                if text and text.lower() != title.lower():
                    company = text
                    break

    if not location:
        for pattern in [
            r"(Accra(?:\s*&\s*Tema)? Region|Greater Accra Region|Kumasi(?:\s*&\s*Ashanti)? Region|Tema|Accra|Ho|Tamale|Takoradi|Kenyasi|Osu)",
            r"(Remote anywhere|Remote|Hybrid|On-site|On-Site)",
        ]:
            match = re.search(pattern, soup.get_text(" ", strip=True), re.IGNORECASE)
            if match:
                location = _clean_text(match.group(1))
                break

    if not title:
        return None

    posted_date = json_ld.get("posted_date")
    return {
        "title": title,
        "company": company,
        "location": location or "Ghana",
        "url": url,
        "source": source,
        "description": description,
        "employment_type": json_ld.get("employment_type"),
        "posted_date": posted_date,
        "date_is_estimated": posted_date is None,
    }


def _collect_links(soup, base_url, href_predicate, limit=25):
    links = []
    seen = set()
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"].strip()
        if not href_predicate(href):
            continue
        full_url = urljoin(base_url, href)
        if full_url in seen:
            continue
        seen.add(full_url)
        links.append((full_url, _clean_text(anchor.get_text(" ", strip=True))))
        if len(links) >= limit:
            break
    return links


def _fetch_remoteok():
    # Uses RemoteOK's JSON API (not the HTML jobs table) specifically so we get a
    # real `date`/`epoch` posted timestamp - the HTML page has no reliable one.
    jobs = []
    try:
        r = requests.get("https://remoteok.com/api", headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        items = r.json()
        for item in items:
            if not isinstance(item, dict) or not item.get("id"):
                continue  # first element is an API legal-notice object, not a job
            posted_date = _parse_date_safe(item.get("date")) or _parse_date_safe(item.get("epoch"))
            jobs.append({
                "title": item.get("position", ""),
                "company": item.get("company", ""),
                "location": item.get("location") or "Remote",
                "url": item.get("url") or item.get("apply_url"),
                "source": "remoteok",
                "description": BeautifulSoup(item.get("description", ""), "html.parser").get_text()[:500],
                "posted_date": posted_date,
                "date_is_estimated": posted_date is None,
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
            posted_date = _parse_date_safe(item.get("publication_date"))
            jobs.append({
                "title": item.get("title", ""),
                "company": item.get("company_name", ""),
                "location": item.get("candidate_required_location") or "Remote",
                "url": item.get("url"),
                "source": "remotive",
                "description": BeautifulSoup(item.get("description", ""), "html.parser").get_text()[:500],
                "employment_type": item.get("job_type") or None,
                "posted_date": posted_date,
                "date_is_estimated": posted_date is None,
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
            posted_date = _parse_date_safe(item.get("created_at"))
            job_types = item.get("job_types") or []
            jobs.append({
                "title": item.get("title", ""),
                "company": item.get("company_name", ""),
                "location": item.get("location") or ("Remote" if item.get("remote") else "On-site"),
                "url": item.get("url"),
                "source": "arbeitnow",
                "description": BeautifulSoup(item.get("description", ""), "html.parser").get_text()[:500],
                "employment_type": job_types[0] if job_types else None,
                "posted_date": posted_date,
                "date_is_estimated": posted_date is None,
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
            # NOTE: fixed here alongside the posted_date addition - the API has no
            # "company"/"url" fields (only "companyName" and "applicationLink"/"guid"),
            # so every Himalayas job was previously being dropped for lacking a URL.
            locations = item.get("locationRestrictions") or []
            posted_date = _parse_date_safe(item.get("pubDate"))
            jobs.append({
                "title": item.get("title", ""),
                "company": item.get("companyName", ""),
                "location": ", ".join(locations) if locations else "Remote",
                "url": item.get("applicationLink") or item.get("guid"),
                "source": "himalayas",
                "description": BeautifulSoup(item.get("description", ""), "html.parser").get_text()[:500],
                "employment_type": item.get("employmentType") or None,
                "posted_date": posted_date,
                "date_is_estimated": posted_date is None,
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
            posted_date = _parse_date_safe(item.get("publication_date"))
            jobs.append({
                "title": item.get("name", ""),
                "company": item.get("company", {}).get("name", ""),
                "location": location,
                "url": item.get("refs", {}).get("landing_page"),
                "source": "themuse",
                "description": BeautifulSoup(item.get("contents", ""), "html.parser").get_text()[:500],
                "posted_date": posted_date,
                "date_is_estimated": posted_date is None,
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
            posted_date = _parse_date_safe(item.findtext("pubDate"))
            jobs.append({
                "title": title,
                "company": company,
                "location": location,
                "url": link,
                "source": "jobicy",
                "description": BeautifulSoup(item.findtext("description", ""), "html.parser").get_text()[:500],
                "posted_date": posted_date,
                "date_is_estimated": posted_date is None,
            })
        logger.info(f"Jobicy: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"Jobicy failed: {e}")
    return jobs


def _fetch_jobberman_ghana():
    jobs = []
    try:
        soup = _fetch_soup("https://www.jobberman.com.gh/jobs")
        links = _collect_links(
            soup,
            "https://www.jobberman.com.gh",
            lambda href: "/listings/" in href,
            limit=20,
        )
        for url, _ in links:
            job = _parse_generic_detail(url, "jobberman_ghana", fallback_location="Ghana")
            if job:
                jobs.append(job)
        logger.info(f"Jobberman Ghana: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"Jobberman Ghana failed: {e}")
    return jobs


def _fetch_glmis_ghana():
    jobs = []
    try:
        soup = _fetch_soup("https://www.glmis.gov.gh/Jobs/Joblistings")
        cards = soup.find_all(["div", "article", "section"])
        seen_urls = set()
        for card in cards:
            title_node = card.find(["h2", "h3", "h4", "h5"])
            if not title_node:
                continue
            title = _clean_text(title_node.get_text(" ", strip=True))
            if not title or title.lower() in {"job vacancies", "view job details"}:
                continue

            detail_link = None
            for anchor in card.find_all("a", href=True):
                href = anchor["href"]
                if "job" in href.lower():
                    detail_link = urljoin("https://www.glmis.gov.gh", href)
                    break

            if detail_link and detail_link in seen_urls:
                continue
            if detail_link:
                seen_urls.add(detail_link)

            lines = [_clean_text(line) for line in card.stripped_strings]
            company = lines[1] if len(lines) > 1 else ""
            location = next((line for line in lines if any(token in line.lower() for token in ["accra", "tema", "osu", "kumasi", "tamale", "takoradi", "weija", "konongo"])), "Ghana")
            description = " ".join(lines[2:8])[:500]

            if not detail_link:
                # No per-job link on this card - build a stable, unique synthetic
                # URL from title+company instead of falling back to the shared
                # listings page URL, which collided across every such job on the
                # unique `url` index and silently dropped all but the first.
                slug = re.sub(r"[^a-z0-9]+", "-", f"{title}-{company}".lower()).strip("-")
                detail_link = f"https://www.glmis.gov.gh/Jobs/Joblistings#{slug}"

            jobs.append({
                "title": title,
                "company": company,
                "location": location,
                "url": detail_link,
                "source": "glmis_ghana",
                "description": description,
                # No structured posting date is available on this listing page.
                "posted_date": None,
                "date_is_estimated": True,
            })
            if len(jobs) >= 25:
                break
        logger.info(f"GLMIS Ghana: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"GLMIS Ghana failed: {e}")
    return jobs


def _fetch_corporategh():
    jobs = []
    try:
        soup = _fetch_soup("https://corporategh.com/jobs/")
        links = _collect_links(
            soup,
            "https://corporategh.com",
            lambda href: "/jobs/" in href and not href.rstrip("/").endswith("/jobs"),
            limit=20,
        )
        for url, _ in links:
            job = _parse_generic_detail(url, "corporategh", fallback_location="Ghana")
            if job:
                jobs.append(job)
        logger.info(f"CorporateGh: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"CorporateGh failed: {e}")
    return jobs


def _fetch_arc_ghana():
    jobs = []
    try:
        soup = _fetch_soup("https://arc.dev/en-gh/remote-jobs")
        cards = soup.find_all(["article", "div", "li"])
        seen = set()
        for card in cards:
            text = _clean_text(card.get_text(" ", strip=True))
            if not text or "remote" not in text.lower():
                continue
            title_node = card.find(["h2", "h3"])
            if not title_node:
                continue
            title = _clean_text(title_node.get_text(" ", strip=True))
            if not title:
                continue

            anchor = card.find("a", href=True)
            url = urljoin("https://arc.dev", anchor["href"]) if anchor else "https://arc.dev/en-gh/remote-jobs"
            if url in seen:
                continue
            seen.add(url)

            company = ""
            for node in card.find_all(["span", "div", "p"]):
                candidate = _clean_text(node.get_text(" ", strip=True))
                if candidate and candidate != title and len(candidate) < 80:
                    company = candidate
                    break

            jobs.append({
                "title": title,
                "company": company,
                "location": "Remote - Ghana",
                "url": url,
                "source": "arc_ghana",
                "description": text[:500],
                # No structured posting date is available on this listing page.
                "posted_date": None,
                "date_is_estimated": True,
            })
            if len(jobs) >= 20:
                break
        logger.info(f"Arc Ghana: {len(jobs)} jobs")
    except Exception as e:
        logger.error(f"Arc Ghana failed: {e}")
    return jobs



def _build_adzuna_queries() -> list:
    fallback = ["software developer", "data analyst", "marketing manager", "financial analyst", "registered nurse"]
    try:
        from app.db.database import users_collection
        queries = set()
        for user in users_collection.find({"is_active": True}, {"profile.roles": 1, "profile.industry": 1}):
            profile = user.get("profile", {})
            for role in (profile.get("roles") or [])[:3]:
                queries.add(role)
            industry = (profile.get("industry") or "").strip()
            if industry:
                queries.add(industry.replace("_", " "))
        return list(queries)[:10] if queries else fallback
    except Exception:
        return fallback


def _fetch_adzuna():
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        return []

    import time
    queries = _build_adzuna_queries()
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
                posted_date = _parse_date_safe(item.get("created"))
                jobs.append({
                    "title": item.get("title", ""),
                    "company": item.get("company", {}).get("display_name", ""),
                    "location": item.get("location", {}).get("display_name", ""),
                    "url": item.get("redirect_url"),
                    "source": "adzuna",
                    "description": item.get("description", "")[:500],
                    "employment_type": item.get("contract_time") or item.get("contract_type") or None,
                    "posted_date": posted_date,
                    "date_is_estimated": posted_date is None,
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
        _fetch_jobberman_ghana,
        _fetch_glmis_ghana,
        _fetch_corporategh,
        _fetch_arc_ghana,
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

    urls = [j["url"] for j in valid]
    existing_urls = {
        doc["url"]
        for doc in jobs_collection.find({"url": {"$in": urls}}, {"url": 1})
    }

    now = datetime.utcnow()

    # Refresh last_seen_at for jobs still active on job boards
    active_urls = [j["url"] for j in valid if j["url"] in existing_urls]
    if active_urls:
        jobs_collection.update_many(
            {"url": {"$in": active_urls}},
            {"$set": {"last_seen_at": now}},
        )

    new_jobs = [j for j in valid if j["url"] not in existing_urls]
    if new_jobs:
        for job in new_jobs:
            job["created_at"] = now
            job["last_seen_at"] = now
            enrich_job(job)
        try:
            jobs_collection.insert_many(new_jobs, ordered=False)
        except Exception as e:
            logger.error(f"Bulk insert error: {e}")

    # New jobs (or refreshed last_seen_at on existing ones) change what counts as
    # "fresh" for every user - without this, the dashboard/job-feed caches would
    # keep serving pre-scrape results for up to their full TTL (10+ minutes).
    if new_jobs or active_urls:
        cache.clear()

    logger.info(f"save_jobs: {len(new_jobs)} new, {len(active_urls)} refreshed out of {len(valid)} fetched")
    return new_jobs
