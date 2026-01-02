from pathlib import Path
import sys
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError

# Try importing a project-provided engine (common names)
engine = None
try:
    # common location: backend.database
    from backend.database import engine as project_engine  # type: ignore
    engine = project_engine
except Exception:
    try:
        # another common location: backend.db
        from backend.db import engine as project_engine  # type: ignore
        engine = project_engine
    except Exception:
        engine = None

# Import Base from your models
try:
    from backend.models import Base  # type: ignore
    from backend.models.layers import Layer  # Ensure the Layer model is included (NEW)
except Exception as e:
    print("ERROR: failed importing Base from backend.models or Layer model:", e)
    sys.exit(1)

# If we couldn't get an engine from the project, create a fallback SQLite file in backend/storage
if engine is None:
    storage_dir = Path(__file__).resolve().parent / "storage"
    storage_dir.mkdir(parents=True, exist_ok=True)
    db_path = storage_dir / "db.sqlite"
    sqlite_url = f"sqlite:///{db_path.as_posix()}"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    print(f"No project engine found; using fallback SQLite DB at: {db_path}")

# Create all tables
try:
    # This will create all tables defined in your SQLAlchemy models
    Base.metadata.create_all(engine)
    print("Database tables created successfully.")
except SQLAlchemyError as e:
    print("ERROR creating tables:", e)
    sys.exit(1)