"""
Panorama Stitching API - Combine multiple images into panoramic views
Supports auto-alignment, blending, cylindrical/spherical projection
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import cv2
from io import BytesIO
from PIL import Image

router = APIRouter(prefix="/api/panorama", tags=["panorama"])


class PanoramaSettings(BaseModel):
    """Panorama stitching configuration"""
    projection: str = "cylindrical"  # cylindrical, spherical, plane
    blending: str = "multiband"  # multiband, feather, no
    exposure_compensation: bool = True
    seam_finding: str = "voronoi"  # voronoi, gc_color, gc_colorgrad
    crop_result: bool = True
    confidence_threshold: float = 0.3


@router.post("/stitch")
async def stitch_panorama(
    images: List[UploadFile] = File(...),
    settings: Optional[str] = None
):
    """
    Stitch multiple images into panorama
    
    Args:
        images: List of overlapping images to stitch
        settings: JSON string of PanoramaSettings
        
    Returns:
        Stitched panorama image
    """
    if len(images) < 2:
        raise HTTPException(status_code=400, detail="At least 2 images required for panorama")
    
    try:
        # Load images
        img_list = []
        for img_file in images:
            contents = await img_file.read()
            img = Image.open(BytesIO(contents))
            img_array = np.array(img)
            img_list.append(img_array)
        
        # Parse settings
        import json
        config = PanoramaSettings()
        if settings:
            config = PanoramaSettings(**json.loads(settings))
        
        # Initialize stitcher
        if config.projection == "spherical":
            mode = cv2.Stitcher_SPHERICAL
        elif config.projection == "plane":
            mode = cv2.Stitcher_PANORAMA
        else:  # cylindrical (default)
            mode = cv2.Stitcher_SCANS
        
        stitcher = cv2.Stitcher.create(mode)
        
        # Configure stitcher
        if config.exposure_compensation:
            compensator = cv2.detail.ExposureCompensator_createDefault(
                cv2.detail.ExposureCompensator_GAIN_BLOCKS
            )
            stitcher.setExposureCompensator(compensator)
        
        # Set seam finder
        if config.seam_finding == "voronoi":
            seam_finder = cv2.detail.SeamFinder_createDefault(cv2.detail.SeamFinder_VORONOI_SEAM)
        elif config.seam_finding == "gc_color":
            seam_finder = cv2.detail_GraphCutSeamFinder("COST_COLOR")
        else:
            seam_finder = cv2.detail_GraphCutSeamFinder("COST_COLOR_GRAD")
        
        stitcher.setSeamFinder(seam_finder)
        
        # Set blending
        if config.blending == "multiband":
            blender = cv2.detail.Blender_createDefault(cv2.detail.Blender_MULTI_BAND)
        elif config.blending == "feather":
            blender = cv2.detail.Blender_createDefault(cv2.detail.Blender_FEATHER)
        else:
            blender = cv2.detail.Blender_createDefault(cv2.detail.Blender_NO)
        
        stitcher.setBlender(blender)
        
        # Stitch images
        status, panorama = stitcher.stitch(img_list)
        
        if status != cv2.Stitcher_OK:
            error_msgs = {
                cv2.Stitcher_ERR_NEED_MORE_IMGS: "Need more images",
                cv2.Stitcher_ERR_HOMOGRAPHY_EST_FAIL: "Homography estimation failed",
                cv2.Stitcher_ERR_CAMERA_PARAMS_ADJUST_FAIL: "Camera parameter adjustment failed"
            }
            error_msg = error_msgs.get(status, f"Stitching failed with status {status}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Crop black borders if requested
        if config.crop_result:
            panorama = crop_black_borders(panorama)
        
        # Convert to PIL Image
        result_img = Image.fromarray(cv2.cvtColor(panorama, cv2.COLOR_BGR2RGB))
        output = BytesIO()
        result_img.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return {"status": "success", "panorama": output.getvalue().hex()}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Panorama stitching failed: {str(e)}")


def crop_black_borders(image: np.ndarray) -> np.ndarray:
    """Crop black borders from stitched panorama"""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Threshold
    _, thresh = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return image
    
    # Get largest contour bounding box
    largest_contour = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest_contour)
    
    # Crop
    cropped = image[y:y+h, x:x+w]
    
    return cropped


@router.post("/align-only")
async def align_images(
    images: List[UploadFile] = File(...),
    feature_detector: str = "orb"  # orb, sift, surf
):
    """
    Align images without stitching (useful for checking alignment)
    
    Returns alignment parameters and confidence scores
    """
    if len(images) < 2:
        raise HTTPException(status_code=400, detail="At least 2 images required")
    
    try:
        # Load images
        img_list = []
        for img_file in images:
            contents = await img_file.read()
            img = Image.open(BytesIO(contents))
            img_list.append(np.array(img))
        
        # Detect features and compute homographies
        alignments = []
        reference = img_list[0]
        
        for i, img in enumerate(img_list[1:], 1):
            # Detect features
            if feature_detector == "sift":
                detector = cv2.SIFT_create()
            elif feature_detector == "surf":
                detector = cv2.xfeatures2d.SURF_create()
            else:  # orb
                detector = cv2.ORB_create(1000)
            
            # Convert to grayscale
            ref_gray = cv2.cvtColor(reference, cv2.COLOR_RGB2GRAY)
            img_gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            
            # Find keypoints and descriptors
            kp1, des1 = detector.detectAndCompute(ref_gray, None)
            kp2, des2 = detector.detectAndCompute(img_gray, None)
            
            # Match features
            if feature_detector in ["sift", "surf"]:
                matcher = cv2.BFMatcher(cv2.NORM_L2, crossCheck=False)
                matches = matcher.knnMatch(des1, des2, k=2)
                # Lowe's ratio test
                good_matches = [m for m, n in matches if m.distance < 0.75 * n.distance]
            else:
                matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
                good_matches = matcher.match(des1, des2)
            
            # Compute homography
            if len(good_matches) >= 4:
                src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                
                H, mask = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 5.0)
                matches_mask = mask.ravel().tolist()
                
                confidence = sum(matches_mask) / len(matches_mask) if matches_mask else 0
                
                alignments.append({
                    "image_index": i,
                    "matches_found": len(good_matches),
                    "inliers": sum(matches_mask),
                    "confidence": confidence,
                    "homography": H.tolist() if H is not None else None
                })
            else:
                alignments.append({
                    "image_index": i,
                    "matches_found": len(good_matches),
                    "confidence": 0,
                    "error": "Not enough matches"
                })
        
        return {"status": "success", "alignments": alignments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alignment failed: {str(e)}")


@router.post("/projection-preview")
async def preview_projection(
    image: UploadFile = File(...),
    projection: str = "cylindrical",  # cylindrical, spherical
    focal_length: float = 1000.0
):
    """Preview how image looks with different projections"""
    try:
        contents = await image.read()
        img = Image.open(BytesIO(contents))
        img_array = np.array(img)
        
        h, w = img_array.shape[:2]
        
        if projection == "cylindrical":
            # Cylindrical projection
            K = np.array([[focal_length, 0, w/2],
                         [0, focal_length, h/2],
                         [0, 0, 1]])
            
            cylindrical = cv2.remap(img_array, *create_cylindrical_map(w, h, K),
                                   cv2.INTER_LINEAR)
            result = cylindrical
        elif projection == "spherical":
            # Spherical projection
            result = apply_spherical_projection(img_array, focal_length)
        else:
            result = img_array
        
        # Convert to PIL Image
        result_img = Image.fromarray(result)
        output = BytesIO()
        result_img.save(output, format='JPEG', quality=95)
        output.seek(0)
        
        return {"status": "success", "preview": output.getvalue().hex()}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Projection preview failed: {str(e)}")


def create_cylindrical_map(width: int, height: int, K: np.ndarray):
    """Create remap for cylindrical projection"""
    map_x = np.zeros((height, width), dtype=np.float32)
    map_y = np.zeros((height, width), dtype=np.float32)
    
    for y in range(height):
        for x in range(width):
            theta = (x - width/2) / K[0, 0]
            h = (y - height/2) / K[1, 1]
            
            x_cyl = K[0, 0] * np.tan(theta) + width/2
            y_cyl = K[1, 1] * h / np.cos(theta) + height/2
            
            map_x[y, x] = x_cyl
            map_y[y, x] = y_cyl
    
    return map_x, map_y


def apply_spherical_projection(image: np.ndarray, focal_length: float) -> np.ndarray:
    """Apply spherical projection to image"""
    h, w = image.shape[:2]
    
    # Create meshgrid
    x, y = np.meshgrid(np.arange(w), np.arange(h))
    
    # Normalize coordinates
    x_norm = (x - w/2) / focal_length
    y_norm = (y - h/2) / focal_length
    
    # Spherical coordinates
    theta = np.arctan(x_norm)
    phi = np.arctan(y_norm / np.sqrt(1 + x_norm**2))
    
    # Map back to image coordinates
    x_sphere = (focal_length * theta + w/2).astype(np.float32)
    y_sphere = (focal_length * phi + h/2).astype(np.float32)
    
    # Remap
    result = cv2.remap(image, x_sphere, y_sphere, cv2.INTER_LINEAR)
    
    return result