from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import json

router = APIRouter()

class SlideshowSettings(BaseModel):
    images: List[str]
    duration: float = 3.0  # seconds per image
    transition: str = "fade"  # fade, slide, zoom, none
    transition_duration: float = 0.5
    music: Optional[str] = None
    loop: bool = False
    shuffle: bool = False

class SlideshowExport(BaseModel):
    format: str = "mp4"  # mp4, gif, webm
    resolution: str = "1920x1080"
    fps: int = 30
    quality: str = "high"

@router.post("/create")
async def create_slideshow(settings: SlideshowSettings):
    """Create a slideshow configuration"""
    return {
        "status": "success",
        "slideshow_id": "slideshow_001",
        "images_count": len(settings.images),
        "total_duration": len(settings.images) * settings.duration,
        "settings": settings.dict()
    }

@router.post("/preview")
async def preview_slideshow(settings: SlideshowSettings):
    """Generate preview frames for slideshow"""
    return {
        "status": "success",
        "preview_frames": [f"frame_{i}.jpg" for i in range(min(5, len(settings.images)))],
        "preview_duration": min(5, len(settings.images)) * settings.duration
    }

@router.post("/export")
async def export_slideshow(
    slideshow_id: str = Form(...),
    export_settings: str = Form(...)
):
    """Export slideshow to video or animated format"""
    settings = json.loads(export_settings)
    
    return {
        "status": "processing",
        "slideshow_id": slideshow_id,
        "format": settings.get("format", "mp4"),
        "estimated_time": 30,
        "output_file": f"slideshow_{slideshow_id}.{settings.get('format', 'mp4')}"
    }

@router.get("/templates")
async def get_slideshow_templates():
    """Get available slideshow templates"""
    return {
        "templates": [
            {
                "id": "classic",
                "name": "Classic",
                "transition": "fade",
                "duration": 3.0,
                "music_style": "calm"
            },
            {
                "id": "modern",
                "name": "Modern",
                "transition": "slide",
                "duration": 2.0,
                "music_style": "upbeat"
            },
            {
                "id": "cinematic",
                "name": "Cinematic",
                "transition": "zoom",
                "duration": 4.0,
                "music_style": "dramatic"
            },
            {
                "id": "fast_paced",
                "name": "Fast Paced",
                "transition": "fade",
                "duration": 1.5,
                "music_style": "energetic"
            }
        ]
    }
