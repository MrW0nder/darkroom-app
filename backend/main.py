import os
import logging
from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.db import get_db, DATABASE_URL, STORAGE_DIR  # Updated imports
from backend.database import Base  # Direct import of Base from database.py
from backend.models.layers import Layer  # Direct import of Layer model
from backend.api.imports import router as imports_router

APP_TITLE = "Darkroom Backend"
FRONTEND_ORIGIN = os.getenv("DARKROOM_FRONTEND_ORIGIN", "http://localhost:5173")

# Logging configuration
LOG_LEVEL = os.getenv("DARKROOM_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("darkroom")

# FastAPI app
app = FastAPI(title=APP_TITLE)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def init_db():
    try:
        Base.metadata.create_all(bind=get_db().bind)  # Ensure tables exist
        logger.info("Database tables initialized successfully!")
    except Exception as e:
        logger.exception("Error during database initialization: %s", e)


@app.get("/health", tags=["health"])
def health_check():
    return JSONResponse({"status": "ok"})


# Include routers
app.include_router(imports_router)