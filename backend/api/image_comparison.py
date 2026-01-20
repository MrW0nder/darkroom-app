from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import cv2
import numpy as np

router = APIRouter(prefix="/api/comparison", tags=["image_comparison"])

class ImageRating(BaseModel):
    image_id: str
    rating: int  # 1-5 stars
    flag: Optional[str] = None  # pick, reject, None

class ComparisonSession(BaseModel):
    session_id: str
    images: List[str]
    ratings: List[ImageRating]

@router.post("/create-session")
async def create_comparison_session(
    images: List[UploadFile] = File(...),
    mode: str = Form("side-by-side")  # side-by-side, survey, grid
):
    """
    Create multi-image comparison session
    
    Args:
        images: List of images to compare (2-16 images)
        mode: Comparison mode (side-by-side, survey, grid)
    """
    if len(images) < 2 or len(images) > 16:
        raise HTTPException(status_code=400, detail="Number of images must be between 2 and 16")
    
    # Load and process images
    processed_images = []
    for idx, img_file in enumerate(images):
        img_bytes = await img_file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is not None:
            processed_images.append({
                "id": f"img_{idx}",
                "filename": img_file.filename,
                "dimensions": f"{img.shape[1]}x{img.shape[0]}",
                "size": len(img_bytes)
            })
    
    return {
        "status": "success",
        "session_id": f"session_{hash(tuple([img['id'] for img in processed_images]))}",
        "images": processed_images,
        "mode": mode,
        "num_images": len(processed_images)
    }


@router.post("/rate-image")
async def rate_image(rating: ImageRating):
    """
    Rate an image in comparison session
    
    Args:
        rating: Image rating with id, stars (1-5), and optional flag (pick/reject)
    """
    if not (1 <= rating.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    if rating.flag and rating.flag not in ["pick", "reject"]:
        raise HTTPException(status_code=400, detail="Flag must be 'pick' or 'reject'")
    
    return {
        "status": "success",
        "image_id": rating.image_id,
        "rating": rating.rating,
        "flag": rating.flag
    }


@router.post("/compare-metadata")
async def compare_metadata(images: List[UploadFile] = File(...)):
    """
    Compare metadata across multiple images
    
    Returns: Comparison table of EXIF data
    """
    metadata_comparison = []
    
    for idx, img_file in enumerate(images):
        img_bytes = await img_file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is not None:
            metadata_comparison.append({
                "image_id": f"img_{idx}",
                "filename": img_file.filename,
                "dimensions": f"{img.shape[1]}x{img.shape[0]}",
                "channels": img.shape[2] if len(img.shape) > 2 else 1,
                # Add more metadata extraction here
                "mean_brightness": float(np.mean(img)),
                "std_brightness": float(np.std(img))
            })
    
    return {
        "status": "success",
        "comparison": metadata_comparison
    }


@router.post("/survey-mode")
async def survey_mode(
    images: List[UploadFile] = File(...),
    grid_size: Optional[str] = Form("auto")  # auto, 2x2, 3x3, 4x4
):
    """
    Display images in survey/grid mode for quick comparison
    
    Args:
        images: Images to display in grid
        grid_size: Grid layout (auto, 2x2, 3x3, 4x4)
    """
    num_images = len(images)
    
    if grid_size == "auto":
        # Auto-calculate grid size
        if num_images <= 4:
            grid = "2x2"
        elif num_images <= 9:
            grid = "3x3"
        else:
            grid = "4x4"
    else:
        grid = grid_size
    
    rows, cols = map(int, grid.split('x'))
    
    return {
        "status": "success",
        "num_images": num_images,
        "grid_layout": grid,
        "rows": rows,
        "cols": cols,
        "max_images": rows * cols
    }


@router.post("/sync-zoom")
async def sync_zoom_pan(
    zoom_level: float = Form(...),
    pan_x: int = Form(...),
    pan_y: int = Form(...)
):
    """
    Synchronize zoom and pan across all images in comparison
    
    Args:
        zoom_level: Zoom level (0.1 to 10.0)
        pan_x: Pan X offset
        pan_y: Pan Y offset
    """
    if not (0.1 <= zoom_level <= 10.0):
        raise HTTPException(status_code=400, detail="Zoom level must be between 0.1 and 10.0")
    
    return {
        "status": "success",
        "zoom_level": zoom_level,
        "pan_x": pan_x,
        "pan_y": pan_y
    }
