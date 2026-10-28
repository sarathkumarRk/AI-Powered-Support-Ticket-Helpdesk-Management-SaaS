import logging
import smtplib

from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, message: str):
    try:
        email = EmailMessage()
        email["Subject"] = subject
        email["From"] = settings.SMTP_FROM_EMAIL
        email["To"] = to_email
        email.set_content(message)

        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=10,
        ) as server:
            server.starttls()
            server.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD,
            )
            server.send_message(email)

        logger.info("Notification email sent to %s", to_email)
        return True

    except Exception:
        logger.exception("Failed to send notification email")
        return False