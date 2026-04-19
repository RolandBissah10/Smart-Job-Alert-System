import smtplib
from email.mime.text import MIMEText
from app.config import EMAIL_USER, EMAIL_PASS, EMAIL_FROM


def send_email(recipient: str, jobs):
    if not EMAIL_USER or not EMAIL_PASS:
        raise ValueError("EMAIL_USER and EMAIL_PASS must be set in environment variables")

    body_lines = []
    for job in jobs:
        line = f"{job.get('title')} at {job.get('company')} - {job.get('url')}"
        body_lines.append(line)

    body = "\n".join(body_lines) or "No jobs matched your preferences."
    msg = MIMEText(body)
    msg["Subject"] = "Smart Job Alert"
    msg["From"] = EMAIL_FROM or EMAIL_USER
    msg["To"] = recipient

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)
