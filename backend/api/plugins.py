from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os

router = APIRouter(prefix="/api/plugins", tags=["plugins"])

class Plugin(BaseModel):
    id: str
    name: str
    version: str
    author: str
    description: str
    category: str  # filter, tool, export, import
    enabled: bool = True
    installed: bool = False
    marketplace_url: Optional[str] = None
    dependencies: List[str] = []
    rating: Optional[float] = None
    downloads: int = 0

class PluginConfig(BaseModel):
    plugin_id: str
    settings: Dict[str, Any]

# In-memory plugin store (should be database in production)
installed_plugins = {}
marketplace_plugins = [
    Plugin(
        id="vintage-film",
        name="Vintage Film Pack",
        version="1.2.0",
        author="RetroFilters Inc",
        description="Professional vintage film emulation filters with grain and color profiles",
        category="filter",
        installed=False,
        marketplace_url="https://marketplace.darkroom.app/vintage-film",
        rating=4.8,
        downloads=15240
    ),
    Plugin(
        id="portrait-retouch",
        name="Portrait Retouching Suite",
        version="2.0.1",
        author="BeautyEdit Pro",
        description="Advanced portrait retouching tools with AI-powered skin smoothing",
        category="tool",
        installed=False,
        marketplace_url="https://marketplace.darkroom.app/portrait-retouch",
        rating=4.9,
        downloads=28950
    ),
    Plugin(
        id="batch-rename",
        name="Advanced Batch Rename",
        version="1.5.3",
        author="WorkflowTools",
        description="Powerful batch renaming with metadata tokens and regex support",
        category="tool",
        installed=False,
        marketplace_url="https://marketplace.darkroom.app/batch-rename",
        rating=4.6,
        downloads=9330
    )
]

@router.get("/installed")
async def get_installed_plugins():
    """Get list of installed plugins"""
    return {"plugins": list(installed_plugins.values())}

@router.get("/marketplace")
async def get_marketplace_plugins(
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Browse plugin marketplace"""
    plugins = marketplace_plugins.copy()
    
    if category:
        plugins = [p for p in plugins if p.category == category]
    
    if search:
        search_lower = search.lower()
        plugins = [
            p for p in plugins 
            if search_lower in p.name.lower() or search_lower in p.description.lower()
        ]
    
    return {"plugins": plugins}

@router.post("/install/{plugin_id}")
async def install_plugin(plugin_id: str):
    """Install a plugin from marketplace"""
    # Find plugin in marketplace
    plugin = next((p for p in marketplace_plugins if p.id == plugin_id), None)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found in marketplace")
    
    # Check dependencies
    for dep_id in plugin.dependencies:
        if dep_id not in installed_plugins:
            raise HTTPException(
                status_code=400,
                detail=f"Missing dependency: {dep_id}"
            )
    
    # Install plugin
    plugin.installed = True
    installed_plugins[plugin_id] = plugin
    
    return {
        "message": f"Plugin '{plugin.name}' installed successfully",
        "plugin": plugin
    }

@router.delete("/uninstall/{plugin_id}")
async def uninstall_plugin(plugin_id: str):
    """Uninstall a plugin"""
    if plugin_id not in installed_plugins:
        raise HTTPException(status_code=404, detail="Plugin not installed")
    
    plugin = installed_plugins[plugin_id]
    plugin.installed = False
    del installed_plugins[plugin_id]
    
    return {"message": f"Plugin '{plugin.name}' uninstalled successfully"}

@router.patch("/toggle/{plugin_id}")
async def toggle_plugin(plugin_id: str, enabled: bool):
    """Enable or disable a plugin"""
    if plugin_id not in installed_plugins:
        raise HTTPException(status_code=404, detail="Plugin not installed")
    
    installed_plugins[plugin_id].enabled = enabled
    status = "enabled" if enabled else "disabled"
    
    return {
        "message": f"Plugin {status}",
        "plugin": installed_plugins[plugin_id]
    }

@router.get("/{plugin_id}/config")
async def get_plugin_config(plugin_id: str):
    """Get plugin configuration"""
    if plugin_id not in installed_plugins:
        raise HTTPException(status_code=404, detail="Plugin not installed")
    
    # Return default config (should load from database)
    return {
        "plugin_id": plugin_id,
        "settings": {
            "auto_update": True,
            "notify_updates": True,
            "custom_param": "value"
        }
    }

@router.put("/{plugin_id}/config")
async def update_plugin_config(plugin_id: str, config: PluginConfig):
    """Update plugin configuration"""
    if plugin_id not in installed_plugins:
        raise HTTPException(status_code=404, detail="Plugin not installed")
    
    # Save config (should save to database)
    return {
        "message": "Plugin configuration updated",
        "config": config
    }

@router.post("/upload")
async def upload_custom_plugin(file: UploadFile = File(...)):
    """Upload custom plugin file (.zip)"""
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed")
    
    # In production: extract, validate, and install plugin
    return {
        "message": f"Plugin '{file.filename}' uploaded successfully",
        "note": "Plugin validation and installation pending"
    }

@router.get("/updates")
async def check_plugin_updates():
    """Check for plugin updates"""
    updates_available = []
    
    for plugin_id, plugin in installed_plugins.items():
        # Check marketplace for newer version
        marketplace_plugin = next(
            (p for p in marketplace_plugins if p.id == plugin_id), 
            None
        )
        if marketplace_plugin and marketplace_plugin.version > plugin.version:
            updates_available.append({
                "plugin_id": plugin_id,
                "current_version": plugin.version,
                "new_version": marketplace_plugin.version
            })
    
    return {"updates": updates_available}