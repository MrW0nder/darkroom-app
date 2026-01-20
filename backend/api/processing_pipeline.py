"""
Processing Pipeline API
Provides Darktable-style module pipeline system for non-destructive editing.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
import json

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


class ModuleConfig(BaseModel):
    module_id: str
    module_type: str  # "exposure", "color_balance", "sharpen", "denoise", etc.
    enabled: bool = True
    order: int
    parameters: Dict[str, Any]


class PipelineState(BaseModel):
    pipeline_id: str
    name: str
    modules: List[ModuleConfig]
    created_at: str
    updated_at: str


class PipelinePreset(BaseModel):
    name: str
    description: str
    modules: List[ModuleConfig]
    category: str  # "portrait", "landscape", "bw", "custom"


# Available module types and their parameters
MODULE_TYPES = {
    "exposure": {
        "name": "Exposure",
        "parameters": ["exposure", "black_point", "highlights", "shadows"],
        "category": "tone"
    },
    "color_balance": {
        "name": "Color Balance",
        "parameters": ["temperature", "tint", "shadows_tint", "highlights_tint"],
        "category": "color"
    },
    "tone_curve": {
        "name": "Tone Curve",
        "parameters": ["curve_points", "mode"],
        "category": "tone"
    },
    "sharpen": {
        "name": "Sharpen",
        "parameters": ["amount", "radius", "threshold"],
        "category": "detail"
    },
    "denoise": {
        "name": "Denoise",
        "parameters": ["luminance", "color", "detail_preservation"],
        "category": "detail"
    },
    "lens_correction": {
        "name": "Lens Correction",
        "parameters": ["distortion", "vignetting", "chromatic_aberration"],
        "category": "correction"
    },
    "local_contrast": {
        "name": "Local Contrast",
        "parameters": ["amount", "radius", "threshold"],
        "category": "tone"
    },
    "color_zones": {
        "name": "Color Zones",
        "parameters": ["zone_adjustments"],
        "category": "color"
    },
    "vignette": {
        "name": "Vignette",
        "parameters": ["amount", "roundness", "feather"],
        "category": "effect"
    },
    "grain": {
        "name": "Film Grain",
        "parameters": ["amount", "size", "roughness"],
        "category": "effect"
    },
    "split_toning": {
        "name": "Split Toning",
        "parameters": ["highlights_hue", "highlights_saturation", "shadows_hue", "shadows_saturation"],
        "category": "color"
    },
    "hsl": {
        "name": "HSL Adjustments",
        "parameters": ["hue_shifts", "saturation_adjustments", "luminance_adjustments"],
        "category": "color"
    },
}


# In-memory storage (in production, use database)
pipelines_db = {}
presets_db = {}


@router.post("/create")
async def create_pipeline(name: str):
    """
    Create a new processing pipeline.
    """
    pipeline_id = f"pipeline_{len(pipelines_db) + 1}_{datetime.now().timestamp()}"
    
    pipeline = PipelineState(
        pipeline_id=pipeline_id,
        name=name,
        modules=[],
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    
    pipelines_db[pipeline_id] = pipeline
    
    return {
        "status": "success",
        "pipeline": pipeline.dict()
    }


@router.get("/get/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    """Get a specific pipeline by ID."""
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    return {
        "status": "success",
        "pipeline": pipelines_db[pipeline_id].dict()
    }


@router.get("/list")
async def list_pipelines():
    """List all pipelines."""
    return {
        "status": "success",
        "pipelines": [p.dict() for p in pipelines_db.values()]
    }


@router.post("/add-module")
async def add_module_to_pipeline(
    pipeline_id: str,
    module: ModuleConfig
):
    """
    Add a module to a pipeline.
    """
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline = pipelines_db[pipeline_id]
    
    # Validate module type
    if module.module_type not in MODULE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid module type: {module.module_type}")
    
    # Add module
    pipeline.modules.append(module)
    pipeline.updated_at = datetime.now().isoformat()
    
    return {
        "status": "success",
        "pipeline": pipeline.dict()
    }


@router.post("/remove-module")
async def remove_module_from_pipeline(
    pipeline_id: str,
    module_id: str
):
    """
    Remove a module from a pipeline.
    """
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline = pipelines_db[pipeline_id]
    pipeline.modules = [m for m in pipeline.modules if m.module_id != module_id]
    pipeline.updated_at = datetime.now().isoformat()
    
    return {
        "status": "success",
        "pipeline": pipeline.dict()
    }


@router.post("/reorder-modules")
async def reorder_modules(
    pipeline_id: str,
    module_order: List[str]  # List of module IDs in desired order
):
    """
    Reorder modules in a pipeline.
    """
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline = pipelines_db[pipeline_id]
    
    # Create a mapping of module_id to module
    module_map = {m.module_id: m for m in pipeline.modules}
    
    # Reorder modules
    reordered_modules = []
    for idx, module_id in enumerate(module_order):
        if module_id in module_map:
            module = module_map[module_id]
            module.order = idx
            reordered_modules.append(module)
    
    pipeline.modules = reordered_modules
    pipeline.updated_at = datetime.now().isoformat()
    
    return {
        "status": "success",
        "pipeline": pipeline.dict()
    }


@router.post("/toggle-module")
async def toggle_module(
    pipeline_id: str,
    module_id: str,
    enabled: bool
):
    """
    Enable or disable a module in the pipeline.
    """
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline = pipelines_db[pipeline_id]
    
    for module in pipeline.modules:
        if module.module_id == module_id:
            module.enabled = enabled
            break
    
    pipeline.updated_at = datetime.now().isoformat()
    
    return {
        "status": "success",
        "pipeline": pipeline.dict()
    }


@router.post("/update-module")
async def update_module_parameters(
    pipeline_id: str,
    module_id: str,
    parameters: Dict[str, Any]
):
    """
    Update module parameters.
    """
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline = pipelines_db[pipeline_id]
    
    for module in pipeline.modules:
        if module.module_id == module_id:
            module.parameters.update(parameters)
            break
    
    pipeline.updated_at = datetime.now().isoformat()
    
    return {
        "status": "success",
        "pipeline": pipeline.dict()
    }


@router.get("/module-types")
async def get_module_types():
    """Get available module types and their parameters."""
    return {
        "status": "success",
        "module_types": MODULE_TYPES
    }


@router.post("/save-preset")
async def save_pipeline_preset(preset: PipelinePreset):
    """
    Save a pipeline as a preset.
    """
    preset_id = f"preset_{len(presets_db) + 1}"
    presets_db[preset_id] = preset
    
    return {
        "status": "success",
        "preset_id": preset_id,
        "preset": preset.dict()
    }


@router.get("/presets")
async def list_presets(category: Optional[str] = None):
    """
    List available pipeline presets.
    """
    presets = list(presets_db.values())
    
    if category:
        presets = [p for p in presets if p.category == category]
    
    return {
        "status": "success",
        "presets": [p.dict() for p in presets]
    }


@router.post("/apply-preset")
async def apply_preset_to_pipeline(
    pipeline_id: str,
    preset_id: str
):
    """
    Apply a preset to a pipeline.
    """
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    if preset_id not in presets_db:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    pipeline = pipelines_db[pipeline_id]
    preset = presets_db[preset_id]
    
    # Replace pipeline modules with preset modules
    pipeline.modules = [
        ModuleConfig(
            module_id=f"{m.module_type}_{idx}",
            module_type=m.module_type,
            enabled=m.enabled,
            order=idx,
            parameters=m.parameters
        )
        for idx, m in enumerate(preset.modules)
    ]
    pipeline.updated_at = datetime.now().isoformat()
    
    return {
        "status": "success",
        "pipeline": pipeline.dict()
    }


@router.post("/snapshot")
async def create_history_snapshot(
    pipeline_id: str,
    snapshot_name: str
):
    """
    Create a history snapshot of the current pipeline state.
    """
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline = pipelines_db[pipeline_id]
    
    snapshot = {
        "name": snapshot_name,
        "timestamp": datetime.now().isoformat(),
        "modules": [m.dict() for m in pipeline.modules]
    }
    
    return {
        "status": "success",
        "snapshot": snapshot
    }


@router.delete("/delete/{pipeline_id}")
async def delete_pipeline(pipeline_id: str):
    """Delete a pipeline."""
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    del pipelines_db[pipeline_id]
    
    return {
        "status": "success",
        "message": f"Pipeline {pipeline_id} deleted"
    }
