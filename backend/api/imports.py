from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from backend.db import STORAGE_DIR, get_db  # Ensure these imports match your structure
from backend.models.models import Image as ImageModel
from backend.models.projects import Project
from backend.models.layers import Layer  # Import Layer model
from pathlib import Path
import uuid
import logging
from PIL import Image as PILImage, UnidentifiedImageError
import io

logger = logging.getLogger("darkroom")
router = APIRouter(prefix="/api", tags=["imports"])

@router.post("/import", status_code=201)
async def import_image(
    file: UploadFile = File(...),
    project_id: int = 0,
    set_cover: bool = False,
    db: Session = Depends(get_db)
):
    if not file:
        logger.error("No file uploaded")
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Generate a unique filename for storage
    suffix = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4().hex}{suffix}"
    save_path = Path(STORAGE_DIR) / "originals" / unique_name
    save_path.parent.mkdir(parents=True, exist_ok=True)  # Ensure the directory exists

    try:
        # Save the uploaded file to disk
        logger.info(f"Uploading file: {file.filename} ({suffix}) -> {unique_name}")
        contents = await file.read()
        with save_path.open("wb") as f:
            f.write(contents)
        logger.debug(f"File saved to: {save_path.resolve()}")

        # Extract image metadata using PIL
        with PILImage.open(io.BytesIO(contents)) as img:
            width, height = img.size
            fmt = img.format
        logger.info(f"Image metadata: {width}x{height}, format={fmt}")

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
        logger.debug(f"Created image record with ID: {image_record.id}")

        layer_record = None
        cover_image_path = None
        if set_cover and project_id:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                cover_image_path = str(save_path.relative_to(STORAGE_DIR).as_posix())
                project.cover_image = cover_image_path
                project.cover_original_width = width
                project.cover_original_height = height
                project.cover_crop_x = 0
                project.cover_crop_y = 0
                project.cover_crop_width = width
                project.cover_crop_height = height
                db.commit()
        else:
            # Insert into `layers` table
            layer_record = Layer(
                project_id=project_id,  # Use the provided project_id
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
            logger.info(f"Created layer record with ID: {layer_record.id} for project {project_id}")

        # Return the combined response for the uploaded image using Layer data
        return {
            "id": layer_record.id if layer_record else None,
            "project_id": project_id,
            "filename": image_record.filename,
            "filepath": image_record.filepath,
            "content": layer_record.content if layer_record else str(save_path.resolve()),
            "width": layer_record.width if layer_record else width,
            "height": layer_record.height if layer_record else height,
            "format": image_record.format,
            "type": layer_record.type if layer_record else "cover",
            "z_index": layer_record.z_index if layer_record else 0,
            "opacity": layer_record.opacity if layer_record else 100,
            "visible": layer_record.visible if layer_record else True,
            "cover_image": cover_image_path,
        }
    except UnidentifiedImageError:
        logger.error(f"Invalid image format: {file.filename}")
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image format")
    except Exception as e:
        logger.error(f"Failed to process uploaded image {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded image: {e}")

