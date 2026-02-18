"""
Mask Refinement API
Provides parametric, drawn, and raster masks with advanced refinement tools.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Tuple
import cv2
import numpy as np

router = APIRouter(prefix="/api/masks", tags=["masks"])


class MaskConfig(BaseModel):
    mask_type: str  # "parametric", "drawn", "raster"
    feather_radius: float = 0.0
    blur_amount: float = 0.0
    density: float = 1.0  # 0.0 to 1.0
    invert: bool = False


class ParametricMaskConfig(BaseModel):
    exposure_range: Optional[Tuple[float, float]] = None  # Min/max exposure values
    color_range: Optional[Dict[str, Tuple[float, float]]] = None  # RGB ranges
    luminance_range: Optional[Tuple[float, float]] = None  # Min/max luminance
    saturation_range: Optional[Tuple[float, float]] = None  # Min/max saturation


class DrawnMaskConfig(BaseModel):
    mask_type: str  # "brush", "gradient", "radial"
    points: List[Dict[str, float]]  # For brush strokes
    center: Optional[Dict[str, float]] = None  # For radial/gradient
    radius: Optional[float] = None  # For radial
    angle: Optional[float] = None  # For gradient
    feather: float = 50.0


@router.post("/create/parametric")
async def create_parametric_mask(
    image: UploadFile = File(...),
    config: ParametricMaskConfig = None
):
    """
    Create a parametric mask based on image properties.
    """
    try:
        # Read image
        img_bytes = await image.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        h, w = img.shape[:2]
        mask = np.ones((h, w), dtype=np.float32)
        
        # Convert to different color spaces for analysis
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        
        # Apply luminance range if specified
        if config and config.luminance_range:
            l_channel = img_lab[:, :, 0].astype(np.float32) / 255.0
            min_lum, max_lum = config.luminance_range
            lum_mask = np.logical_and(l_channel >= min_lum, l_channel <= max_lum).astype(np.float32)
            mask *= lum_mask
        
        # Apply saturation range if specified
        if config and config.saturation_range:
            s_channel = img_hsv[:, :, 1].astype(np.float32) / 255.0
            min_sat, max_sat = config.saturation_range
            sat_mask = np.logical_and(s_channel >= min_sat, s_channel <= max_sat).astype(np.float32)
            mask *= sat_mask
        
        # Apply color range if specified
        if config and config.color_range:
            color_mask = np.ones((h, w), dtype=np.float32)
            for channel_name, (min_val, max_val) in config.color_range.items():
                if channel_name == 'R':
                    channel = img[:, :, 2].astype(np.float32) / 255.0
                elif channel_name == 'G':
                    channel = img[:, :, 1].astype(np.float32) / 255.0
                elif channel_name == 'B':
                    channel = img[:, :, 0].astype(np.float32) / 255.0
                else:
                    continue
                
                ch_mask = np.logical_and(channel >= min_val, channel <= max_val).astype(np.float32)
                color_mask *= ch_mask
            
            mask *= color_mask
        
        # Convert mask to uint8
        mask_uint8 = (mask * 255).astype(np.uint8)
        
        # Encode mask
        _, buffer = cv2.imencode('.png', mask_uint8)
        
        return {
            "status": "success",
            "mask_type": "parametric",
            "dimensions": {"width": w, "height": h},
            "coverage_percent": float(np.mean(mask) * 100),
            "mask_data": buffer.tobytes().hex()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create/drawn")
async def create_drawn_mask(
    width: int,
    height: int,
    config: DrawnMaskConfig
):
    """
    Create a drawn mask (brush, gradient, or radial).
    """
    try:
        mask = np.zeros((height, width), dtype=np.float32)
        
        if config.mask_type == "brush":
            # Paint brush strokes
            for point in config.points:
                x = int(point['x'])
                y = int(point['y'])
                brush_size = int(point.get('size', 50))
                opacity = point.get('opacity', 1.0)
                
                cv2.circle(mask, (x, y), brush_size, opacity, -1)
        
        elif config.mask_type == "radial":
            # Create radial gradient mask
            if config.center and config.radius:
                center_x = int(config.center['x'])
                center_y = int(config.center['y'])
                radius = int(config.radius)
                
                y, x = np.ogrid[:height, :width]
                dist_from_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)
                
                # Create radial gradient with feathering
                mask = np.clip(1.0 - (dist_from_center / radius), 0, 1).astype(np.float32)
                
                # Apply feathering
                if config.feather > 0:
                    feather_radius = int(config.feather)
                    mask = cv2.GaussianBlur(mask, (0, 0), feather_radius / 3)
        
        elif config.mask_type == "gradient":
            # Create linear gradient mask
            if config.center and config.angle is not None:
                center_x = config.center['x']
                center_y = config.center['y']
                angle_rad = np.radians(config.angle)
                
                y, x = np.ogrid[:height, :width]
                
                # Calculate distance along gradient direction
                dx = x - center_x
                dy = y - center_y
                
                # Rotate coordinates
                dist = dx * np.cos(angle_rad) + dy * np.sin(angle_rad)
                
                # Normalize to 0-1 range
                dist_min = dist.min()
                dist_max = dist.max()
                if dist_max > dist_min:
                    mask = ((dist - dist_min) / (dist_max - dist_min)).astype(np.float32)
                
                # Apply feathering
                if config.feather > 0:
                    feather_radius = int(config.feather)
                    mask = cv2.GaussianBlur(mask, (0, 0), feather_radius / 3)
        
        # Clip mask to valid range
        mask = np.clip(mask, 0, 1)
        
        # Convert to uint8
        mask_uint8 = (mask * 255).astype(np.uint8)
        
        # Encode mask
        _, buffer = cv2.imencode('.png', mask_uint8)
        
        return {
            "status": "success",
            "mask_type": config.mask_type,
            "dimensions": {"width": width, "height": height},
            "coverage_percent": float(np.mean(mask) * 100),
            "mask_data": buffer.tobytes().hex()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine")
async def refine_mask(
    mask: UploadFile = File(...),
    config: MaskConfig = None
):
    """
    Refine an existing mask with feathering, blur, density, and inversion.
    """
    try:
        # Read mask
        mask_bytes = await mask.read()
        mask_array = np.frombuffer(mask_bytes, np.uint8)
        mask_img = cv2.imdecode(mask_array, cv2.IMREAD_GRAYSCALE)
        
        if mask_img is None:
            raise HTTPException(status_code=400, detail="Invalid mask")
        
        # Convert to float
        mask_float = mask_img.astype(np.float32) / 255.0
        
        # Apply feathering
        if config and config.feather_radius > 0:
            kernel_size = int(config.feather_radius * 2) + 1
            mask_float = cv2.GaussianBlur(mask_float, (kernel_size, kernel_size), config.feather_radius / 3)
        
        # Apply blur
        if config and config.blur_amount > 0:
            blur_size = int(config.blur_amount * 2) + 1
            mask_float = cv2.GaussianBlur(mask_float, (blur_size, blur_size), config.blur_amount / 3)
        
        # Apply density
        if config and config.density != 1.0:
            mask_float = mask_float * config.density
        
        # Apply inversion
        if config and config.invert:
            mask_float = 1.0 - mask_float
        
        # Clip to valid range
        mask_float = np.clip(mask_float, 0, 1)
        
        # Convert back to uint8
        refined_mask = (mask_float * 255).astype(np.uint8)
        
        # Encode refined mask
        _, buffer = cv2.imencode('.png', refined_mask)
        
        return {
            "status": "success",
            "refinements_applied": {
                "feather": config.feather_radius if config else 0,
                "blur": config.blur_amount if config else 0,
                "density": config.density if config else 1.0,
                "inverted": config.invert if config else False
            },
            "coverage_percent": float(np.mean(mask_float) * 100),
            "mask_data": buffer.tobytes().hex()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/combine")
async def combine_masks(
    masks: List[UploadFile] = File(...),
    operation: str = "add"  # "add", "subtract", "intersect", "union"
):
    """
    Combine multiple masks using specified operation.
    """
    try:
        if len(masks) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 masks to combine")
        
        # Read first mask
        mask1_bytes = await masks[0].read()
        mask1_array = np.frombuffer(mask1_bytes, np.uint8)
        result = cv2.imdecode(mask1_array, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
        
        # Combine with other masks
        for mask_file in masks[1:]:
            mask_bytes = await mask_file.read()
            mask_array = np.frombuffer(mask_bytes, np.uint8)
            mask = cv2.imdecode(mask_array, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
            
            if operation == "add":
                result = np.clip(result + mask, 0, 1)
            elif operation == "subtract":
                result = np.clip(result - mask, 0, 1)
            elif operation == "intersect":
                result = np.minimum(result, mask)
            elif operation == "union":
                result = np.maximum(result, mask)
        
        # Convert to uint8
        combined_mask = (result * 255).astype(np.uint8)
        
        # Encode
        _, buffer = cv2.imencode('.png', combined_mask)
        
        return {
            "status": "success",
            "operation": operation,
            "masks_combined": len(masks),
            "coverage_percent": float(np.mean(result) * 100),
            "mask_data": buffer.tobytes().hex()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/edge-detect")
async def detect_edges_for_mask(
    image: UploadFile = File(...),
    threshold1: int = 50,
    threshold2: int = 150
):
    """
    Detect edges in image to assist with mask creation.
    """
    try:
        # Read image
        img_bytes = await image.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        # Detect edges using Canny
        edges = cv2.Canny(img, threshold1, threshold2)
        
        # Dilate edges slightly to make them more visible
        kernel = np.ones((3, 3), np.uint8)
        edges_dilated = cv2.dilate(edges, kernel, iterations=1)
        
        # Encode
        _, buffer = cv2.imencode('.png', edges_dilated)
        
        return {
            "status": "success",
            "edge_detection_params": {
                "threshold1": threshold1,
                "threshold2": threshold2
            },
            "edge_data": buffer.tobytes().hex()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))