from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict

router = APIRouter(prefix="/api/performance", tags=["performance"])

class CacheSettings(BaseModel):
    enabled: bool = True
    max_size_gb: int = 10
    preview_cache_size_gb: int = 5
    thumbnail_cache_size_gb: int = 2
    auto_purge: bool = True
    purge_after_days: int = 30

class ProxySettings(BaseModel):
    enabled: bool = False
    format: str = "jpeg"  # jpeg, h264
    quality: int = 70
    max_dimension: int = 2048
    auto_generate: bool = False

class HardwareSettings(BaseModel):
    gpu_acceleration: bool = True
    gpu_device: Optional[str] = None  # cuda, metal, opencl
    cpu_threads: int = 0  # 0 = auto
    memory_limit_gb: int = 0  # 0 = unlimited
    preview_quality: str = "high"  # low, medium, high

class RenderJob(BaseModel):
    id: str
    type: str
    status: str
    progress: float
    files: int

@router.get("/cache/status")
async def get_cache_status():
    """Get cache status"""
    return {
        "total_size_gb": 8.5,
        "preview_cache_gb": 4.2,
        "thumbnail_cache_gb": 1.8,
        "misc_cache_gb": 2.5,
        "max_size_gb": 10,
        "items": 12456
    }

@router.post("/cache/clear")
async def clear_cache(cache_type: str = "all"):
    """Clear cache"""
    # cache_type: all, previews, thumbnails, renders
    return {"status": "cleared", "type": cache_type, "space_freed_gb": 8.5}

@router.post("/cache/settings")
async def update_cache_settings(settings: CacheSettings):
    """Update cache settings"""
    return {"status": "updated", "settings": settings.dict()}

@router.post("/proxy/generate")
async def generate_proxies(file_ids: List[str]):
    """Generate proxy files"""
    return {
        "status": "queued",
        "files": len(file_ids),
        "job_id": f"proxy_{len(file_ids)}"
    }

@router.post("/proxy/settings")
async def update_proxy_settings(settings: ProxySettings):
    """Update proxy settings"""
    return {"status": "updated", "settings": settings.dict()}

@router.post("/hardware/settings")
async def update_hardware_settings(settings: HardwareSettings):
    """Update hardware acceleration settings"""
    return {"status": "updated", "settings": settings.dict()}

@router.get("/hardware/info")
async def get_hardware_info():
    """Get hardware information"""
    return {
        "cpu": {
            "model": "Intel Core i9-12900K",
            "cores": 16,
            "threads": 24
        },
        "gpu": [
            {
                "model": "NVIDIA GeForce RTX 4080",
                "vram_gb": 16,
                "cuda_support": True
            }
        ],
        "ram_gb": 64,
        "storage": {
            "total_gb": 2000,
            "free_gb": 1200
        }
    }

@router.get("/render-queue")
async def get_render_queue() -> List[RenderJob]:
    """Get render queue status"""
    return [
        RenderJob(
            id="job1",
            type="export",
            status="processing",
            progress=0.65,
            files=42
        )
    ]

@router.post("/render-queue/{job_id}/cancel")
async def cancel_render_job(job_id: str):
    """Cancel render job"""
    return {"status": "cancelled", "job_id": job_id}

@router.post("/optimize")
async def optimize_performance():
    """Run performance optimization"""
    return {
        "status": "optimized",
        "actions": [
            "Cleared 2.3 GB of cached previews",
            "Rebuilt thumbnail database",
            "Optimized catalog index"
        ]
    }

@router.get("/stats")
async def get_performance_stats():
    """Get performance statistics"""
    return {
        "avg_export_time_sec": 12.5,
        "avg_preview_gen_time_ms": 450,
        "cache_hit_rate": 0.87,
        "memory_usage_gb": 8.2,
        "cpu_usage_percent": 45,
        "gpu_usage_percent": 62
    }