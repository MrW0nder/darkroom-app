from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import uuid
from pathlib import Path

from backend.db import get_db, STORAGE_DIR
from backend.models.layers import Layer

router = APIRouter(prefix="/api/watermark", tags=["watermark"])

EXPORTS_DIR = Path(STORAGE_DIR) / "exports"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Helpers ────────────────────────────────────────────────────────────────

def _resolve_layer_source(layer: Layer) -> Path:
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
    raise HTTPException(status_code=404, detail=f"Source file not found for layer {layer.id}")


def _load_font(size: int):
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    try:
        return ImageFont.load_default(size=size)  # type: ignore[call-arg]
    except TypeError:
        return ImageFont.load_default()


def _hex_to_rgba(hex_color: str, opacity: float) -> tuple:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r, g, b, max(0, min(255, int(opacity * 255))))


def _calc_position(canvas_w: int, canvas_h: int, item_w: int, item_h: int,
                   position: str, margin: int = 20) -> tuple:
    return {
        "top-left":     (margin, margin),
        "top-right":    (canvas_w - item_w - margin, margin),
        "bottom-left":  (margin, canvas_h - item_h - margin),
        "bottom-right": (canvas_w - item_w - margin, canvas_h - item_h - margin),
        "center":       ((canvas_w - item_w) // 2, (canvas_h - item_h) // 2),
    }.get(position, (canvas_w - item_w - margin, canvas_h - item_h - margin))


# ── Layer-based endpoint (for the editor UI) ──────────────────────────────

@router.post("/apply")
async def apply_watermark(
    layer_id: int = Form(...),
    watermark_type: str = Form("text"),
    text: Optional[str] = Form(None),
    position: str = Form("bottom-right"),
    font_size: int = Form(36),
    opacity: float = Form(0.7),
    color: str = Form("#FFFFFF"),
    scale: float = Form(0.2),
    watermark_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Apply a text or image watermark to a layer and return a preview URL."""
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")

    src = _resolve_layer_source(layer)
    base_img = Image.open(str(src)).convert("RGBA")
    w, h = base_img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    if watermark_type == "text":
        if not text:
            raise HTTPException(status_code=400, detail="text is required for text watermark")
        font = _load_font(font_size)
        draw = ImageDraw.Draw(overlay)
        fill = _hex_to_rgba(color, opacity)
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        except AttributeError:
            tw, th = draw.textsize(text, font=font)  # type: ignore[attr-defined]
        x, y = _calc_position(w, h, tw, th, position)
        draw.text((x, y), text, font=font, fill=fill)

    elif watermark_type == "image":
        if not watermark_image:
            raise HTTPException(status_code=400, detail="watermark_image is required for image watermark")
        wm_data = await watermark_image.read()
        wm = Image.open(io.BytesIO(wm_data)).convert("RGBA")
        wm_w = max(1, int(w * scale))
        wm_h = max(1, int(wm.height * wm_w / wm.width))
        wm = wm.resize((wm_w, wm_h), Image.LANCZOS)
        r2, g2, b2, a2 = wm.split()
        a2 = a2.point(lambda p: int(p * max(0.0, min(1.0, opacity))))
        wm = Image.merge("RGBA", (r2, g2, b2, a2))
        x, y = _calc_position(w, h, wm_w, wm_h, position)
        overlay.paste(wm, (x, y), mask=wm)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown watermark_type: {watermark_type!r}")

    result = Image.alpha_composite(base_img, overlay).convert("RGB")
    dest_name = f"wm_{layer_id}_{uuid.uuid4().hex[:8]}.jpg"
    dest = EXPORTS_DIR / dest_name
    result.save(str(dest), "JPEG", quality=95)

    return {
        "success": True,
        "layer_id": layer_id,
        "preview_url": f"/api/export/download/{dest_name}",
    }


async def add_text_watermark(
    image: UploadFile = File(...),
    text: str = Form(...),
    position: str = Form("bottom-right"),
    font_size: int = Form(36),
    opacity: float = Form(0.5),
    color: str = Form("#FFFFFF")
):
    """Add text watermark to image"""
    # Read image
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Convert to PIL for text rendering
    pil_img = Image.fromarray(img)
    
    # Create transparent overlay
    overlay = Image.new('RGBA', pil_img.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Try to use a font, fallback to default
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Calculate text position
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    positions = {
        "top-left": (20, 20),
        "top-right": (pil_img.width - text_width - 20, 20),
        "bottom-left": (20, pil_img.height - text_height - 20),
        "bottom-right": (pil_img.width - text_width - 20, pil_img.height - text_height - 20),
        "center": ((pil_img.width - text_width) // 2, (pil_img.height - text_height) // 2)
    }
    
    pos = positions.get(position, positions["bottom-right"])
    
    # Parse color
    color_rgb = tuple(int(color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    color_rgba = color_rgb + (int(255 * opacity),)
    
    # Draw text
    draw.text(pos, text, font=font, fill=color_rgba)
    
    # Composite overlay onto original image
    pil_img = pil_img.convert('RGBA')
    pil_img = Image.alpha_composite(pil_img, overlay)
    pil_img = pil_img.convert('RGB')
    
    # Convert back to bytes
    img_byte_arr = io.BytesIO()
    pil_img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    return StreamingResponse(img_byte_arr, media_type="image/png")

@router.post("/add-image")
async def add_image_watermark(
    image: UploadFile = File(...),
    watermark: UploadFile = File(...),
    position: str = Form("bottom-right"),
    scale: float = Form(0.2),
    opacity: float = Form(0.5)
):
    """Add image watermark to image"""
    # Read main image
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Read watermark image
    wm_contents = await watermark.read()
    wm_nparr = np.frombuffer(wm_contents, np.uint8)
    wm_img = cv2.imdecode(wm_nparr, cv2.IMREAD_UNCHANGED)
    
    # Convert to PIL
    pil_img = Image.fromarray(img)
    
    # Handle watermark with alpha channel
    if wm_img.shape[2] == 4:
        wm_img = cv2.cvtColor(wm_img, cv2.COLOR_BGRA2RGBA)
    else:
        wm_img = cv2.cvtColor(wm_img, cv2.COLOR_BGR2RGB)
    
    pil_wm = Image.fromarray(wm_img)
    
    # Scale watermark
    wm_width = int(pil_img.width * scale)
    wm_height = int(pil_wm.height * (wm_width / pil_wm.width))
    pil_wm = pil_wm.resize((wm_width, wm_height), Image.Resampling.LANCZOS)
    
    # Apply opacity
    if pil_wm.mode != 'RGBA':
        pil_wm = pil_wm.convert('RGBA')
    
    alpha = pil_wm.split()[3]
    alpha = alpha.point(lambda p: int(p * opacity))
    pil_wm.putalpha(alpha)
    
    # Calculate position
    positions = {
        "top-left": (20, 20),
        "top-right": (pil_img.width - wm_width - 20, 20),
        "bottom-left": (20, pil_img.height - wm_height - 20),
        "bottom-right": (pil_img.width - wm_width - 20, pil_img.height - wm_height - 20),
        "center": ((pil_img.width - wm_width) // 2, (pil_img.height - wm_height) // 2)
    }
    
    pos = positions.get(position, positions["bottom-right"])
    
    # Composite watermark onto image
    pil_img = pil_img.convert('RGBA')
    pil_img.paste(pil_wm, pos, pil_wm)
    pil_img = pil_img.convert('RGB')
    
    # Convert to bytes
    img_byte_arr = io.BytesIO()
    pil_img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    return StreamingResponse(img_byte_arr, media_type="image/png")

@router.post("/remove")
async def remove_watermark(
    image: UploadFile = File(...),
    method: str = Form("inpaint")
):
    """Attempt to remove watermark from image (AI-based)"""
    # Read image
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Simple watermark removal using inpainting
    # In production, this would use AI models
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Detect bright/watermark regions
    _, mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    
    # Dilate mask slightly
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.dilate(mask, kernel, iterations=1)
    
    # Inpaint
    result = cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA)
    
    # Convert to bytes
    _, img_encoded = cv2.imencode('.png', result)
    img_byte_arr = io.BytesIO(img_encoded.tobytes())
    
    return StreamingResponse(img_byte_arr, media_type="image/png")