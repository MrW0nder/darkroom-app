from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.db import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    cover_image = Column(String, nullable=True)
    cover_original_width = Column(Integer, nullable=True)
    cover_original_height = Column(Integer, nullable=True)
    cover_crop_x = Column(Integer, nullable=True)
    cover_crop_y = Column(Integer, nullable=True)
    cover_crop_width = Column(Integer, nullable=True)
    cover_crop_height = Column(Integer, nullable=True)
    due_date = Column(DateTime, nullable=True)
    is_pinned = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship with layers
    layers = relationship(
        "Layer", back_populates="project", cascade="all, delete-orphan"
    )