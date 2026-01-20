"""
Advanced Print Module API
Provides professional print layouts, contact sheets, picture packages, and custom templates.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io

router = APIRouter(prefix="/api/print", tags=["print"])


class PrintLayout(BaseModel):
    layout_type: str  # "single", "2up", "4up", "contact_sheet", "picture_package", "custom"
    paper_size: str  # "4x6", "5x7", "8x10", "A4", "Letter", "11x14", "13x19"
    orientation: str  # "portrait", "landscape"
    dpi: int = 300
    color_profile: str = "sRGB"  # "sRGB", "AdobeRGB", "ProPhotoRGB"
    margins_inches: float = 0.5
    borderless: bool = False
    images_per_page: int = 1
    grid_rows: Optional[int] = None
    grid_cols: Optional[int] = None
    spacing_inches: float = 0.25
    add_filename: bool = False
    add_metadata: bool = False


class PrintTemplate(BaseModel):
    name: str
    description: str
    layout_config: Dict


# Paper size definitions in inches
PAPER_SIZES = {
    "4x6": (4, 6),
    "5x7": (5, 7),
    "8x10": (8, 10),
    "A4": (8.27, 11.69),
    "Letter": (8.5, 11),
    "11x14": (11, 14),
    "13x19": (13, 19),
    "16x20": (16, 20),
    "A3": (11.69, 16.54),
}


@router.post("/layout")
async def create_print_layout(layout: PrintLayout, images: List[UploadFile] = File(...)):
    """
    Create a print layout with specified configuration.
    """
    try:
        # Get paper dimensions
        if layout.paper_size not in PAPER_SIZES:
            raise HTTPException(status_code=400, detail=f"Invalid paper size: {layout.paper_size}")
        
        paper_width, paper_height = PAPER_SIZES[layout.paper_size]
        
        # Swap dimensions for landscape
        if layout.orientation == "landscape":
            paper_width, paper_height = paper_height, paper_width
        
        # Convert to pixels
        width_px = int(paper_width * layout.dpi)
        height_px = int(paper_height * layout.dpi)
        margin_px = int(layout.margins_inches * layout.dpi) if not layout.borderless else 0
        spacing_px = int(layout.spacing_inches * layout.dpi)
        
        # Create canvas
        canvas = np.ones((height_px, width_px, 3), dtype=np.uint8) * 255
        
        # Load images
        loaded_images = []
        for img_file in images:
            img_bytes = await img_file.read()
            img_array = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is not None:
                loaded_images.append(img)
        
        if not loaded_images:
            raise HTTPException(status_code=400, detail="No valid images provided")
        
        # Apply layout
        if layout.layout_type == "single":
            canvas = _layout_single(canvas, loaded_images[0], margin_px)
        elif layout.layout_type == "2up":
            canvas = _layout_grid(canvas, loaded_images[:2], 1, 2, margin_px, spacing_px)
        elif layout.layout_type == "4up":
            canvas = _layout_grid(canvas, loaded_images[:4], 2, 2, margin_px, spacing_px)
        elif layout.layout_type == "contact_sheet":
            rows = layout.grid_rows or 4
            cols = layout.grid_cols or 5
            canvas = _layout_grid(canvas, loaded_images, rows, cols, margin_px, spacing_px)
        elif layout.layout_type == "picture_package":
            canvas = _layout_picture_package(canvas, loaded_images[0], margin_px, spacing_px)
        elif layout.layout_type == "custom" and layout.grid_rows and layout.grid_cols:
            canvas = _layout_grid(canvas, loaded_images, layout.grid_rows, layout.grid_cols, margin_px, spacing_px)
        
        # Convert to bytes
        _, buffer = cv2.imencode('.jpg', canvas, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        return {
            "status": "success",
            "layout_type": layout.layout_type,
            "paper_size": layout.paper_size,
            "dimensions_px": {"width": width_px, "height": height_px},
            "dpi": layout.dpi,
            "image_data": buffer.tobytes().hex()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _layout_single(canvas, img, margin):
    """Place single image centered on canvas."""
    h, w = canvas.shape[:2]
    usable_h = h - 2 * margin
    usable_w = w - 2 * margin
    
    # Resize image to fit
    img_h, img_w = img.shape[:2]
    scale = min(usable_w / img_w, usable_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    
    # Center on canvas
    y_offset = margin + (usable_h - new_h) // 2
    x_offset = margin + (usable_w - new_w) // 2
    
    canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
    
    return canvas


def _layout_grid(canvas, images, rows, cols, margin, spacing):
    """Place images in a grid layout."""
    h, w = canvas.shape[:2]
    usable_h = h - 2 * margin
    usable_w = w - 2 * margin
    
    # Calculate cell size
    cell_h = (usable_h - (rows - 1) * spacing) // rows
    cell_w = (usable_w - (cols - 1) * spacing) // cols
    
    for idx, img in enumerate(images[:rows * cols]):
        row = idx // cols
        col = idx % cols
        
        # Resize image to fit cell
        img_h, img_w = img.shape[:2]
        scale = min(cell_w / img_w, cell_h / img_h)
        new_w = int(img_w * scale)
        new_h = int(img_h * scale)
        
        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        
        # Position in cell
        y_base = margin + row * (cell_h + spacing)
        x_base = margin + col * (cell_w + spacing)
        
        y_offset = y_base + (cell_h - new_h) // 2
        x_offset = x_base + (cell_w - new_w) // 2
        
        canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
    
    return canvas


def _layout_picture_package(canvas, img, margin, spacing):
    """Create a picture package layout with multiple sizes of the same image."""
    h, w = canvas.shape[:2]
    usable_h = h - 2 * margin
    usable_w = w - 2 * margin
    
    # Picture package: 1 large (5x7), 2 medium (3.5x5), 4 small (2.5x3.5)
    # Simplified version: 1 large + smaller versions
    
    # Large image (2/3 of width)
    large_w = int(usable_w * 0.65)
    large_h = int(usable_h * 0.7)
    
    img_h, img_w = img.shape[:2]
    scale = min(large_w / img_w, large_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    
    large_img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    canvas[margin:margin+new_h, margin:margin+new_w] = large_img
    
    # Small images on the right
    small_w = usable_w - new_w - spacing
    small_h = (usable_h - spacing) // 2
    
    for i in range(2):
        scale_small = min(small_w / img_w, small_h / img_h)
        small_new_w = int(img_w * scale_small)
        small_new_h = int(img_h * scale_small)
        
        small_img = cv2.resize(img, (small_new_w, small_new_h), interpolation=cv2.INTER_LANCZOS4)
        
        y_pos = margin + i * (small_h + spacing)
        x_pos = margin + new_w + spacing
        
        canvas[y_pos:y_pos+small_new_h, x_pos:x_pos+small_new_w] = small_img
    
    return canvas


@router.get("/templates")
async def get_print_templates():
    """Get available print layout templates."""
    templates = [
        {
            "name": "Single Image",
            "description": "Full page single image",
            "layout_type": "single",
            "preview": "single_preview.jpg"
        },
        {
            "name": "2-Up Portrait",
            "description": "Two images side by side",
            "layout_type": "2up",
            "preview": "2up_preview.jpg"
        },
        {
            "name": "4-Up Grid",
            "description": "Four images in 2x2 grid",
            "layout_type": "4up",
            "preview": "4up_preview.jpg"
        },
        {
            "name": "Contact Sheet",
            "description": "Multiple images in grid (4x5 default)",
            "layout_type": "contact_sheet",
            "preview": "contact_preview.jpg"
        },
        {
            "name": "Picture Package",
            "description": "Multiple sizes of same image",
            "layout_type": "picture_package",
            "preview": "package_preview.jpg"
        },
    ]
    
    return {"templates": templates}


@router.get("/paper-sizes")
async def get_paper_sizes():
    """Get available paper sizes."""
    return {
        "paper_sizes": [
            {"name": "4x6", "width": 4, "height": 6, "unit": "inches"},
            {"name": "5x7", "width": 5, "height": 7, "unit": "inches"},
            {"name": "8x10", "width": 8, "height": 10, "unit": "inches"},
            {"name": "A4", "width": 8.27, "height": 11.69, "unit": "inches"},
            {"name": "Letter", "width": 8.5, "height": 11, "unit": "inches"},
            {"name": "11x14", "width": 11, "height": 14, "unit": "inches"},
            {"name": "13x19", "width": 13, "height": 19, "unit": "inches"},
            {"name": "16x20", "width": 16, "height": 20, "unit": "inches"},
            {"name": "A3", "width": 11.69, "height": 16.54, "unit": "inches"},
        ]
    }