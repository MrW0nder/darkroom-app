# backend/db.py
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Generator

# Default storage location (will create backend/storage if missing)
BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
DB_PATH = os.environ.get("DARKROOM_DATABASE_URL", STORAGE_DIR / "db.sqlite")

# Ensure storage dir exists
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# SQLAlchemy engine and session
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

# Base class for models
Base = declarative_base()

def get_db() -> Generator:
    """
    FastAPI dependency that yields a DB session and ensures it's closed.
    Usage:
        from fastapi import Depends
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Create DB file and tables (must import models so Base.metadata has tables).
    Call this at startup after importing your models module(s).
    """
    # Import models here to ensure they are registered on Base before create_all
    try:
        # If you create backend.models, import it here to register models
        import backend.models  # noqa: F401
    except Exception:
        # If models don't exist yet, that's fine; caller should re-run init_db after adding models
        pass

    Base.metadata.create_all(bind=engine)