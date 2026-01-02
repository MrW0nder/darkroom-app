import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path

# Base class for models
Base = declarative_base()

# Get database URL from environment variables or use a default SQLite file
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "storage" / "db.sqlite"

DATABASE_URL = os.getenv("DARKROOM_DATABASE_URL") or f"sqlite:///{DEFAULT_DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, future=True)

# Database session manager
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    """Dependency for FastAPI: Yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()