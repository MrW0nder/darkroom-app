from pathlib import Path
import uuid
import shutil
import io

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from PIL import Image as PILImage, UnidentifiedImageError
from sqlalchemy.orm import Session

from backend.db import STORAGE_DIR, get_db
from backend.models.models import Image as ImageModel  # Updated import

router = APIRouter(prefix="/api", tags=["imports"])

# Ensure subdirectories exist
ORIGINALS_DIR = Path(STORAGE_DIR) / "originals"
ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)


def _save_upload_to_disk(upload: UploadFile, dest_path: Path) -> None:
    """
    Save an UploadFile to disk atomically by writing to a temp file and moving.
    """
    temp_path = dest_path.with_suffix(dest_path.suffix + ".tmp")
    with temp_path.open("wb") as f:
        shutil.copyfileobj(upload.file, f)
    temp_path.replace(dest_path)


@router.post("/import", status_code=201)
async def import_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Accept an uploaded image file, store the original file under backend/storage/originals,
    extract basic metadata (format, width, height) via Pillow, create an Image row in the DB,
    and return the created record.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Generate a safe unique filename to avoid collisions
    suffix = Path(file.filename).suffix or ""
    unique_name = f"{uuid.uuid4().hex}{suffix}"
    save_path = ORIGINALS_DIR / unique_name

    # Read small portion to validate it's an image without loading the whole file twice
    try:
        contents = await file.read()
        img = PILImage.open(io.BytesIO(contents))
        img.verify()  # verify may close the image file; we reopen later if needed
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Uploaded file is not a supported image")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading image: {e}")

    # Write to disk (we already consumed the file; write from in-memory bytes)
    try:
        with save_path.open("wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    # Re-open to get dimensions and format (safe now)
    try:
        with PILImage.open(save_path) as img2:
            width, height = img2.size
            fmt = img2.format
    except Exception:
        width = None
        height = None
        fmt = None

    # Create DB record
    image_row = ImageModel(
        filename=file.filename,
        filepath=str(save_path.resolve()),
        width=width,
        height=height,
        format=fmt,
        metadata=None,
    )
    db.add(image_row)
    db.commit()
    db.refresh(image_row)

    return JSONResponse(
        {
            "id": image_row.id,
            "filename": image_row.filename,
            "filepath": image_row.filepath,
            "width": image_row.width,
            "height": image_row.height,
            "format": image_row.format,
            "created_at": image_row.created_at.isoformat(),
        }
    )


@router.get("/images")
def list_images(db: Session = Depends(get_db)):
    """
    Return a list of imported images with basic metadata.
    """
    images = db.query(ImageModel).order_by(ImageModel.created_at.desc()).all()
    return [
        {
            "id": img.id,
            "filename": img.filename,
            "filepath": img.filepath,
            "width": img.width,
            "height": img.height,
            "format": img.format,
            "created_at": img.created_at.isoformat(),
        }
        for img in images
    ]


@router.get("/images/{image_id}")
def get_image_metadata(image_id: int, db: Session = Depends(get_db)):
    """
    Return metadata for a single image.
    """
    img = db.query(ImageModel).filter(ImageModel.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return {
        "id": img.id,
        "filename": img.filename,
        "filepath": img.filepath,
        "width": img.width,
        "height": img.height,
        "format": img.format,
        "metadata": img.metadata,
        "created_at": img.created_at.isoformat(),
    }


@router.get("/images/{image_id}/file")
def download_image_file(image_id: int, db: Session = Depends(get_db)):
    """
    Serve the original image file for download/preview.
    """
    img = db.query(ImageModel).filter(ImageModel.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = Path(img.filepath)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    return FileResponse(path=str(file_path), filename=img.filename, media_type="application/octet-stream")