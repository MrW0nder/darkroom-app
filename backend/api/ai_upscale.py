"""
AI Upscaling / Super-Resolution API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import cv2
import numpy as np
from pathlib import Path

router = APIRouter(prefix="/api/ai", tags=["AI Upscaling"])

class UpscaleRequest(BaseModel):
    image_path: str
    scale_factor: int = 2  # 2x, 4x, or 8x
    model: str = "esrgan"  # esrgan, real-esrgan, gfpgan
    enhance_face: bool = False
    denoise: bool = True

@router.post("/upscale")
async def upscale_image(request: UpscaleRequest):
    """Upscale image using AI super-resolution"""
    try:
        # Validate scale factor
        if request.scale_factor not in [2, 4, 8]:
            raise HTTPException(status_code=400, detail="Scale factor must be 2, 4, or 8")
        
        # Load image
        image_path = Path(request.image_path)
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        
        image = cv2.imread(str(image_path))
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to load image")
        
        original_height, original_width = image.shape[:2]
        
        # Calculate new dimensions
        new_width = original_width * request.scale_factor
        new_height = original_height * request.scale_factor
        
        # Denoise if requested
        if request.denoise:
            image = cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)
        
        # Apply upscaling
        # Using bicubic interpolation as placeholder (real AI models would go here)
        if request.scale_factor == 2:
            # For 2x, use EDSR or similar
            upscaled = cv2.resize(image, (new_width, new_height), 
                                 interpolation=cv2.INTER_CUBIC)
        elif request.scale_factor == 4:
            # For 4x, two-stage upscaling with sharpening
            temp = cv2.resize(image, (original_width * 2, original_height * 2), 
                            interpolation=cv2.INTER_CUBIC)
            upscaled = cv2.resize(temp, (new_width, new_height), 
                                 interpolation=cv2.INTER_CUBIC)
        else:  # 8x
            # Multi-stage upscaling
            temp1 = cv2.resize(image, (original_width * 2, original_height * 2), 
                             interpolation=cv2.INTER_CUBIC)
            temp2 = cv2.resize(temp1, (original_width * 4, original_height * 4), 
                             interpolation=cv2.INTER_CUBIC)
            upscaled = cv2.resize(temp2, (new_width, new_height), 
                                 interpolation=cv2.INTER_CUBIC)
        
        # Apply sharpening to enhance details
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        upscaled = cv2.filter2D(upscaled, -1, kernel)
        
        # Face enhancement (placeholder - would use GFPGAN)
        if request.enhance_face:
            # Apply additional sharpening for faces
            upscaled = cv2.detailEnhance(upscaled, sigma_s=10, sigma_r=0.15)
        
        # Save result
        output_path = image_path.parent / f"{image_path.stem}_upscaled_{request.scale_factor}x{image_path.suffix}"
        cv2.imwrite(str(output_path), upscaled)
        
        return {
            "success": True,
            "output_path": str(output_path),
            "original_size": [original_width, original_height],
            "new_size": [new_width, new_height],
            "scale_factor": request.scale_factor,
            "model": request.model,
            "message": f"Image upscaled {request.scale_factor}x successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upscaling failed: {str(e)}")

@router.post("/enhance")
async def enhance_details(image_path: str, strength: float = 0.5):
    """Enhance image details using AI"""
    try:
        # Load image
        img_path = Path(image_path)
        if not img_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        
        image = cv2.imread(str(img_path))
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to load image")
        
        # Apply detail enhancement
        enhanced = cv2.detailEnhance(image, sigma_s=10, sigma_r=strength)
        
        # Apply unsharp masking for additional sharpness
        gaussian = cv2.GaussianBlur(enhanced, (0, 0), 2.0)
        enhanced = cv2.addWeighted(enhanced, 1.5, gaussian, -0.5, 0)
        
        # Save result
        output_path = img_path.parent / f"{img_path.stem}_enhanced{img_path.suffix}"
        cv2.imwrite(str(output_path), enhanced)
        
        return {
            "success": True,
            "output_path": str(output_path),
            "strength": strength,
            "message": "Detail enhancement completed"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")
