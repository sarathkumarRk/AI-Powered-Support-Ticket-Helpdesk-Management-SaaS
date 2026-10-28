from datetime import datetime
from pydantic import BaseModel


class AssignmentCreate(BaseModel):
    ticket_id: int


class AssignmentResponse(BaseModel):
    id: int
    ticket_id: int
    agent_id: int
    is_active: bool
    assigned_at: datetime

    class Config:
        from_attributes = True


class AssignmentHistoryResponse(BaseModel):
    id: int
    ticket_id: int
    agent_id: int
    action: str
    assigned_at: datetime

    class Config:
        from_attributes = True