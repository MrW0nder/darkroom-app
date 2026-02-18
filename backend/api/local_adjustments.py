from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Tuple
import cv2
import numpy as np

router = APIRouter(prefix="/api/local-adjustments", tags=["local-adjustments"])

class Point(BaseModel):
    x: float
    y: float

class RadialFilterRequest(BaseModel):
    image_path: str
    center_x: float
    center_y: float
    radius_x: float
    radius_y: float
    feather: float = 50.0
    exposure: float = 0.0
    contrast: float = 0.0
    highlights: float = 0.0
    shadows: float = 0.0
    saturation: float = 0.0
    invert: bool = False

class GradientFilterRequest(BaseModel):
    image_path: str
    start_x: float
    start_y: float
    end_x: float
    end_y: float
    feather: float = 100.0
    exposure: float = 0.0
    contrast: float = 0.0
    highlights: float = 0.0
    shadows: float = 0.0
    saturation: float = 0.0
    rotation: float = 0.0

class AdjustmentBrushRequest(BaseModel):
    image_path: str
    brush_strokes: List[List[Point]]
    brush_size: int = 50
    feather: float = 50.0
    exposure: float = 0.0
    contrast: float = 0.0
    clarity: float = 0.0
    saturation: float = 0.0

def create_radial_mask(shape: Tuple[int, int], center_x: float, center_y: float, 
                       radius_x: float, radius_y: float, feather: float, invert: bool = False) -> np.ndarray:
    """Create radial gradient mask"""
    h, w = shape[:2]
    
    # Create meshgrid
    y, x = np.ogrid[:h, :w]
    
    # Calculate elliptical distance
    dx = (x - center_x * w) / (radius_x * w)
    dy = (y - center_y * h) / (radius_y * h)
    distance = np.sqrt(dx**2 + dy**2)
    
    # Create gradient with feathering
    feather_normalized = feather / 100.0
    mask = np.clip((distance - 1.0) / feather_normalized + 1.0, 0, 1)
    
    if invert:
        mask = 1 - mask
    
    return mask.astype(np.float32)

def create_gradient_mask(shape: Tuple[int, int], start_x: float, start_y: float,
                         end_x: float, end_y: float, feather: float, rotation: float = 0.0) -> np.ndarray:
    """Create linear gradient mask"""
    h, w = shape[:2]
    
    # Convert normalized coordinates to pixels
    start = np.array([start_x * w, start_y * h])
    end = np.array([end_x * w, end_y * h])
    
    # Create meshgrid
    y, x = np.ogrid[:h, :w]
    points = np.stack([x.ravel(), y.ravel()], axis=1)
    
    # Calculate perpendicular distance to gradient line
    gradient_vec = end - start
    gradient_length = np.linalg.norm(gradient_vec)
    
    if gradient_length < 1:
        return np.ones((h, w), dtype=np.float32)
    
    gradient_unit = gradient_vec / gradient_length
    
    # Project each point onto gradient line
    to_points = points - start
    projections = np.dot(to_points, gradient_unit)
    
    # Create gradient
    feather_pixels = feather
    mask = np.clip(projections / (gradient_length + feather_pixels), 0, 1)
    mask = mask.reshape(h, w)
    
    return mask.astype(np.float32)

