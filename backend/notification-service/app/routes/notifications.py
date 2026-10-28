import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NotificationLog
from app.schemas import NotificationRequest
from app.dependencies import get_current_user
from app.email_service import send_email


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

logger = logging.getLogger(__name__)

ALLOWED_EVENTS = [
    "TICKET_CREATED",
    "TICKET_ASSIGNED",
    "STATUS_CHANGED",
    "TICKET_RESOLVED",
]


@router.post("/")
def create_notification(
    data: NotificationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Validate event type
    if data.event_type not in ALLOWED_EVENTS:
        raise HTTPException(
            status_code=400,
            detail="Invalid notification event type"
        )

    # Prevent duplicate successful notifications
    existing_notification = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.ticket_id == data.ticket_id,
            NotificationLog.email == str(data.email),
            NotificationLog.event_type == data.event_type,
            NotificationLog.is_sent == True,
        )
        .first()
    )

    if existing_notification:
        return {
            "message": "Notification already sent",
            "notification_id": existing_notification.id,
            "is_sent": True,
        }

    # Create notification log
    notification = NotificationLog(
        ticket_id=data.ticket_id,
        email=str(data.email),
        event_type=data.event_type,
        subject=data.subject,
        message=data.message,
        is_sent=False,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Send email
    try:
        email_sent = send_email(
            to_email=str(data.email),
            subject=data.subject,
            message=data.message,
        )

        if email_sent:
            notification.is_sent = True
            notification.error_message = None

            db.commit()
            db.refresh(notification)

            logger.info(
                "Notification sent: ticket_id=%s event=%s",
                data.ticket_id,
                data.event_type,
            )

            return {
                "message": "Notification sent successfully",
                "notification_id": notification.id,
                "ticket_id": data.ticket_id,
                "event_type": data.event_type,
                "is_sent": True,
            }

        # Email failed; retain the log and error status
        notification.is_sent = False
        notification.error_message = "Email delivery failed"

        db.commit()

        logger.error(
            "Notification email failed: ticket_id=%s event=%s",
            data.ticket_id,
            data.event_type,
        )

        return {
            "message": "Email delivery failed; notification logged",
            "notification_id": notification.id,
            "ticket_id": data.ticket_id,
            "event_type": data.event_type,
            "is_sent": False,
        }

    except Exception:
        db.rollback()

        logger.exception(
            "Notification processing failed: ticket_id=%s",
            data.ticket_id,
        )

        # Do not raise an HTTP error for email delivery failure
        return {
            "message": "Notification processing failed",
            "ticket_id": data.ticket_id,
            "event_type": data.event_type,
            "is_sent": False,
        }


@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Only Admin can view all notification logs
    if current_user["role"] != "Admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    notifications = (
        db.query(NotificationLog)
        .order_by(NotificationLog.created_at.desc())
        .all()
    )

    return notifications


@router.get("/{notification_id}")
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Only Admin can view an individual notification log
    if current_user["role"] != "Admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    notification = (
        db.query(NotificationLog)
        .filter(NotificationLog.id == notification_id)
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification