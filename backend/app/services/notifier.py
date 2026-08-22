import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import EMAIL_USER, EMAIL_PASS, EMAIL_FROM, FRONTEND_URL


def _require_email_configured():
    if not EMAIL_USER or not EMAIL_PASS:
        raise ValueError("EMAIL_USER and EMAIL_PASS must be set in environment variables")


def _send_mime_message(msg: MIMEMultipart):
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)


def _build_html(jobs, alert_name=None):
    count = len(jobs)
    plural = "s" if count != 1 else ""
    match_line = f'matching your "{alert_name}" alert' if alert_name else "matching your profile"

    job_rows = ""
    for job in jobs:
        title = job.get("title", "Untitled")
        company = job.get("company", "Unknown Company")
        location = job.get("location", "Remote")
        url = job.get("url", "#")
        source = job.get("source", "").capitalize()
        source_badge = f'<span style="font-size:11px;color:#94a3b8;"> &middot; {source}</span>' if source else ""

        job_rows += f"""
        <tr>
          <td style="padding:0 0 14px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;border:1px solid #e2e8f0;
                          border-radius:12px;border-collapse:separate;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:top;">
                        <p style="margin:0 0 5px;font-size:16px;font-weight:700;
                                  color:#1e293b;line-height:1.3;">{title}</p>
                        <p style="margin:0 0 4px;font-size:13px;color:#475569;">
                          &#127970; {company}
                        </p>
                        <p style="margin:0;font-size:12px;color:#94a3b8;">
                          &#128205; {location}{source_badge}
                        </p>
                      </td>
                      <td style="vertical-align:middle;text-align:right;
                                 padding-left:16px;white-space:nowrap;">
                        <a href="{url}"
                           style="display:inline-block;padding:10px 18px;
                                  background-color:#1e40af;color:#ffffff;
                                  text-decoration:none;border-radius:8px;
                                  font-size:13px;font-weight:600;">
                          View Job &#8594;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Smart Job Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;
             font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0"
         style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td align="center"
                style="background-color:#1e40af;border-radius:16px 16px 0 0;
                       padding:36px 32px;">
              <p style="margin:0;font-size:28px;">&#128276;</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;
                         font-weight:800;letter-spacing:-0.5px;">
                Smart Job Alert
              </h1>
              <p style="margin:10px 0 0;color:#bfdbfe;font-size:14px;">
                We found
                <strong style="color:#ffffff;">{count} new job{plural}</strong>
                {match_line}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#f8fafc;padding:28px 32px;">
              <p style="margin:0 0 20px;font-size:14px;color:#475569;">
                Here are the latest opportunities tailored just for you:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                {job_rows}
              </table>

              <p style="margin:20px 0 16px;font-size:13px;color:#94a3b8;
                        text-align:center;">
                Log in to save jobs, track applications, and update your preferences.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{FRONTEND_URL}/dashboard"
                       style="display:inline-block;padding:12px 28px;
                              background-color:#f1f5f9;color:#1e40af;
                              text-decoration:none;border-radius:8px;
                              font-size:13px;font-weight:600;
                              border:2px solid #bfdbfe;">
                      Open Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
                style="background-color:#e2e8f0;border-radius:0 0 16px 16px;
                       padding:20px 32px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                You&#39;re receiving this because you signed up for Smart Job Alert.<br/>
                To stop alerts, disable notifications in your
                <a href="{FRONTEND_URL}/dashboard"
                   style="color:#1e40af;text-decoration:none;font-weight:600;">
                  dashboard settings
                </a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""


def _build_plain(jobs, alert_name=None):
    header = f'Smart Job Alert — "{alert_name}"\n' if alert_name else "Smart Job Alert — New Matches\n"
    lines = [header, "=" * 40]
    for job in jobs:
        lines.append(f"\n{job.get('title')} at {job.get('company')}")
        lines.append(f"Location : {job.get('location', 'Remote')}")
        lines.append(f"Apply at : {job.get('url')}")
    lines.append("\n" + "=" * 40)
    lines.append("Open your dashboard: {FRONTEND_URL}/dashboard")
    return "\n".join(lines)


def send_email(recipient: str, jobs, alert_name=None):
    _require_email_configured()

    count = len(jobs)
    plural = "s" if count != 1 else ""
    subject_suffix = f"— {alert_name}" if alert_name else "— Smart Job Alert"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"\U0001f514 {count} New Job Alert{plural} {subject_suffix}"
    msg["From"] = EMAIL_FROM or EMAIL_USER
    msg["To"] = recipient

    msg.attach(MIMEText(_build_plain(jobs, alert_name), "plain", "utf-8"))
    msg.attach(MIMEText(_build_html(jobs, alert_name), "html", "utf-8"))

    _send_mime_message(msg)


def _build_reset_plain(reset_link):
    return (
        "Reset your Smart Job Alert password\n"
        "=====================================\n\n"
        f"We received a request to reset your password. Open this link to choose a new one:\n\n"
        f"{reset_link}\n\n"
        "This link expires in 30 minutes. If you didn't request this, you can safely ignore this email."
    )


def _build_reset_html(reset_link):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;
             font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center"
                style="background-color:#1e40af;border-radius:16px 16px 0 0;padding:36px 32px;">
              <p style="margin:0;font-size:28px;">&#128274;</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;
                         font-weight:800;letter-spacing:-0.5px;">
                Reset your password
              </h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:28px 32px;">
              <p style="margin:0 0 20px;font-size:14px;color:#475569;">
                We received a request to reset your Smart Job Alert password. Click below to choose a new one:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{reset_link}"
                       style="display:inline-block;padding:12px 28px;
                              background-color:#1e40af;color:#ffffff;
                              text-decoration:none;border-radius:8px;
                              font-size:14px;font-weight:600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
                This link expires in 30 minutes. If you didn't request this, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_password_reset_email(recipient: str, reset_link: str):
    _require_email_configured()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your Smart Job Alert password"
    msg["From"] = EMAIL_FROM or EMAIL_USER
    msg["To"] = recipient

    msg.attach(MIMEText(_build_reset_plain(reset_link), "plain", "utf-8"))
    msg.attach(MIMEText(_build_reset_html(reset_link), "html", "utf-8"))

    _send_mime_message(msg)
