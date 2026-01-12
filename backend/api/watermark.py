from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import Optional
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io

router = APIRouter()

@router.post("/add-text")
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