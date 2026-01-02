"""
Database and storage configuration.

This module now reads configuration from environment variables:
- DARKROOM_STORAGE_PATH or STORAGE_PATH: path to storage directory (default: backend/storage)
- DARKROOM_DATABASE_URL or DATABASE_URL: full DB URL (e.g. sqlite:///path/to/db.sqlite) or a path
  (if a plain path is provided it will be resolved under the storage directory and converted to a sqlite URL).

It will ensure the storage directory (and DB parent) exist.
"""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Generator, Optional

# Default storage location (will create backend/storage if missing)
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_STORAGE_DIR = BASE_DIR / "storage"

# Allow overriding storage path via env vars
_storage_env = os.environ.get("DARKROOM_STORAGE_PATH") or os.environ.get("STORAGE_PATH")
if _storage_env:
    STORAGE_DIR = Path(_storage_env).expanduser()
else:
    STORAGE_DIR = DEFAULT_STORAGE_DIR

# Ensure storage dir exists
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def _build_database_url() -> (str, Optional[Path]):
    """
    Return (DATABASE_URL, db_path_if_sqlite_else_None)
    - If env var contains a full sqlite URL (starts with 'sqlite:'), return it as-is.
    - If env var is a path (not starting with a scheme), treat it as a filesystem path
      (relative paths are resolved under STORAGE_DIR).
    - If no env var provided, default to STORAGE_DIR / 'db.sqlite'
    """
    db_env = os.environ.get("DARKROOM_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if db_env:
        db_env = db_env.strip()
        # If it looks like a full sqlite URL, use it directly
        if db_env.startswith("sqlite:"):
            # Try to infer file path for convenience; otherwise db_path stays None
            if db_env.startswith("sqlite:///"):
                db_path = Path(db_env.replace("sqlite:///", "", 1))
            else:
                db_path = None
            return db_env, db_path
        else:
            # Treat value as a filesystem path (relative -> under STORAGE_DIR)
            candidate = Path(db_env).expanduser()
            if not candidate.is_absolute():
                candidate = STORAGE_DIR / candidate
            candidate.parent.mkdir(parents=True, exist_ok=True)
            return f"sqlite:///{candidate}", candidate
    # Default
    default_path = STORAGE_DIR / "db.sqlite"
    default_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{default_path}", default_path

DATABASE_URL, DB_PATH = _build_database_url()

# SQLAlchemy engine and session
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