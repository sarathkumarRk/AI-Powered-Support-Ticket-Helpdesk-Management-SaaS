from typing import Any
import logging

import httpx
from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import Response

from app.config import settings
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# MICROSERVICE URLS
AUTH_SERVICE_URL = settings.AUTH_SERVICE_URL.rstrip("/")
TICKET_SERVICE_URL = settings.TICKET_SERVICE_URL.rstrip("/")
ASSIGNMENT_SERVICE_URL = settings.ASSIGNMENT_SERVICE_URL.rstrip("/")
NOTIFICATION_SERVICE_URL = settings.NOTIFICATION_SERVICE_URL.rstrip("/")
ANALYTICS_SERVICE_URL = settings.ANALYTICS_SERVICE_URL.rstrip("/")

REQUEST_TIMEOUT = 20.0


# COMMON PROXY FUNCTION

async def forward_request(
    request: Request,
    service_url: str,
    path: str = "",
    json_body: Any = None,
    use_json_body: bool = False,
) -> Response:

    url = service_url.rstrip("/")

    if path:
        url = f"{url}/{path.lstrip('/')}"

    if request.url.query:
        url = f"{url}?{request.url.query}"

    excluded_request_headers = {
        "host",
        "content-length",
        "connection",
        "transfer-encoding",
    }

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in excluded_request_headers
    }

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
        ) as client:

            if use_json_body:
                response = await client.request(
                    method=request.method,
                    url=url,
                    headers=headers,
                    json=json_body,
                )
            else:
                body = await request.body()

                response = await client.request(
                    method=request.method,
                    url=url,
                    headers=headers,
                    content=body,
                )

        excluded_response_headers = {
            "content-length",
            "content-encoding",
            "transfer-encoding",
            "connection",
        }

        response_headers = {
            key: value
            for key, value in response.headers.items()
            if key.lower() not in excluded_response_headers
        }

        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.headers.get(
                "content-type",
                "application/json",
            ),
        )

    except httpx.TimeoutException:
        logger.exception("Microservice request timed out")

        return Response(
            content='{"detail":"Microservice request timed out"}',
            status_code=504,
            media_type="application/json",
        )

    except httpx.RequestError:
        logger.exception("Microservice is unavailable")

        return Response(
            content='{"detail":"Microservice is unavailable"}',
            status_code=503,
            media_type="application/json",
        )


# HEALTH CHECK
@router.get("/", tags=["Gateway"])
async def health_check():
    return {
        "message": "Support Ticket API Gateway is running",
    }


# AUTHENTICATION - REGISTER
@router.post(
    "/auth/register",
    tags=["Authentication"],
    summary="Register User",
)
async def register_user(
    request: Request,
    payload: dict = Body(
        ...,
        examples=[
            {
                "name": "Test Customer",
                "email": "customer@example.com",
                "password": "Test@123",
                "role": "Customer",
            },
        ],
    ),
):
    return await forward_request(
        request=request,
        service_url=AUTH_SERVICE_URL,
        path="auth/register",
        json_body=payload,
        use_json_body=True,
    )


# AUTHENTICATION - LOGIN
@router.post(
    "/auth/login",
    tags=["Authentication"],
    summary="Login User",
)
async def login_user(
    request: Request,
    payload: dict = Body(
        ...,
        examples=[
            {
                "email": "customer@example.com",
                "password": "Test@123",
            },
        ],
    ),
):
    return await forward_request(
        request=request,
        service_url=AUTH_SERVICE_URL,
        path="auth/login",
        json_body=payload,
        use_json_body=True,
    )


# AUTHENTICATION - OTHER ENDPOINTS
@router.api_route(
    "/auth/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["Authentication"],
    include_in_schema=False,
)
async def auth_proxy(
    request: Request,
    path: str,
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=AUTH_SERVICE_URL,
        path=f"auth/{path}",
    )


