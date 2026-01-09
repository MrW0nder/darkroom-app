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
    def adjust_brightness(img: np.ndarray, value: float) -> np.ndarray:
        """
        Adjust brightness
        value: -100 to 100 (0 = no change)
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 2] = hsv[:, :, 2] * (1 + value / 100.0)
        hsv[:, :, 2] = np.clip(hsv[:, :, 2], 0, 255)
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    
    @staticmethod
    def adjust_contrast(img: np.ndarray, value: float) -> np.ndarray:
        """
        Adjust contrast
        value: -100 to 100 (0 = no change)
        """
        factor = (100 + value) / 100.0
        img_float = img.astype(np.float32)
        mean = np.mean(img_float)
        result = (img_float - mean) * factor + mean
        return np.clip(result, 0, 255).astype(np.uint8)
    
    @staticmethod
    def adjust_saturation(img: np.ndarray, value: float) -> np.ndarray:
        """
        Adjust saturation
        value: -100 to 100 (0 = no change)
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] = hsv[:, :, 1] * (1 + value / 100.0)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    
    @staticmethod
    def adjust_exposure(img: np.ndarray, value: float) -> np.ndarray:
        """
        Adjust exposure (EV)
        value: -3.0 to 3.0 (0 = no change)
        """
        factor = 2 ** value
        img_float = img.astype(np.float32) * factor
        return np.clip(img_float, 0, 255).astype(np.uint8)
    
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