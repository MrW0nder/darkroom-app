# backend/main.py
import os
import io
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from PIL import Image as PILImage

from backend.db import init_db
from backend.api.imports import router as imports_router

APP_TITLE = "Darkroom Backend"
FRONTEND_ORIGIN = os.environ.get("DARKROOM_FRONTEND_ORIGIN", "http://localhost:5173")

app = FastAPI(title=APP_TITLE)

# Configure CORS to allow only the frontend origin by default (local-only)
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
    Initialize DB/tables and any other startup tasks.
    """
    init_db()


@app.get("/health", tags=["health"])
def health():
    return JSONResponse({"status": "ok"}, status_code=200)


# Compatibility: keep the minimal process-image endpoint for quick testing
@app.post("/api/process-image")
async def process_image(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file and returns basic info (format, size).
    Kept for compatibility with the original minimal server.
    """
    try:
        contents = await file.read()
        img = PILImage.open(io.BytesIO(contents))
        width, height = img.size
        fmt = img.format
        return JSONResponse({"filename": file.filename, "format": fmt, "width": width, "height": height})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)


# Include API routers (imports router provides /api/import and /api/images endpoints)
app.include_router(imports_router)


if __name__ == "__main__":
    # Run via: python -m backend.main (not necessary if using uvicorn)
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=int(os.environ.get("PORT", 8000)), reload=True)