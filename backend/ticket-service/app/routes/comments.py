from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ticket, TicketComment
from app.schemas import CommentCreate, CommentResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/tickets", tags=["Comments"])


@router.post("/{ticket_id}/comments", response_model=CommentResponse)
def add_comment(
    ticket_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user["role"] == "Customer":
        if ticket.creator_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

    elif current_user["role"] == "Agent":
        if ticket.assigned_agent_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

    comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user["id"],
        comment=data.comment,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment