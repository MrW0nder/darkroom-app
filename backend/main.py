import os
import io
import logging
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from PIL import Image as PILImage

from backend.db import init_db, STORAGE_DIR, DATABASE_URL  # read configured storage & DB
from backend.api.imports import router as imports_router

APP_TITLE = "Darkroom Backend"
FRONTEND_ORIGIN = os.environ.get("DARKROOM_FRONTEND_ORIGIN", "http://localhost:5173")

# Configure basic logging
LOG_LEVEL = os.environ.get("DARKROOM_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("darkroom")

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
    Initialize DB/tables and log configuration.
    """
    # Initialize database tables
    init_db()

    # Log effective storage path and DB url for easy debugging
    try:
        logger.info("Storage directory: %s", STORAGE_DIR)
        logger.info("Database URL: %s", DATABASE_URL)
    except Exception:
        # If STORAGE_DIR or DATABASE_URL are not present, still continue
        logger.exception("Unable to read storage/db configuration on startup")


@app.get("/health", tags=["health"])
def health():
    return JSONResponse({"status": "ok"}, status_code=200)


@app.post("/api/process-image")
async def process_image(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file, validates it, and returns basic info (format, size).
    """
    MAX_FILE_SIZE_MB = 5  # Maximum file size allowed (5 MB)
    ALLOWED_EXTENSIONS = {"jpeg", "png", "jpg"}  # Allowed file formats/extensions

    try:
        # Enforce file size limit
        contents = await file.read()  # Read file content
        file_size_mb = len(contents) / (1024 * 1024)  # Convert size to MB
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds {MAX_FILE_SIZE_MB}MB limit."
            )

        # Enforce file format validation
        try:
            img = PILImage.open(io.BytesIO(contents))  # Open the image
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail="Uploaded file is not a valid image or is corrupted."
            )

        file_format = img.format.lower()
        if file_format not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=415,
                detail=f"Invalid file format '{file_format}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}."
            )

        # Return file metadata response
        width, height = img.size
        return JSONResponse(
            {
                "status": "success",
                "message": "File processed successfully.",
                "data": {
                    "filename": file.filename,
                    "format": file_format,
                    "size_MB": round(file_size_mb, 2),
                    "dimensions": {"width": width, "height": height},
                },
            },
            status_code=201  # Return "Created" status
        )

    except HTTPException as e:
        raise e  # Pass through explicit exceptions

    except Exception as e:
        # Handle unexpected errors
        logger.exception("Unexpected server error during image processing")
        raise HTTPException(
            status_code=500,
            detail=f"Server error during file processing: {str(e)}"
        )


# Include API routers (imports router provides /api/import and /api/images endpoints)
app.include_router(imports_router)


if __name__ == "__main__":
    # Run via: python -m backend.main (not necessary if using uvicorn)
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=int(os.environ.get("PORT", 8000)), reload=True)