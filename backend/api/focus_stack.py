from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
import cv2
import numpy as np

router = APIRouter(prefix="/api/focus-stack", tags=["focus_stack"])

@router.post("/stack")
async def stack_images(
    images: List[UploadFile] = File(...),
    alignment: bool = Form(True),
    generate_depth_map: bool = Form(False)
):
    """
    Focus stacking for macro photography
    
    Args:
        images: List of images at different focus distances
        alignment: Auto-align images before stacking
        generate_depth_map: Generate depth map visualization
    """
    if len(images) < 2:
        raise HTTPException(status_code=400, detail="At least 2 images required for focus stacking")
    
    # Load images
    img_list = []
    for img_file in images:
        img_bytes = await img_file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            continue
        
        img_list.append(img)
    
    if len(img_list) < 2:
        raise HTTPException(status_code=400, detail="Could not load images")
    
    # Align images if requested
    if alignment:
        img_list = align_images(img_list)
    
    # Perform focus stacking
    stacked_image = focus_stack(img_list)
    
    result = {
        "status": "success",
        "num_images": len(img_list)
    }
    
    # Generate depth map if requested
    if generate_depth_map:
        depth_map = generate_depth_map_from_stack(img_list)
        result["depth_map_generated"] = True
    
    # Encode result
    _, buffer = cv2.imencode('.png', stacked_image)
    result["image"] = buffer.tobytes()
    
    return result


def align_images(images: List[np.ndarray]) -> List[np.ndarray]:
    """Align images using feature-based registration"""
    if len(images) < 2:
        return images
    
    # Use first image as reference
    reference = images[0]
    aligned = [reference]
    
    # Detect ORB features in reference
    orb = cv2.ORB_create(5000)
    kp1, des1 = orb.detectAndCompute(reference, None)
    
    for img in images[1:]:
        # Detect features in current image
        kp2, des2 = orb.detectAndCompute(img, None)
        
        if des1 is None or des2 is None:
            aligned.append(img)
            continue
        
        # Match features
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)
        
        # Use top matches for homography
        if len(matches) > 10:
            src_pts = np.float32([kp1[m.queryIdx].pt for m in matches[:100]]).reshape(-1, 1, 2)
            dst_pts = np.float32([kp2[m.trainIdx].pt for m in matches[:100]]).reshape(-1, 1, 2)
            
            # Find homography
            M, mask = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 5.0)
            
            if M is not None:
                # Warp image
                h, w = reference.shape[:2]
                aligned_img = cv2.warpPerspective(img, M, (w, h))
                aligned.append(aligned_img)
            else:
                aligned.append(img)
        else:
            aligned.append(img)
    
    return aligned


def focus_stack(images: List[np.ndarray]) -> np.ndarray:
    """Perform focus stacking using Laplacian variance"""
    if not images:
        raise ValueError("No images to stack")
    
    # Convert to grayscale for focus measure
    gray_images = [cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) for img in images]
    
    # Calculate Laplacian for each image
    laplacians = []
    for gray in gray_images:
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        laplacians.append(np.absolute(laplacian))
    
    # Stack laplacians
    laplacian_stack = np.array(laplacians)
    
    # Find the image with maximum focus at each pixel
    focus_index = np.argmax(laplacian_stack, axis=0)
    
    # Create output image
    height, width = images[0].shape[:2]
    output = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Copy pixels from most focused image
    for i in range(len(images)):
        mask = (focus_index == i)
        for c in range(3):
            output[:, :, c][mask] = images[i][:, :, c][mask]
    
    return output


def generate_depth_map_from_stack(images: List[np.ndarray]) -> np.ndarray:
    """Generate depth map from focus stack"""
    # Convert to grayscale
    gray_images = [cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) for img in images]
    
    # Calculate Laplacian variance for each image
    focus_measures = []
    for gray in gray_images:
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        focus_measures.append(np.absolute(laplacian))
    
    # Stack and find index of maximum focus
    focus_stack = np.array(focus_measures)
    depth_map = np.argmax(focus_stack, axis=0)
    
    # Normalize to 0-255
    depth_map = (depth_map / len(images) * 255).astype(np.uint8)
    
    return depth_map


@router.post("/estimate_quality")
async def estimate_stacking_quality(num_images: int, focus_step: float):
    """Estimate focus stacking quality based on number of images and focus step"""
    # More images and smaller steps = better quality
    quality_score = min(100, (num_images * 10) + (1 / max(focus_step, 0.1)) * 10)
    
    return {
        "num_images": num_images,
        "focus_step": focus_step,
        "quality_score": quality_score,
        "recommendation": "Good" if quality_score > 70 else "Increase number of images or decrease focus step"
    }
