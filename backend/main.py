from fastapi.responses import FileResponse
import mimetypes
# Custom endpoint to serve images from originals reliably
@app.get("/api/images/{filename}")
def get_image(filename: str):
    originals_dir = Path(__file__).parent / "storage" / "originals"
    file_path = originals_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    mime_type, _ = mimetypes.guess_type(str(file_path))
    return FileResponse(str(file_path), media_type=mime_type or "application/octet-stream")
import os
import logging
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db, engine, DATABASE_URL, STORAGE_DIR  # Import from db.py
from backend.models import Base  # Ensure models are imported for table creation
from backend.models.layers import Layer  # Updated Layer import
from backend.api.imports import router as imports_router  # Import the imports router
from backend.api.adjustments import router as adjustments_router  # Import adjustments router
from backend.api.exports import router as exports_router  # Import exports router
from backend.api.projects import router as projects_router  # Import projects router
from backend.api.crop import router as crop_router  # Import crop router
from backend.api.brush import router as brush_router  # Import brush router
from backend.api.presets import router as presets_router  # Import presets router
from backend.api.text_shapes import router as text_shapes_router  # Import text & shapes router
from backend.api.batch import router as batch_router  # Import batch processing router
from backend.api.raw import router as raw_router  # Import RAW file router

# Optional AI routers (require torch)
try:
    from backend.api.ai_detection import router as ai_detection_router
    from backend.api.ai_inpainting import router as ai_inpainting_router
    from backend.api.ai_upscale import router as ai_upscale_router
    from backend.api.ai_face import router as ai_face_router
    from backend.api.ai_colorize import router as ai_colorize_router
    from backend.api.ai_presets import router as ai_presets_router
    from backend.api.ai_crop import router as ai_crop_router
    from backend.api.ai_sky import router as ai_sky_router
    from backend.api.ai_lens import router as ai_lens_router
    from backend.api.ai_enhance import router as ai_enhance_router
    AI_AVAILABLE = True
except ImportError as e:
    logging.getLogger("darkroom").warning("AI features disabled (missing dependencies): %s", e)
    AI_AVAILABLE = False

from backend.api.settings import router as settings_router  # Import settings router
from backend.api.filters import router as filters_router  # Import filters router
from backend.api.metadata import router as metadata_router  # Import metadata router
from backend.api.watermark import router as watermark_router  # Import watermark router
from backend.api.color_grading import router as color_grading_router  # Import color grading router
from backend.api.slideshow import router as slideshow_router  # Import slideshow router
from backend.api.lens_correction import router as lens_correction_router  # Import lens correction router
from backend.api.local_adjustments import router as local_adjustments_router  # Import local adjustments router
from backend.api.collections import router as collections_router  # Import collections router
from backend.api.advanced_sharpening import router as advanced_sharpening_router  # Import advanced sharpening router
from backend.api.print_module import router as print_module_router  # Import advanced print module router
from backend.api.masks import router as masks_router  # Import mask refinement router
from backend.api.color_zones import router as color_zones_router  # Import color zones router
from backend.api.processing_pipeline import router as processing_pipeline_router  # Import processing pipeline router
from backend.api.hdr_merge import router as hdr_merge_router  # Import HDR merge router
from backend.api.panorama import router as panorama_router  # Import panorama stitching router
from backend.api.perspective import router as perspective_router  # Import perspective correction router
from backend.api.color_management import router as color_management_router  # Import color management router
from backend.api.timelapse import router as timelapse_router  # Import timelapse router
from backend.api.focus_stack import router as focus_stack_router  # Import focus stacking router
from backend.api.image_comparison import router as image_comparison_router  # Import image comparison router
from backend.api.scopes import router as scopes_router  # Import scopes router
from backend.api.plugins import router as plugins_router  # Import plugins router
from backend.api.tethering import router as tethering_router  # Import tethering router
from backend.api.retouching import router as retouching_router  # Import retouching router
from backend.api.presets_library import router as presets_library_router  # Import presets library router
from backend.api.cloud_sync import router as cloud_sync_router  # Import cloud sync router
from backend.api.automation import router as automation_router  # Import automation router
from backend.api.advanced_search import router as advanced_search_router  # Import advanced search router
from backend.api.performance import router as performance_router  # Import performance router
from backend.api.video_editing import router as video_editing_router  # Import video editing router
from backend.api.collaboration import router as collaboration_router  # Import collaboration router
from backend.api.analytics import router as analytics_router  # Import analytics router
from backend.api.tutorials import router as tutorials_router  # Import tutorials router
from backend.api.Mobile_responsive import router as mobile_responsive_router  # Import mobile/responsive router
from backend.api.accessibility import router as accessibility_router  # Import accessibility router
from backend.api.integrations import router as integrations_router  # Import integrations router
from backend.api.polish import router as polish_router  # Import polish router

