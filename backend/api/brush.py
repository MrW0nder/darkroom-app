"""
Brush Tool API - Handle brush stroke saving and rendering
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Tuple
import numpy as np
import cv2
from pathlib import Path

from backend.db import get_db
from backend.models.layers import Layer
from backend.services.image_processor import ImageProcessor

router = APIRouter(prefix="/api/brush", tags=["brush"])
processor = ImageProcessor()


class BrushStroke(BaseModel):
    """Single brush stroke data"""
    points: List[float]  # Flattened array of x, y coordinates
    color: str  # Hex color like "#FF0000"
    size: int  # Brush size in pixels
    opacity: float  # 0.0 to 1.0


class BrushSaveRequest(BaseModel):
    """Request to save brush strokes to a layer"""
    layer_id: int
    strokes: List[BrushStroke]


@router.post("/save")
async def save_brush_strokes(
    request: BrushSaveRequest,
    db: Session = Depends(get_db)
):
    """
    Save brush strokes to a layer
    
    Creates a new image with brush strokes rendered on top of existing layer image
    """
    # Get layer from database
    layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Layer {request.layer_id} not found")
    
    # Get image path
    image_path = layer.image_path
    if image_path.startswith('/uploads/'):
        image_path = image_path[9:]  # Remove /uploads/ prefix
    
    full_path = Path("uploads") / image_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {image_path}")
    
    # Load base image
    base_image = cv2.imread(str(full_path), cv2.IMREAD_UNCHANGED)
    if base_image is None:
        raise HTTPException(status_code=400, detail="Failed to load image")
    
    # Apply brush strokes
    try:
        for stroke in request.strokes:
            base_image = processor.apply_brush_stroke(
                base_image,
                stroke.points,
                stroke.color,
                stroke.size,
                stroke.opacity
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply brush strokes: {str(e)}")
    
    # Save modified image
    output_filename = f"{full_path.stem}_brushed{full_path.suffix}"
    output_path = full_path.parent / output_filename
    cv2.imwrite(str(output_path), base_image)
    
    # Update layer in database
    layer.image_path = f"/uploads/{output_filename}"
    layer.width = base_image.shape[1]
    layer.height = base_image.shape[0]
    db.commit()
    db.refresh(layer)
    
    return {
        "success": True,
        "message": f"Brush strokes saved successfully",
        "layer_id": layer.id,
        "new_path": layer.image_path,
        "stroke_count": len(request.strokes)
    }