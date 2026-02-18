from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json

router = APIRouter(prefix="/api", tags=["settings"])

class UserSettings(BaseModel):
    theme: str = "dark"
    language: str = "en"
    auto_save: bool = True
    auto_save_interval: int = 300  # seconds
    default_export_format: str = "jpeg"
    default_export_quality: int = 95
    show_rulers: bool = True
    show_grid: bool = False
    grid_size: int = 10
    snap_to_grid: bool = False
    undo_limit: int = 50
    gpu_acceleration: bool = True
    preview_quality: str = "medium"
    color_profile: str = "sRGB"
    backup_enabled: bool = True
    backup_path: Optional[str] = None
    keyboard_shortcuts: Optional[Dict[str, str]] = None

class AppConfig(BaseModel):
    app_name: str = "Darkroom Pro"
    version: str = "1.0.0"
    max_image_size: int = 50000000  # 50MB
    supported_formats: list = ["jpeg", "jpg", "png", "tiff", "tif", "webp", "cr2", "nef", "arw", "dng"]
    cache_size: int = 1000000000  # 1GB
    temp_directory: Optional[str] = None

# In-memory storage (replace with database in production)
settings_store: Dict[str, Dict[str, Any]] = {}

@router.get("/settings/user")
async def get_user_settings(user_id: str = "default"):
    """Get user settings"""
    if user_id not in settings_store:
        settings_store[user_id] = UserSettings().model_dump()
    return settings_store[user_id]

@router.put("/settings/user")
async def update_user_settings(settings: UserSettings, user_id: str = "default"):
    """Update user settings"""
    settings_store[user_id] = settings.model_dump()
    return {"status": "success", "settings": settings_store[user_id]}

@router.get("/settings/app")
async def get_app_config():
    """Get application configuration"""
    return AppConfig().model_dump()

@router.post("/settings/reset")
async def reset_settings(user_id: str = "default"):
    """Reset user settings to defaults"""
    settings_store[user_id] = UserSettings().model_dump()
    return {"status": "success", "message": "Settings reset to defaults"}

@router.post("/settings/export")
async def export_settings(user_id: str = "default"):
    """Export user settings as JSON"""
    if user_id not in settings_store:
        settings_store[user_id] = UserSettings().model_dump()
    return {"settings": settings_store[user_id]}

@router.post("/settings/import")
async def import_settings(settings: Dict[str, Any], user_id: str = "default"):
    """Import user settings from JSON"""
    try:
        validated_settings = UserSettings(**settings)
        settings_store[user_id] = validated_settings.model_dump()
        return {"status": "success", "message": "Settings imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid settings: {str(e)}")