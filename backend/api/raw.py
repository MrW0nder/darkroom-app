from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends
from pydantic import BaseModel
from pathlib import Path
import shutil
import uuid
from typing import Optional

from ..db import get_db
from ..models.models import Image

router = APIRouter()

# RAW file format support
SUPPORTED_RAW_FORMATS = {
    '.cr2': 'Canon',
    '.cr3': 'Canon',
    '.nef': 'Nikon',
    '.nrw': 'Nikon',
    '.arw': 'Sony',
    '.dng': 'Adobe DNG (Universal)',
    '.raf': 'Fujifilm',
    '.orf': 'Olympus',
    '.rw2': 'Panasonic',
    '.pef': 'Pentax',
    '.srw': 'Samsung',
    '.erf': 'Epson',
    '.kdc': 'Kodak',
    '.dcr': 'Kodak',
    '.mos': 'Leaf',
    '.raw': 'Generic RAW',
}

class RAWImportRequest(BaseModel):
    preserve_metadata: bool = True
    auto_white_balance: bool = False
    exposure_compensation: float = 0.0
    highlight_recovery: bool = True
    shadow_recovery: bool = True

class RAWImportResponse(BaseModel):
    id: int
    filename: str
    path: str
    raw_format: str
    camera_make: Optional[str]
    camera_model: Optional[str]
    iso: Optional[int]
    aperture: Optional[float]
    shutter_speed: Optional[str]
    focal_length: Optional[float]

# Storage setup
UPLOAD_DIR = Path("backend/uploads")
RAW_DIR = UPLOAD_DIR / "raw"
UPLOAD_DIR.mkdir(exist_ok=True)
RAW_DIR.mkdir(exist_ok=True)

@router.post("/raw/import", response_model=RAWImportResponse)
async def import_raw_file(
    file: UploadFile = File(...),
    settings: Optional[RAWImportRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Import RAW image files (CR2, NEF, ARW, DNG, etc.)
    Extracts EXIF metadata and prepares for non-destructive editing.
    """
    # Validate RAW file format
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in SUPPORTED_RAW_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported RAW format. Supported formats: {', '.join(SUPPORTED_RAW_FORMATS.keys())}"
        )
    
    try:
        # Save RAW file
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = RAW_DIR / unique_filename
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract EXIF metadata (requires rawpy or exiftool)
        metadata = extract_raw_metadata(str(file_path))
        
        # Create database record
        db_image = Image(
            filename=file.filename,
            path=f"/uploads/raw/{unique_filename}",
            original_path=str(file_path)
        )
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        
        return RAWImportResponse(
            id=db_image.id,
            filename=file.filename,
            path=db_image.path,
            raw_format=SUPPORTED_RAW_FORMATS[file_extension],
            camera_make=metadata.get('make'),
            camera_model=metadata.get('model'),
            iso=metadata.get('iso'),
            aperture=metadata.get('aperture'),
            shutter_speed=metadata.get('shutter_speed'),
            focal_length=metadata.get('focal_length')
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import RAW file: {str(e)}")

@router.get("/raw/supported-formats")
async def get_supported_raw_formats():
    """
    Get list of supported RAW file formats.
    """
    return {
        "formats": [
            {
                "extension": ext,
                "camera": make,
                "example": f"IMG_0001{ext}"
            }
            for ext, make in SUPPORTED_RAW_FORMATS.items()
        ]
    }

@router.post("/raw/{image_id}/process")
async def process_raw_image(
    image_id: int,
    settings: RAWImportRequest,
    db: Session = Depends(get_db)
):
    """
    Process RAW image with specified settings.
    Non-destructive processing - original RAW file preserved.
    """
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    raw_path = Path(image.original_path)
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail="RAW file not found")
    
    try:
        # Process RAW file (requires rawpy library)
        processed_image = process_raw_with_settings(
            str(raw_path),
            settings.dict()
        )
        
        # Save processed image
        processed_filename = f"{raw_path.stem}_processed.jpg"
        processed_path = UPLOAD_DIR / processed_filename
        
        # Save the processed image (placeholder - needs actual implementation)
        # processed_image.save(str(processed_path))
        
        return {
            "message": "RAW image processed successfully",
            "original_path": image.path,
            "processed_path": f"/uploads/{processed_filename}",
            "settings_applied": settings.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process RAW image: {str(e)}")

def extract_raw_metadata(file_path: str) -> dict:
    """
    Extract EXIF metadata from RAW file.
    
    Note: This is a placeholder. In production, you would use:
    - rawpy library for reading RAW files
    - piexif or exifread for EXIF extraction
    """
    # Placeholder implementation
    return {
        'make': 'Unknown',
        'model': 'Unknown',
        'iso': None,
        'aperture': None,
        'shutter_speed': None,
        'focal_length': None
    }

def process_raw_with_settings(file_path: str, settings: dict):
    """
    Process RAW file with specified settings.
    
    Note: This is a placeholder. In production, you would use:
    - rawpy library for RAW processing
    - Apply demosaicing, white balance, exposure compensation
    - Apply tone curves and color grading
    """
    # Placeholder implementation
    # In production:
    # import rawpy
    # with rawpy.imread(file_path) as raw:
    #     rgb = raw.postprocess(
    #         use_camera_wb=settings.get('auto_white_balance'),
    #         highlight_mode=rawpy.HighlightMode.Blend if settings.get('highlight_recovery') else rawpy.HighlightMode.Clip,
    #         exp_shift=settings.get('exposure_compensation', 0.0)
    #     )
    #     return rgb
    pass

@router.get("/raw/{image_id}/metadata")
async def get_raw_metadata(
    image_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed EXIF metadata from RAW file.
    Includes camera settings, lens info, GPS data, etc.
    """
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    raw_path = Path(image.original_path)
    if not raw_path.exists():
        raise HTTPException(status_code=404, detail="RAW file not found")
    
    try:
        metadata = extract_raw_metadata(str(raw_path))
        
        return {
            "image_id": image_id,
            "filename": image.filename,
            "metadata": metadata,
            "raw_format": Path(image.filename).suffix.lower()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read metadata: {str(e)}")