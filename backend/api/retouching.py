from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image
import io

router = APIRouter(prefix="/api/retouching", tags=["retouching"])

class RetouchPoint(BaseModel):
    x: int
    y: int
    pressure: float = 1.0

class RetouchArea(BaseModel):
    points: List[RetouchPoint]
    tool: str  # healing, clone, spot_removal
    brush_size: int = 20
    hardness: float = 0.8
    opacity: float = 1.0
    source_x: Optional[int] = None  # for clone stamp
    source_y: Optional[int] = None

class RedEyeCorrection(BaseModel):
    center_x: int
    center_y: int
    radius: int = 10
    intensity: float = 0.8

class SkinSmoothingParams(BaseModel):
    strength: float = 0.5  # 0.0 to 1.0
    preserve_texture: bool = True
    radius: int = 5

@router.post("/healing-brush")
async def apply_healing_brush(
    file: UploadFile = File(...),
    areas: str = None  # JSON string of RetouchArea list
):
    """Apply content-aware healing brush"""
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Parse retouch areas (simplified)
        # In production: parse JSON areas and apply healing
        
        # Apply inpainting (content-aware healing)
        mask = np.zeros(img.shape[:2], dtype=np.uint8)
        # Create mask from areas (simplified for example)
        cv2.circle(mask, (100, 100), 20, 255, -1)
        
        # Inpaint
        result = cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA)
        
        # Encode result
        _, buffer = cv2.imencode('.jpg', result)
        return {"processed_image": buffer.tobytes().hex()[:100]}  # Truncated for demo
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clone-stamp")
async def apply_clone_stamp(
    file: UploadFile = File(...),
    areas: str = None  # JSON string of RetouchArea list
):
    """Apply clone stamp tool"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # In production: parse areas and apply cloning
        # For each area, copy pixels from source to destination
        
        result = img.copy()
        # Example: clone small area (simplified)
        source_region = img[50:100, 50:100]
        result[150:200, 150:200] = source_region
        
        _, buffer = cv2.imencode('.jpg', result)
        return {"processed_image": buffer.tobytes().hex()[:100]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/spot-removal")
async def remove_spots(
    file: UploadFile = File(...),
    spots: str = None  # JSON string of spot coordinates and sizes
):
    """Remove spots/blemishes from image"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Create mask for spots
        mask = np.zeros(img.shape[:2], dtype=np.uint8)
        
        # Example spots (in production, parse from parameter)
        spots_list = [(100, 100, 5), (200, 150, 8), (300, 250, 6)]
        for x, y, radius in spots_list:
            cv2.circle(mask, (x, y), radius, 255, -1)
        
        # Inpaint to remove spots
        result = cv2.inpaint(img, mask, 5, cv2.INPAINT_TELEA)
        
        _, buffer = cv2.imencode('.jpg', result)
        return {"processed_image": buffer.tobytes().hex()[:100]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/red-eye-correction")
async def correct_red_eye(
    file: UploadFile = File(...),
    eyes: str = None  # JSON string of RedEyeCorrection list
):
    """Correct red-eye effect"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        result = img.copy()
        
        # Example red-eye correction (simplified)
        # In production: parse eyes parameter and correct each
        eyes_list = [(150, 150, 15), (200, 150, 15)]
        
        for center_x, center_y, radius in eyes_list:
            # Create circular mask
            mask = np.zeros(img.shape[:2], dtype=np.uint8)
            cv2.circle(mask, (center_x, center_y), radius, 255, -1)
            
            # Reduce red channel in the eye area
            result[:, :, 2] = np.where(
                mask == 255,
                result[:, :, 2] * 0.3,  # Reduce red
                result[:, :, 2]
            ).astype(np.uint8)
        
        _, buffer = cv2.imencode('.jpg', result)
        return {"processed_image": buffer.tobytes().hex()[:100]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skin-smoothing")
async def apply_skin_smoothing(
    file: UploadFile = File(...),
    params: Optional[str] = None  # JSON string of SkinSmoothingParams
):
    """Apply skin smoothing (frequency separation)"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Default parameters
        strength = 0.5
        radius = 5
        
        # Apply bilateral filter for skin smoothing
        # Preserves edges while smoothing
        result = cv2.bilateralFilter(img, radius, 75, 75)
        
        # Blend with original based on strength
        result = cv2.addWeighted(img, 1 - strength, result, strength, 0)
        
        _, buffer = cv2.imencode('.jpg', result)
        return {"processed_image": buffer.tobytes().hex()[:100]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/frequency-separation")
async def apply_frequency_separation(
    file: UploadFile = File(...),
    low_freq_blur: int = 5,
    high_freq_strength: float = 1.0
):
    """Apply frequency separation technique"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Convert to float
        img_float = img.astype(np.float32) / 255.0
        
        # Low frequency (color/tone)
        low_freq = cv2.GaussianBlur(img_float, (0, 0), low_freq_blur)
        
        # High frequency (texture/detail)
        high_freq = img_float - low_freq
        
        # Adjust high frequency strength
        high_freq = high_freq * high_freq_strength
        
        # Recombine
        result = low_freq + high_freq
        result = np.clip(result * 255, 0, 255).astype(np.uint8)
        
        _, buffer = cv2.imencode('.jpg', result)
        return {"processed_image": buffer.tobytes().hex()[:100]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sharpen-details")
async def sharpen_details(
    file: UploadFile = File(...),
    amount: float = 1.0,
    radius: float = 1.0,
    threshold: int = 0
):
    """Sharpen image details (unsharp mask)"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Gaussian blur
        blurred = cv2.GaussianBlur(img, (0, 0), radius)
        
        # Unsharp mask
        sharpened = cv2.addWeighted(img, 1 + amount, blurred, -amount, 0)
        
        # Apply threshold
        if threshold > 0:
            diff = cv2.absdiff(img, sharpened)
            mask = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY) > threshold
            result = np.where(mask[:, :, None], sharpened, img)
        else:
            result = sharpened
        
        _, buffer = cv2.imencode('.jpg', result)
        return {"processed_image": buffer.tobytes().hex()[:100]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
