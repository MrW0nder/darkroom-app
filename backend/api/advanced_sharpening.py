from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import cv2
import numpy as np

router = APIRouter()

class SharpeningRequest(BaseModel):
    image_path: str
    mode: str = "capture"  # capture, creative, output
    amount: float = 50.0
    radius: float = 1.0
    detail: float = 25.0
    masking: float = 0.0

class NoiseReductionRequest(BaseModel):
    image_path: str
    luminance: float = 50.0
    color: float = 25.0
    detail: float = 50.0
    contrast: float = 0.0
    smoothness: float = 50.0

def unsharp_mask(image: np.ndarray, amount: float, radius: float, threshold: float = 0) -> np.ndarray:
    """Apply unsharp mask sharpening"""
    # Convert to float
    img_float = image.astype(np.float32)
    
    # Create blurred version
    blurred = cv2.GaussianBlur(img_float, (0, 0), radius)
    
    # Calculate sharpened image
    sharpened = img_float + amount * (img_float - blurred)
    
    # Apply threshold if specified
    if threshold > 0:
        low_contrast_mask = np.abs(img_float - blurred) < threshold
        sharpened = np.where(low_contrast_mask, img_float, sharpened)
    
    return np.clip(sharpened, 0, 255).astype(np.uint8)

def high_pass_sharpen(image: np.ndarray, radius: float, amount: float) -> np.ndarray:
    """High-pass filter based sharpening"""
    # Convert to grayscale for edge detection
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
    else:
        gray = image.astype(np.float32)
    
    # Apply Gaussian blur
    blurred = cv2.GaussianBlur(gray, (0, 0), radius)
    
    # High-pass filter
    high_pass = gray - blurred
    
    # Normalize
    high_pass = (high_pass - high_pass.min()) / (high_pass.max() - high_pass.min() + 1e-5)
    high_pass = (high_pass - 0.5) * 2  # Center around 0
    
    # Apply to original image
    img_float = image.astype(np.float32)
    
    if len(image.shape) == 3:
        high_pass = high_pass[:, :, np.newaxis]
    
    sharpened = img_float + amount * high_pass
    
    return np.clip(sharpened, 0, 255).astype(np.uint8)

def capture_sharpening(image: np.ndarray, amount: float, radius: float, detail: float, masking: float) -> np.ndarray:
    """Capture sharpening for RAW images - corrects lens/sensor blur"""
    # Multi-scale sharpening for different detail levels
    
    # Base sharpening
    sharpened = unsharp_mask(image, amount / 100.0, radius, 0)
    
    # Detail enhancement
    if detail > 0:
        detail_enhanced = high_pass_sharpen(sharpened, 0.5, detail / 100.0)
        sharpened = cv2.addWeighted(sharpened, 1 - detail/200, detail_enhanced, detail/200, 0)
    
    # Edge masking - only sharpen edges
    if masking > 0:
        # Detect edges
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        edges = cv2.Canny(gray, 50, 150)
        edges_blurred = cv2.GaussianBlur(edges, (5, 5), 0) / 255.0
        
        # Apply mask
        if len(image.shape) == 3:
            edges_blurred = edges_blurred[:, :, np.newaxis]
        
        mask_strength = masking / 100.0
        edge_mask = edges_blurred * mask_strength + (1 - mask_strength)
        
        sharpened = (image * (1 - edge_mask) + sharpened * edge_mask).astype(np.uint8)
    
    return sharpened

def creative_sharpening(image: np.ndarray, amount: float, radius: float, detail: float) -> np.ndarray:
    """Creative sharpening for artistic effects - more aggressive"""
    # Stronger sharpening with clarity-like local contrast
    
    # Base unsharp mask
    sharpened = unsharp_mask(image, amount / 50.0, radius, 0)
    
    # Local contrast enhancement (clarity)
    if detail > 0:
        # Medium radius blur for local contrast
        blurred_medium = cv2.GaussianBlur(image.astype(np.float32), (0, 0), 10.0)
        local_contrast = image.astype(np.float32) - blurred_medium
        
        enhanced = image.astype(np.float32) + local_contrast * (detail / 100.0)
        enhanced = np.clip(enhanced, 0, 255).astype(np.uint8)
        
        sharpened = cv2.addWeighted(sharpened, 0.5, enhanced, 0.5, 0)
    
    return sharpened

def output_sharpening(image: np.ndarray, amount: float, media_type: str = "screen") -> np.ndarray:
    """Output sharpening based on viewing medium"""
    # Different sharpening for screen vs print
    
    if media_type == "screen":
        # Subtle sharpening for screen viewing
        radius = 0.5
        threshold = 1.0
    elif media_type == "matte_paper":
        # More aggressive for matte paper
        radius = 1.0
        threshold = 0.5
    elif media_type == "glossy_paper":
        # Medium sharpening for glossy
        radius = 0.8
        threshold = 0.8
    else:
        radius = 1.0
        threshold = 1.0
    
    sharpened = unsharp_mask(image, amount / 100.0, radius, threshold)
    
    return sharpened

@router.post("/sharpen")
async def apply_sharpening(request: SharpeningRequest):
    """Apply advanced sharpening"""
    try:
        image = cv2.imread(request.image_path)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        if request.mode == "capture":
            result = capture_sharpening(
                image,
                request.amount,
                request.radius,
                request.detail,
                request.masking
            )
        elif request.mode == "creative":
            result = creative_sharpening(
                image,
                request.amount,
                request.radius,
                request.detail
            )
        elif request.mode == "output":
            result = output_sharpening(
                image,
                request.amount,
                "screen"
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid sharpening mode")
        
        # Save result
        output_path = request.image_path.replace(".", f"_sharpened_{request.mode}.")
        cv2.imwrite(output_path, result)
        
        return {
            "status": "success",
            "output_path": output_path,
            "mode": request.mode
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/denoise")
async def apply_noise_reduction(request: NoiseReductionRequest):
    """Apply advanced noise reduction"""
    try:
        image = cv2.imread(request.image_path)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not load image")
        
        # Convert to float
        img_float = image.astype(np.float32) / 255.0
        
        # Non-local means denoising for luminance
        if request.luminance > 0:
            h_luminance = request.luminance / 10.0
            denoised = cv2.fastNlMeansDenoisingColored(
                image,
                None,
                h=h_luminance,
                hColor=request.color / 10.0,
                templateWindowSize=7,
                searchWindowSize=21
            )
        else:
            denoised = image.copy()
        
        # Detail preservation
        if request.detail > 0:
            # Edge-preserving filter
            denoised = cv2.bilateralFilter(
                denoised,
                d=9,
                sigmaColor=75 * (request.detail / 100.0),
                sigmaSpace=75 * (request.detail / 100.0)
            )
        
        # Smoothness
        if request.smoothness > 0:
            kernel_size = int(request.smoothness / 25) * 2 + 1
            denoised = cv2.GaussianBlur(denoised, (kernel_size, kernel_size), 0)
        
        # Contrast preservation
        if abs(request.contrast) > 0.001:
            # Enhance contrast after denoising
            lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB).astype(np.float32)
            l_channel = lab[:, :, 0]
            
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0 * (1 + request.contrast / 100.0), tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(l_channel.astype(np.uint8))
            
            denoised = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)
        
        # Save result
        output_path = request.image_path.replace(".", "_denoised.")
        cv2.imwrite(output_path, denoised)
        
        return {
            "status": "success",
            "output_path": output_path,
            "settings": {
                "luminance": request.luminance,
                "color": request.color,
                "detail": request.detail,
                "smoothness": request.smoothness
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
