"""
AI Inpainting API - Object removal and content-aware fill
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import cv2
import numpy as np
from pathlib import Path

router = APIRouter(prefix="/api/ai", tags=["AI Inpainting"])

class InpaintRequest(BaseModel):
    image_path: str
    mask_coordinates: List[List[int]]  # List of [x, y] points defining mask
    quality_mode: str = "balanced"  # fast, balanced, quality
    
class RemoveObjectRequest(BaseModel):
    image_path: str
    object_bbox: List[int]  # [x, y, width, height]
    quality_mode: str = "balanced"

@router.post("/inpaint")
async def inpaint_image(request: InpaintRequest):
    """Remove objects using AI inpainting with custom mask"""
    try:
        # Load image
        image_path = Path(request.image_path)
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        
        image = cv2.imread(str(image_path))
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to load image")
        
        # Create mask from coordinates
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        points = np.array(request.mask_coordinates, dtype=np.int32)
        cv2.fillPoly(mask, [points], 255)
        
        # Apply inpainting based on quality mode
        if request.quality_mode == "fast":
            # Fast inpainting using OpenCV
            result = cv2.inpaint(image, mask, 3, cv2.INPAINT_TELEA)
        elif request.quality_mode == "balanced":
            # Balanced using NS algorithm
            result = cv2.inpaint(image, mask, 5, cv2.INPAINT_NS)
        else:  # quality
            # High quality - would use AI model (placeholder)
            result = cv2.inpaint(image, mask, 7, cv2.INPAINT_NS)
        
        # Save result
        output_path = image_path.parent / f"{image_path.stem}_inpainted{image_path.suffix}"
        cv2.imwrite(str(output_path), result)
        
        return {
            "success": True,
            "output_path": str(output_path),
            "mode": request.quality_mode,
            "message": "Inpainting completed"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {str(e)}")

@router.post("/remove-object")
async def remove_object(request: RemoveObjectRequest):
    """Remove detected object using bounding box"""
    try:
        # Load image
        image_path = Path(request.image_path)
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        
        image = cv2.imread(str(image_path))
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to load image")
        
        # Create mask from bounding box
        x, y, w, h = request.object_bbox
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        
        # Create slightly larger mask with feathered edges
        padding = 10
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(image.shape[1], x + w + padding)
        y2 = min(image.shape[0], y + h + padding)
        
        mask[y1:y2, x1:x2] = 255
        
        # Apply Gaussian blur to mask for smooth edges
        mask = cv2.GaussianBlur(mask, (21, 21), 11)
        
        # Inpaint
        if request.quality_mode == "fast":
            result = cv2.inpaint(image, mask, 3, cv2.INPAINT_TELEA)
        elif request.quality_mode == "balanced":
            result = cv2.inpaint(image, mask, 5, cv2.INPAINT_NS)
        else:
            result = cv2.inpaint(image, mask, 7, cv2.INPAINT_NS)
        
        # Save result
        output_path = image_path.parent / f"{image_path.stem}_object_removed{image_path.suffix}"
        cv2.imwrite(str(output_path), result)
        
        return {
            "success": True,
            "output_path": str(output_path),
            "bbox": request.object_bbox,
            "mode": request.quality_mode,
            "message": "Object removed successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Object removal failed: {str(e)}")

@router.post("/erase")
async def erase_with_ai(
    file: UploadFile = File(...),
    brush_strokes: str = Form(...)  # JSON string of stroke coordinates
):
    """Free-form eraser with AI fill"""
    try:
        import json
        
        # Read uploaded image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to decode image")
        
        # Parse brush strokes
        strokes = json.loads(brush_strokes)
        
        # Create mask from brush strokes
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        
        for stroke in strokes:
            points = np.array(stroke["points"], dtype=np.int32)
            if len(points) > 1:
                for i in range(len(points) - 1):
                    cv2.line(mask, tuple(points[i]), tuple(points[i+1]), 255, 
                            stroke.get("size", 10))
        
        # Apply inpainting
        result = cv2.inpaint(image, mask, 5, cv2.INPAINT_NS)
        
        # Encode result
        _, buffer = cv2.imencode('.png', result)
        
        return {
            "success": True,
            "image_data": buffer.tobytes().hex(),
            "message": "Erasing completed with AI fill"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erasing failed: {str(e)}")
