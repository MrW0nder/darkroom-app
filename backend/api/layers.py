"""
Layers API - Core layer management for the editor
Handles creating, updating, deleting and compositing layers
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Literal
from pathlib import Path
import uuid
import json
from datetime import datetime

from backend.db import get_db, STORAGE_DIR
from backend.models.layers import Layer
from backend.services.image_processor import ImageProcessor

router = APIRouter(prefix="/api/layers", tags=["layers"])

# Request models
class LayerCreate(BaseModel):
    project_id: int
    type: Literal["image", "adjustment", "text", "shape", "mask"]
    name: Optional[str] = None
    x: float = 0
    y: float = 0
    width: Optional[float] = None
    height: Optional[float] = None
    opacity: float = 1.0
    blend_mode: str = "normal"
    visible: bool = True
    locked: bool = False

class LayerUpdate(BaseModel):
    name: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    opacity: Optional[float] = None
    blend_mode: Optional[str] = None
    visible: Optional[bool] = None
    locked: Optional[bool] = None
    z_index: Optional[int] = None

class LayerResponse(BaseModel):
    id: int
    project_id: int
    type: str
    name: Optional[str] = None
    content: Optional[str]
    x: float
    y: float
    width: Optional[float]
    height: Optional[float]
    opacity: float
    blend_mode: str
    visible: bool
    locked: bool
    z_index: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LayerReorderRequest(BaseModel):
    layer_ids: List[int]  # List of layer IDs in new order (bottom to top)

# Layer endpoints
@router.post("/", response_model=LayerResponse)
async def create_layer(
    layer_data: LayerCreate,
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Create a new layer"""
    
    # Get the highest z_index for this project to place new layer on top
    max_z_index = db.query(Layer).filter(
        Layer.project_id == layer_data.project_id
    ).count()
    
    # Handle file upload for image layers
    content_path = None
    if file and layer_data.type == "image":
        # Generate unique filename
        file_extension = Path(file.filename).suffix if file.filename else '.jpg'
        filename = f"{uuid.uuid4()}{file_extension}"
        file_path = STORAGE_DIR / "layers" / filename
        file_path.parent.mkdir(exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        content_path = str(file_path.relative_to(STORAGE_DIR.parent))
        
        # If no dimensions provided, get from image
        if not layer_data.width or not layer_data.height:
            try:
                img = ImageProcessor.load_image(str(file_path))
                h, w = img.shape[:2]
                layer_data.width = float(w)
                layer_data.height = float(h)
            except:
                pass
    
    # Create layer record
    layer = Layer(
        project_id=layer_data.project_id,
        type=layer_data.type,
        name=layer_data.name or f"{layer_data.type.capitalize()} Layer",
        content=content_path,
        x=layer_data.x,
        y=layer_data.y,
        width=layer_data.width,
        height=layer_data.height,
        opacity=layer_data.opacity,
        blend_mode=layer_data.blend_mode,
        visible=layer_data.visible,
        locked=layer_data.locked,
        z_index=max_z_index
    )
    
    db.add(layer)
    db.commit()
    db.refresh(layer)
    
    return layer

@router.get("/project/{project_id}", response_model=List[LayerResponse])
async def get_layers_by_project(project_id: int, db: Session = Depends(get_db)):
    """Get all layers for a project, ordered by z_index"""
    layers = db.query(Layer).filter(
        Layer.project_id == project_id
    ).order_by(Layer.z_index).all()
    
    return layers

@router.get("/{layer_id}", response_model=LayerResponse)
async def get_layer(layer_id: int, db: Session = Depends(get_db)):
    """Get a specific layer"""
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    return layer

@router.put("/{layer_id}", response_model=LayerResponse)
async def update_layer(
    layer_id: int, 
    layer_data: LayerUpdate, 
    db: Session = Depends(get_db)
):
    """Update a layer"""
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")

    update_data = layer_data.model_dump(exclude_unset=True)

    if layer.locked:
        # If the request is unlocking the layer, only apply the locked field and return.
        # Any other edit attempt on a locked layer is rejected.
        if update_data.get('locked') is False:
            layer.locked = False
            layer.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(layer)
            return layer
        raise HTTPException(status_code=400, detail="Cannot edit locked layer")

    # Update fields
    for field, value in update_data.items():
        setattr(layer, field, value)
    
    layer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(layer)
    
    return layer

@router.delete("/{layer_id}")
async def delete_layer(layer_id: int, db: Session = Depends(get_db)):
    """Delete a layer"""
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    
    if layer.locked:
        raise HTTPException(status_code=400, detail="Cannot delete locked layer")
    
    # Delete associated content file if it exists
    if layer.content:
        try:
            content_path = STORAGE_DIR.parent / layer.content
            if content_path.exists():
                content_path.unlink()
        except:
            pass  # File might have been manually deleted
    
    db.delete(layer)
    db.commit()
    
    return {"message": "Layer deleted successfully"}

@router.post("/reorder")
async def reorder_layers(
    reorder_data: LayerReorderRequest,
    db: Session = Depends(get_db)
):
    """Reorder layers by updating z_index values"""
    
    # Update z_index for each layer based on position in array
    for index, layer_id in enumerate(reorder_data.layer_ids):
        layer = db.query(Layer).filter(Layer.id == layer_id).first()
        if layer:
            layer.z_index = index
            layer.updated_at = datetime.utcnow()
    
    db.commit()
    return {"message": "Layers reordered successfully"}

@router.post("/{layer_id}/duplicate", response_model=LayerResponse)
async def duplicate_layer(layer_id: int, db: Session = Depends(get_db)):
    """Duplicate a layer"""
    original = db.query(Layer).filter(Layer.id == layer_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Layer not found")
    
    # Get next z_index
    max_z_index = db.query(Layer).filter(
        Layer.project_id == original.project_id
    ).count()
    
    # Create duplicate
    duplicate = Layer(
        project_id=original.project_id,
        type=original.type,
        name=f"{original.name} Copy",
        content=original.content,  # For now, share the same content
        x=original.x + 10,  # Slight offset
        y=original.y + 10,
        width=original.width,
        height=original.height,
        opacity=original.opacity,
        blend_mode=original.blend_mode,
        visible=original.visible,
        locked=False,  # Duplicates are never locked by default
        z_index=max_z_index
    )
    
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    
    return duplicate

@router.post("/{layer_id}/toggle-lock")
async def toggle_layer_lock(layer_id: int, db: Session = Depends(get_db)):
    """Toggle layer lock status"""
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    
    layer.locked = not layer.locked
    layer.updated_at = datetime.utcnow()
    db.commit()
    
    return {"locked": layer.locked}

@router.post("/{layer_id}/toggle-visibility")
async def toggle_layer_visibility(layer_id: int, db: Session = Depends(get_db)):
    """Toggle layer visibility"""
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    
    layer.visible = not layer.visible
    layer.updated_at = datetime.utcnow()
    db.commit()
    
    return {"visible": layer.visible}

@router.get("/{layer_id}/thumbnail")
async def get_layer_thumbnail(layer_id: int, db: Session = Depends(get_db)):
    """Get a thumbnail for the layer"""
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    
    # For now, return the content path or generate a placeholder
    if layer.content and layer.type == "image":
        # TODO: Generate actual thumbnails
        return {"thumbnail_url": f"/storage/{layer.content}"}
    else:
        # Return placeholder for non-image layers
        return {"thumbnail_url": None, "type": layer.type}