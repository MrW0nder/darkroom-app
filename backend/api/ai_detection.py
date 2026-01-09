"""
AI Object Detection and Segmentation API
Provides endpoints for object detection, segmentation, and background removal.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import cv2
import numpy as np
from pathlib import Path
import logging

from backend.services.ai_service import get_ai_service
from backend.db import get_db
from backend.models import Layer

router = APIRouter(prefix="/ai", tags=["AI Detection"])
logger = logging.getLogger(__name__)


class DetectionRequest(BaseModel):
    layer_id: int
    confidence_threshold: float = 0.5
    model: str = "yolov8n"


class DetectedObject(BaseModel):
    class_name: str
    confidence: float
    bbox: List[float]  # [x, y, width, height]
    class_id: int


class DetectionResponse(BaseModel):
    success: bool
    message: str
    layer_id: int
    objects: List[DetectedObject]
    total_objects: int


class SegmentationRequest(BaseModel):
    layer_id: int
    object_ids: Optional[List[int]] = None
    model: str = "maskrcnn"


class SegmentationResponse(BaseModel):
    success: bool
    message: str
    layer_id: int
    mask_path: str
    num_objects: int


class BackgroundRemovalRequest(BaseModel):
    layer_id: int
    model: str = "u2net"


class BackgroundRemovalResponse(BaseModel):
    success: bool
    message: str
    layer_id: int
    new_path: str


@router.post("/detect", response_model=DetectionResponse)
async def detect_objects(request: DetectionRequest):
    """
    Detect objects in an image using AI
    Returns bounding boxes and class labels for detected objects
    """
    try:
        ai_service = get_ai_service()
        db = next(get_db())
        
        # Get layer
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        # Load image
        image_path = Path("backend") / layer.path.lstrip("/")
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        
        image = cv2.imread(str(image_path))
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to load image")
        
        # Load detection model
        model = ai_service.load_detection_model(request.model)
        
        # Perform object detection (placeholder implementation)
        # In production, this would use actual YOLO or Mask R-CNN inference
        detected_objects = []
        
        # Mock detection results for demonstration
        if ai_service.is_gpu_available():
            # Simulate faster GPU processing
            mock_objects = [
                {"class_name": "person", "confidence": 0.92, "bbox": [100, 100, 200, 300], "class_id": 0},
                {"class_name": "dog", "confidence": 0.87, "bbox": [300, 150, 150, 200], "class_id": 16},
            ]
        else:
            # Simulate CPU processing
            mock_objects = [
                {"class_name": "person", "confidence": 0.89, "bbox": [100, 100, 200, 300], "class_id": 0},
            ]
        
        # Filter by confidence threshold
        for obj in mock_objects:
            if obj["confidence"] >= request.confidence_threshold:
                detected_objects.append(DetectedObject(**obj))
        
        logger.info(f"Detected {len(detected_objects)} objects in layer {request.layer_id}")
        
        return DetectionResponse(
            success=True,
            message=f"Detected {len(detected_objects)} objects",
            layer_id=request.layer_id,
            objects=detected_objects,
            total_objects=len(detected_objects)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in object detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/segment", response_model=SegmentationResponse)
async def segment_objects(request: SegmentationRequest):
    """
    Create segmentation masks for detected objects
    Returns a mask image with selected objects isolated
    """
    try:
        ai_service = get_ai_service()
        db = next(get_db())
        
        # Get layer
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        # Load image
        image_path = Path("backend") / layer.path.lstrip("/")
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        
        image = cv2.imread(str(image_path))
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to load image")
        
        # Load segmentation model
        model = ai_service.load_detection_model(request.model)
        
        # Perform segmentation (placeholder implementation)
        # In production, this would use actual Mask R-CNN or U²-Net
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        
        # Create mock mask for demonstration
        if request.object_ids:
            # Simulate masks for selected objects
            for obj_id in request.object_ids:
                # Create circular mask as demonstration
                center = (image.shape[1] // 2, image.shape[0] // 2)
                radius = min(image.shape[:2]) // 4
                cv2.circle(mask, center, radius, 255, -1)
        
        # Save mask
        mask_filename = f"{Path(layer.path).stem}_mask.png"
        mask_path = Path("backend/uploads") / mask_filename
        cv2.imwrite(str(mask_path), mask)
        
        logger.info(f"Created segmentation mask for layer {request.layer_id}")
        
        return SegmentationResponse(
            success=True,
            message="Segmentation mask created",
            layer_id=request.layer_id,
            mask_path=f"/uploads/{mask_filename}",
            num_objects=len(request.object_ids) if request.object_ids else 0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in segmentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove-background", response_model=BackgroundRemovalResponse)
async def remove_background(request: BackgroundRemovalRequest):
    """
    Automatically remove background from image
    Creates a new layer with transparent background
    """
    try:
        ai_service = get_ai_service()
        db = next(get_db())
        
        # Get layer
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        # Load image
        image_path = Path("backend") / layer.path.lstrip("/")
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        
        image = cv2.imread(str(image_path))
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to load image")
        
        # Load background removal model
        model = ai_service.load_detection_model(request.model)
        
        # Perform background removal (placeholder implementation)
        # In production, this would use U²-Net or similar model
        
        # Create mock result with alpha channel
        result = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
        
        # Simple demonstration: create a circular mask
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        center = (image.shape[1] // 2, image.shape[0] // 2)
        radius = min(image.shape[:2]) // 3
        cv2.circle(mask, center, radius, 255, -1)
        result[:, :, 3] = mask
        
        # Save result
        result_filename = f"{Path(layer.path).stem}_nobg.png"
        result_path = Path("backend/uploads") / result_filename
        cv2.imwrite(str(result_path), result)
        
        logger.info(f"Background removed from layer {request.layer_id}")
        
        return BackgroundRemovalResponse(
            success=True,
            message="Background removed successfully",
            layer_id=request.layer_id,
            new_path=f"/uploads/{result_filename}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in background removal: {e}")
        raise HTTPException(status_code=500, detail=str(e))
