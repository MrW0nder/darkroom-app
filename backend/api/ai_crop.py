from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import numpy as np
import cv2

router = APIRouter(prefix="/ai", tags=["ai_crop"])

class AICropRequest(BaseModel):
    image_id: int
    mode: str = "smart"  # smart, rule_of_thirds, golden_ratio, centered
    aspect_ratio: Optional[str] = None
    face_priority: bool = True

class AICropResponse(BaseModel):
    success: bool
    crop_x: int
    crop_y: int
    crop_width: int
    crop_height: int
    confidence: float
    composition_type: str

@router.post("/auto-crop", response_model=AICropResponse)
async def auto_crop_image(request: AICropRequest):
    """AI-powered automatic cropping with composition analysis"""
    # Placeholder - production would use actual composition detection
    return AICropResponse(
        success=True,
        crop_x=100,
        crop_y=100,
        crop_width=800,
        crop_height=600,
        confidence=0.92,
        composition_type="rule_of_thirds"
    )

@router.post("/suggest-crop")
async def suggest_crop_options(image_id: int):
    """Generate multiple crop suggestions"""
    suggestions = [
        {"type": "rule_of_thirds", "x": 100, "y": 100, "w": 800, "h": 600, "score": 0.92},
        {"type": "golden_ratio", "x": 120, "y": 80, "w": 750, "h": 600, "score": 0.88},
        {"type": "centered", "x": 150, "y": 100, "w": 700, "h": 600, "score": 0.85}
    ]
    return {"image_id": image_id, "suggestions": suggestions}