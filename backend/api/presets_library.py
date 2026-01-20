from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
from datetime import datetime

router = APIRouter(prefix="/api/presets-library", tags=["presets-library"])

class PresetMetadata(BaseModel):
    id: str
    name: str
    description: str
    author: str
    category: str  # Portrait, Landscape, B&W, Cinematic, etc.
    tags: List[str] = []
    rating: Optional[float] = None
    downloads: int = 0
    created_at: str
    updated_at: str
    is_premium: bool = False
    price: float = 0.0
    thumbnail_url: Optional[str] = None

class PresetSettings(BaseModel):
    exposure: float = 0
    contrast: float = 0
    highlights: float = 0
    shadows: float = 0
    whites: float = 0
    blacks: float = 0
    clarity: float = 0
    vibrance: float = 0
    saturation: float = 0
    temperature: float = 0
    tint: float = 0
    # Color grading
    shadows_hue: float = 0
    shadows_sat: float = 0
    midtones_hue: float = 0
    midtones_sat: float = 0
    highlights_hue: float = 0
    highlights_sat: float = 0
    # Tone curve
    tone_curve: Optional[List[List[int]]] = None
    # Filters
    filter_name: Optional[str] = None
    filter_intensity: float = 1.0

class Preset(BaseModel):
    metadata: PresetMetadata
    settings: PresetSettings

# In-memory presets library
user_presets = {}
marketplace_presets = [
    Preset(
        metadata=PresetMetadata(
            id="cinematic-teal-orange",
            name="Cinematic Teal & Orange",
            description="Hollywood-style color grading with teal shadows and orange highlights",
            author="ColorGrade Pro",
            category="Cinematic",
            tags=["cinematic", "teal", "orange", "blockbuster"],
            rating=4.9,
            downloads=45230,
            created_at="2025-12-01T00:00:00Z",
            updated_at="2026-01-15T00:00:00Z",
            is_premium=True,
            price=4.99,
            thumbnail_url="https://cdn.darkroom.app/presets/cinematic-teal-orange.jpg"
        ),
        settings=PresetSettings(
            exposure=0.3,
            contrast=15,
            highlights=-10,
            shadows=20,
            clarity=10,
            vibrance=20,
            saturation=-5,
            temperature=5,
            shadows_hue=180,
            shadows_sat=30,
            highlights_hue=30,
            highlights_sat=25
        )
    ),
    Preset(
        metadata=PresetMetadata(
            id="portrait-soft-glow",
            name="Portrait Soft Glow",
            description="Dreamy portrait preset with soft highlights and warm tones",
            author="Portrait Masters",
            category="Portrait",
            tags=["portrait", "soft", "glow", "warm"],
            rating=4.8,
            downloads=38940,
            created_at="2025-11-15T00:00:00Z",
            updated_at="2026-01-10T00:00:00Z",
            is_premium=False,
            price=0.0
        ),
        settings=PresetSettings(
            exposure=0.2,
            contrast=-5,
            highlights=-15,
            shadows=15,
            clarity=-10,
            vibrance=10,
            temperature=10,
            tint=5,
            filter_name="soft_focus",
            filter_intensity=0.3
        )
    ),
    Preset(
        metadata=PresetMetadata(
            id="landscape-vivid",
            name="Landscape Vivid",
            description="Enhance landscapes with vibrant colors and deep contrast",
            author="Nature Photo Collective",
            category="Landscape",
            tags=["landscape", "vivid", "vibrant", "nature"],
            rating=4.7,
            downloads=29150,
            created_at="2025-10-20T00:00:00Z",
            updated_at="2025-12-05T00:00:00Z",
            is_premium=False,
            price=0.0
        ),
        settings=PresetSettings(
            exposure=0,
            contrast=20,
            highlights=-5,
            shadows=10,
            clarity=15,
            vibrance=30,
            saturation=10
        )
    )
]

@router.get("/presets/my-library")
async def get_user_presets(category: Optional[str] = None):
    """Get user's saved presets"""
    presets = list(user_presets.values())
    
    if category:
        presets = [p for p in presets if p.metadata.category == category]
    
    return {"presets": presets}

@router.get("/presets/marketplace")
async def browse_marketplace(
    category: Optional[str] = None,
    tags: Optional[str] = None,  # comma-separated
    search: Optional[str] = None,
    premium_only: bool = False,
    free_only: bool = False
):
    """Browse preset marketplace"""
    presets = marketplace_presets.copy()
    
    # Filter by category
    if category:
        presets = [p for p in presets if p.metadata.category == category]
    
    # Filter by tags
    if tags:
        tag_list = [t.strip() for t in tags.split(',')]
        presets = [
            p for p in presets 
            if any(tag in p.metadata.tags for tag in tag_list)
        ]
    
    # Search
    if search:
        search_lower = search.lower()
        presets = [
            p for p in presets
            if search_lower in p.metadata.name.lower() or
               search_lower in p.metadata.description.lower()
        ]
    
    # Premium filter
    if premium_only:
        presets = [p for p in presets if p.metadata.is_premium]
    if free_only:
        presets = [p for p in presets if not p.metadata.is_premium]
    
    return {"presets": presets}