def create_brush_mask(shape: Tuple[int, int], strokes: List[List[Point]], 
                      brush_size: int, feather: float) -> np.ndarray:
    """Create mask from brush strokes"""
    h, w = shape[:2]
    mask = np.zeros((h, w), dtype=np.float32)
    
    for stroke in strokes:
        if len(stroke) < 2:
            continue
        
        # Convert points to pixel coordinates
        points = [(int(p.x * w), int(p.y * h)) for p in stroke]
        
        # Draw stroke
        for i in range(len(points) - 1):
            cv2.line(mask, points[i], points[i+1], 1.0, brush_size)
        
        # Draw circles at each point for smooth brush
        for point in points:
            cv2.circle(mask, point, brush_size // 2, 1.0, -1)
    
    # Apply feathering with Gaussian blur
    if feather > 0:
        kernel_size = int(feather) * 2 + 1
        mask = cv2.GaussianBlur(mask, (kernel_size, kernel_size), feather / 3.0)
    
    return mask

def apply_local_adjustments(image: np.ndarray, mask: np.ndarray, 
                           exposure: float = 0.0, contrast: float = 0.0,
                           highlights: float = 0.0, shadows: float = 0.0,
                           saturation: float = 0.0, clarity: float = 0.0) -> np.ndarray:
    """Apply adjustments using mask"""
    adjusted = image.copy().astype(np.float32)
    
    # Expand mask to 3 channels
    mask_3d = mask[:, :, np.newaxis] if len(mask.shape) == 2 else mask
    
    # Apply exposure
    if abs(exposure) > 0.001:
        exposure_factor = 2 ** (exposure / 100.0)
        adjusted = adjusted * exposure_factor
    
    # Apply contrast
    if abs(contrast) > 0.001:
        mid_point = 127.5
        contrast_factor = (contrast / 100.0) + 1.0
        adjusted = (adjusted - mid_point) * contrast_factor + mid_point
    
    # Apply saturation
    if abs(saturation) > 0.001:
        hsv = cv2.cvtColor(adjusted.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
        sat_factor = (saturation / 100.0) + 1.0
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * sat_factor, 0, 255)
        adjusted = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
    
    # Apply clarity (local contrast)
    if abs(clarity) > 0.001:
        blurred = cv2.GaussianBlur(adjusted, (0, 0), 5.0)
        clarity_factor = clarity / 100.0
        adjusted = adjusted + (adjusted - blurred) * clarity_factor
    
    # Blend with original using mask
    adjusted = np.clip(adjusted, 0, 255)
    result = image * (1 - mask_3d) + adjusted * mask_3d
    
    return np.clip(result, 0, 255).astype(np.uint8)

@router.post("/radial")
async def apply_radial_filter(request: RadialFilterRequest):
    """Apply radial/elliptical local adjustment"""
    try:
        image = cv2.imread(request.image_path)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        # Create radial mask
        mask = create_radial_mask(
            image.shape,
            request.center_x,
            request.center_y,
            request.radius_x,
            request.radius_y,
            request.feather,
            request.invert
        )
        
        # Apply adjustments
        result = apply_local_adjustments(
            image, mask,
            exposure=request.exposure,
            contrast=request.contrast,
            highlights=request.highlights,
            shadows=request.shadows,
            saturation=request.saturation
        )
        
        # Save result
        output_path = request.image_path.replace(".", "_radial_adjusted.")
        cv2.imwrite(output_path, result)
        
        return {"status": "success", "output_path": output_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gradient")
async def apply_gradient_filter(request: GradientFilterRequest):
    """Apply linear gradient local adjustment"""
    try:
        image = cv2.imread(request.image_path)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        # Create gradient mask
        mask = create_gradient_mask(
            image.shape,
            request.start_x,
            request.start_y,
            request.end_x,
            request.end_y,
            request.feather,
            request.rotation
        )
        
        # Apply adjustments
        result = apply_local_adjustments(
            image, mask,
            exposure=request.exposure,
            contrast=request.contrast,
            highlights=request.highlights,
            shadows=request.shadows,
            saturation=request.saturation
        )
        
        # Save result
        output_path = request.image_path.replace(".", "_gradient_adjusted.")
        cv2.imwrite(output_path, result)
        
        return {"status": "success", "output_path": output_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/brush")
async def apply_adjustment_brush(request: AdjustmentBrushRequest):
    """Apply brush-based local adjustment"""
    try:
        image = cv2.imread(request.image_path)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        # Create brush mask
        mask = create_brush_mask(
            image.shape,
            request.brush_strokes,
            request.brush_size,
            request.feather
        )
        
        # Apply adjustments
        result = apply_local_adjustments(
            image, mask,
            exposure=request.exposure,
            contrast=request.contrast,
            saturation=request.saturation,
            clarity=request.clarity
        )
        
        # Save result
        output_path = request.image_path.replace(".", "_brush_adjusted.")
        cv2.imwrite(output_path, result)
        
        return {"status": "success", "output_path": output_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))