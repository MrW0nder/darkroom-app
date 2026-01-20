from fastapi import APIRouter, UploadFile, File, HTTPException
import cv2
import numpy as np
from typing import Dict, List

router = APIRouter(prefix="/api/scopes", tags=["scopes"])

@router.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    """
    Comprehensive scope analysis of image
    
    Returns: RGB parade, vectorscope, waveform, histogram data
    """
    img_bytes = await image.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")
    
    # Generate all scopes
    rgb_parade = generate_rgb_parade(img)
    vectorscope = generate_vectorscope(img)
    waveform = generate_waveform(img)
    histogram = generate_histogram_zones(img)
    clipping = detect_clipping(img)
    color_dist = analyze_color_distribution(img)
    
    return {
        "status": "success",
        "rgb_parade": rgb_parade,
        "vectorscope": vectorscope,
        "waveform": waveform,
        "histogram": histogram,
        "clipping": clipping,
        "color_distribution": color_dist
    }


def generate_rgb_parade(img: np.ndarray) -> Dict:
    """Generate RGB parade data for color balance analysis"""
    height, width = img.shape[:2]
    
    # Split channels
    b, g, r = cv2.split(img)
    
    # Calculate histograms for each channel
    hist_r = cv2.calcHist([r], [0], None, [256], [0, 256])
    hist_g = cv2.calcHist([g], [0], None, [256], [0, 256])
    hist_b = cv2.calcHist([b], [0], None, [256], [0, 256])
    
    return {
        "red": hist_r.flatten().tolist(),
        "green": hist_g.flatten().tolist(),
        "blue": hist_b.flatten().tolist(),
        "width": width,
        "height": height
    }


def generate_vectorscope(img: np.ndarray) -> Dict:
    """Generate vectorscope for hue/saturation analysis"""
    # Convert to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    
    # Create vectorscope data
    # Flatten for sampling
    h_flat = h.flatten()
    s_flat = s.flatten()
    
    # Sample points for vectorscope
    sample_size = min(10000, len(h_flat))
    indices = np.random.choice(len(h_flat), sample_size, replace=False)
    
    hue_samples = h_flat[indices]
    sat_samples = s_flat[indices]
    
    # Convert to polar coordinates
    angles = (hue_samples / 180.0) * np.pi  # Hue to radians
    radii = sat_samples / 255.0  # Saturation as radius
    
    return {
        "angles": angles.tolist(),
        "radii": radii.tolist(),
        "sample_size": sample_size
    }


def generate_waveform(img: np.ndarray) -> Dict:
    """Generate waveform monitor for exposure analysis"""
    # Convert to grayscale for luminance
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    # Calculate waveform data (vertical distribution of brightness)
    waveform_data = []
    for x in range(0, width, max(1, width // 256)):
        column = gray[:, x]
        waveform_data.append(column.tolist())
    
    return {
        "data": waveform_data,
        "width": len(waveform_data),
        "height": height
    }


def generate_histogram_zones(img: np.ndarray) -> Dict:
    """Generate histogram with zone system analysis"""
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Calculate histogram
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    
    # Divide into zones (inspired by Ansel Adams zone system)
    zones = []
    zone_size = 256 // 10
    for i in range(10):
        start = i * zone_size
        end = (i + 1) * zone_size if i < 9 else 256
        zone_pixels = np.sum(hist[start:end])
        zones.append({
            "zone": i,
            "start": start,
            "end": end,
            "pixels": int(zone_pixels),
            "percentage": float(zone_pixels / gray.size * 100)
        })
    
    return {
        "histogram": hist.flatten().tolist(),
        "zones": zones,
        "total_pixels": gray.size
    }


def detect_clipping(img: np.ndarray) -> Dict:
    """Detect highlight and shadow clipping"""
    # Split channels
    b, g, r = cv2.split(img)
    
    # Count clipped pixels
    highlight_threshold = 250
    shadow_threshold = 5
    
    highlight_clipped = {
        "red": int(np.sum(r >= highlight_threshold)),
        "green": int(np.sum(g >= highlight_threshold)),
        "blue": int(np.sum(b >= highlight_threshold))
    }
    
    shadow_clipped = {
        "red": int(np.sum(r <= shadow_threshold)),
        "green": int(np.sum(g <= shadow_threshold)),
        "blue": int(np.sum(b <= shadow_threshold))
    }
    
    total_pixels = img.shape[0] * img.shape[1]
    
    return {
        "highlights": {
            **highlight_clipped,
            "total": sum(highlight_clipped.values()),
            "percentage": sum(highlight_clipped.values()) / (total_pixels * 3) * 100
        },
        "shadows": {
            **shadow_clipped,
            "total": sum(shadow_clipped.values()),
            "percentage": sum(shadow_clipped.values()) / (total_pixels * 3) * 100
        }
    }


def analyze_color_distribution(img: np.ndarray) -> Dict:
    """Analyze overall color distribution"""
    # Convert to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    
    # Calculate statistics
    return {
        "hue": {
            "mean": float(np.mean(h)),
            "std": float(np.std(h)),
            "median": float(np.median(h))
        },
        "saturation": {
            "mean": float(np.mean(s)),
            "std": float(np.std(s)),
            "median": float(np.median(s))
        },
        "value": {
            "mean": float(np.mean(v)),
            "std": float(np.std(v)),
            "median": float(np.median(v))
        }
    }


@router.post("/parade")
async def get_rgb_parade(image: UploadFile = File(...)):
    """Get RGB parade data only"""
    img_bytes = await image.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")
    
    return generate_rgb_parade(img)


@router.post("/vectorscope")
async def get_vectorscope(image: UploadFile = File(...)):
    """Get vectorscope data only"""
    img_bytes = await image.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")
    
    return generate_vectorscope(img)


@router.post("/waveform")
async def get_waveform(image: UploadFile = File(...)):
    """Get waveform monitor data only"""
    img_bytes = await image.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")
    
    return generate_waveform(img)