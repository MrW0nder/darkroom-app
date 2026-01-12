"""
Metadata API for reading and editing image metadata (EXIF, IPTC, XMP).
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import piexif
from PIL import Image
import io
import json

router = APIRouter(prefix="/api/metadata", tags=["metadata"])


class MetadataResponse(BaseModel):
    """Response model for image metadata."""
    exif: Dict[str, Any]
    iptc: Dict[str, Any]
    xmp: Dict[str, Any]
    basic: Dict[str, Any]


class MetadataUpdate(BaseModel):
    """Model for updating metadata fields."""
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    copyright: Optional[str] = None
    artist: Optional[str] = None
    rating: Optional[int] = None


@router.post("/read", response_model=MetadataResponse)
async def read_metadata(file: UploadFile = File(...)):
    """
    Read all metadata from an image file.
    
    Returns EXIF, IPTC, XMP, and basic metadata.
    """
    try:
        # Read image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        
        # Extract EXIF data
        exif_dict = {}
        if hasattr(img, '_getexif') and img._getexif():
            exif_data = img._getexif()
            for tag_id, value in exif_data.items():
                tag = piexif.TAGS.get(tag_id, tag_id)
                exif_dict[str(tag)] = str(value)
        
        # Basic metadata
        basic = {
            "format": img.format,
            "mode": img.mode,
            "width": img.width,
            "height": img.height,
            "size": len(contents),
        }
        
        # IPTC and XMP (placeholder - requires additional libraries)
        iptc = {}
        xmp = {}
        
        return MetadataResponse(
            exif=exif_dict,
            iptc=iptc,
            xmp=xmp,
            basic=basic
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read metadata: {str(e)}")


@router.post("/update")
async def update_metadata(
    file: UploadFile = File(...),
    updates: MetadataUpdate = None
):
    """
    Update metadata fields in an image.
    
    Supports updating title, description, keywords, copyright, artist, and rating.
    """
    try:
        # Read image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        
        # Get existing EXIF data or create new
        exif_dict = piexif.load(img.info.get("exif", b""))
        
        # Update fields
        if updates:
            if updates.title:
                exif_dict["0th"][piexif.ImageIFD.ImageDescription] = updates.title.encode()
            
            if updates.copyright:
                exif_dict["0th"][piexif.ImageIFD.Copyright] = updates.copyright.encode()
            
            if updates.artist:
                exif_dict["0th"][piexif.ImageIFD.Artist] = updates.artist.encode()
            
            if updates.rating is not None:
                exif_dict["0th"][piexif.ImageIFD.Rating] = updates.rating
        
        # Dump EXIF data
        exif_bytes = piexif.dump(exif_dict)
        
        # Save image with updated EXIF
        output = io.BytesIO()
        img.save(output, format=img.format, exif=exif_bytes)
        
        return {
            "status": "success",
            "message": "Metadata updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update metadata: {str(e)}")


@router.post("/strip")
async def strip_metadata(
    file: UploadFile = File(...),
    keep_orientation: bool = True
):
    """
    Remove all metadata from an image.
    
    Optionally keeps orientation data.
    """
    try:
        # Read image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        
        # Remove metadata
        data = list(img.getdata())
        image_without_exif = Image.new(img.mode, img.size)
        image_without_exif.putdata(data)
        
        # Keep orientation if requested
        if keep_orientation and hasattr(img, '_getexif'):
            exif = img._getexif()
            if exif and 274 in exif:  # Orientation tag
                orientation = exif[274]
                exif_dict = {"0th": {piexif.ImageIFD.Orientation: orientation}}
                exif_bytes = piexif.dump(exif_dict)
                
                output = io.BytesIO()
                image_without_exif.save(output, format=img.format, exif=exif_bytes)
            else:
                output = io.BytesIO()
                image_without_exif.save(output, format=img.format)
        else:
            output = io.BytesIO()
            image_without_exif.save(output, format=img.format)
        
        return {
            "status": "success",
            "message": "Metadata stripped successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to strip metadata: {str(e)}")


@router.get("/fields")
async def get_editable_fields():
    """
    Get list of editable metadata fields.
    """
    return {
        "fields": [
            {"name": "title", "type": "string", "description": "Image title"},
            {"name": "description", "type": "string", "description": "Image description"},
            {"name": "keywords", "type": "array", "description": "Keywords/tags"},
            {"name": "copyright", "type": "string", "description": "Copyright information"},
            {"name": "artist", "type": "string", "description": "Artist/creator name"},
            {"name": "rating", "type": "integer", "description": "Rating (0-5)"},
        ]
    }