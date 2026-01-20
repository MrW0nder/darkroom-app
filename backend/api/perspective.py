"""
Perspective Correction API - Fix perspective distortion in architectural photography
Supports automatic and manual keystone correction, lens shift simulation
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Tuple
import numpy as np
import cv2
from io import BytesIO
from PIL import Image

router = APIRouter(prefix="/api/perspective", tags=["perspective"])


class PerspectiveSettings(BaseModel):
    """Perspective correction configuration"""
    mode: str = "auto"  # auto, manual, four_point
    vertical_correction: float = 0.0  # -100 to 100
    horizontal_correction: float = 0.0  # -100 to 100
    rotation: float = 0.0  # degrees
    crop_to_fit: bool = True
    aspect_ratio: Optional[str] = None  # "original", "16:9", "4:3", etc.


class FourPointCorrection(BaseModel):
    """Four-point perspective correction"""
    top_left: Tuple[float, float]
    top_right: Tuple[float, float]
    bottom_right: Tuple[float, float]
    bottom_left: Tuple[float, float]


@router.post("/correct")
async def correct_perspective(
    image: UploadFile = File(...),
    settings: Optional[str] = None
):
    """
    Apply perspective correction to image
    
    Args:
        image: Input image with perspective distortion
        settings: JSON string of PerspectiveSettings
        
    Returns:
        Corrected image with straightened perspective
    """
    try:
        # Load image
        contents = await image.read()
        img = Image.open(BytesIO(contents))
        img_array = np.array(img)
        
        # Parse settings
        import json
        config = PerspectiveSettings()
        if settings:
            config = PerspectiveSettings(**json.loads(settings))
        
        # Apply correction based on mode
        if config.mode == "auto":
            corrected = auto_perspective_correction(img_array)
        elif config.mode == "manual":
            corrected = manual_perspective_correction(
                img_array,
                config.vertical_correction,
                config.horizontal_correction,
                config.rotation
            )
        else:
            corrected = img_array
        
        # Crop to fit if requested
        if config.crop_to_fit:
            corrected = crop_to_content(corrected)
        
        # Convert to PIL Image
        result_img = Image.fromarray(corrected)
        output = BytesIO()
        result_img.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return {"status": "success", "image": output.getvalue().hex()}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Perspective correction failed: {str(e)}")


@router.post("/four-point")
async def four_point_correction(
    image: UploadFile = File(...),
    points: str = None  # JSON string of FourPointCorrection
):
    """
    Apply four-point perspective transformation
    User specifies four corners of the area to straighten
    """
    try:
        # Load image
        contents = await image.read()
        img = Image.open(BytesIO(contents))
        img_array = np.array(img)
        h, w = img_array.shape[:2]
        
        # Parse points
        import json
        if not points:
            raise HTTPException(status_code=400, detail="Four points required")
        
        point_config = FourPointCorrection(**json.loads(points))
        
        # Source points (in image coordinates)
        src_points = np.float32([
            point_config.top_left,
            point_config.top_right,
            point_config.bottom_right,
            point_config.bottom_left
        ])
        
        # Destination points (rectangle)
        # Calculate output dimensions
        width_top = np.linalg.norm(np.array(point_config.top_right) - np.array(point_config.top_left))
        width_bottom = np.linalg.norm(np.array(point_config.bottom_right) - np.array(point_config.bottom_left))
        max_width = int(max(width_top, width_bottom))
        
        height_left = np.linalg.norm(np.array(point_config.bottom_left) - np.array(point_config.top_left))
        height_right = np.linalg.norm(np.array(point_config.bottom_right) - np.array(point_config.top_right))
        max_height = int(max(height_left, height_right))
        
        dst_points = np.float32([
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1]
        ])
        
        # Compute perspective transform
        M = cv2.getPerspectiveTransform(src_points, dst_points)
        
        # Apply transform
        corrected = cv2.warpPerspective(img_array, M, (max_width, max_height))
        
        # Convert to PIL Image
        result_img = Image.fromarray(corrected)
        output = BytesIO()
        result_img.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return {"status": "success", "image": output.getvalue().hex()}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Four-point correction failed: {str(e)}")


def auto_perspective_correction(image: np.ndarray) -> np.ndarray:
    """Automatically detect and correct perspective distortion"""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    
    # Edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    
    # Hough line detection
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, 
                           minLineLength=100, maxLineGap=10)
    
    if lines is None:
        return image  # No lines detected, return original
    
    # Classify lines as vertical or horizontal
    vertical_lines = []
    horizontal_lines = []
    
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
        
        if angle < 45 or angle > 135:  # Horizontal
            horizontal_lines.append(line[0])
        else:  # Vertical
            vertical_lines.append(line[0])
    
    # Compute average angles
    if len(vertical_lines) > 0:
        vertical_angles = [np.arctan2(y2 - y1, x2 - x1) 
                          for x1, y1, x2, y2 in vertical_lines]
        avg_vertical_angle = np.median(vertical_angles)
        
        # Compute rotation to make vertical lines truly vertical
        rotation_angle = -(avg_vertical_angle * 180 / np.pi - 90)
    else:
        rotation_angle = 0
    
    # Apply rotation
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, rotation_angle, 1.0)
    
    # Compute new image size to accommodate rotation
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))
    
    # Adjust rotation matrix
    M[0, 2] += (new_w / 2) - center[0]
    M[1, 2] += (new_h / 2) - center[1]
    
    corrected = cv2.warpAffine(image, M, (new_w, new_h), 
                              flags=cv2.INTER_LINEAR,
                              borderMode=cv2.BORDER_REPLICATE)
    
    return corrected


def manual_perspective_correction(
    image: np.ndarray,
    vertical: float,
    horizontal: float,
    rotation: float
) -> np.ndarray:
    """Apply manual perspective correction with sliders"""
    h, w = image.shape[:2]
    
    # Create perspective transform matrix
    # Vertical keystone correction
    v_shift = vertical / 100.0 * h / 2
    
    # Horizontal keystone correction
    h_shift = horizontal / 100.0 * w / 2
    
    # Source and destination points for perspective transform
    src_points = np.float32([
        [0, 0],
        [w, 0],
        [w, h],
        [0, h]
    ])
    
    dst_points = np.float32([
        [h_shift, v_shift],
        [w - h_shift, v_shift],
        [w + h_shift, h - v_shift],
        [-h_shift, h - v_shift]
    ])
    
    # Compute perspective transform
    M = cv2.getPerspectiveTransform(src_points, dst_points)
    
    # Apply perspective transform
    corrected = cv2.warpPerspective(image, M, (w, h),
                                    flags=cv2.INTER_LINEAR,
                                    borderMode=cv2.BORDER_REPLICATE)
    
    # Apply rotation if specified
    if abs(rotation) > 0.01:
        center = (w // 2, h // 2)
        rot_matrix = cv2.getRotationMatrix2D(center, rotation, 1.0)
        corrected = cv2.warpAffine(corrected, rot_matrix, (w, h),
                                  flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_REPLICATE)
    
    return corrected


def crop_to_content(image: np.ndarray) -> np.ndarray:
    """Crop image to remove black borders after perspective correction"""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    
    # Threshold
    _, thresh = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return image
    
    # Get largest contour bounding box
    largest_contour = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest_contour)
    
    # Crop with small margin
    margin = 5
    x = max(0, x + margin)
    y = max(0, y + margin)
    w = min(image.shape[1] - x, w - 2*margin)
    h = min(image.shape[0] - y, h - 2*margin)
    
    cropped = image[y:y+h, x:x+w]
    
    return cropped


@router.post("/detect-lines")
async def detect_perspective_lines(
    image: UploadFile = File(...),
    line_type: str = "all"  # all, vertical, horizontal
):
    """
    Detect lines in image for perspective correction guidance
    Returns line coordinates and angles
    """
    try:
        # Load image
        contents = await image.read()
        img = Image.open(BytesIO(contents))
        img_array = np.array(img)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        # Edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Hough line detection
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=80,
                               minLineLength=50, maxLineGap=10)
        
        if lines is None:
            return {"status": "success", "lines": []}
        
        # Classify and filter lines
        detected_lines = []
        
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi
            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            
            # Classify line
            if abs(angle) < 30 or abs(angle) > 150:
                line_class = "horizontal"
            elif 60 < abs(angle) < 120:
                line_class = "vertical"
            else:
                line_class = "diagonal"
            
            # Filter by requested type
            if line_type == "all" or line_class == line_type:
                detected_lines.append({
                    "x1": int(x1), "y1": int(y1),
                    "x2": int(x2), "y2": int(y2),
                    "angle": float(angle),
                    "length": float(length),
                    "type": line_class
                })
        
        return {"status": "success", "lines": detected_lines}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Line detection failed: {str(e)}")


@router.post("/lens-shift")
async def simulate_lens_shift(
    image: UploadFile = File(...),
    shift_x: float = 0.0,  # -100 to 100 (percentage)
    shift_y: float = 0.0   # -100 to 100 (percentage)
):
    """
    Simulate tilt-shift lens effect
    Useful for architectural photography without actual tilt-shift lens
    """
    try:
        # Load image
        contents = await image.read()
        img = Image.open(BytesIO(contents))
        img_array = np.array(img)
        h, w = img_array.shape[:2]
        
        # Convert percentage to pixel shift
        dx = shift_x / 100.0 * w
        dy = shift_y / 100.0 * h
        
        # Create transformation matrix for shift
        M = np.float32([
            [1, 0, dx],
            [0, 1, dy]
        ])
        
        # Apply shift
        shifted = cv2.warpAffine(img_array, M, (w, h),
                                flags=cv2.INTER_LINEAR,
                                borderMode=cv2.BORDER_REPLICATE)
        
        # Convert to PIL Image
        result_img = Image.fromarray(shifted)
        output = BytesIO()
        result_img.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return {"status": "success", "image": output.getvalue().hex()}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lens shift simulation failed: {str(e)}")