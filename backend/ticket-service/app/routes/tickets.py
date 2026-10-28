from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ticket
from app.schemas import TicketCreate, TicketUpdate, TicketResponse,  TicketAssign
from app.dependencies import get_current_user

router = APIRouter(prefix="/tickets", tags=["Tickets"])


# Create Ticket
@router.post("/", response_model=TicketResponse)
def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "Customer":
        raise HTTPException(
            status_code=403,
            detail="Only customers can create tickets",
        )

    ticket = Ticket(
        title=data.title,
        description=data.description,
        category=data.category,
        priority=data.priority,
        status="Open",
        creator_id=current_user["id"],
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return ticket


# View Tickets
@router.get("/", response_model=list[TicketResponse])
def get_tickets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(Ticket)

    if current_user["role"] == "Customer":
        query = query.filter(
            Ticket.creator_id == current_user["id"]
        )

    elif current_user["role"] == "Agent":
        query = query.filter(
            Ticket.assigned_agent_id == current_user["id"]
        )

    return query.order_by(Ticket.created_at.desc()).all()


# View Single Ticket
@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
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

    return ticket


# Update Ticket
@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
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

        if data.status is not None:
            raise HTTPException(
                status_code=403,
                detail="Customers cannot update ticket status",
            )

    elif current_user["role"] == "Agent":
        if ticket.assigned_agent_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

    elif current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Access denied")

    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(ticket, field, value)

    if ticket.status == "Resolved" and ticket.resolved_at is None:
        ticket.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ticket)

    return ticket

# Assign Ticket to Agent
@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(
    ticket_id: int,
    data: TicketAssign,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Only Admin can assign tickets
    if current_user["role"] != "Admin":
        raise HTTPException(
            status_code=403,
            detail="Only Admin can assign tickets",
        )

    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id)
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    ticket.assigned_agent_id = data.agent_id

    db.commit()
    db.refresh(ticket)

    return ticket