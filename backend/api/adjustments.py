"""
Image Adjustments API
Apply real-time adjustments using OpenCV image processor
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import numpy as np
import cv2
from pathlib import Path

from backend.db import get_db
from backend.models.layers import Layer
from backend.services.image_processor import ImageProcessor

router = APIRouter(prefix="/api/adjustments", tags=["adjustments"])


class AdjustmentRequest(BaseModel):
    layer_id: int
    brightness: Optional[float] = 0
    contrast: Optional[float] = 0
    saturation: Optional[float] = 0
    exposure: Optional[float] = 0
    highlights: Optional[float] = 0
    shadows: Optional[float] = 0
    sharpness: Optional[float] = 1.0


@router.post("/apply")
async def apply_adjustments(request: AdjustmentRequest, db: Session = Depends(get_db)):
    """
    Apply adjustments to a layer and return processed image
    """
    try:
        # Get layer from database
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        if not layer.content:
            raise HTTPException(status_code=400, detail="Layer has no image content")
        
        # Load original image
        img = ImageProcessor.load_image(layer.content)
        
        # Apply adjustments in sequence
        if request.brightness != 0:
            img = ImageProcessor.adjust_brightness(img, request.brightness)
        
        if request.contrast != 0:
            img = ImageProcessor.adjust_contrast(img, request.contrast)
        
        if request.saturation != 0:
            img = ImageProcessor.adjust_saturation(img, request.saturation)
        
        if request.exposure != 0:
            img = ImageProcessor.adjust_exposure(img, request.exposure)
        
        if request.highlights != 0:
            img = ImageProcessor.adjust_highlights(img, request.highlights)
        
        if request.shadows != 0:
            img = ImageProcessor.adjust_shadows(img, request.shadows)
        
        if request.sharpness != 1.0:
            img = ImageProcessor.sharpen(img, request.sharpness)
        
        # Save processed image to temp location
        temp_path = Path(layer.content).parent / f"adjusted_{layer.id}.jpg"
        ImageProcessor.save_image(img, str(temp_path))
        
        return {
            "success": True,
            "layer_id": layer.id,
            "processed_path": str(temp_path),
            "adjustments_applied": {
                "brightness": request.brightness,
                "contrast": request.contrast,
                "saturation": request.saturation,
                "exposure": request.exposure,
                "highlights": request.highlights,
                "shadows": request.shadows,
                "sharpness": request.sharpness
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error applying adjustments: {str(e)}")
