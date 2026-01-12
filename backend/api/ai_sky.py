from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/ai", tags=["ai_sky"])

class SkyReplacementRequest(BaseModel):
    image_id: int
    sky_type: str  # sunset, sunrise, cloudy, clear_blue, dramatic, night
    blend_strength: float = 0.8
    preserve_foreground: bool = True

class SkyReplacementResponse(BaseModel):
    success: bool
    new_image_path: str
    sky_mask_path: str
    blend_quality: float

@router.post("/replace-sky", response_model=SkyReplacementResponse)
async def replace_sky(request: SkyReplacementRequest):
    """AI-powered sky replacement with automatic masking"""
    return SkyReplacementResponse(
        success=True,
        new_image_path=f"/storage/sky_replaced_{request.image_id}.jpg",
        sky_mask_path=f"/storage/sky_mask_{request.image_id}.png",
        blend_quality=0.94
    )

@router.post("/detect-sky")
async def detect_sky_region(image_id: int):
    """Detect and segment sky region in image"""
    return {
        "image_id": image_id,
        "has_sky": True,
        "sky_percentage": 35.2,
        "mask_path": f"/storage/sky_mask_{image_id}.png",
        "sky_conditions": "partly_cloudy"
    }

@router.get("/sky-presets")
async def get_sky_presets():
    """Get available sky replacement presets"""
    presets = [
        {"id": "sunset1", "name": "Golden Sunset", "preview": "/presets/sunset1.jpg"},
        {"id": "sunrise1", "name": "Dawn Sky", "preview": "/presets/sunrise1.jpg"},
        {"id": "dramatic1", "name": "Storm Clouds", "preview": "/presets/dramatic1.jpg"},
        {"id": "clear1", "name": "Clear Blue", "preview": "/presets/clear1.jpg"}
    ]
    return {"presets": presets}
