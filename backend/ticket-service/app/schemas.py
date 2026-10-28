from datetime import datetime
from pydantic import BaseModel


class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "Medium"


class TicketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    priority: str | None = None
    status: str | None = None


class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    creator_id: int
    assigned_agent_id: int | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    comment: str


class CommentResponse(BaseModel):
    id: int
    ticket_id: int
    user_id: int
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field


class TicketAssign(BaseModel):
    agent_id: int 
