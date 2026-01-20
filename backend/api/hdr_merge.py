"""
HDR Merge API - Combine multiple exposures into High Dynamic Range images
Supports exposure bracketing, alignment, ghost removal, tone mapping
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import cv2
from io import BytesIO
from PIL import Image

router = APIRouter(prefix="/api/hdr", tags=["hdr"])


class HDRMergeRequest(BaseModel):
    """HDR merge configuration"""
    alignment: bool = True  # Auto-align images
    ghost_removal: bool = True  # Remove moving objects
    tone_mapping: str = "drago"  # drago, reinhard, mantiuk
    gamma: float = 2.2
    saturation: float = 1.0
    bias: float = 0.85  # For Drago tone mapping
    response_curve: str = "auto"  # auto, linear, gamma


class HDRSettings(BaseModel):
    """HDR processing settings"""
    exposure_values: List[float]  # EV values for each image
    merge_method: str = "debevec"  # debevec, robertson, mertens
    calibration_lambda: float = 10.0
    calibration_samples: int = 70


@router.post("/merge")
async def merge_hdr(
    images: List[UploadFile] = File(...),
    settings: Optional[str] = None
):
    """
    Merge multiple exposures into HDR image
    
    Args:
        images: List of bracketed exposure images (min 3 recommended)
        settings: JSON string of HDRMergeRequest
        
    Returns:
        HDR merged and tone-mapped image
    """
    if len(images) < 2:
        raise HTTPException(status_code=400, detail="At least 2 images required for HDR merge")
    
    try:
        # Load images
        img_list = []
        for img_file in images:
            contents = await img_file.read()
            img = Image.open(BytesIO(contents))
            img_array = np.array(img).astype(np.float32) / 255.0
            img_list.append(img_array)
        
        # Parse settings
        import json
        config = HDRMergeRequest()
        if settings:
            config = HDRMergeRequest(**json.loads(settings))
        
        # Align images if requested
        if config.alignment:
            img_list = align_images(img_list)
        
        # Estimate camera response function
        if config.response_curve == "auto":
            response = estimate_response_curve(img_list)
        else:
            response = None
        
        # Merge to HDR
        if config.merge_method == "debevec":
            hdr = merge_debevec(img_list, response)
        elif config.merge_method == "robertson":
            hdr = merge_robertson(img_list, response)
        else:  # mertens
            hdr = merge_mertens(img_list)
        
        # Ghost removal
        if config.ghost_removal:
            hdr = remove_ghosts(hdr, img_list)
        
        # Tone mapping
        ldr = tone_map(hdr, config)
        
        # Convert to uint8
        result = (np.clip(ldr, 0, 1) * 255).astype(np.uint8)
        
        # Encode to JPEG
        result_img = Image.fromarray(result)
        output = BytesIO()
        result_img.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return {"status": "success", "image": output.getvalue().hex()}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HDR merge failed: {str(e)}")


def align_images(images: List[np.ndarray]) -> List[np.ndarray]:
    """Align images using feature-based registration"""
    if len(images) < 2:
        return images
    
    # Use first image as reference
    reference = images[0]
    aligned = [reference]
    
    for img in images[1:]:
        # Convert to grayscale for alignment
        ref_gray = cv2.cvtColor((reference * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
        img_gray = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
        
        # Detect ORB features
        orb = cv2.ORB_create(1000)
        kp1, des1 = orb.detectAndCompute(ref_gray, None)
        kp2, des2 = orb.detectAndCompute(img_gray, None)
        
        # Match features
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = matcher.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)
        
        # Extract matched points
        pts1 = np.float32([kp1[m.queryIdx].pt for m in matches[:50]]).reshape(-1, 1, 2)
        pts2 = np.float32([kp2[m.trainIdx].pt for m in matches[:50]]).reshape(-1, 1, 2)
        
        # Find homography
        H, _ = cv2.findHomography(pts2, pts1, cv2.RANSAC, 5.0)
        
        # Warp image
        height, width = reference.shape[:2]
        aligned_img = cv2.warpPerspective(img, H, (width, height))
        aligned.append(aligned_img)
    
    return aligned


def estimate_response_curve(images: List[np.ndarray]) -> np.ndarray:
    """Estimate camera response curve from exposure stack"""
    # Simplified - use gamma 2.2 curve
    curve = np.arange(256, dtype=np.float32)
    curve = np.power(curve / 255.0, 2.2)
    return curve


def merge_debevec(images: List[np.ndarray], response: Optional[np.ndarray]) -> np.ndarray:
    """Merge using Debevec's method"""
    # Convert to OpenCV format
    cv_images = [(img * 255).astype(np.uint8) for img in images]
    
    # Exposure times (assuming geometric sequence)
    times = np.array([1/4, 1/2, 1, 2, 4], dtype=np.float32)[:len(images)]
    
    # Create calibrate object
    calibrate = cv2.createCalibrateDebevec()
    response_cv = calibrate.process(cv_images, times)
    
    # Merge
    merge = cv2.createMergeDebevec()
    hdr = merge.process(cv_images, times, response_cv)
    
    return hdr


