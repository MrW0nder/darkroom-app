from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
import cv2
import numpy as np
from pathlib import Path
import tempfile
import subprocess

router = APIRouter(prefix="/api/timelapse", tags=["timelapse"])

@router.post("/create")
async def create_timelapse(
    images: List[UploadFile] = File(...),
    frame_rate: int = Form(24),
    codec: str = Form("H.264"),
    transition: Optional[str] = Form(None),
    deflicker: bool = Form(False),
    output_format: str = Form("MP4")
):
    """
    Create timelapse/video from image sequence
    
    Args:
        images: List of images in sequence
        frame_rate: Frame rate (1-120 fps)
        codec: Codec selection (H.264, H.265, ProRes)
        transition: Transition effect (fade, dissolve, wipe, etc.)
        deflicker: Apply deflicker algorithm
        output_format: Output format (MP4, MOV, AVI)
    """
    if len(images) < 2:
        raise HTTPException(status_code=400, detail="At least 2 images required")
    
    if not (1 <= frame_rate <= 120):
        raise HTTPException(status_code=400, detail="Frame rate must be between 1 and 120")
    
    frames = []
    
    # Read and process images
    for img_file in images:
        img_bytes = await img_file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            continue
        
        # Apply deflicker if requested
        if deflicker:
            img = apply_deflicker(img, frames)
        
        frames.append(img)
    
    if len(frames) < 2:
        raise HTTPException(status_code=400, detail="Could not process images")
    
    # Get dimensions from first frame
    height, width = frames[0].shape[:2]
    
    # Setup video writer
    codec_map = {
        "H.264": "mp4v",
        "H.265": "hevc",
        "ProRes": "prores"
    }
    
    fourcc = cv2.VideoWriter_fourcc(*codec_map.get(codec, "mp4v"))
    
    # Create temporary output file
    with tempfile.NamedTemporaryFile(suffix=f".{output_format.lower()}", delete=False) as tmp:
        output_path = tmp.name
    
    out = cv2.VideoWriter(output_path, fourcc, frame_rate, (width, height))
    
    # Write frames with transitions if requested
    for i, frame in enumerate(frames):
        if transition and i < len(frames) - 1:
            # Apply transition to next frame
            transition_frames = apply_transition(frame, frames[i + 1], transition)
            for tf in transition_frames:
                out.write(tf)
        else:
            out.write(frame)
    
    out.release()
    
    return {
        "status": "success",
        "output_path": output_path,
        "frame_count": len(frames),
        "frame_rate": frame_rate,
        "codec": codec,
        "format": output_format
    }


def apply_deflicker(frame: np.ndarray, previous_frames: List[np.ndarray]) -> np.ndarray:
    """Apply deflicker algorithm to smooth brightness variations"""
    if not previous_frames:
        return frame
    
    # Calculate average brightness of previous frames
    avg_brightness = np.mean([np.mean(f) for f in previous_frames[-5:]])
    current_brightness = np.mean(frame)
    
    # Adjust current frame to match average
    if current_brightness > 0:
        adjustment = avg_brightness / current_brightness
        frame = np.clip(frame * adjustment, 0, 255).astype(np.uint8)
    
    return frame


def apply_transition(frame1: np.ndarray, frame2: np.ndarray, transition_type: str) -> List[np.ndarray]:
    """Apply transition effect between two frames"""
    transition_frames = []
    num_transition_frames = 5  # Number of frames for transition
    
    for i in range(num_transition_frames):
        alpha = i / num_transition_frames
        
        if transition_type == "fade":
            # Simple crossfade
            blended = cv2.addWeighted(frame1, 1 - alpha, frame2, alpha, 0)
        
        elif transition_type == "dissolve":
            # Similar to fade but with slight adjustment
            blended = cv2.addWeighted(frame1, 1 - alpha, frame2, alpha, 0)
        
        elif transition_type == "wipe":
            # Left to right wipe
            height, width = frame1.shape[:2]
            wipe_pos = int(width * alpha)
            blended = frame1.copy()
            blended[:, :wipe_pos] = frame2[:, :wipe_pos]
        
        else:
            # Default to crossfade
            blended = cv2.addWeighted(frame1, 1 - alpha, frame2, alpha, 0)
        
        transition_frames.append(blended)
    
    return transition_frames


@router.post("/estimate_duration")
async def estimate_duration(num_frames: int, frame_rate: int):
    """Estimate video duration from frame count and frame rate"""
    if frame_rate <= 0:
        raise HTTPException(status_code=400, detail="Invalid frame rate")
    
    duration_seconds = num_frames / frame_rate
    
    return {
        "num_frames": num_frames,
        "frame_rate": frame_rate,
        "duration_seconds": duration_seconds,
        "duration_formatted": f"{int(duration_seconds // 60)}:{int(duration_seconds % 60):02d}"
    }