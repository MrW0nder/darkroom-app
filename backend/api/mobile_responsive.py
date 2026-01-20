"""
Mobile and Responsive Design API
Provides mobile/tablet support, responsive layouts, and touch gestures
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/mobile", tags=["mobile"])

class DeviceSettings(BaseModel):
    device_type: str  # mobile, tablet, desktop
    orientation: str  # portrait, landscape
    screen_width: int
    screen_height: int
    touch_enabled: bool

class ResponsiveLayout(BaseModel):
    breakpoint: str  # sm, md, lg, xl
    columns: int
    sidebar_visible: bool
    toolbar_position: str  # top, bottom, side

@router.post("/detect")
async def detect_device(user_agent: str):
    """Detect device type from user agent"""
    device_type = "desktop"
    if "Mobile" in user_agent or "Android" in user_agent:
        device_type = "mobile"
    elif "Tablet" in user_agent or "iPad" in user_agent:
        device_type = "tablet"
    
    return {"device_type": device_type, "touch_enabled": device_type in ["mobile", "tablet"]}

@router.post("/layout")
async def get_responsive_layout(settings: DeviceSettings):
    """Get responsive layout configuration"""
    if settings.device_type == "mobile":
        return ResponsiveLayout(
            breakpoint="sm",
            columns=1,
            sidebar_visible=False,
            toolbar_position="bottom"
        )
    elif settings.device_type == "tablet":
        return ResponsiveLayout(
            breakpoint="md",
            columns=2,
            sidebar_visible=True,
            toolbar_position="side"
        )
    else:
        return ResponsiveLayout(
            breakpoint="lg",
            columns=3,
            sidebar_visible=True,
            toolbar_position="top"
        )

@router.get("/gestures")
async def get_touch_gestures():
    """Get available touch gestures"""
    return {
        "pinch_zoom": True,
        "two_finger_pan": True,
        "swipe_navigate": True,
        "long_press_menu": True,
        "double_tap_zoom": True
    }
