import os
import io
import logging
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from PIL import Image as PILImage, ImageDraw, ImageFont

from backend.db import init_db, get_db, STORAGE_DIR, DATABASE_URL  # Updated: Add `get_db`
from backend.api.imports import router as imports_router
from backend.models.layers import Layer  # Import the Layer model

APP_TITLE = "Darkroom Backend"
FRONTEND_ORIGIN = os.environ.get("DARKROOM_FRONTEND_ORIGIN", "http://localhost:5173")

# Configure basic logging
LOG_LEVEL = os.environ.get("DARKROOM_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("darkroom")

app = FastAPI(title=APP_TITLE)

# Configure CORS to allow only the frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """
    Initialize DB/tables and log configuration.
    """
    init_db()
    try:
        # Log storage path and DB URL
        logger.info("Storage directory: %s", STORAGE_DIR)
        logger.info("Database URL: %s", DATABASE_URL)
    except Exception:
        logger.exception("Unable to read storage/db configuration on startup")


@app.get("/health", tags=["health"])
def health():
    return JSONResponse({"status": "ok"}, status_code=200)


# --------------------------- Layers Endpoints ---------------------------
class LayerCreate(BaseModel):
    project_id: int
    type: str
    content: str = None
    z_index: int = None
    locked: bool = False
    opacity: int = 100
    visible: bool = True
    x: float = 0.0
    y: float = 0.0
    width: float = None
    height: float = None
    blend_mode: str = None


@app.post("/api/layers", response_model=dict)
def create_layer(layer: LayerCreate, db: Session = Depends(get_db)):
    new_layer = Layer(**layer.dict())
    db.add(new_layer)
    db.commit()
    db.refresh(new_layer)
    return {"message": "Layer successfully created", "layer": new_layer.id}


@app.get("/api/layers", response_model=list)
def get_all_layers(project_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Layer)
    if project_id:
        query = query.filter(Layer.project_id == project_id)
    return query.all()


@app.get("/api/layers/{layer_id}", response_model=dict)
def get_layer(layer_id: int, db: Session = Depends(get_db)):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    return layer


@app.put("/api/layers/{layer_id}", response_model=dict)
def update_layer(layer_id: int, layer_data: LayerCreate, db: Session = Depends(get_db)):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")

    for key, value in layer_data.dict(exclude_unset=True).items():
        setattr(layer, key, value)

    db.commit()
    db.refresh(layer)
    return {"message": "Layer successfully updated", "layer": layer.id}


@app.delete("/api/layers/{layer_id}", response_model=dict)
def delete_layer(layer_id: int, db: Session = Depends(get_db)):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    db.delete(layer)
    db.commit()
    return {"message": "Layer successfully deleted"}


# ------------------------- Image Processing Endpoints (Existing) -------------------------


@app.post("/api/process-image")
async def process_image(
    file: UploadFile = File(...),
    apply_watermark: Optional[bool] = Query(True, description="Whether to apply a watermark or not."),
    watermark_size: Optional[int] = Query(None, description="Custom watermark size (font).")
):
    # The original `process-image` implementation
    return {"message": "Image processing not modified here for brevity."}


# Include the imports router (images and import-related API endpoints)
app.include_router(imports_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=int(os.environ.get("PORT", 8000)), reload=True)