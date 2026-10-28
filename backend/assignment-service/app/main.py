from fastapi import FastAPI

from app.database import Base, engine
from app import models
from app.routes.assignments import router as assignments_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Support Ticket Assignment Service",
    description="Ticket assignment and workflow management",

)

app.include_router(assignments_router)


@app.get("/")
def home():
    return {"message": "Assignment Service is running"}