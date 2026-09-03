import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes import users, auth, jobs, saved_jobs, dashboard, alerts, notifications
from app.config import ALLOWED_ORIGINS
from app.performance import get_performance_report

app = FastAPI(title="Smart Job Alert System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(saved_jobs.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(notifications.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


@app.get("/")
def root():
    return {"message": "Smart Job Alert System is running"}


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}


@app.get("/performance")
def performance_stats():
    """Get performance statistics (for monitoring)"""
    return get_performance_report()

