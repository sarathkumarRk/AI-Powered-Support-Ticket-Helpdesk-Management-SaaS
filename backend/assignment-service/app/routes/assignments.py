import logging

import httpx

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import TicketAssignment, AssignmentHistory
from app.schemas import AssignmentCreate, AssignmentResponse
from app.dependencies import get_current_user, admin_required


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"],
)

HTTP_TIMEOUT = 10.0

ACTIVE_TICKET_STATUSES = {
    "open",
    "in progress",
}

CLOSED_TICKET_STATUSES = {
    "resolved",
    "closed",
}


# HELPERS
def normalize_status(value):
    return str(value or "").strip().lower()


def get_ticket_service_url(path: str) -> str:
    return f"{settings.TICKET_SERVICE_URL.rstrip('/')}{path}"


def get_auth_service_url(path: str) -> str:
    return f"{settings.AUTH_SERVICE_URL.rstrip('/')}{path}"


def get_auth_headers(authorization: str) -> dict:
    """Forward the logged-in user's JWT to internal services."""

    if (
        not authorization
        or not authorization.lower().startswith("bearer ")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization token",
        )

    return {
        "Authorization": authorization,
    }


def handle_service_error(
    response: httpx.Response,
    service_name: str,
):
    """Handle errors returned by internal services."""

    if response.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"{service_name} rejected the authentication token",
        )

    if response.status_code == 403:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{service_name} denied access",
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource not found in {service_name}",
        )

    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"{service_name} returned a server error",
        )

    response.raise_for_status()



# FETCH SINGLE TICKET
# GET /tickets/{ticket_id}
def fetch_ticket(
    ticket_id: int,
    authorization: str,
) -> dict:

    headers = get_auth_headers(authorization)

    try:
        response = httpx.get(
            get_ticket_service_url(f"/tickets/{ticket_id}"),
            headers=headers,
            timeout=HTTP_TIMEOUT,
        )

        handle_service_error(response, "Ticket Service")

        ticket = response.json()

        if not isinstance(ticket, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid ticket data received from Ticket Service",
            )

        return ticket

    except HTTPException:
        raise

    except httpx.RequestError as exc:
        logger.exception(
            "Cannot connect to Ticket Service for ticket %s",
            ticket_id,
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ticket Service is unavailable",
        ) from exc

    except ValueError as exc:
        logger.exception("Invalid JSON response from Ticket Service")

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from Ticket Service",
        ) from exc


# FETCH AGENTS
# GET /auth/users/agents
def fetch_agents(authorization: str) -> list:

    headers = get_auth_headers(authorization)

    try:
        # IMPORTANT:
        # Auth router prefix is /auth.
        # Therefore the complete endpoint is /auth/users/agents.
        response = httpx.get(
            get_auth_service_url("/auth/users/agents"),
            headers=headers,
            timeout=HTTP_TIMEOUT,
        )

        handle_service_error(response, "Auth Service")

        agents = response.json()

        if not isinstance(agents, list):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid agent list received from Auth Service",
            )

        return agents

    except HTTPException:
        raise

    except httpx.RequestError as exc:
        logger.exception("Cannot retrieve agents from Auth Service")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve agents from Auth Service",
        ) from exc

    except ValueError as exc:
        logger.exception("Invalid JSON response from Auth Service")

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid agent response from Auth Service",
        ) from exc



# FETCH ALL TICKETS
# Used for agent workload calculation

def fetch_tickets(authorization: str) -> list:

    headers = get_auth_headers(authorization)

    try:
        response = httpx.get(
            get_ticket_service_url("/tickets/"),
            headers=headers,
            timeout=HTTP_TIMEOUT,
        )

        handle_service_error(response, "Ticket Service")

        tickets = response.json()

        if not isinstance(tickets, list):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid ticket list received from Ticket Service",
            )

        return tickets

    except HTTPException:
        raise

    except httpx.RequestError as exc:
        logger.exception("Cannot retrieve tickets for workload calculation")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve ticket workload",
        ) from exc

    except ValueError as exc:
        logger.exception("Invalid ticket list JSON response")

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid ticket list response",
        ) from exc



# UPDATE TICKET ASSIGNMENT IN TICKET SERVICE
# PATCH /tickets/{ticket_id}/assign

def update_ticket_assignment(
    ticket_id: int,
    agent_id: int,
    authorization: str,
) -> None:

    headers = get_auth_headers(authorization)

    try:
        response = httpx.patch(
            get_ticket_service_url(
                f"/tickets/{ticket_id}/assign"
            ),
            headers=headers,
            json={
                "agent_id": agent_id,
            },
            timeout=HTTP_TIMEOUT,
        )

        handle_service_error(response, "Ticket Service")

    except HTTPException:
        raise

    except httpx.RequestError as exc:
        logger.exception(
            "Failed to assign ticket %s to agent %s",
            ticket_id,
            agent_id,
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not update ticket assignment in Ticket Service",
        ) from exc



