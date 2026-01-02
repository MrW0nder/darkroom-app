from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from backend.db import STORAGE_DIR, get_db  # Ensure these imports match your structure
from backend.models.models import Image as ImageModel
from backend.models.layers import Layer  # Import Layer model
from pathlib import Path
import uuid
from PIL import Image as PILImage, UnidentifiedImageError
import io

router = APIRouter(prefix="/api", tags=["imports"])

@router.post("/import", status_code=201)
async def import_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Generate a unique filename for storage
    suffix = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4().hex}{suffix}"
    save_path = Path(STORAGE_DIR) / "originals" / unique_name
    save_path.parent.mkdir(parents=True, exist_ok=True)  # Ensure the directory exists

    try:
        # Save the uploaded file to disk
        contents = await file.read()
        with save_path.open("wb") as f:
            f.write(contents)

        # Extract image metadata using PIL
        with PILImage.open(io.BytesIO(contents)) as img:
            width, height = img.size
            fmt = img.format

        # Insert into `images` table
        image_record = ImageModel(
            filename=file.filename,
            filepath=str(save_path.resolve()),
            width=width,
            height=height,
            format=fmt,
        )
        db.add(image_record)
        db.commit()
        db.refresh(image_record)

        # Insert into `layers` table
        layer_record = Layer(
            project_id=0,  # Default project ID (can vary depending on your app logic)
            type="image",  # Always "image" for now
            content=str(save_path.resolve()),  # Use the file path of the image as content
            z_index=0,  # Default z-index
            width=width,
            height=height,
            blend_mode="normal",  # Default blend mode
            opacity=100,
            visible=True,
            locked=False,
            x=0,
            y=0,
        )
        db.add(layer_record)
        db.commit()
        db.refresh(layer_record)

        # Return the combined response for the uploaded image using Layer data
        return {
            "id": layer_record.id,
            "filename": image_record.filename,
            "filepath": image_record.filepath,
            "content": layer_record.content,
            "width": layer_record.width,
            "height": layer_record.height,
            "format": image_record.format,
        }
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded image: {e}")