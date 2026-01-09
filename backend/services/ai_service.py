"""
AI Service - Model Management and Loading
Handles AI model loading, caching, GPU detection, and memory management.
"""
import os
import torch
import logging
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class AIService:
    """Manages AI models and provides inference capabilities"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.device = self._get_device()
        self.model_dir = Path(__file__).parent.parent / "models" / "ai"
        self.model_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"AI Service initialized on device: {self.device}")
    
    def _get_device(self) -> str:
        """Detect and return the best available device"""
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"  # Apple Silicon
        else:
            return "cpu"
    
    def is_gpu_available(self) -> bool:
        """Check if GPU acceleration is available"""
        return self.device in ["cuda", "mps"]
    
    def get_model_path(self, model_type: str, model_name: str) -> Path:
        """Get the path for a specific model"""
        model_path = self.model_dir / model_type / f"{model_name}.pt"
        model_path.parent.mkdir(parents=True, exist_ok=True)
        return model_path
    
    def load_detection_model(self, model_name: str = "yolov8n"):
        """Load object detection model"""
        if f"detection_{model_name}" in self.models:
            return self.models[f"detection_{model_name}"]
        
        try:
            # Placeholder for actual model loading
            # In production, this would load YOLOv8 or Mask R-CNN
            logger.info(f"Loading detection model: {model_name}")
            
            # Mock model for now - replace with actual model
            model = {
                "type": "detection",
                "name": model_name,
                "device": self.device,
                "loaded": True
            }
            
            self.models[f"detection_{model_name}"] = model
            logger.info(f"Detection model {model_name} loaded successfully")
            return model
            
        except Exception as e:
            logger.error(f"Error loading detection model: {e}")
            raise
    
    def load_inpainting_model(self, model_name: str = "lama"):
        """Load inpainting model"""
        if f"inpainting_{model_name}" in self.models:
            return self.models[f"inpainting_{model_name}"]
        
        try:
            logger.info(f"Loading inpainting model: {model_name}")
            
            # Mock model for now - replace with actual LaMa or Stable Diffusion
            model = {
                "type": "inpainting",
                "name": model_name,
                "device": self.device,
                "loaded": True
            }
            
            self.models[f"inpainting_{model_name}"] = model
            logger.info(f"Inpainting model {model_name} loaded successfully")
            return model
            
        except Exception as e:
            logger.error(f"Error loading inpainting model: {e}")
            raise
    
    def load_upscale_model(self, model_name: str = "realesrgan"):
        """Load super-resolution model"""
        if f"upscale_{model_name}" in self.models:
            return self.models[f"upscale_{model_name}"]
        
        try:
            logger.info(f"Loading upscale model: {model_name}")
            
            # Mock model for now - replace with Real-ESRGAN or GFPGAN
            model = {
                "type": "upscale",
                "name": model_name,
                "device": self.device,
                "loaded": True
            }
            
            self.models[f"upscale_{model_name}"] = model
            logger.info(f"Upscale model {model_name} loaded successfully")
            return model
            
        except Exception as e:
            logger.error(f"Error loading upscale model: {e}")
            raise
    
    def unload_model(self, model_key: str):
        """Unload a model from memory"""
        if model_key in self.models:
            del self.models[model_key]
            if self.device == "cuda":
                torch.cuda.empty_cache()
            logger.info(f"Model {model_key} unloaded")
    
    def clear_cache(self):
        """Clear all cached models"""
        self.models.clear()
        if self.device == "cuda":
            torch.cuda.empty_cache()
        logger.info("All models cleared from cache")
    
    def get_memory_info(self) -> Dict[str, Any]:
        """Get current memory usage information"""
        info = {
            "device": self.device,
            "loaded_models": len(self.models),
            "model_names": list(self.models.keys())
        }
        
        if self.device == "cuda":
            info["gpu_memory_allocated"] = torch.cuda.memory_allocated() / 1024**2  # MB
            info["gpu_memory_reserved"] = torch.cuda.memory_reserved() / 1024**2  # MB
        
        return info


# Singleton instance
_ai_service = None


def get_ai_service() -> AIService:
    """Get the singleton AI service instance"""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
