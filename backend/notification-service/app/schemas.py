from pydantic import BaseModel, EmailStr


class NotificationRequest(BaseModel):
    email: EmailStr
    subject: str
    message: str
    ticket_id: int
    event_type: str