# TICKETS - LIST AND CREATE
@router.get(
    "/tickets",
    tags=["Tickets"],
    summary="List Tickets",
)
@router.get(
    "/tickets/",
    tags=["Tickets"],
    include_in_schema=False,
)
async def list_tickets(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=TICKET_SERVICE_URL,
        path="tickets/",
    )


@router.post(
    "/tickets",
    tags=["Tickets"],
    summary="Create Ticket",
)
@router.post(
    "/tickets/",
    tags=["Tickets"],
    include_in_schema=False,
)
async def create_ticket(
    request: Request,
    payload: dict = Body(
        ...,
        examples=[
            {
                "title": "Login Issue",
                "description": "Unable to log in to my account.",
                "category": "Technical",
                "priority": "High",
            },
        ],
    ),
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=TICKET_SERVICE_URL,
        path="tickets/",
        json_body=payload,
        use_json_body=True,
    )


# TICKETS - OTHER ENDPOINTS
@router.api_route(
    "/tickets/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["Tickets"],
    include_in_schema=False,
)
async def tickets_proxy(
    request: Request,
    path: str,
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=TICKET_SERVICE_URL,
        path=f"tickets/{path}",
    )


# ASSIGNMENTS - CREATE ASSIGNMENT
@router.post(
    "/assignments",
    tags=["Assignments"],
    summary="Assign Ticket",
)
@router.post(
    "/assignments/",
    tags=["Assignments"],
    include_in_schema=False,
)
async def create_assignment(
    request: Request,
    payload: dict = Body(
        ...,
        examples=[
            {
                "ticket_id": 1,
            },
        ],
    ),
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=ASSIGNMENT_SERVICE_URL,
        path="assignments/",
        json_body=payload,
        use_json_body=True,
    )


# ASSIGNMENTS - OTHER ENDPOINTS
@router.api_route(
    "/assignments/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["Assignments"],
    include_in_schema=False,
)
async def assignments_proxy(
    request: Request,
    path: str,
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=ASSIGNMENT_SERVICE_URL,
        path=f"assignments/{path}",
    )


# NOTIFICATIONS - LIST
@router.get(
    "/notifications",
    tags=["Notifications"],
    summary="List Notifications",
)
@router.get(
    "/notifications/",
    tags=["Notifications"],
    include_in_schema=False,
)
async def list_notifications(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=NOTIFICATION_SERVICE_URL,
        path="notifications/",
    )


# NOTIFICATIONS - CREATE
@router.post(
    "/notifications",
    tags=["Notifications"],
    summary="Create Notification",
)
@router.post(
    "/notifications/",
    tags=["Notifications"],
    include_in_schema=False,
)
async def create_notification(
    request: Request,
    payload: dict = Body(
        ...,
        examples=[
            {
                "email": "customer@example.com",
                "subject": "Ticket Created",
                "message": "Your support ticket has been created.",
                "ticket_id": 1,
                "event_type": "TICKET_CREATED",
            },
        ],
    ),
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=NOTIFICATION_SERVICE_URL,
        path="notifications/",
        json_body=payload,
        use_json_body=True,
    )


# NOTIFICATIONS - OTHER ENDPOINTS
@router.api_route(
    "/notifications/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["Notifications"],
    include_in_schema=False,
)
async def notifications_proxy(
    request: Request,
    path: str,
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=NOTIFICATION_SERVICE_URL,
        path=f"notifications/{path}",
    )


# ANALYTICS
@router.get(
    "/analytics",
    tags=["Analytics"],
    summary="Get Ticket Analytics",
)
@router.get(
    "/analytics/",
    tags=["Analytics"],
    include_in_schema=False,
)
async def get_analytics(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=ANALYTICS_SERVICE_URL,
        path="analytics/",
    )


# ANALYTICS - OTHER GET ENDPOINTS
@router.get(
    "/analytics/{path:path}",
    tags=["Analytics"],
)
async def analytics_proxy(
    request: Request,
    path: str,
    current_user: dict = Depends(get_current_user),
):
    return await forward_request(
        request=request,
        service_url=ANALYTICS_SERVICE_URL,
        path=f"analytics/{path}",
    )