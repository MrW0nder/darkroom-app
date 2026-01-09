"""
Presets database model
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from backend.db import Base


class Preset(Base):
    __tablename__ = "presets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=False, default="Custom")  # Portrait, Landscape, B&W, Custom
    description = Column(String(255), nullable=True)
    
    # Adjustment values
    exposure = Column(Float, default=0.0)
    brightness = Column(Float, default=0.0)
    contrast = Column(Float, default=0.0)
    highlights = Column(Float, default=0.0)
    shadows = Column(Float, default=0.0)
    saturation = Column(Float, default=0.0)
    sharpness = Column(Float, default=0.0)
    
    # Optional: store additional custom parameters as JSON
    custom_params = Column(JSON, nullable=True)
    
    # User/ownership (optional for future multi-user support)
    user_id = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())