# CREATE ASSIGNMENT
# POST /assignments/
# Admin only
@router.post(
    "/",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign_ticket(
    data: AssignmentCreate,
    authorization: str = Header(
        default=None,
        alias="Authorization",
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_required),
):
    ticket_id = data.ticket_id

    # 1. Check whether the ticket is already assigned.
    existing = (
        db.query(TicketAssignment)
        .filter(
            TicketAssignment.ticket_id == ticket_id,
            TicketAssignment.is_active.is_(True),
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is already assigned",
        )

    # 2. Fetch ticket details from Ticket Service.
    ticket = fetch_ticket(
        ticket_id=ticket_id,
        authorization=authorization,
    )

    # 3. Validate ticket status.
    ticket_status = normalize_status(ticket.get("status"))

    if ticket_status in CLOSED_TICKET_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign a resolved or closed ticket",
        )

    # 4. Ensure ticket does not already have an assigned agent.
    if ticket.get("assigned_agent_id") is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket already has an assigned agent",
        )

    # 5. Fetch agents from Auth Service.
    agents = fetch_agents(
        authorization=authorization,
    )

    # 6. Filter active agents.
    active_agents = [
        agent
        for agent in agents
        if isinstance(agent, dict)
        and agent.get("id") is not None
        and agent.get("is_active") is True
        and normalize_status(agent.get("role")) == "agent"
    ]

    if not active_agents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active agents available",
        )

    # 7. Fetch tickets to calculate workload.
    tickets = fetch_tickets(
        authorization=authorization,
    )

    # 8. Calculate each agent's active ticket count.
    agent_workload = []

    for agent in active_agents:
        agent_id = agent["id"]

        active_count = sum(
            1
            for item in tickets
            if isinstance(item, dict)
            and item.get("assigned_agent_id") is not None
            and str(item.get("assigned_agent_id")) == str(agent_id)
            and normalize_status(item.get("status"))
            in ACTIVE_TICKET_STATUSES
        )

        agent_workload.append(
            (active_count, agent)
        )

    # 9. Select the agent with the lowest workload.
    # Agent ID is the deterministic tie-breaker.
    agent_workload.sort(
        key=lambda item: (
            item[0],
            str(item[1]["id"]),
        )
    )

    selected_agent = agent_workload[0][1]
    agent_id = selected_agent["id"]

    # 10. Update Ticket Service.
    update_ticket_assignment(
        ticket_id=ticket_id,
        agent_id=agent_id,
        authorization=authorization,
    )

    # 11. Save assignment and history in Assignment Service DB.
    assignment = TicketAssignment(
        ticket_id=ticket_id,
        agent_id=agent_id,
        is_active=True,
    )

    history = AssignmentHistory(
        ticket_id=ticket_id,
        agent_id=agent_id,
        action="Assigned",
    )

    try:
        db.add(assignment)
        db.add(history)

        db.commit()
        db.refresh(assignment)

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to save assignment for ticket %s",
            ticket_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Assignment database save failed. "
                "Check the ticket assignment state before retrying."
            ),
        ) from exc

    logger.info(
        "Ticket %s assigned to agent %s by user %s",
        ticket_id,
        agent_id,
        current_user.get("id", "unknown"),
    )

    return assignment


# GET /assignments/
# Admin only
@router.get(
    "/",
    response_model=list[AssignmentResponse],
)
def get_assignments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_required),
):
    return (
        db.query(TicketAssignment)
        .order_by(TicketAssignment.id.desc())
        .all()
    )



# GET A PARTICULAR ASSIGNMENT
# GET /assignments/{ticket_id}
# Admin and assigned agent only
@router.get(
    "/{ticket_id}",
    response_model=AssignmentResponse,
)
def get_assignment(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    assignment = (
        db.query(TicketAssignment)
        .filter(
            TicketAssignment.ticket_id == ticket_id,
            TicketAssignment.is_active.is_(True),
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    role = normalize_status(current_user.get("role"))
    current_user_id = current_user.get("id")

    if role == "agent":
        if str(assignment.agent_id) != str(current_user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    elif role == "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    elif role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return assignment


# GET ASSIGNMENT HISTORY
# GET /assignments/{ticket_id}/history
# Admin only
@router.get(
    "/{ticket_id}/history",
)
def get_assignment_history(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_required),
):
    history = (
        db.query(AssignmentHistory)
        .filter(
            AssignmentHistory.ticket_id == ticket_id
        )
        .order_by(
            AssignmentHistory.assigned_at.desc()
        )
        .all()
    )

    return history