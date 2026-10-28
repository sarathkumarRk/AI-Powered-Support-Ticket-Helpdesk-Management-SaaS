from fastapi import FastAPI

from app.database import Base, engine
from app import models
from app.routes.auth import router as auth_router


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Support Ticket Authentication Service",
    description="Authentication and User Management",
)


app.include_router(auth_router)


@app.get("/")
def home():
    return {
        "message": "Authentication Service is running"
    }