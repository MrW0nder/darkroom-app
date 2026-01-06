from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.db import Base  # Import Base from the new database.py setup
from backend.models.projects import Project  # Make sure Project is imported here

class Layer(Base):
    __tablename__ = "layers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )  # ForeignKey with cascade delete
    type = Column(String, nullable=False)  # e.g., "image", "text", "shape"
    content = Column(Text, nullable=True)  # File path for images or content for text
    z_index = Column(Integer, default=0)  # Layer order in the stack
    locked = Column(Boolean, default=False)
    opacity = Column(Integer, default=100)  # 0-100 (fully transparent to opaque)
    visible = Column(Boolean, default=True)  # True = Visible, False = Hidden
    x = Column(Float, default=0.0)  # X position of the layer
    y = Column(Float, default=0.0)  # Y position of the layer
    width = Column(Float, nullable=True)  # Width of the layer
    height = Column(Float, nullable=True)  # Height of the layer
    blend_mode = Column(
        String, default="normal"
    )  # e.g., "normal", "multiply", blending mode for effects
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship with the "Project", ensuring proper joins
    project = relationship(
        "Project", back_populates="layers", lazy="joined"
    )