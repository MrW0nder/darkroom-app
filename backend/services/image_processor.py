"""
Image Processing Service
Core image manipulation using OpenCV and PIL
"""
import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional
import io


class ImageProcessor:
    """Handles all image processing operations"""
    
    @staticmethod
    def load_image(file_path: str) -> np.ndarray:
        """Load an image file and return as numpy array (BGR format)"""
        img = cv2.imread(file_path)
        if img is None:
            raise ValueError(f"Could not load image from {file_path}")
        return img
    
    @staticmethod
    def load_image_rgb(file_path: str) -> np.ndarray:
        """Load an image file and return as numpy array (RGB format)"""
        img = cv2.imread(file_path)
        if img is None:
            raise ValueError(f"Could not load image from {file_path}")
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    @staticmethod
    def save_image(img: np.ndarray, file_path: str, quality: int = 95) -> None:
        """Save numpy array as image file"""
        cv2.imwrite(file_path, img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    
    @staticmethod
    def adjust_exposure(img: np.ndarray, value: float) -> np.ndarray:
        """True EV shift in linear light matching the frontend formula.
        Frontend: v = p * 2^(value * 3 / 110)
        This is gamma-safe: multiplying gamma-encoded p by 2^(EV/2.2) equals
        (p^2.2 * 2^EV)^(1/2.2), so ±110 slider === ±3 EV in linear light."""
        factor = 2.0 ** (value * 3.0 / 110.0)
        return np.clip(img.astype(np.float32) * factor, 0, 255).astype(np.uint8)

    @staticmethod
    def adjust_brightness(img: np.ndarray, value: float) -> np.ndarray:
        """Gamma power-curve (Lightroom style). Blacks stay 0, whites stay 1.
        Frontend: gamma = 2^(-brightness * 1.1 / 50), v = v^gamma"""
        if abs(value) < 0.5:
            return img
        gamma = 2.0 ** (-value * 1.1 / 50.0)
        v = np.power(np.clip(img.astype(np.float32) / 255.0, 0.0, 1.0), gamma)
        return np.clip(v * 255.0, 0, 255).astype(np.uint8)

    @staticmethod
    def adjust_contrast(img: np.ndarray, value: float) -> np.ndarray:
        """Cubic S-curve that leaves 0, 0.5 and 1 unchanged — cannot clip.
        Frontend: v += (contrast/50) * (v-0.5) * (1 - 4*(v-0.5)^2)"""
        if abs(value) < 0.5:
            return img
        amount = value / 50.0
        v = img.astype(np.float32) / 255.0
        mid = v - 0.5
        v = v + amount * mid * (1.0 - 4.0 * mid * mid)
        return np.clip(v * 255.0, 0, 255).astype(np.uint8)

    @staticmethod
    def adjust_highlights(img: np.ndarray, value: float) -> np.ndarray:
        """Quadratic ramp: zero below midtone, full at pure white — matches frontend.
        Frontend: hw = ((max(0, v-0.5)/0.5))^2, v += (highlights/100)*hw*0.9"""
        if abs(value) < 0.5:
            return img
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2Lab).astype(np.float32)
        L = lab[:, :, 0] / 255.0
        hw = np.power(np.maximum(0.0, (L - 0.5) / 0.5), 2)
        L = L + (value / 100.0) * hw * 0.9
        lab[:, :, 0] = np.clip(L * 255.0, 0, 255)
        return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_Lab2BGR)

    @staticmethod
    def adjust_shadows(img: np.ndarray, value: float) -> np.ndarray:
        """Quadratic ramp: zero above midtone, full at pure black — matches frontend.
        Frontend: sw = ((max(0, 0.5-v)/0.5))^2, v += (shadows/100)*sw*0.9"""
        if abs(value) < 0.5:
            return img
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2Lab).astype(np.float32)
        L = lab[:, :, 0] / 255.0
        sw = np.power(np.maximum(0.0, (0.5 - L) / 0.5), 2)
        L = L + (value / 100.0) * sw * 0.9
        lab[:, :, 0] = np.clip(L * 255.0, 0, 255)
        return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_Lab2BGR)

    @staticmethod
    def adjust_saturation(img: np.ndarray, value: float) -> np.ndarray:
        """HSV saturation scale matching CSS saturate(1 + value/50).
        Frontend: saturate(1 + saturation / 50) — divisor is 50, not 100."""
        if abs(value) < 0.5:
            return img
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * (1.0 + value / 50.0), 0, 255)
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    @staticmethod
    def adjust_vibrance(img: np.ndarray, value: float) -> np.ndarray:
        """Vibrance: boosts saturation of muted colours more than vivid ones.
        Matches frontend CSS approximation (divisor 150) but implemented properly
        in HSV space: weight = (1 - s/255)^2 so already-saturated pixels change less."""
        if abs(value) < 0.5:
            return img
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        s = hsv[:, :, 1] / 255.0  # normalise to 0-1
        weight = (1.0 - s) ** 2   # strong boost for desaturated, near-zero for vivid
        scale = 1.0 + (value / 100.0) * weight
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * scale, 0, 255)
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    @staticmethod
    def adjust_sharpness(img: np.ndarray, value: float) -> np.ndarray:
        """Unsharp mask. value 1.0 = pass-through; >1.0 = sharpen; <1.0 = soften."""
        if abs(value - 1.0) < 0.01:
            return img
        blurred = cv2.GaussianBlur(img, (0, 0), 3)
        strength = value - 1.0
        result = cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)
        return np.clip(result, 0, 255).astype(np.uint8)

    # Bradford matrices (identical to frontend MainCanvas.tsx)
    _M_BRAD     = np.array([[ 0.8951,  0.2664, -0.1614],
                             [-0.7502,  1.7135,  0.0367],
                             [ 0.0389, -0.0685,  1.0296]], dtype=np.float64)
    _M_BRAD_INV = np.array([[ 0.9869929, -0.1470543,  0.1599627],
                             [ 0.4323053,  0.5183603,  0.0492912],
                             [-0.0085287,  0.0400428,  0.9684867]], dtype=np.float64)
    _M_RGB_XYZ  = np.array([[0.4124564, 0.3575761, 0.1804375],
                             [0.2126729, 0.7151522, 0.0721750],
                             [0.0193339, 0.1191920, 0.9503041]], dtype=np.float64)
    _M_XYZ_RGB  = np.array([[ 3.2404542, -1.5371385, -0.4985314],
                             [-0.9692660,  1.8760108,  0.0415560],
                             [ 0.0556434, -0.2040259,  1.0572252]], dtype=np.float64)
    _D65_XYZ    = np.array([0.95047, 1.0, 1.08883], dtype=np.float64)

    @staticmethod
    def _kelvin_to_xyz(K: float) -> np.ndarray:
        """Planckian locus approximation — Kim et al. 2002, identical to frontend."""
        T = max(1667.0, min(25000.0, K))
        x = (-0.2661239e9/T**3 - 0.2343589e6/T**2 + 877.6956/T + 0.179910
             if T <= 4000 else
             -3.0258469e9/T**3 + 2.1070379e6/T**2 + 222.6347/T + 0.240390)
        if T <= 2222:
            y = -1.1063814*x**3 - 1.34811020*x**2 + 2.18555832*x - 0.20219683
        elif T <= 4000:
            y = -0.9549476*x**3 - 1.37418593*x**2 + 2.09137015*x - 0.16748867
        else:
            y =  3.0817580*x**3 - 5.87338670*x**2 + 3.75112997*x - 0.37001483
        return np.array([x/y, 1.0, (1.0-x-y)/y], dtype=np.float64)

    @classmethod
    def adjust_white_balance(cls, img: np.ndarray, temperature: float, tint: float) -> np.ndarray:
        """Full Bradford CAT matching frontend buildCATMatrix().
        temperature: raw slider value; K = max(1667, 6500 - temperature * 80)
        tint: -50 (green) → +50 (magenta)
        Pipeline: BGR → sRGB → de-gamma(2.2) → linear RGB → CAT matrix
                  → re-gamma(1/2.2) → sRGB → BGR"""
        if abs(temperature) < 0.5 and abs(tint) < 0.5:
            return img
        K = max(1667.0, 6500.0 - temperature * 80.0)
        dst_xyz = cls._kelvin_to_xyz(K)
        src_lms = cls._M_BRAD @ cls._D65_XYZ
        dst_lms = cls._M_BRAD @ dst_xyz
        D       = np.diag(dst_lms / src_lms)
        cat_xyz = cls._M_BRAD_INV @ D @ cls._M_BRAD
        M       = cls._M_XYZ_RGB @ cat_xyz @ cls._M_RGB_XYZ   # RGB domain
        if abs(tint) > 0.5:
            t = tint / 50.0
            M[0, :] *= (1.0 + t * 0.05)
            M[1, :] *= (1.0 - t * 0.10)
            M[2, :] *= (1.0 + t * 0.05)
        # BGR → RGB, de-gamma, apply matrix, re-gamma, RGB → BGR
        rgb  = img[:, :, ::-1].astype(np.float32) / 255.0
        lin  = np.power(np.clip(rgb, 0.0, 1.0), 2.2)
        out  = lin @ M.T.astype(np.float32)
        srgb = np.power(np.clip(out, 0.0, 1.0), 1.0/2.2)
        return np.clip(srgb[:, :, ::-1] * 255.0, 0, 255).astype(np.uint8)

    @staticmethod
    def adjust_color_wheels(
        img: np.ndarray,
        shadow_hue: float,    shadow_sat: float,    shadow_lum: float,
        midtone_hue: float,   midtone_sat: float,   midtone_lum: float,
        highlight_hue: float, highlight_sat: float, highlight_lum: float,
    ) -> np.ndarray:
        """Per-tonal-range HSL grading matching Lightroom's Hue/Sat/Lum wheels.
        Each range is weighted by a soft luminance mask so edits blend smoothly.
        shadow_hue/midtone_hue/highlight_hue: 0–360  (hue rotation in degrees)
        *_sat: 0–100  (additive saturation boost, scaled to HSV space)
        *_lum: -50–50 (luminance shift, applied in Lab L channel)"""
        # Check if anything is non-zero
        has_hue_sat = any(abs(v) > 0.1 for v in (
            shadow_hue, shadow_sat, midtone_hue, midtone_sat,
            highlight_hue, highlight_sat))
        has_lum = any(abs(v) > 0.1 for v in (shadow_lum, midtone_lum, highlight_lum))
        if not has_hue_sat and not has_lum:
            return img

        # Build per-pixel luminance (0–1) from BGR input
        lum = img.astype(np.float32).dot(np.array([0.0722, 0.7152, 0.2126], np.float32)) / 255.0

        # Soft masks: each is a smooth bell curve centred on its tonal range
        # shadows:    peaks at lum=0,   fades by lum=0.5
        # midtones:   peaks at lum=0.5, fades at 0 and 1
        # highlights: peaks at lum=1,   fades by lum=0.5
        shadow_mask    = np.clip(1.0 - lum * 2.0,               0.0, 1.0) ** 2
        highlight_mask = np.clip((lum - 0.5) * 2.0,             0.0, 1.0) ** 2
        midtone_mask   = np.clip(1.0 - shadow_mask - highlight_mask, 0.0, 1.0)

        if has_hue_sat:
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
            H, S = hsv[:, :, 0], hsv[:, :, 1]

            # Hue shift (OpenCV hue is 0–180, so divide degrees by 2)
            dH = (shadow_hue / 2.0 * shadow_mask
                + midtone_hue / 2.0 * midtone_mask
                + highlight_hue / 2.0 * highlight_mask)
            hsv[:, :, 0] = (H + dH) % 180.0

            # Saturation additive boost (scale 0–100 → 0–55 in 0–255 HSV space)
            dS = (shadow_sat * shadow_mask
                + midtone_sat * midtone_mask
                + highlight_sat * highlight_mask) * (255.0 / 100.0) * 0.55
            hsv[:, :, 1] = np.clip(S + dS, 0.0, 255.0)

            img = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

        if has_lum:
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2Lab).astype(np.float32)
            L = lab[:, :, 0] / 255.0
            dL = (shadow_lum / 50.0 * shadow_mask
                + midtone_lum / 50.0 * midtone_mask
                + highlight_lum / 50.0 * highlight_mask) * 0.5
            lab[:, :, 0] = np.clip((L + dL) * 255.0, 0.0, 255.0)
            img = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_Lab2BGR)

        return img
        """Apply all adjustments in frontend pipeline order:
        Exposure → Brightness → Contrast → Highlights → Shadows
        → White Balance → Color Grading Wheels → Sharpness → Saturation"""
        # 1. Tonal adjustments
        if adjustments.get('exposure', 0) != 0:
            img = ImageProcessor.adjust_exposure(img, adjustments['exposure'])
        if adjustments.get('brightness', 0) != 0:
            img = ImageProcessor.adjust_brightness(img, adjustments['brightness'])
        if adjustments.get('contrast', 0) != 0:
            img = ImageProcessor.adjust_contrast(img, adjustments['contrast'])
        if adjustments.get('highlights', 0) != 0:
            img = ImageProcessor.adjust_highlights(img, adjustments['highlights'])
        if adjustments.get('shadows', 0) != 0:
            img = ImageProcessor.adjust_shadows(img, adjustments['shadows'])
        # 2. White balance
        temp = adjustments.get('temperature', 0)
        tint = adjustments.get('tint', 0)
        if abs(temp) > 0.5 or abs(tint) > 0.5:
            img = ImageProcessor.adjust_white_balance(img, temp, tint)
        # 3. Color grading wheels (per tonal range)
        img = ImageProcessor.adjust_color_wheels(
            img,
            adjustments.get('shadowHue', 0),    adjustments.get('shadowSat', 0),    adjustments.get('shadowLum', 0),
            adjustments.get('midtoneHue', 0),   adjustments.get('midtoneSat', 0),   adjustments.get('midtoneLum', 0),
            adjustments.get('highlightHue', 0), adjustments.get('highlightSat', 0), adjustments.get('highlightLum', 0),
        )
        # 4. Sharpness
        sharpness = adjustments.get('sharpness', 1.0)
        if abs(sharpness - 1.0) > 0.01:
            img = ImageProcessor.adjust_sharpness(img, sharpness)
        # 5. Saturation + Vibrance
        if adjustments.get('saturation', 0) != 0:
            img = ImageProcessor.adjust_saturation(img, adjustments['saturation'])
        if adjustments.get('vibrance', 0) != 0:
            img = ImageProcessor.adjust_vibrance(img, adjustments['vibrance'])
        return img

    @staticmethod
    def crop_image(img: np.ndarray, x: int, y: int, width: int, height: int) -> np.ndarray:
        """
        Crop image to specified rectangle
        x, y: top-left corner
        width, height: crop dimensions
        """
        img_height, img_width = img.shape[:2]

        # Ensure coordinates are within bounds
        x = max(0, min(x, img_width))
        y = max(0, min(y, img_height))
        width = min(width, img_width - x)
        height = min(height, img_height - y)
        
        return img[y:y+height, x:x+width]
    
    @staticmethod
    def rotate_image(img: np.ndarray, angle: float) -> np.ndarray:
        """
        Rotate image by arbitrary angle
        angle: rotation angle in degrees (positive = clockwise)
        """
        height, width = img.shape[:2]
        center = (width / 2, height / 2)
        
        # Get rotation matrix
        rotation_matrix = cv2.getRotationMatrix2D(center, -angle, 1.0)
        
        # Calculate new bounding dimensions
        abs_cos = abs(rotation_matrix[0, 0])
        abs_sin = abs(rotation_matrix[0, 1])
        new_width = int(height * abs_sin + width * abs_cos)
        new_height = int(height * abs_cos + width * abs_sin)
        
        # Adjust rotation matrix for new center
        rotation_matrix[0, 2] += new_width / 2 - center[0]
        rotation_matrix[1, 2] += new_height / 2 - center[1]
        
        # Perform rotation with black background
        rotated = cv2.warpAffine(
            img,
            rotation_matrix,
            (new_width, new_height),
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0)
        )
        
        return rotated
    
    @staticmethod
    def apply_brush_stroke(
        img: np.ndarray,
        points: list,
        color: str,
        size: int,
        opacity: float
    ) -> np.ndarray:
        """
        Apply a brush stroke to an image
        points: flattened list of x, y coordinates
        color: hex color like "#FF0000"
        size: brush size in pixels
        opacity: 0.0 to 1.0
        """
        # Convert hex color to BGR
        color = color.lstrip('#')
        r, g, b = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
        bgr_color = (b, g, r)
        
        # Create a copy of the image
        result = img.copy()
        
        # Convert points list to array of (x, y) tuples
        point_pairs = [(int(points[i]), int(points[i+1])) for i in range(0, len(points)-1, 2)]
        
        # Draw lines between consecutive points
        for i in range(len(point_pairs) - 1):
            pt1 = point_pairs[i]
            pt2 = point_pairs[i + 1]
            
            # Create overlay for alpha blending
            overlay = result.copy()
            cv2.line(overlay, pt1, pt2, bgr_color, size, cv2.LINE_AA)
            
            # Blend overlay with original based on opacity
            cv2.addWeighted(overlay, opacity, result, 1 - opacity, 0, result)
        
        return result

    @staticmethod
    def add_text_overlay(
        image_path: str,
        text: str,
        font: str = "Arial",
        font_size: int = 24,
        color: str = "#FFFFFF",
        position: Tuple[int, int] = (50, 50),
        bold: bool = False,
        italic: bool = False
    ) -> str:
        """
        Add text overlay to an image using PIL.
        Returns path to the new image.
        """
        from PIL import Image, ImageDraw, ImageFont
        import os
        
        # Load image with PIL
        img = Image.open(image_path)
        draw = ImageDraw.Draw(img)
        
        # Try to load font (fallback to default if not found)
        try:
            # Construct font path for system fonts
            font_style = ""
            if bold and italic:
                font_style = "bi"
            elif bold:
                font_style = "b"
            elif italic:
                font_style = "i"
            
            # Try common font paths
            font_paths = [
                f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}{'-Oblique' if italic else ''}.ttf",
                f"/System/Library/Fonts/{font}.ttf",
                f"C:\\Windows\\Fonts\\{font.replace(' ', '')}.ttf",
            ]
            
            pil_font = None
            for path in font_paths:
                if os.path.exists(path):
                    pil_font = ImageFont.truetype(path, font_size)
                    break
            
            if pil_font is None:
                pil_font = ImageFont.load_default()
        except:
            pil_font = ImageFont.load_default()
        
        # Draw text
        draw.text(position, text, fill=color, font=pil_font)
        
        # Save result
        base_name = os.path.basename(image_path)
        name, ext = os.path.splitext(base_name)
        result_path = os.path.join(os.path.dirname(image_path), f"{name}_text{ext}")
        img.save(result_path)
        
        return result_path
    
    @staticmethod
    def add_shape(
        image_path: str,
        shape_type: str,
        position: Tuple[int, int],
        width: int,
        height: int,
        fill_color: Optional[str] = None,
        stroke_color: str = "#FFFFFF",
        stroke_width: int = 2,
        rotation: float = 0.0
    ) -> str:
        """
        Add shape to an image using OpenCV.
        Returns path to the new image.
        """
        import os
        
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image from {image_path}")
        
        # Convert colors from hex to BGR
        def hex_to_bgr(hex_color):
            hex_color = hex_color.lstrip('#')
            r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            return (b, g, r)
        
        stroke_bgr = hex_to_bgr(stroke_color)
        fill_bgr = hex_to_bgr(fill_color) if fill_color else None
        
        x, y = position
        
        # Draw shape
        if shape_type == 'rectangle':
            if fill_bgr:
                cv2.rectangle(img, (x, y), (x + width, y + height), fill_bgr, -1)
            cv2.rectangle(img, (x, y), (x + width, y + height), stroke_bgr, stroke_width)
        
        elif shape_type == 'ellipse':
            center = (x + width // 2, y + height // 2)
            axes = (width // 2, height // 2)
            if fill_bgr:
                cv2.ellipse(img, center, axes, rotation, 0, 360, fill_bgr, -1)
            cv2.ellipse(img, center, axes, rotation, 0, 360, stroke_bgr, stroke_width)
        
        elif shape_type == 'line':
            cv2.line(img, (x, y), (x + width, y + height), stroke_bgr, stroke_width, cv2.LINE_AA)
        
        elif shape_type == 'arrow':
            cv2.arrowedLine(img, (x, y), (x + width, y + height), stroke_bgr, stroke_width, cv2.LINE_AA, tipLength=0.3)
        
        # Save result
        base_name = os.path.basename(image_path)
        name, ext = os.path.splitext(base_name)
        result_path = os.path.join(os.path.dirname(image_path), f"{name}_shape{ext}")
        cv2.imwrite(result_path, img)
        
        return result_path