from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.proxy import router as proxy_router

app = FastAPI(
    title="Support Ticket API Gateway",
    description="API Gateway for Support Ticket Management microservices.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proxy_router)