def merge_robertson(images: List[np.ndarray], response: Optional[np.ndarray]) -> np.ndarray:
    """Merge using Robertson's method"""
    cv_images = [(img * 255).astype(np.uint8) for img in images]
    times = np.array([1/4, 1/2, 1, 2, 4], dtype=np.float32)[:len(images)]
    
    merge = cv2.createMergeRobertson()
    hdr = merge.process(cv_images, times)
    
    return hdr


def merge_mertens(images: List[np.ndarray]) -> np.ndarray:
    """Merge using Mertens fusion (no HDR, direct to LDR)"""
    cv_images = [(img * 255).astype(np.uint8) for img in images]
    
    merge = cv2.createMergeMertens()
    result = merge.process(cv_images)
    
    return result


def remove_ghosts(hdr: np.ndarray, images: List[np.ndarray]) -> np.ndarray:
    """Remove ghosting artifacts from moving objects"""
    # Simplified ghost removal using variance
    variance = np.var(np.array(images), axis=0)
    threshold = np.percentile(variance, 90)
    mask = variance < threshold
    
    # Apply mask with feathering
    mask_blur = cv2.GaussianBlur(mask.astype(np.float32), (15, 15), 0)
    hdr_filtered = hdr * mask_blur[:, :, np.newaxis]
    
    return hdr_filtered


def tone_map(hdr: np.ndarray, config: HDRMergeRequest) -> np.ndarray:
    """Apply tone mapping to convert HDR to LDR"""
    if config.tone_mapping == "drago":
        tonemap = cv2.createTonemapDrago(
            gamma=config.gamma,
            saturation=config.saturation,
            bias=config.bias
        )
    elif config.tone_mapping == "reinhard":
        tonemap = cv2.createTonemapReinhard(
            gamma=config.gamma,
            intensity=0.0,
            light_adapt=0.8,
            color_adapt=0.0
        )
    else:  # mantiuk
        tonemap = cv2.createTonemapMantiuk(
            gamma=config.gamma,
            scale=0.75,
            saturation=config.saturation
        )
    
    ldr = tonemap.process(hdr)
    return ldr


@router.post("/preview")
async def preview_tone_mapping(
    image: UploadFile = File(...),
    tone_mapping: str = "drago",
    gamma: float = 2.2,
    saturation: float = 1.0
):
    """Preview different tone mapping options on HDR image"""
    try:
        contents = await image.read()
        img = Image.open(BytesIO(contents))
        hdr = np.array(img).astype(np.float32) / 255.0
        
        config = HDRMergeRequest(
            tone_mapping=tone_mapping,
            gamma=gamma,
            saturation=saturation
        )
        
        ldr = tone_map(hdr, config)
        result = (np.clip(ldr, 0, 1) * 255).astype(np.uint8)
        
        result_img = Image.fromarray(result)
        output = BytesIO()
        result_img.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return {"status": "success", "preview": output.getvalue().hex()}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")
