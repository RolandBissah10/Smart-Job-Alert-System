import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes import users, auth, jobs, saved_jobs, dashboard
from app.tasks.scheduler import scheduler, run_job_pipeline
from app.services.notifier import send_email
from app.services.matcher import _get_keywords_from_profile, match_score
from app.db.database import users_collection, jobs_collection, alerts_collection
from app.config import EMAIL_USER, EMAIL_PASS, FRONTEND_URL

app = FastAPI(title="Smart Job Alert System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:4173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(saved_jobs.router)
app.include_router(dashboard.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


@app.on_event("startup")
def startup_event():
    if not scheduler.running:
        scheduler.start()


@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()


@app.get("/")
def root():
    return {"message": "Smart Job Alert System is running"}


@app.post("/api/trigger-pipeline")
def trigger_pipeline():
    try:
        run_job_pipeline()
        return {"ok": True, "message": "Pipeline ran — check server terminal for logs"}
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "ok": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        })


@app.post("/api/test-email")
def test_email(body: dict):
    """Send a test email. Body: {"email": "you@example.com"}"""
    recipient = body.get("email")
    if not recipient:
        return JSONResponse(status_code=400, content={"error": "email field required"})
    if not EMAIL_USER or not EMAIL_PASS:
        return JSONResponse(status_code=500, content={
            "error": "EMAIL_USER or EMAIL_PASS not set in .env",
            "EMAIL_USER_set": bool(EMAIL_USER),
            "EMAIL_PASS_set": bool(EMAIL_PASS),
        })
    try:
        send_email(recipient, [{
            "title": "Senior Python Developer",
            "company": "Smart Job Alert",
            "location": "Remote",
            "url": "http://example.com",
            "source": "test",
        }])
        return {"ok": True, "message": f"Test email sent to {recipient}"}
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "ok": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        })


@app.get("/api/debug-pipeline")
def debug_pipeline(email: str):
    """Show what the pipeline would do for a user without sending emails."""
    user = users_collection.find_one({"email": email}, {"password": 0})
    if not user:
        return JSONResponse(status_code=404, content={"error": "User not found"})

    profile = user.get("profile", {})
    keywords = _get_keywords_from_profile(profile)
    is_active = user.get("is_active", False)

    sent_ids = [
        a["job_id"]
        for a in alerts_collection.find({"user_id": user["_id"]}, {"job_id": 1})
    ]

    unalerted = list(jobs_collection.find({"_id": {"$nin": sent_ids}}).limit(200))
    matches = []
    for job in unalerted:
        score = match_score(job, keywords)
        if score > 0:
            matches.append({
                "title": job.get("title"),
                "company": job.get("company"),
                "source": job.get("source"),
                "score": score,
            })
    matches.sort(key=lambda x: x["score"], reverse=True)

    return {
        "user_email": email,
        "is_active": is_active,
        "profile_keywords": keywords,
        "total_jobs_in_db": jobs_collection.count_documents({}),
        "already_alerted_count": len(sent_ids),
        "unalerted_jobs_checked": len(unalerted),
        "new_matching_jobs": len(matches),
        "top_matches": matches[:10],
        "email_config": {
            "EMAIL_USER_set": bool(EMAIL_USER),
            "EMAIL_PASS_set": bool(EMAIL_PASS),
        },
    }
