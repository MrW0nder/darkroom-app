import os
import io
import logging
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image as PILImage, ImageDraw, ImageFont

from backend.db import init_db, STORAGE_DIR, DATABASE_URL  # Read configured storage & DB
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

    # Log effective storage path and DB URL for easy debugging
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
    Accepts an uploaded image file, validates it, processes it (resize, convert, watermark), and returns basic info.
    """
    MAX_FILE_SIZE_MB = 5  # Maximum file size allowed (5 MB)
    ALLOWED_EXTENSIONS = {"jpeg", "png", "jpg", "webp"}  # Allowed file formats/extensions
    MAX_DIMENSION = 800  # Maximum image dimension in pixels (width/height)

    logger.info("Received file: %s", file.filename)

    try:
        # Enforce file size limit
        contents = await file.read()  # Read file content
        file_size_mb = len(contents) / (1024 * 1024)  # Convert size to MB
        logger.info("File size (MB): %.2f", file_size_mb)

        if file_size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds {MAX_FILE_SIZE_MB}MB limit."
            )

        # Validate the file using Pillow
        try:
            img = PILImage.open(io.BytesIO(contents))  # Open the image
            file_format = img.format.lower()  # Retrieve format, e.g., 'jpeg'
            logger.info("Pillow identified format: %s", file_format)
        except Exception:
            logger.exception("Pillow failed to open the file.")
            raise HTTPException(
                status_code=422,
                detail="Uploaded file is not a valid image or is corrupted."
            )

        # Normalize the file format
        if file_format == "jpg":  # Some tools report `jpg` instead of `jpeg`
            file_format = "jpeg"

        if file_format not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=415,
                detail=f"Invalid file format '{file_format}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}."
            )

        # Resize the image if larger than MAX_DIMENSION
        original_width, original_height = img.size
        logger.info("Original dimensions: %dx%d", original_width, original_height)
        if max(original_width, original_height) > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION))
            logger.info("Image resized to: %dx%d", img.width, img.height)

        # Convert the image to JPEG for standardization
        if file_format in {"png", "webp"}:
            img = img.convert("RGB")  # Convert to RGB (JPEG does not support alpha channel)
            file_format = "jpeg"  # Update format after conversion
            logger.info("Image converted to JPEG.")

        # Add a watermark to the image
        draw = ImageDraw.Draw(img)
        text = "Darkroom"
        font_size = int(img.width / 20)
        font = ImageFont.load_default()  # Use default font (you can replace this with a TrueType font)
        text_width, text_height = draw.textsize(text, font=font)
        draw.text(
            (img.width - text_width - 10, img.height - text_height - 10),
            text,
            fill=(255, 255, 255, 128),  # White with some transparency
            font=font,
        )
        logger.info("Watermark added.")

        # Save image to in-memory file
        output_buffer = io.BytesIO()
        img.save(output_buffer, format="JPEG")
        output_buffer.seek(0)

        # Calculate the new file size
        processed_file_size_mb = len(output_buffer.getvalue()) / (1024 * 1024)
        width, height = img.size
        logger.info("Final image size: %.2f MB; Dimensions: %dx%d", processed_file_size_mb, width, height)

        # Return file metadata response
        return JSONResponse(
            {
                "status": "success",
                "message": "File processed successfully.",
                "data": {
                    "filename": file.filename,
                    "original_format": file.format.lower(),
                    "processed_format": "jpeg",
                    "original_size_MB": round(file_size_mb, 2),
                    "processed_size_MB": round(processed_file_size_mb, 2),
                    "dimensions": {"width": width, "height": height},
                },
            },
            status_code=201  # Return "Created" status
        )

    except HTTPException as e:
        logger.warning("HTTPException caught: %s", str(e.detail))
        raise e  # Pass through explicit exceptions

    except Exception as e:
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