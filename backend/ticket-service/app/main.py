from fastapi import FastAPI

from app.database import Base, engine
from app import models
from app.routes.tickets import router as tickets_router
from app.routes.comments import router as comments_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Support Ticket Management Service",
    description="Ticket creation, management and comments",
    version="1.0.0",
)

app.include_router(tickets_router)
app.include_router(comments_router)


@app.get("/")
def home():
    return {"message": "Ticket Management Service is running"}