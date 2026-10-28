from fastapi import FastAPI

from app.database import Base, engine
from app import models
from app.routes.notifications import router as notifications_router


# Create database tables
Base.metadata.create_all(bind=engine)


# Create FastAPI application
app = FastAPI(
    title="Support Ticket Notification Service",
    description="Handles ticket email notifications and notification logs",
)


# Register routes
app.include_router(notifications_router)


@app.get("/")
def home():
    return {
        "message": "Notification Service is running"
    }

