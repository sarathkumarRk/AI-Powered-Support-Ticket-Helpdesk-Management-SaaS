from datetime import datetime, timedelta, timezone
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.dependencies import admin_required


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


# =====================================================
# GET TICKET ANALYTICS — ADMIN ONLY
# =====================================================
@router.get("/")
def get_analytics(
    current_user: dict = Depends(admin_required),
):
    # Fetch tickets from Ticket Service
    try:
        response = httpx.get(
            f"{settings.TICKET_SERVICE_URL.rstrip('/')}/tickets/",
            timeout=10.0,
        )

        response.raise_for_status()
        tickets = response.json()

    except httpx.TimeoutException as exc:
        logger.exception("Ticket Service request timed out")

        raise HTTPException(
            status_code=504,
            detail="Ticket Service request timed out",
        ) from exc

    except httpx.HTTPStatusError as exc:
        logger.error(
            "Ticket Service returned HTTP %s",
            exc.response.status_code,
        )

        raise HTTPException(
            status_code=502,
            detail="Ticket Service returned an error",
        ) from exc

    except httpx.RequestError as exc:
        logger.exception("Unable to connect to Ticket Service")

        raise HTTPException(
            status_code=503,
            detail="Ticket Service is unavailable",
        ) from exc

    except ValueError as exc:
        logger.exception("Ticket Service returned invalid JSON")

        raise HTTPException(
            status_code=502,
            detail="Ticket Service returned invalid JSON",
        ) from exc

    # Validate ticket response
    if not isinstance(tickets, list):
        raise HTTPException(
            status_code=502,
            detail="Invalid ticket data: expected a list",
        )

    # Initialize counters
    total_tickets = len(tickets)
    open_tickets = 0
    resolved_tickets = 0
    overdue_tickets = 0

    tickets_by_status = {}
    tickets_by_priority = {}
    agent_workload = {}
    resolution_times = []

    now = datetime.now(timezone.utc)

    # Process tickets
    for ticket in tickets:

        if not isinstance(ticket, dict):
            continue

        status = str(ticket.get("status") or "Unknown")
        priority = str(ticket.get("priority") or "Unknown")
        agent_id = ticket.get("assigned_agent_id")

        # Count tickets by status
        tickets_by_status[status] = (
            tickets_by_status.get(status, 0) + 1
        )

        # Count tickets by priority
        tickets_by_priority[priority] = (
            tickets_by_priority.get(priority, 0) + 1
        )

        # Count open tickets
        if status == "Open":
            open_tickets += 1

        # Count resolved and closed tickets
        if status in ["Resolved", "Closed"]:
            resolved_tickets += 1

        # Check overdue tickets older than 24 hours
        created_at = ticket.get("created_at")

        if created_at and status not in ["Resolved", "Closed"]:
            try:
                if isinstance(created_at, datetime):
                    created_time = created_at
                else:
                    created_time = datetime.fromisoformat(
                        str(created_at).replace("Z", "+00:00")
                    )

                if created_time.tzinfo is None:
                    created_time = created_time.replace(
                        tzinfo=timezone.utc
                    )

                if now - created_time > timedelta(hours=24):
                    overdue_tickets += 1

            except (ValueError, TypeError):
                logger.warning(
                    "Invalid created_at value for ticket: %s",
                    ticket.get("id"),
                )

        # Calculate agent workload
        if (
            agent_id is not None
            and status in ["Open", "In Progress"]
        ):
            agent_key = str(agent_id)

            agent_workload[agent_key] = (
                agent_workload.get(agent_key, 0) + 1
            )

        # Calculate resolution time
        if status in ["Resolved", "Closed"]:
            created_at = ticket.get("created_at")
            resolved_at = ticket.get("resolved_at")

            if created_at and resolved_at:
                try:
                    if isinstance(created_at, datetime):
                        created_time = created_at
                    else:
                        created_time = datetime.fromisoformat(
                            str(created_at).replace("Z", "+00:00")
                        )

                    if isinstance(resolved_at, datetime):
                        resolved_time = resolved_at
                    else:
                        resolved_time = datetime.fromisoformat(
                            str(resolved_at).replace("Z", "+00:00")
                        )

                    # Normalize timezone
                    if created_time.tzinfo is None:
                        created_time = created_time.replace(
                            tzinfo=timezone.utc
                        )

                    if resolved_time.tzinfo is None:
                        resolved_time = resolved_time.replace(
                            tzinfo=timezone.utc
                        )

                    # Calculate duration in hours
                    if resolved_time >= created_time:
                        hours = (
                            resolved_time - created_time
                        ).total_seconds() / 3600

                        resolution_times.append(hours)

                except (ValueError, TypeError):
                    logger.warning(
                        "Invalid resolution datetime for ticket: %s",
                        ticket.get("id"),
                    )

    # Calculate average resolution time
    average_resolution_time = None

    if resolution_times:
        average_resolution_time = round(
            sum(resolution_times) / len(resolution_times),
            2,
        )

    # Return analytics response
    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved_tickets,
        "overdue_tickets": overdue_tickets,
        "tickets_by_status": tickets_by_status,
        "tickets_by_priority": tickets_by_priority,
        "agent_workload": agent_workload,
        "average_resolution_time_hours": average_resolution_time,
    }