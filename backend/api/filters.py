from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import cv2
import numpy as np
from io import BytesIO
from PIL import Image

router = APIRouter(prefix="/api/filters", tags=["filters"])


class FilterRequest(BaseModel):
    filter_type: str
    intensity: Optional[float] = 1.0


@router.post("/apply")
async def apply_filter(
    file: UploadFile = File(...),
    filter_type: str = "vintage",
    intensity: float = 1.0
):
    """Apply creative filter to image"""
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Apply filter based on type
        filtered_img = apply_filter_effect(img, filter_type, intensity)
        
        # Encode result
        _, buffer = cv2.imencode('.png', filtered_img)
        
        return {
            "success": True,
            "filter": filter_type,
            "intensity": intensity,
            "image_data": buffer.tobytes().hex()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_filters():
    """Get list of available filters"""
    return {
        "filters": [
            {"id": "vintage", "name": "Vintage", "category": "Creative"},
            {"id": "sepia", "name": "Sepia", "category": "Classic"},
            {"id": "bw", "name": "Black & White", "category": "Classic"},
            {"id": "warm", "name": "Warm", "category": "Enhancement"},
            {"id": "cool", "name": "Cool", "category": "Enhancement"},
            {"id": "vibrant", "name": "Vibrant", "category": "Enhancement"},
            {"id": "muted", "name": "Muted", "category": "Creative"},
            {"id": "hdr", "name": "HDR", "category": "Enhancement"},
            {"id": "soft_focus", "name": "Soft Focus", "category": "Artistic"},
            {"id": "sharpen", "name": "Sharpen", "category": "Enhancement"},
            {"id": "cross_process", "name": "Cross Process", "category": "Creative"},
            {"id": "split_tone", "name": "Split Tone", "category": "Artistic"},
            {"id": "vignette", "name": "Vignette", "category": "Artistic"},
            {"id": "film_grain", "name": "Film Grain", "category": "Creative"},
            {"id": "polaroid", "name": "Polaroid", "category": "Creative"}
        ]
    }


def apply_filter_effect(img, filter_type, intensity):
    """Apply specific filter effect to image"""
    img = img.astype(np.float32) / 255.0
    
    if filter_type == "vintage":
        # Vintage: reduced saturation, sepia tone, vignette
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        img_hsv[:,:,1] *= 0.6  # Reduce saturation
        img = cv2.cvtColor(img_hsv, cv2.COLOR_HSV2BGR)
        
        # Sepia tone
        sepia_kernel = np.array([[0.272, 0.534, 0.131],
                                  [0.349, 0.686, 0.168],
                                  [0.393, 0.769, 0.189]])
        img = cv2.transform(img, sepia_kernel)
    
    elif filter_type == "sepia":
        # Pure sepia tone
        sepia_kernel = np.array([[0.272, 0.534, 0.131],
                                  [0.349, 0.686, 0.168],
                                  [0.393, 0.769, 0.189]])
        img = cv2.transform(img, sepia_kernel)
    
    elif filter_type == "bw":
        # Black and white
        gray = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)
        img = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR).astype(np.float32) / 255.0
    
    elif filter_type == "warm":
        # Warm tone: increase red/yellow
        img[:,:,2] *= 1.1  # Increase red
        img[:,:,0] *= 0.9  # Decrease blue
    
    elif filter_type == "cool":
        # Cool tone: increase blue
        img[:,:,0] *= 1.1  # Increase blue
        img[:,:,2] *= 0.9  # Decrease red
    
    elif filter_type == "vibrant":
        # Increase saturation
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        img_hsv[:,:,1] *= 1.3
        img = cv2.cvtColor(img_hsv, cv2.COLOR_HSV2BGR)
    
    elif filter_type == "muted":
        # Decrease saturation
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        img_hsv[:,:,1] *= 0.5
        img = cv2.cvtColor(img_hsv, cv2.COLOR_HSV2BGR)
    
    elif filter_type == "hdr":
        # HDR effect
        img_uint8 = (img * 255).astype(np.uint8)
        img = cv2.detailEnhance(img_uint8, sigma_s=12, sigma_r=0.15).astype(np.float32) / 255.0
    
    elif filter_type == "soft_focus":
        # Soft focus blur
        img_uint8 = (img * 255).astype(np.uint8)
        blurred = cv2.GaussianBlur(img_uint8, (15, 15), 0)
        img = cv2.addWeighted(img_uint8, 0.7, blurred, 0.3, 0).astype(np.float32) / 255.0
    
    elif filter_type == "sharpen":
        # Sharpen
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        img_uint8 = (img * 255).astype(np.uint8)
        img = cv2.filter2D(img_uint8, -1, kernel).astype(np.float32) / 255.0
    
    elif filter_type == "cross_process":
        # Cross process effect
        img[:,:,2] *= 1.2  # Boost red
        img[:,:,1] *= 0.9  # Reduce green
        img[:,:,0] *= 1.1  # Boost blue
    
    elif filter_type == "split_tone":
        # Split tone: warm highlights, cool shadows
        gray = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        mask_highlights = (gray > 0.5).astype(np.float32)
        mask_shadows = (gray <= 0.5).astype(np.float32)
        
        img[:,:,2] += mask_highlights[:,:,np.newaxis] * 0.1  # Red in highlights
        img[:,:,0] += mask_shadows[:,:,np.newaxis] * 0.1    # Blue in shadows
    
    elif filter_type == "vignette":
        # Vignette effect
        rows, cols = img.shape[:2]
        X_resultant_kernel = cv2.getGaussianKernel(cols, cols/2)
        Y_resultant_kernel = cv2.getGaussianKernel(rows, rows/2)
        resultant_kernel = Y_resultant_kernel * X_resultant_kernel.T
        mask = resultant_kernel / resultant_kernel.max()
        img = img * mask[:,:,np.newaxis]
    
    elif filter_type == "film_grain":
        # Add film grain noise
        noise = np.random.normal(0, 0.02, img.shape).astype(np.float32)
        img = img + noise
    
    elif filter_type == "polaroid":
        # Polaroid effect: high contrast, faded colors
        img = np.power(img, 0.8)
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        img_hsv[:,:,1] *= 0.7
        img = cv2.cvtColor(img_hsv, cv2.COLOR_HSV2BGR)
    
    # Blend with original based on intensity
    img = img * intensity + (img * 0 + 1) * (1 - intensity) if intensity < 1.0 else img
    
    # Clip and convert back
    img = np.clip(img * 255, 0, 255).astype(np.uint8)
    return img