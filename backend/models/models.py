from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from backend.database import Base  # Use Base imported from backend/database.py

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    format = Column(String(50), nullable=True)
    metadata_json = Column("metadata", Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Image id={self.id} filename={self.filename}>"