@router.get("/presets/{preset_id}")
async def get_preset_details(preset_id: str):
    """Get detailed preset information"""
    # Check user library first
    if preset_id in user_presets:
        return user_presets[preset_id]
    
    # Check marketplace
    preset = next(
        (p for p in marketplace_presets if p.metadata.id == preset_id), 
        None
    )
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    return preset

@router.post("/presets/save")
async def save_preset(preset: Preset):
    """Save a new preset to user library"""
    # Generate ID if not provided
    if not preset.metadata.id:
        preset.metadata.id = f"user_preset_{len(user_presets) + 1}"
    
    preset.metadata.created_at = datetime.utcnow().isoformat() + "Z"
    preset.metadata.updated_at = preset.metadata.created_at
    
    user_presets[preset.metadata.id] = preset
    
    return {
        "message": "Preset saved successfully",
        "preset": preset
    }

@router.put("/presets/{preset_id}")
async def update_preset(preset_id: str, preset: Preset):
    """Update existing preset"""
    if preset_id not in user_presets:
        raise HTTPException(status_code=404, detail="Preset not found in user library")
    
    preset.metadata.id = preset_id
    preset.metadata.updated_at = datetime.utcnow().isoformat() + "Z"
    
    user_presets[preset_id] = preset
    
    return {
        "message": "Preset updated successfully",
        "preset": preset
    }

@router.delete("/presets/{preset_id}")
async def delete_preset(preset_id: str):
    """Delete preset from user library"""
    if preset_id not in user_presets:
        raise HTTPException(status_code=404, detail="Preset not found in user library")
    
    del user_presets[preset_id]
    
    return {"message": "Preset deleted successfully"}

@router.post("/presets/{preset_id}/purchase")
async def purchase_preset(preset_id: str):
    """Purchase premium preset from marketplace"""
    preset = next(
        (p for p in marketplace_presets if p.metadata.id == preset_id),
        None
    )
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found in marketplace")
    
    if not preset.metadata.is_premium:
        raise HTTPException(status_code=400, detail="Preset is free, no purchase needed")
    
    # In production: process payment
    # Add to user library
    user_presets[preset_id] = preset
    
    return {
        "message": f"Preset '{preset.metadata.name}' purchased successfully",
        "preset": preset
    }

@router.post("/presets/export")
async def export_presets(preset_ids: List[str]):
    """Export presets as .drkpreset file"""
    presets_to_export = []
    
    for preset_id in preset_ids:
        if preset_id in user_presets:
            presets_to_export.append(user_presets[preset_id])
    
    if not presets_to_export:
        raise HTTPException(status_code=404, detail="No presets found to export")
    
    # Create export data
    export_data = {
        "version": "1.0",
        "export_date": datetime.utcnow().isoformat() + "Z",
        "presets": [p.dict() for p in presets_to_export]
    }
    
    return {
        "filename": f"darkroom_presets_{datetime.utcnow().strftime('%Y%m%d')}.drkpreset",
        "data": json.dumps(export_data, indent=2)
    }

@router.post("/presets/import")
async def import_presets(file: UploadFile = File(...)):
    """Import presets from .drkpreset file"""
    try:
        contents = await file.read()
        data = json.loads(contents)
        
        imported_count = 0
        for preset_data in data.get("presets", []):
            preset = Preset(**preset_data)
            # Add unique suffix if preset already exists
            base_id = preset.metadata.id
            counter = 1
            while preset.metadata.id in user_presets:
                preset.metadata.id = f"{base_id}_{counter}"
                counter += 1
            
            user_presets[preset.metadata.id] = preset
            imported_count += 1
        
        return {
            "message": f"Successfully imported {imported_count} presets",
            "imported_count": imported_count
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid preset file format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_preset_categories():
    """Get list of preset categories"""
    return {
        "categories": [
            "Portrait",
            "Landscape",
            "Cinematic",
            "B&W",
            "Vintage",
            "Urban",
            "Nature",
            "Food",
            "Wedding",
            "Street"
        ]
    }

@router.post("/presets/{preset_id}/rate")
async def rate_preset(preset_id: str, rating: float):
    """Rate a preset (1-5 stars)"""
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    preset = next(
        (p for p in marketplace_presets if p.metadata.id == preset_id),
        None
    )
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    # In production: calculate average rating
    return {
        "message": "Rating submitted successfully",
        "preset_id": preset_id,
        "your_rating": rating
    }
