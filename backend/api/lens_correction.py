from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import cv2
import numpy as np

router = APIRouter()

# Lens correction database (simplified - in production, load from comprehensive database)
LENS_PROFILES = {
    "Canon EF 50mm f/1.8": {
        "distortion": [-0.02, 0.0, 0.0],
        "vignetting": [1.0, -0.15, 0.05],
        "chromatic_aberration": {"r": 1.001, "g": 1.0, "b": 0.999}
    },
    "Nikon AF-S 35mm f/1.8G": {
        "distortion": [-0.015, 0.0, 0.0],
        "vignetting": [1.0, -0.12, 0.03],
        "chromatic_aberration": {"r": 1.0008, "g": 1.0, "b": 0.9992}
    },
    "Sony FE 85mm f/1.4": {
        "distortion": [-0.008, 0.0, 0.0],
        "vignetting": [1.0, -0.18, 0.06],
        "chromatic_aberration": {"r": 1.0005, "g": 1.0, "b": 0.9995}
    },
    "Generic Wide Angle": {
        "distortion": [-0.05, 0.0, 0.01],
        "vignetting": [1.0, -0.25, 0.10],
        "chromatic_aberration": {"r": 1.002, "g": 1.0, "b": 0.998}
    }
}

class LensCorrectionRequest(BaseModel):
    image_path: str
    lens_model: Optional[str] = None
    enable_distortion: bool = True
    enable_vignetting: bool = True
    enable_chromatic_aberration: bool = True
    manual_distortion: Optional[float] = None
    manual_vignetting: Optional[float] = None

def correct_distortion(image: np.ndarray, coefficients: list) -> np.ndarray:
    """Apply lens distortion correction"""
    h, w = image.shape[:2]
    
    # Camera matrix
    K = np.array([[w, 0, w/2],
                  [0, h, h/2],
                  [0, 0, 1]], dtype=np.float32)
    
    # Distortion coefficients [k1, k2, p1, p2, k3]
    dist = np.array(coefficients + [0, 0], dtype=np.float32)
    
    # Undistort
    corrected = cv2.undistort(image, K, dist)
    return corrected

def correct_vignetting(image: np.ndarray, coefficients: list) -> np.ndarray:
    """Apply vignetting correction"""
    h, w = image.shape[:2]
    
    # Create radial distance map
    y, x = np.ogrid[:h, :w]
    center_y, center_x = h/2, w/2
    
    # Normalized distance from center
    dist_from_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)
    max_dist = np.sqrt(center_x**2 + center_y**2)
    normalized_dist = dist_from_center / max_dist
    
    # Apply vignetting correction: gain = c0 + c1*r^2 + c2*r^4
    gain = coefficients[0] + coefficients[1] * normalized_dist**2 + coefficients[2] * normalized_dist**4
    gain = np.clip(gain, 0.1, 2.0)
    
    # Apply to all channels
    if len(image.shape) == 3:
        gain = gain[:, :, np.newaxis]
    
    corrected = np.clip(image.astype(float) * gain, 0, 255).astype(np.uint8)
    return corrected

def correct_chromatic_aberration(image: np.ndarray, scale_factors: dict) -> np.ndarray:
    """Correct lateral chromatic aberration by scaling color channels"""
    if len(image.shape) != 3:
        return image
    
    h, w = image.shape[:2]
    center = (w/2, h/2)
    
    # Split channels
    b, g, r = cv2.split(image)
    
    # Create transformation matrices for red and blue channels
    # Green channel stays as reference
    corrected_channels = []
    
    for channel, scale in zip([b, g, r], [scale_factors['b'], scale_factors['g'], scale_factors['r']]):
        if abs(scale - 1.0) < 0.0001:
            corrected_channels.append(channel)
        else:
            # Scale around center
            M = cv2.getRotationMatrix2D(center, 0, scale)
            corrected = cv2.warpAffine(channel, M, (w, h), flags=cv2.INTER_LINEAR)
            corrected_channels.append(corrected)
    
    return cv2.merge(corrected_channels)

@router.post("/correct")
async def apply_lens_correction(request: LensCorrectionRequest):
    """Apply lens corrections based on lens profile or manual settings"""
    try:
        # Load image
        image = cv2.imread(request.image_path)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        corrected = image.copy()
        
        # Get lens profile or use defaults
        profile = LENS_PROFILES.get(request.lens_model, {})
        
        # Apply distortion correction
        if request.enable_distortion:
            distortion_coef = profile.get("distortion", [-0.02, 0.0, 0.0])
            if request.manual_distortion is not None:
                distortion_coef = [request.manual_distortion, 0.0, 0.0]
            corrected = correct_distortion(corrected, distortion_coef)
        
        # Apply vignetting correction
        if request.enable_vignetting:
            vignette_coef = profile.get("vignetting", [1.0, -0.15, 0.05])
            if request.manual_vignetting is not None:
                vignette_coef = [1.0, request.manual_vignetting, 0.0]
            corrected = correct_vignetting(corrected, vignette_coef)
        
        # Apply chromatic aberration correction
        if request.enable_chromatic_aberration:
            ca_factors = profile.get("chromatic_aberration", {"r": 1.001, "g": 1.0, "b": 0.999})
            corrected = correct_chromatic_aberration(corrected, ca_factors)
        
        # Save result
        output_path = request.image_path.replace(".", "_lens_corrected.")
        cv2.imwrite(output_path, corrected)
        
        return {
            "status": "success",
            "output_path": output_path,
            "lens_model": request.lens_model,
            "corrections_applied": {
                "distortion": request.enable_distortion,
                "vignetting": request.enable_vignetting,
                "chromatic_aberration": request.enable_chromatic_aberration
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profiles")
async def list_lens_profiles():
    """Get list of available lens profiles"""
    return {
        "profiles": list(LENS_PROFILES.keys()),
        "count": len(LENS_PROFILES)
    }

@router.get("/profile/{lens_model}")
async def get_lens_profile(lens_model: str):
    """Get specific lens profile data"""
    profile = LENS_PROFILES.get(lens_model)
    if not profile:
        raise HTTPException(status_code=404, detail="Lens profile not found")
    return {"lens_model": lens_model, "profile": profile}