import os
import io
import sys
import logging
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from PIL import Image as PILImage, ImageDraw, ImageFont

# Debugging code: Print the Python search path
print("Python Search Path:", sys.path)

from backend.db import get_db, engine, DATABASE_URL  # Import from db.py
from backend.models import Base  # Ensure models are imported for table creation
from backend.models.layers import Layer  # Updated Layer import
from backend.api.imports import router as imports_router  # Import the imports router
from backend.api.adjustments import router as adjustments_router  # Import adjustments router
from backend.api.exports import router as exports_router  # Import exports router
from backend.api.projects import router as projects_router  # Import projects router
from backend.api.crop import router as crop_router  # Import crop router

APP_TITLE = "Darkroom Backend - Hybrid Lightroom + Photoshop"

# Configure basic logging
LOG_LEVEL = os.environ.get("DARKROOM_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("darkroom")

app = FastAPI(title=APP_TITLE)

# Include all API routers
app.include_router(imports_router)
app.include_router(adjustments_router)
app.include_router(exports_router)
app.include_router(projects_router)
app.include_router(crop_router)

# FIXED CORS SETTINGS: Explicitly allow both localhost origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],  # Allow React frontend origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


@app.on_event("startup")
def on_startup():
    """
    Initialize DB/tables and log configuration.
    """
    try:
        # Dynamically create all missing database tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized.")
        logger.info("Storage directory: %s", engine.url.database)
        logger.info("Database URL: %s", DATABASE_URL)
    except Exception as e:
        logger.exception("Unable to initialize the database on startup: %s", e)


@app.get("/health", tags=["health"])
def health():
    return JSONResponse({"status": "ok"}, status_code=200)


# --------------------------- Layers Endpoints ---------------------------

# Pydantic model for creating new layers
class LayerCreate(BaseModel):
    project_id: int
    type: str
    content: Optional[str] = None
    z_index: Optional[int] = None
    locked: bool = False
    opacity: int = 100
    visible: bool = True
    x: float = 0.0
    y: float = 0.0
    width: Optional[float] = None
    height: Optional[float] = None
    blend_mode: Optional[str] = None


# Pydantic model for serializing existing layers
class LayerResponse(BaseModel):
    id: int
    project_id: int
    type: str
    content: Optional[str]
    z_index: Optional[int]
    locked: bool
    opacity: int
    visible: bool
    x: float
    y: float
    width: Optional[float]
    height: Optional[float]
    blend_mode: Optional[str]

    class Config:
        orm_mode = True


@app.post("/api/layers", response_model=dict)
def create_layer(layer: LayerCreate, db: Session = Depends(get_db)):
    try:
        new_layer = Layer(**layer.dict())
        db.add(new_layer)
        db.commit()
        db.refresh(new_layer)
        logger.debug("Layer created with ID: %s", new_layer.id)
        return {"message": "Layer successfully created", "layer": new_layer.id}
    except Exception as e:
        logger.error("Error creating layer: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error while creating layer")


@app.get("/api/layers", response_model=List[LayerResponse])
def get_all_layers(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    try:
        query = db.query(Layer)
        if project_id is not None:
            logger.debug("Filtering layers by project_id: %s", project_id)
            query = query.filter(Layer.project_id == project_id)
        layers = query.all()
        logger.debug("Retrieved layers: %s", layers)
        return layers
    except Exception as e:
        logger.error("Error fetching layers: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error while fetching layers")


@app.get("/api/layers/{layer_id}", response_model=LayerResponse)
def get_layer(layer_id: int, db: Session = Depends(get_db)):
    try:
        layer = db.query(Layer).filter(Layer.id == layer_id).first()
        if not layer:
            logger.warning("Layer not found for ID: %s", layer_id)
            raise HTTPException(status_code=404, detail="Layer not found")
        logger.debug("Retrieved layer: %s", layer)
        return layer
    except Exception as e:
        logger.error("Error fetching layer with ID %s: %s", layer_id, e)
        raise HTTPException(status_code=500, detail="Internal server error while fetching layer")


@app.put("/api/layers/{layer_id}", response_model=dict)
def update_layer(layer_id: int, layer: LayerCreate, db: Session = Depends(get_db)):
    try:
        existing_layer = db.query(Layer).filter(Layer.id == layer_id).first()
        if not existing_layer:
            logger.warning("Layer not found for update with ID: %s", layer_id)
            raise HTTPException(status_code=404, detail="Layer not found")
        
        for field, value in layer.dict(exclude_unset=True).items():
            setattr(existing_layer, field, value)

        db.commit()
        db.refresh(existing_layer)
        logger.debug("Updated layer with ID: %s", layer_id)
        return {"message": "Layer updated successfully", "layer": existing_layer.id}
    except Exception as e:
        logger.error("Error updating layer with ID %s: %s", layer_id, e)
        raise HTTPException(status_code=500, detail="Internal server error while updating layer")


@app.delete("/api/layers/{layer_id}", response_model=dict)
def delete_layer(layer_id: int, db: Session = Depends(get_db)):
    try:
        layer = db.query(Layer).filter(Layer.id == layer_id).first()
        if not layer:
            logger.warning("Layer not found for deletion with ID: %s", layer_id)
            raise HTTPException(status_code=404, detail="Layer not found")

        db.delete(layer)
        db.commit()
        logger.debug("Deleted layer with ID: %s", layer_id)
        return {"message": "Layer deleted successfully"}
    except Exception as e:
        logger.error("Error deleting layer with ID %s: %s", layer_id, e)
        raise HTTPException(status_code=500, detail="Internal server error while deleting layer")