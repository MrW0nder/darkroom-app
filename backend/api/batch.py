from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi import Depends
from typing import List, Optional
from pydantic import BaseModel
from pathlib import Path
import shutil
import uuid
from datetime import datetime

from ..db import get_db
from ..models.models import Image
from ..models.projects import Project
from ..services.image_processor import ImageProcessor

router = APIRouter()

# Batch Import Models
class BatchImportResponse(BaseModel):
    batch_id: str
    total_files: int
    imported: List[dict]
    failed: List[dict]

class BatchExportRequest(BaseModel):
    layer_ids: List[int]
    format: str = "jpeg"
    quality: int = 95
    prefix: str = "exported"

class BatchExportResponse(BaseModel):
    batch_id: str
    total_files: int
    exported: List[dict]
    failed: List[dict]

class BatchProcessRequest(BaseModel):
    layer_ids: List[int]
    adjustments: dict
    output_format: str = "jpeg"

# Storage setup
UPLOAD_DIR = Path("backend/uploads")
EXPORT_DIR = Path("backend/exports")
UPLOAD_DIR.mkdir(exist_ok=True)
EXPORT_DIR.mkdir(exist_ok=True)

@router.post("/batch/import", response_model=BatchImportResponse)
async def batch_import_images(
    files: List[UploadFile] = File(...),
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Import multiple images at once.
    Supports drag-and-drop multi-file import.
    """
    batch_id = str(uuid.uuid4())
    imported = []
    failed = []
    
    # Verify project exists if provided
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    for file in files:
        try:
            # Validate file type
            if not file.content_type or not file.content_type.startswith('image/'):
                failed.append({
                    "filename": file.filename,
                    "error": "Invalid file type. Must be an image."
                })
                continue
            
            # Save file
            file_extension = Path(file.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Create database record
            db_image = Image(
                filename=file.filename,
                path=f"/uploads/{unique_filename}",
                original_path=str(file_path)
            )
            db.add(db_image)
            db.commit()
            db.refresh(db_image)
            
            imported.append({
                "id": db_image.id,
                "filename": file.filename,
                "path": db_image.path,
                "size": file_path.stat().st_size
            })
            
        except Exception as e:
            failed.append({
                "filename": file.filename,
                "error": str(e)
            })
            db.rollback()
    
    return BatchImportResponse(
        batch_id=batch_id,
        total_files=len(files),
        imported=imported,
        failed=failed
    )

@router.post("/batch/export", response_model=BatchExportResponse)
async def batch_export_images(
    request: BatchExportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Export multiple images with the same settings.
    Useful for batch processing workflows.
    """
    batch_id = str(uuid.uuid4())
    exported = []
    failed = []
    
    processor = ImageProcessor()
    
    for layer_id in request.layer_ids:
        try:
            # Get layer from database (you'll need to import Layer model)
            from ..models.layers import Layer
            layer = db.query(Layer).filter(Layer.id == layer_id).first()
            
            if not layer:
                failed.append({
                    "layer_id": layer_id,
                    "error": "Layer not found"
                })
                continue
            
            # Get original image path
            image = db.query(Image).filter(Image.id == layer.image_id).first()
            if not image:
                failed.append({
                    "layer_id": layer_id,
                    "error": "Image not found"
                })
                continue
            
            # Load and export image
            input_path = Path(image.original_path)
            if not input_path.exists():
                # Try relative path
                input_path = UPLOAD_DIR / Path(image.path).name
            
            if not input_path.exists():
                failed.append({
                    "layer_id": layer_id,
                    "error": "Image file not found"
                })
                continue
            
            # Generate output filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"{request.prefix}_{layer_id}_{timestamp}.{request.format}"
            output_path = EXPORT_DIR / output_filename
            
            # Export with quality settings
            img = processor.load_image(str(input_path))
            processor.save_image(img, str(output_path), quality=request.quality)
            
            exported.append({
                "layer_id": layer_id,
                "filename": output_filename,
                "path": f"/exports/{output_filename}",
                "size": output_path.stat().st_size
            })
            
        except Exception as e:
            failed.append({
                "layer_id": layer_id,
                "error": str(e)
            })
    
    return BatchExportResponse(
        batch_id=batch_id,
        total_files=len(request.layer_ids),
        exported=exported,
        failed=failed
    )

@router.post("/batch/process")
async def batch_process_images(
    request: BatchProcessRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Apply the same adjustments to multiple images.
    Perfect for consistent batch editing.
    """
    batch_id = str(uuid.uuid4())
    processed = []
    failed = []
    
    processor = ImageProcessor()
    
    for layer_id in request.layer_ids:
        try:
            from ..models.layers import Layer
            layer = db.query(Layer).filter(Layer.id == layer_id).first()
            
            if not layer:
                failed.append({
                    "layer_id": layer_id,
                    "error": "Layer not found"
                })
                continue
            
            image = db.query(Image).filter(Image.id == layer.image_id).first()
            if not image:
                failed.append({
                    "layer_id": layer_id,
                    "error": "Image not found"
                })
                continue
            
            # Load image
            input_path = Path(image.original_path)
            if not input_path.exists():
                input_path = UPLOAD_DIR / Path(image.path).name
            
            if not input_path.exists():
                failed.append({
                    "layer_id": layer_id,
                    "error": "Image file not found"
                })
                continue
            
            img = processor.load_image(str(input_path))
            
            # Apply adjustments
            adjustments = request.adjustments
            if adjustments.get('brightness'):
                img = processor.adjust_brightness(img, adjustments['brightness'])
            if adjustments.get('contrast'):
                img = processor.adjust_contrast(img, adjustments['contrast'])
            if adjustments.get('saturation'):
                img = processor.adjust_saturation(img, adjustments['saturation'])
            
            # Save processed image
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"processed_{layer_id}_{timestamp}.{request.output_format}"
            output_path = UPLOAD_DIR / output_filename
            
            processor.save_image(img, str(output_path))
            
            # Update layer path
            layer.image_path = f"/uploads/{output_filename}"
            db.commit()
            
            processed.append({
                "layer_id": layer_id,
                "path": f"/uploads/{output_filename}"
            })
            
        except Exception as e:
            failed.append({
                "layer_id": layer_id,
                "error": str(e)
            })
            db.rollback()
    
    return {
        "batch_id": batch_id,
        "total_files": len(request.layer_ids),
        "processed": processed,
        "failed": failed
    }

@router.get("/batch/{batch_id}/status")
async def get_batch_status(batch_id: str):
    """
    Get the status of a batch operation.
    Useful for tracking long-running batch jobs.
    """
    # In a real implementation, you'd store batch status in database or cache
    return {
        "batch_id": batch_id,
        "status": "completed",
        "progress": 100,
        "message": "Batch operation completed successfully"
    }