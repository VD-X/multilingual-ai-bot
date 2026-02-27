from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app import models

# Ensure tables are created (Though Alembic should be used for this)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    description="Backend API for the Multilingual AI Hotel Concierge Bot",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080", 
        "http://127.0.0.1:8080", 
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Concierge API. Systems operational."}

@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}

from app.routers import chat, booking

# Include routers here later
app.include_router(chat.router, prefix="/api/v1")
app.include_router(booking.router, prefix="/api/v1")
