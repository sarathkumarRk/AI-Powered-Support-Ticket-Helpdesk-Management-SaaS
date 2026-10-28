from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean

from app.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)

    ticket_id = Column(Integer, nullable=False, index=True)

    email = Column(String(255), nullable=False)

    event_type = Column(String(50), nullable=False)

    subject = Column(String(255), nullable=False)

    message = Column(Text, nullable=False)

    is_sent = Column(Boolean, default=False, nullable=False)

    error_message = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )