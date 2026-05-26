"""
Image Export API
Export single or multiple layers with applied adjustments.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, Literal, List
from pathlib import Path
import shutil
import uuid
import numpy as np
import cv2
import piexif
from PIL import Image as PILImage

from backend.db import get_db, STORAGE_DIR
from backend.models.layers import Layer
from backend.services.image_processor import ImageProcessor

router = APIRouter(prefix="/api/export", tags=["export"])

EXPORTS_DIR = Path(STORAGE_DIR) / "exports"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

# ── Pydantic models ────────────────────────────────────────────────────────

class Adjustments(BaseModel):
    brightness:  float = 0
    contrast:    float = 0
    saturation:  float = 0
    vibrance:    float = 0
    exposure:    float = 0
    highlights:  float = 0
    shadows:     float = 0
    sharpness:   float = 1.0
    temperature: float = 0   # white balance — Kelvin offset
    tint:        float = 0   # white balance — green/magenta axis


class ResizeOptions(BaseModel):
    long_edge:  Optional[int] = Field(default=None, ge=64, le=65536, description="Resize so the longest side equals this pixel count")
    width:      Optional[int] = Field(default=None, ge=64, le=65536, description="Exact output width (preserves aspect ratio)")
    height:     Optional[int] = Field(default=None, ge=64, le=65536, description="Exact output height (preserves aspect ratio)")
    dpi:        int = Field(default=300, ge=72, le=1200, description="Output DPI for print formats")


class ExportRequest(BaseModel):
    layer_id:    int
    format:      Literal["JPEG", "PNG", "PNG16", "TIFF", "TIFF16", "WEBP", "PDF", "RAW", "BMP", "PPM"] = "JPEG"
    quality:     int = Field(default=95, ge=1, le=100)
    filename:    Optional[str] = None
    adjustments: Optional[Adjustments] = None
    resize:      Optional[ResizeOptions] = None


class BatchExportItem(BaseModel):
    layer_id:    int
    adjustments: Optional[Adjustments] = None


class BatchExportRequest(BaseModel):
    items:     List[BatchExportItem]
    format:    Literal["JPEG", "PNG", "PNG16", "TIFF", "TIFF16", "WEBP", "PDF", "RAW", "BMP", "PPM"] = "JPEG"
    quality:   int = Field(default=95, ge=1, le=100)
    prefix:    Optional[str] = None
    save_path: Optional[str] = None
    resize:    Optional[ResizeOptions] = None


# ── Helpers ────────────────────────────────────────────────────────────────

EXT_MAP  = {"JPEG": ".jpg", "PNG": ".png", "PNG16": ".png", "TIFF": ".tiff", "TIFF16": ".tiff",
            "WEBP": ".webp", "PDF": ".pdf", "RAW": "", "BMP": ".bmp", "PPM": ".ppm"}
MIME_MAP = {"JPEG": "image/jpeg", "PNG": "image/png", "PNG16": "image/png",
            "TIFF": "image/tiff", "TIFF16": "image/tiff",
            "WEBP": "image/webp", "PDF": "application/pdf", "BMP": "image/bmp", "PPM": "image/x-portable-pixmap"}


def _resolve_source(layer: Layer) -> Path:
    content = layer.content
    if not content:
        raise HTTPException(status_code=400, detail=f"Layer {layer.id} has no image content")
    p = Path(content)
    if p.is_absolute() and p.exists():
        return p
    filename = p.name or content.replace("\\", "/").split("/")[-1]
    candidate = Path(STORAGE_DIR) / "originals" / filename
    if candidate.exists():
        return candidate
    raise HTTPException(status_code=404, detail=f"Source file not found for layer {layer.id}: {content}")


def _read_source_exif(src: Path) -> Optional[bytes]:
    """Extract raw EXIF bytes from the source file. Returns None on any failure."""
    try:
        pil = PILImage.open(str(src))
        exif_data = pil.info.get("exif")
        if exif_data:
            return exif_data
        # Try piexif as a fallback for TIFF sources
        exif_dict = piexif.load(str(src))
        return piexif.dump(exif_dict)
    except Exception:
        return None


def _embed_exif(exif_bytes: Optional[bytes], dest: Path, fmt: str, dpi: int) -> None:
    """Re-embed EXIF (with updated DPI) into an already-written JPEG or TIFF."""
    if not exif_bytes or fmt not in ("JPEG", "TIFF", "TIFF16"):
        return
    try:
        exif_dict = piexif.load(exif_bytes)
        # Update / insert DPI in the EXIF
        rational_dpi = (dpi, 1)
        exif_dict.setdefault("0th", {})
        exif_dict["0th"][piexif.ImageIFD.XResolution] = rational_dpi
        exif_dict["0th"][piexif.ImageIFD.YResolution] = rational_dpi
        exif_dict["0th"][piexif.ImageIFD.ResolutionUnit] = 2  # inches
        updated = piexif.dump(exif_dict)
        piexif.insert(updated, str(dest))
    except Exception:
        pass  # EXIF embedding is best-effort; never fail the export


def _apply_resize(img: np.ndarray, resize: Optional["ResizeOptions"]) -> np.ndarray:
    """Resize the image according to ResizeOptions. Returns original if no resize requested."""
    if resize is None:
        return img
    h, w = img.shape[:2]
    target_w, target_h = w, h
    if resize.long_edge:
        scale = resize.long_edge / max(w, h)
        if scale < 1.0:  # only downscale
            target_w = round(w * scale)
            target_h = round(h * scale)
    elif resize.width:
        scale = resize.width / w
        target_w = resize.width
        target_h = round(h * scale)
    elif resize.height:
        scale = resize.height / h
        target_h = resize.height
        target_w = round(w * scale)
    if (target_w, target_h) == (w, h):
        return img
    interp = cv2.INTER_AREA if (target_w < w or target_h < h) else cv2.INTER_LANCZOS4
    return cv2.resize(img, (target_w, target_h), interpolation=interp)


def _write_image(img: np.ndarray, dest: Path, fmt: str, quality: int, dpi: int,
                 exif_bytes: Optional[bytes]) -> None:
    if fmt == "JPEG":
        cv2.imwrite(str(dest), img, [cv2.IMWRITE_JPEG_QUALITY, quality])
        _embed_exif(exif_bytes, dest, fmt, dpi)
    elif fmt == "PNG":
        compress = max(0, min(9, (100 - quality) // 11))
        cv2.imwrite(str(dest), img, [cv2.IMWRITE_PNG_COMPRESSION, compress])
    elif fmt == "PNG16":
        img16 = (img.astype(np.float32) / 255.0 * 65535.0).astype(np.uint16)
        cv2.imwrite(str(dest), img16)
    elif fmt == "WEBP":
        cv2.imwrite(str(dest), img, [cv2.IMWRITE_WEBP_QUALITY, quality])
    elif fmt == "PDF":
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pil = PILImage.fromarray(rgb)
        pil.save(str(dest), "PDF", resolution=dpi)
    elif fmt == "TIFF":
        cv2.imwrite(str(dest), img)
        _embed_exif(exif_bytes, dest, fmt, dpi)
    elif fmt == "TIFF16":
        img16 = (img.astype(np.float32) / 255.0 * 65535.0).astype(np.uint16)
        cv2.imwrite(str(dest), img16)
        _embed_exif(exif_bytes, dest, "TIFF", dpi)
    elif fmt == "BMP":
        cv2.imwrite(str(dest), img)
    elif fmt == "PPM":
        cv2.imwrite(str(dest), img)


def _export_layer(layer: Layer, fmt: str, quality: int, stem: str,
                  adjustments: Optional[Adjustments],
                  resize: Optional[ResizeOptions] = None) -> Path:
    src = _resolve_source(layer)
    # RAW passthrough: copy the original file unchanged
    if fmt == "RAW":
        dest = EXPORTS_DIR / f"{stem}_{src.name}"
        shutil.copy2(src, dest)
        return dest
    exif_bytes = _read_source_exif(src)
    img = ImageProcessor.load_image(str(src))
    if adjustments:
        img = ImageProcessor.apply_adjustments(img, adjustments.model_dump())
    img = _apply_resize(img, resize)
    dpi = resize.dpi if resize else 300
    dest = EXPORTS_DIR / f"{stem}{EXT_MAP[fmt]}"
    _write_image(img, dest, fmt, quality, dpi, exif_bytes)
    return dest


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/single")
async def export_single(request: ExportRequest, db: Session = Depends(get_db)):
    """Export one layer with optional adjustments. Returns a download URL."""
    layer = db.query(Layer).filter(Layer.id == request.layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    stem = request.filename or f"export_{uuid.uuid4().hex[:10]}"
    dest = _export_layer(layer, request.format, request.quality, stem, request.adjustments, request.resize)
    return {
        "success":      True,
        "filename":     dest.name,
        "download_url": f"/api/export/download/{dest.name}",
        "format":       request.format,
        "size_bytes":   dest.stat().st_size,
    }


@router.post("/batch")
async def export_batch(request: BatchExportRequest, db: Session = Depends(get_db)):
    """Export multiple layers. Returns a list of download URLs."""
    prefix    = request.prefix or "batch_export"
    save_dir: Optional[Path] = None
    if request.save_path:
        save_dir = Path(request.save_path).resolve()
        if not save_dir.is_dir():
            raise HTTPException(status_code=400, detail=f"Save path is not a valid directory: {request.save_path}")
    results = []
    for i, item in enumerate(request.items):
        layer = db.query(Layer).filter(Layer.id == item.layer_id).first()
        if not layer:
            results.append({"layer_id": item.layer_id, "success": False, "error": "Layer not found"})
            continue
        try:
            stem = f"{prefix}_{i+1:03d}_{uuid.uuid4().hex[:6]}"
            dest = _export_layer(layer, request.format, request.quality, stem, item.adjustments, request.resize)
            if save_dir:
                shutil.copy2(dest, save_dir / dest.name)
            results.append({
                "layer_id":     item.layer_id,
                "success":      True,
                "filename":     dest.name,
                "download_url": f"/api/export/download/{dest.name}",
                "size_bytes":   dest.stat().st_size,
            })
        except Exception as exc:
            results.append({"layer_id": item.layer_id, "success": False, "error": str(exc)})
    return {"format": request.format, "results": results}


@router.get("/download/{filename}")
async def download_export(filename: str):
    """Serve a previously exported file for download."""
    safe_name = Path(filename).name          # strip any path traversal
    file_path = EXPORTS_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    ext    = file_path.suffix.lower().lstrip(".")
    lookup = {"jpg": "JPEG", "jpeg": "JPEG", "png": "PNG", "tiff": "TIFF",
              "tif": "TIFF", "webp": "WEBP", "pdf": "PDF", "bmp": "BMP", "ppm": "PPM", "tiff16": "TIFF16"}
    mime   = MIME_MAP.get(lookup.get(ext, ""), "application/octet-stream")
    return FileResponse(path=str(file_path), filename=safe_name, media_type=mime)


# Legacy endpoint – keep old callers working
@router.post("/")
async def export_image_legacy(request: ExportRequest, db: Session = Depends(get_db)):
    return await export_single(request, db)
