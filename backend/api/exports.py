"""
Image Export API
Handle image export with format options and quality settings
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, Literal
from pathlib import Path
import uuid

from backend.db import get_db, STORAGE_DIR
from backend.models.layers import Layer
from backend.services.image_processor import ImageProcessor

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportRequest(BaseModel):
    layer_id: int
    format: Literal["JPEG", "PNG", "TIFF"] = "JPEG"
    quality: int = 95  # 1-100 for JPEG
    filename: Optional[str] = None


@router.post("/")
async def export_image(request: ExportRequest, db: Session = Depends(get_db)):
    """
    Export a layer as an image file
    """
    try:
        # Get layer from database
        layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
        if not layer:
            raise HTTPException(status_code=404, detail="Layer not found")
        
        if not layer.content:
            raise HTTPException(status_code=400, detail="Layer has no image content")
        
        # Load image
        img = ImageProcessor.load_image(layer.content)
        
        # Determine export filename
        if request.filename:
            export_filename = request.filename
        else:
            export_filename = f"darkroom_export_{uuid.uuid4().hex[:8]}"
        
        # Add appropriate extension
        ext_map = {"JPEG": ".jpg", "PNG": ".png", "TIFF": ".tiff"}
        export_filename += ext_map[request.format]
        
        # Create exports directory
        exports_dir = Path(STORAGE_DIR) / "exports"
        exports_dir.mkdir(parents=True, exist_ok=True)
        
        export_path = exports_dir / export_filename
        
        # Save with format-specific options
        ImageProcessor.save_image(img, str(export_path), quality=request.quality)
        
        return {
            "success": True,
            "export_path": str(export_path),
            "filename": export_filename,
            "format": request.format,
            "size_bytes": export_path.stat().st_size
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting image: {str(e)}")


@router.get("/download/{filename}")
async def download_export(filename: str):
    """
    Download an exported image file
    """
    exports_dir = Path(STORAGE_DIR) / "exports"
    file_path = exports_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream"
    )
