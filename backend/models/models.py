from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from backend.db import Base  # Import Base from db.py

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    width = Column(Integer)
    height = Column(Integer)
    format = Column(String(50))

    # Avoid using the attribute name `metadata` (it's reserved by SQLAlchemy's declarative Base).
    # Store the DB column as "metadata" but expose it on the model as `metadata_json`.
    metadata_json = Column("metadata", Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Image id={self.id} filename={self.filename}>"