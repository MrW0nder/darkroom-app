"""
Text and Shapes API endpoints for adding text overlays and shapes to images.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Literal
import os

from backend.db import get_db
from backend.models.layers import Layer
from backend.services.image_processor import ImageProcessor

router = APIRouter(prefix="/api", tags=["text_shapes"])


class TextOverlayRequest(BaseModel):
    """Request model for adding text overlay"""
    layer_id: int
    text: str
    font: str = "Arial"
    font_size: int = 24
    color: str = "#FFFFFF"
    x: int = 50
    y: int = 50
    bold: bool = False
    italic: bool = False


class ShapeRequest(BaseModel):
    """Request model for adding shapes"""
    layer_id: int
    shape_type: Literal["rectangle", "ellipse", "line", "arrow"]
    x: int
    y: int
    width: int = 100
    height: int = 100
    fill_color: Optional[str] = None
    stroke_color: str = "#FFFFFF"
    stroke_width: int = 2
    rotation: float = 0.0


@router.post("/text/add")
async def add_text_overlay(
    request: TextOverlayRequest,
    db: Session = Depends(get_db)
):
    """
    Add text overlay to an image layer.
    
    Args:
        request: Text overlay parameters
        db: Database session
        
    Returns:
        Success message with updated layer info
    """
    try:
        # Get the layer from database
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        # Get the image path
        image_path = layer.image_path
        if image_path.startswith('/uploads/'):
            image_path = image_path[9:]  # Remove /uploads/ prefix
        full_path = os.path.join('uploads', image_path)
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Initialize image processor
        processor = ImageProcessor()
        
        # Add text overlay
        result_path = processor.add_text_overlay(
            full_path,
            text=request.text,
            font=request.font,
            font_size=request.font_size,
            color=request.color,
            position=(request.x, request.y),
            bold=request.bold,
            italic=request.italic
        )
        
        # Update layer in database
        layer.image_path = f'/uploads/{os.path.basename(result_path)}'
        db.commit()
        
        return {
            "success": True,
            "message": f"Text '{request.text}' added successfully",
            "layer_id": layer.id,
            "new_path": layer.image_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding text: {str(e)}")


@router.post("/shapes/add")
async def add_shape(
    request: ShapeRequest,
    db: Session = Depends(get_db)
):
    """
    Add shape to an image layer.
    
    Args:
        request: Shape parameters
        db: Database session
        
    Returns:
        Success message with updated layer info
    """
    try:
        # Get the layer from database
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        # Get the image path
        image_path = layer.image_path
        if image_path.startswith('/uploads/'):
            image_path = image_path[9:]  # Remove /uploads/ prefix
        full_path = os.path.join('uploads', image_path)
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Initialize image processor
        processor = ImageProcessor()
        
        # Add shape
        result_path = processor.add_shape(
            full_path,
            shape_type=request.shape_type,
            position=(request.x, request.y),
            width=request.width,
            height=request.height,
            fill_color=request.fill_color,
            stroke_color=request.stroke_color,
            stroke_width=request.stroke_width,
            rotation=request.rotation
        )
        
        # Update layer in database
        layer.image_path = f'/uploads/{os.path.basename(result_path)}'
        db.commit()
        
        return {
            "success": True,
            "message": f"{request.shape_type.capitalize()} added successfully",
            "layer_id": layer.id,
            "new_path": layer.image_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding shape: {str(e)}")
