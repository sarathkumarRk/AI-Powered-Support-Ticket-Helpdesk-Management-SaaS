from fastapi import FastAPI

from app.routes.analytics import router as analytics_router


app = FastAPI(
    title="Support Ticket Analytics Service",
    description="Ticket analytics and reporting",
)


app.include_router(analytics_router)


@app.get("/")
def home():
    return {
        "message": "Analytics Service is running"
    }

