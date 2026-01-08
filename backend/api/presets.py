"""
Presets API - Save and load adjustment presets
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from backend.db import get_db
from backend.models.presets import Preset

router = APIRouter(prefix="/api/presets", tags=["presets"])


class PresetCreate(BaseModel):
    """Request to create a new preset"""
    name: str
    category: str = "Custom"
    description: Optional[str] = None
    exposure: float = 0.0
    brightness: float = 0.0
    contrast: float = 0.0
    highlights: float = 0.0
    shadows: float = 0.0
    saturation: float = 0.0
    sharpness: float = 0.0


class PresetResponse(BaseModel):
    """Preset response model"""
    id: int
    name: str
    category: str
    description: Optional[str]
    exposure: float
    brightness: float
    contrast: float
    highlights: float
    shadows: float
    saturation: float
    sharpness: float
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/", response_model=PresetResponse)
async def create_preset(
    preset_data: PresetCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new adjustment preset
    """
    # Check if preset with same name already exists
    existing = db.query(Preset).filter(Preset.name == preset_data.name).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Preset with name '{preset_data.name}' already exists"
        )
    
    # Create new preset
    new_preset = Preset(
        name=preset_data.name,
        category=preset_data.category,
        description=preset_data.description,
        exposure=preset_data.exposure,
        brightness=preset_data.brightness,
        contrast=preset_data.contrast,
        highlights=preset_data.highlights,
        shadows=preset_data.shadows,
        saturation=preset_data.saturation,
        sharpness=preset_data.sharpness,
    )
    
    db.add(new_preset)
    db.commit()
    db.refresh(new_preset)
    
    return new_preset


@router.get("/", response_model=List[PresetResponse])
async def list_presets(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all presets, optionally filtered by category
    """
    query = db.query(Preset)
    
    if category:
        query = query.filter(Preset.category == category)
    
    presets = query.order_by(Preset.category, Preset.name).all()
    return presets


@router.get("/{preset_id}", response_model=PresetResponse)
async def get_preset(
    preset_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific preset by ID
    """
    preset = db.query(Preset).filter(Preset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
    
    return preset


@router.put("/{preset_id}", response_model=PresetResponse)
async def update_preset(
    preset_id: int,
    preset_data: PresetCreate,
    db: Session = Depends(get_db)
):
    """
    Update an existing preset
    """
    preset = db.query(Preset).filter(Preset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
    
    # Update fields
    preset.name = preset_data.name
    preset.category = preset_data.category
    preset.description = preset_data.description
    preset.exposure = preset_data.exposure
    preset.brightness = preset_data.brightness
    preset.contrast = preset_data.contrast
    preset.highlights = preset_data.highlights
    preset.shadows = preset_data.shadows
    preset.saturation = preset_data.saturation
    preset.sharpness = preset_data.sharpness
    
    db.commit()
    db.refresh(preset)
    
    return preset


@router.delete("/{preset_id}")
async def delete_preset(
    preset_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a preset
    """
    preset = db.query(Preset).filter(Preset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
    
    db.delete(preset)
    db.commit()
    
    return {
        "success": True,
        "message": f"Preset '{preset.name}' deleted successfully"
    }


@router.get("/categories/list")
async def list_categories(db: Session = Depends(get_db)):
    """
    Get list of all preset categories
    """
    categories = db.query(Preset.category).distinct().all()
    return {
        "categories": [cat[0] for cat in categories]
    }
