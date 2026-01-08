"""
Crop API
Handles image cropping and rotation operations
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import os
from pathlib import Path

from backend.db import get_db
from backend.models.layers import Layer
from backend.services.image_processor import ImageProcessor

router = APIRouter(prefix="/api/crop", tags=["crop"])


class CropRequest(BaseModel):
    """Request model for crop operation"""
    layer_id: int
    x: int
    y: int
    width: int
    height: int
    aspect_ratio: Optional[str] = None  # e.g., "16:9", "4:3", "1:1"


class RotateRequest(BaseModel):
    """Request model for rotate operation"""
    layer_id: int
    angle: float  # Degrees, positive = clockwise


class CropResponse(BaseModel):
    """Response model for crop operations"""
    success: bool
    message: str
    layer_id: int
    new_path: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


@router.post("/apply", response_model=CropResponse)
async def apply_crop(
    request: CropRequest,
    db: Session = Depends(get_db)
):
    """
    Apply crop to an image layer
    Supports both direct coordinates and aspect ratio constraints
    """
    try:
        # Get layer from database
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        if not layer.content:
            raise HTTPException(status_code=400, detail="Layer has no content")
        
        # Load the image
        image_path = layer.content
        if image_path.startswith("/uploads/"):
            image_path = "backend" + image_path
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail=f"Image file not found: {image_path}")
        
        processor = ImageProcessor()
        img = processor.load_image(image_path)
        
        # Apply crop
        cropped = processor.crop_image(
            img,
            request.x,
            request.y,
            request.width,
            request.height
        )
        
        # Save cropped image with new filename
        original_path = Path(image_path)
        new_filename = f"{original_path.stem}_cropped{original_path.suffix}"
        new_path = original_path.parent / new_filename
        
        processor.save_image(cropped, str(new_path))
        
        # Update layer in database
        layer.content = str(new_path).replace("backend", "")
        layer.width = request.width
        layer.height = request.height
        db.commit()
        
        return CropResponse(
            success=True,
            message="Crop applied successfully",
            layer_id=request.layer_id,
            new_path=layer.content,
            width=request.width,
            height=request.height
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crop failed: {str(e)}")


@router.post("/rotate", response_model=CropResponse)
async def rotate_image(
    request: RotateRequest,
    db: Session = Depends(get_db)
):
    """
    Rotate an image layer by arbitrary angle
    Positive angles rotate clockwise, negative counter-clockwise
    """
    try:
        # Get layer from database
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        if not layer.content:
            raise HTTPException(status_code=400, detail="Layer has no content")
        
        # Load the image
        image_path = layer.content
        if image_path.startswith("/uploads/"):
            image_path = "backend" + image_path
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail=f"Image file not found: {image_path}")
        
        processor = ImageProcessor()
        img = processor.load_image(image_path)
        
        # Apply rotation
        rotated = processor.rotate_image(img, request.angle)
        
        # Save rotated image with new filename
        original_path = Path(image_path)
        new_filename = f"{original_path.stem}_rotated{original_path.suffix}"
        new_path = original_path.parent / new_filename
        
        processor.save_image(rotated, str(new_path))
        
        # Update layer in database
        layer.content = str(new_path).replace("backend", "")
        layer.width = rotated.shape[1]
        layer.height = rotated.shape[0]
        db.commit()
        
        return CropResponse(
            success=True,
            message=f"Image rotated {request.angle}° successfully",
            layer_id=request.layer_id,
            new_path=layer.content,
            width=rotated.shape[1],
            height=rotated.shape[0]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rotation failed: {str(e)}")