APP_TITLE = "Darkroom Backend - Hybrid Lightroom + Photoshop"

# Configure basic logging
LOG_LEVEL = os.environ.get("DARKROOM_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("darkroom")

app = FastAPI(title=APP_TITLE)


class CORSAwareStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        origin = None
        for key, value in scope.get("headers", []):
            if key == b"origin":
                origin = value.decode("utf-8")
                break

        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Range, Authorization"
        response.headers["Access-Control-Max-Age"] = "3600"
        response.headers["Vary"] = "Origin"
        # For file:// protocol compatibility
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response


# Serve uploaded files for previews
app.mount("/storage", CORSAwareStaticFiles(directory=str(STORAGE_DIR)), name="storage")

# Include all API routers
app.include_router(imports_router)
app.include_router(adjustments_router)
app.include_router(exports_router)
app.include_router(projects_router)
app.include_router(crop_router)
app.include_router(brush_router)
app.include_router(presets_router)
app.include_router(text_shapes_router)
app.include_router(batch_router)
app.include_router(raw_router)

# Include AI routers if available
if AI_AVAILABLE:
    app.include_router(ai_detection_router)
    app.include_router(ai_inpainting_router)
    app.include_router(ai_upscale_router)
    app.include_router(ai_face_router)
    app.include_router(ai_colorize_router)
    app.include_router(ai_presets_router)
    app.include_router(ai_crop_router)
    app.include_router(ai_sky_router)
    app.include_router(ai_lens_router)
    app.include_router(ai_enhance_router)

app.include_router(settings_router)
app.include_router(filters_router)
app.include_router(metadata_router)
app.include_router(watermark_router)
app.include_router(color_grading_router)
app.include_router(slideshow_router)
app.include_router(lens_correction_router)
app.include_router(local_adjustments_router)
app.include_router(collections_router)
app.include_router(advanced_sharpening_router)
app.include_router(print_module_router)
app.include_router(masks_router)
app.include_router(color_zones_router)
app.include_router(processing_pipeline_router)
app.include_router(hdr_merge_router)
app.include_router(panorama_router)
app.include_router(perspective_router)
app.include_router(color_management_router)
app.include_router(timelapse_router)
app.include_router(focus_stack_router)
app.include_router(image_comparison_router)
app.include_router(scopes_router)
app.include_router(plugins_router)
app.include_router(tethering_router)
app.include_router(retouching_router)
app.include_router(presets_library_router)
app.include_router(cloud_sync_router)
app.include_router(automation_router)
app.include_router(advanced_search_router)
app.include_router(performance_router)
app.include_router(video_editing_router)
app.include_router(collaboration_router)
app.include_router(analytics_router)
app.include_router(tutorials_router)
app.include_router(mobile_responsive_router)
app.include_router(accessibility_router)
app.include_router(integrations_router)
app.include_router(polish_router)

# FIXED CORS SETTINGS: Allow dev server and Electron (file:// protocol)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000"
    ],
    allow_origin_regex=r"^(file://|http://localhost.*|http://127\.0\.0\.1.*|https?://.*\.local)$",  # Allow Electron file://, localhost, 127.0.0.1, and .local domains
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
        from_attributes = True


@app.post("/api/layers", response_model=dict)
def create_layer(layer: LayerCreate, db: Session = Depends(get_db)):
    try:
        new_layer = Layer(**layer.model_dump())
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
        logger.info("Retrieved %d layers for project_id=%s", len(layers), project_id)
        for layer in layers:
            logger.debug(f"Layer {layer.id}: content={layer.content}, visible={layer.visible}, z_index={layer.z_index}")
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
        
        for field, value in layer.model_dump(exclude_unset=True).items():
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

        if layer.content:
            content_path = Path(layer.content)
            if content_path.exists():
                try:
                    content_path.unlink()
                except Exception as e:
                    logger.warning("Unable to delete file for layer %s: %s", layer_id, e)

        db.delete(layer)
        db.commit()
        logger.debug("Deleted layer with ID: %s", layer_id)
        return {"message": "Layer deleted successfully"}
    except Exception as e:
        logger.error("Error deleting layer with ID %s: %s", layer_id, e)
        raise HTTPException(status_code=500, detail="Internal server error while deleting layer")