"""
Color Zones API
Provides HSL-based color zone adjustments for targeted color corrections.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, List
import cv2
import numpy as np

router = APIRouter(prefix="/api/color-zones", tags=["color-zones"])


class ColorZoneAdjustment(BaseModel):
    zone: str  # "red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta"
    hue_shift: float = 0.0  # -180 to +180 degrees
    saturation: float = 0.0  # -100 to +100
    luminance: float = 0.0  # -100 to +100


class ColorZonesConfig(BaseModel):
    adjustments: List[ColorZoneAdjustment]
    global_saturation: float = 0.0


# HSL color zone definitions (hue ranges in degrees)
COLOR_ZONES = {
    "red": (345, 15),  # Wraps around 0
    "orange": (15, 45),
    "yellow": (45, 75),
    "green": (75, 165),
    "cyan": (165, 195),
    "blue": (195, 255),
    "purple": (255, 315),
    "magenta": (315, 345),
}


def hue_in_range(hue, range_start, range_end):
    """Check if hue is in specified range, handling wraparound."""
    if range_start > range_end:  # Wraparound case (e.g., red zone)
        return hue >= range_start or hue <= range_end
    else:
        return range_start <= hue <= range_end


def get_zone_mask(hsv_img, zone_name, feather=10):
    """
    Create a mask for a specific color zone with smooth transitions.
    """
    h, w = hsv_img.shape[:2]
    hue_channel = hsv_img[:, :, 0].astype(np.float32)
    
    # Get zone range
    if zone_name not in COLOR_ZONES:
        return np.zeros((h, w), dtype=np.float32)
    
    range_start, range_end = COLOR_ZONES[zone_name]
    
    # Create mask
    mask = np.zeros((h, w), dtype=np.float32)
    
    if range_start > range_end:  # Wraparound case
        mask1 = (hue_channel >= range_start).astype(np.float32)
        mask2 = (hue_channel <= range_end).astype(np.float32)
        mask = np.maximum(mask1, mask2)
    else:
        mask = np.logical_and(
            hue_channel >= range_start,
            hue_channel <= range_end
        ).astype(np.float32)
    
    # Apply feathering for smooth transitions
    if feather > 0:
        # Create distance-based falloff at zone edges
        for y in range(h):
            for x in range(w):
                hue = hue_channel[y, x]
                
                # Calculate distance to zone edges
                if range_start > range_end:  # Wraparound
                    if hue >= range_start:
                        dist_start = hue - range_start
                        dist_end = 360 - hue + range_end
                    elif hue <= range_end:
                        dist_start = hue + 360 - range_start
                        dist_end = range_end - hue
                    else:
                        continue
                else:
                    if range_start <= hue <= range_end:
                        dist_start = hue - range_start
                        dist_end = range_end - hue
                    else:
                        continue
                
                # Apply feathering
                min_dist = min(dist_start, dist_end)
                if min_dist < feather:
                    mask[y, x] *= (min_dist / feather)
    
    return mask


@router.post("/apply")
async def apply_color_zones(
    image: UploadFile = File(...),
    config: ColorZonesConfig = None
):
    """
    Apply color zone adjustments to image.
    """
    try:
        # Read image
        img_bytes = await image.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        # Convert to HSV for hue adjustments and LAB for luminance
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
        
        h, w = img.shape[:2]
        
        # Apply global saturation if specified
        if config and config.global_saturation != 0:
            saturation_factor = 1.0 + (config.global_saturation / 100.0)
            img_hsv[:, :, 1] = np.clip(img_hsv[:, :, 1] * saturation_factor, 0, 255)
        
        # Apply zone-specific adjustments
        if config and config.adjustments:
            for adjustment in config.adjustments:
                zone_mask = get_zone_mask(img_hsv, adjustment.zone, feather=15)
                
                # Expand mask to 3 channels
                zone_mask_3ch = np.stack([zone_mask] * 3, axis=2)
                
                # Apply hue shift
                if adjustment.hue_shift != 0:
                    hue_shift_amount = adjustment.hue_shift * (180.0 / 180.0)  # Convert to OpenCV hue range
                    img_hsv[:, :, 0] += zone_mask[:, :, np.newaxis] * hue_shift_amount
                    img_hsv[:, :, 0] = img_hsv[:, :, 0] % 180  # Wrap around
                
                # Apply saturation adjustment
                if adjustment.saturation != 0:
                    sat_factor = 1.0 + (adjustment.saturation / 100.0)
                    img_hsv[:, :, 1] = np.clip(
                        img_hsv[:, :, 1] + zone_mask * (img_hsv[:, :, 1] * (sat_factor - 1.0)),
                        0, 255
                    )
                
                # Apply luminance adjustment
                if adjustment.luminance != 0:
                    lum_shift = adjustment.luminance * 2.55  # Convert to LAB L scale (0-255)
                    img_lab[:, :, 0] = np.clip(
                        img_lab[:, :, 0] + zone_mask * lum_shift,
                        0, 255
                    )
        
        # Convert back to BGR
        img_hsv = np.clip(img_hsv, 0, 255).astype(np.uint8)
        img_lab = np.clip(img_lab, 0, 255).astype(np.uint8)
        
        # Merge changes: use LAB for luminance, HSV for hue/saturation
        result_from_hsv = cv2.cvtColor(img_hsv, cv2.COLOR_HSV2BGR)
        result_from_lab = cv2.cvtColor(img_lab, cv2.COLOR_LAB2BGR)
        
        # Blend results (prioritize LAB for luminance)
        result = cv2.addWeighted(result_from_hsv, 0.7, result_from_lab, 0.3, 0)
        
        # Encode result
        _, buffer = cv2.imencode('.jpg', result, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        return {
            "status": "success",
            "zones_adjusted": len(config.adjustments) if config else 0,
            "global_saturation": config.global_saturation if config else 0,
            "image_data": buffer.tobytes().hex()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zones")
async def get_color_zones():
    """Get available color zones and their hue ranges."""
    zones = []
    for zone_name, (start, end) in COLOR_ZONES.items():
        zones.append({
            "name": zone_name,
            "hue_range": {"start": start, "end": end},
            "description": f"{zone_name.capitalize()} color zone"
        })
    
    return {"zones": zones}


@router.post("/analyze")
async def analyze_color_distribution(image: UploadFile = File(...)):
    """
    Analyze color distribution across zones in the image.
    """
    try:
        # Read image
        img_bytes = await image.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        # Convert to HSV
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Analyze each zone
        zone_stats = {}
        total_pixels = img.shape[0] * img.shape[1]
        
        for zone_name in COLOR_ZONES.keys():
            mask = get_zone_mask(img_hsv, zone_name, feather=0)
            coverage = np.sum(mask) / total_pixels
            
            # Get average saturation and luminance in this zone
            if coverage > 0:
                zone_pixels = img_hsv[mask > 0.5]
                if len(zone_pixels) > 0:
                    avg_saturation = float(np.mean(zone_pixels[:, 1]))
                    avg_value = float(np.mean(zone_pixels[:, 2]))
                else:
                    avg_saturation = 0.0
                    avg_value = 0.0
            else:
                avg_saturation = 0.0
                avg_value = 0.0
            
            zone_stats[zone_name] = {
                "coverage_percent": float(coverage * 100),
                "avg_saturation": avg_saturation,
                "avg_value": avg_value
            }
        
        return {
            "status": "success",
            "zone_statistics": zone_stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
