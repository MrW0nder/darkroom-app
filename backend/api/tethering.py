from fastapi import APIRouter, HTTPException, WebSocket
from pydantic import BaseModel
from typing import List, Optional, Dict
import asyncio
import logging

router = APIRouter(prefix="/api/tethering", tags=["tethering"])
logger = logging.getLogger("darkroom.tethering")

class Camera(BaseModel):
    id: str
    name: str
    manufacturer: str  # Canon, Nikon, Sony, etc.
    model: str
    connection_type: str  # USB, WiFi
    battery_level: Optional[int] = None
    storage_available: Optional[int] = None  # MB
    is_connected: bool = False

class CameraSettings(BaseModel):
    iso: int
    aperture: str  # e.g., "f/2.8"
    shutter_speed: str  # e.g., "1/250"
    white_balance: str  # Auto, Daylight, Tungsten, etc.
    image_format: str  # RAW, JPEG, RAW+JPEG
    quality: str  # Fine, Normal, Basic

class Shot(BaseModel):
    id: str
    filename: str
    timestamp: str
    camera_id: str
    settings: CameraSettings
    thumbnail_path: Optional[str] = None

# Simulated cameras
available_cameras = [
    Camera(
        id="canon-eos-r5-01",
        name="Canon EOS R5",
        manufacturer="Canon",
        model="EOS R5",
        connection_type="USB",
        battery_level=85,
        storage_available=32000,
        is_connected=False
    ),
    Camera(
        id="nikon-z9-01",
        name="Nikon Z9",
        manufacturer="Nikon",
        model="Z9",
        connection_type="WiFi",
        battery_level=92,
        storage_available=64000,
        is_connected=False
    )
]

connected_cameras = {}
live_view_active = {}

@router.get("/cameras/available")
async def get_available_cameras():
    """Get list of available cameras"""
    return {"cameras": available_cameras}

@router.get("/cameras/connected")
async def get_connected_cameras():
    """Get list of connected cameras"""
    return {"cameras": list(connected_cameras.values())}

@router.post("/cameras/{camera_id}/connect")
async def connect_camera(camera_id: str):
    """Connect to a camera"""
    camera = next((c for c in available_cameras if c.id == camera_id), None)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    if camera_id in connected_cameras:
        raise HTTPException(status_code=400, detail="Camera already connected")
    
    camera.is_connected = True
    connected_cameras[camera_id] = camera
    
    return {
        "message": f"Connected to {camera.name}",
        "camera": camera
    }

@router.post("/cameras/{camera_id}/disconnect")
async def disconnect_camera(camera_id: str):
    """Disconnect from a camera"""
    if camera_id not in connected_cameras:
        raise HTTPException(status_code=404, detail="Camera not connected")
    
    camera = connected_cameras[camera_id]
    camera.is_connected = False
    
    # Stop live view if active
    if camera_id in live_view_active:
        live_view_active[camera_id] = False
    
    del connected_cameras[camera_id]
    
    return {"message": f"Disconnected from {camera.name}"}

@router.get("/cameras/{camera_id}/settings")
async def get_camera_settings(camera_id: str):
    """Get current camera settings"""
    if camera_id not in connected_cameras:
        raise HTTPException(status_code=404, detail="Camera not connected")
    
    # Return simulated settings
    return {
        "settings": CameraSettings(
            iso=400,
            aperture="f/4.0",
            shutter_speed="1/125",
            white_balance="Auto",
            image_format="RAW+JPEG",
            quality="Fine"
        )
    }

@router.put("/cameras/{camera_id}/settings")
async def update_camera_settings(camera_id: str, settings: CameraSettings):
    """Update camera settings"""
    if camera_id not in connected_cameras:
        raise HTTPException(status_code=404, detail="Camera not connected")
    
    # In production: send settings to actual camera
    return {
        "message": "Camera settings updated",
        "settings": settings
    }

@router.post("/cameras/{camera_id}/capture")
async def capture_photo(camera_id: str):
    """Capture a photo from the camera"""
    if camera_id not in connected_cameras:
        raise HTTPException(status_code=404, detail="Camera not connected")
    
    camera = connected_cameras[camera_id]
    
    # Simulate photo capture
    shot = Shot(
        id=f"shot_{camera_id}_001",
        filename=f"IMG_{camera_id}_001.CR3",
        timestamp="2026-01-20T20:15:00Z",
        camera_id=camera_id,
        settings=CameraSettings(
            iso=400,
            aperture="f/4.0",
            shutter_speed="1/125",
            white_balance="Auto",
            image_format="RAW+JPEG",
            quality="Fine"
        ),
        thumbnail_path=None
    )
    
    return {
        "message": "Photo captured successfully",
        "shot": shot
    }

@router.post("/cameras/{camera_id}/liveview/start")
async def start_live_view(camera_id: str):
    """Start camera live view"""
    if camera_id not in connected_cameras:
        raise HTTPException(status_code=404, detail="Camera not connected")
    
    live_view_active[camera_id] = True
    
    return {
        "message": "Live view started",
        "stream_url": f"/api/tethering/cameras/{camera_id}/liveview/stream"
    }

@router.post("/cameras/{camera_id}/liveview/stop")
async def stop_live_view(camera_id: str):
    """Stop camera live view"""
    if camera_id not in connected_cameras:
        raise HTTPException(status_code=404, detail="Camera not connected")
    
    live_view_active[camera_id] = False
    
    return {"message": "Live view stopped"}

@router.get("/cameras/{camera_id}/liveview/status")
async def get_live_view_status(camera_id: str):
    """Get live view status"""
    if camera_id not in connected_cameras:
        raise HTTPException(status_code=404, detail="Camera not connected")
    
    is_active = live_view_active.get(camera_id, False)
    
    return {
        "camera_id": camera_id,
        "live_view_active": is_active
    }

@router.websocket("/cameras/{camera_id}/liveview/stream")
async def live_view_stream(websocket: WebSocket, camera_id: str):
    """WebSocket endpoint for live view stream"""
    await websocket.accept()
    
    try:
        while live_view_active.get(camera_id, False):
            # In production: stream actual camera feed
            await websocket.send_json({
                "type": "frame",
                "data": "base64_encoded_image_data",
                "timestamp": "2026-01-20T20:15:00Z"
            })
            await asyncio.sleep(0.033)  # ~30fps
    except Exception as e:
        logger.exception("WebSocket error: %s", e)
    finally:
        await websocket.close()

@router.get("/import/auto-settings")
async def get_auto_import_settings():
    """Get auto-import settings"""
    return {
        "enabled": True,
        "destination_folder": "/imports/tethered",
        "file_naming": "{camera}_{date}_{sequence}",
        "apply_preset": "portrait_default",
        "backup_enabled": True,
        "backup_folder": "/backups/tethered"
    }

@router.put("/import/auto-settings")
async def update_auto_import_settings(settings: Dict):
    """Update auto-import settings"""
    return {
        "message": "Auto-import settings updated",
        "settings": settings
    }