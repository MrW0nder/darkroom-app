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
