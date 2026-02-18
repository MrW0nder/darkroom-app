from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/api/collections", tags=["collections"])

# In-memory storage (replace with database in production)
collections_db = {}
images_db = {}

class Collection(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    type: str = "regular"  # regular, smart
    parent_id: Optional[str] = None
    criteria: Optional[dict] = None  # For smart collections
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ImageMetadata(BaseModel):
    id: str
    file_path: str
    rating: int = 0  # 0-5 stars
    color_label: Optional[str] = None  # red, yellow, green, blue, purple
    flag: Optional[str] = None  # pick, reject, none
    keywords: List[str] = []
    collections: List[str] = []
    captured_at: Optional[datetime] = None
    camera: Optional[str] = None
    lens: Optional[str] = None
    iso: Optional[int] = None
    aperture: Optional[str] = None
    shutter_speed: Optional[str] = None

class SmartCollectionCriteria(BaseModel):
    rating: Optional[int] = None
    rating_operator: str = "gte"  # gte, lte, eq
    color_labels: Optional[List[str]] = None
    flags: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    camera: Optional[str] = None
    lens: Optional[str] = None
    iso_min: Optional[int] = None
    iso_max: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

@router.post("/collections")
async def create_collection(collection: Collection):
    """Create a new collection or smart collection"""
    try:
        import uuid
        collection_id = str(uuid.uuid4())
        collection.id = collection_id
        collection.created_at = datetime.now()
        collection.updated_at = datetime.now()
        
        collections_db[collection_id] = collection.model_dump()
        
        return {
            "status": "success",
            "collection": collection.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections")
async def list_collections(parent_id: Optional[str] = None):
    """List all collections or collections under a parent"""
    try:
        if parent_id:
            filtered = [c for c in collections_db.values() if c.get("parent_id") == parent_id]
        else:
            filtered = [c for c in collections_db.values() if c.get("parent_id") is None]
        
        return {
            "collections": filtered,
            "count": len(filtered)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collections/{collection_id}")
async def get_collection(collection_id: str):
    """Get a specific collection"""
    collection = collections_db.get(collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection

@router.put("/collections/{collection_id}")
async def update_collection(collection_id: str, collection: Collection):
    """Update a collection"""
    if collection_id not in collections_db:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    collection.id = collection_id
    collection.updated_at = datetime.now()
    collection.created_at = collections_db[collection_id].get("created_at")
    
    collections_db[collection_id] = collection.model_dump()
    return {"status": "success", "collection": collection.model_dump()}

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str):
    """Delete a collection"""
    if collection_id not in collections_db:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    del collections_db[collection_id]
    
    # Remove from all images
    for image in images_db.values():
        if collection_id in image.get("collections", []):
            image["collections"].remove(collection_id)
    
    return {"status": "success"}

@router.post("/images/metadata")
async def update_image_metadata(metadata: ImageMetadata):
    """Update image metadata (rating, color label, flag, keywords)"""
    try:
        images_db[metadata.id] = metadata.model_dump()
        return {"status": "success", "metadata": metadata.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/images/{image_id}/metadata")
async def get_image_metadata(image_id: str):
    """Get image metadata"""
    metadata = images_db.get(image_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Image metadata not found")
    return metadata

@router.post("/collections/{collection_id}/add-image/{image_id}")
async def add_image_to_collection(collection_id: str, image_id: str):
    """Add an image to a collection"""
    if collection_id not in collections_db:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    if image_id not in images_db:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if collection_id not in images_db[image_id].get("collections", []):
        images_db[image_id].setdefault("collections", []).append(collection_id)
    
    return {"status": "success"}

@router.delete("/collections/{collection_id}/remove-image/{image_id}")
async def remove_image_from_collection(collection_id: str, image_id: str):
    """Remove an image from a collection"""
    if image_id in images_db:
        if collection_id in images_db[image_id].get("collections", []):
            images_db[image_id]["collections"].remove(collection_id)
    
    return {"status": "success"}

@router.post("/collections/{collection_id}/evaluate")
async def evaluate_smart_collection(collection_id: str):
    """Evaluate smart collection criteria and return matching images"""
    collection = collections_db.get(collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    if collection.get("type") != "smart":
        raise HTTPException(status_code=400, detail="Collection is not a smart collection")
    
    criteria = collection.get("criteria", {})
    matching_images = []
    
    for image_id, image in images_db.items():
        # Check rating
        if "rating" in criteria:
            operator = criteria.get("rating_operator", "gte")
            if operator == "gte" and image.get("rating", 0) < criteria["rating"]:
                continue
            elif operator == "lte" and image.get("rating", 0) > criteria["rating"]:
                continue
            elif operator == "eq" and image.get("rating", 0) != criteria["rating"]:
                continue
        
        # Check color labels
        if "color_labels" in criteria and criteria["color_labels"]:
            if image.get("color_label") not in criteria["color_labels"]:
                continue
        
        # Check flags
        if "flags" in criteria and criteria["flags"]:
            if image.get("flag") not in criteria["flags"]:
                continue
        
        # Check keywords
        if "keywords" in criteria and criteria["keywords"]:
            image_keywords = set(image.get("keywords", []))
            required_keywords = set(criteria["keywords"])
            if not required_keywords.intersection(image_keywords):
                continue
        
        # Check camera
        if "camera" in criteria and criteria["camera"]:
            if image.get("camera") != criteria["camera"]:
                continue
        
        # Check ISO range
        if "iso_min" in criteria and image.get("iso", 0) < criteria["iso_min"]:
            continue
        if "iso_max" in criteria and image.get("iso", 999999) > criteria["iso_max"]:
            continue
        
        matching_images.append(image)
    
    return {
        "collection_id": collection_id,
        "count": len(matching_images),
        "images": matching_images
    }

@router.get("/images/filter")
async def filter_images(
    rating: Optional[int] = None,
    color_label: Optional[str] = None,
    flag: Optional[str] = None,
    keyword: Optional[str] = None
):
    """Filter images by various criteria"""
    filtered = list(images_db.values())
    
    if rating is not None:
        filtered = [img for img in filtered if img.get("rating", 0) >= rating]
    
    if color_label:
        filtered = [img for img in filtered if img.get("color_label") == color_label]
    
    if flag:
        filtered = [img for img in filtered if img.get("flag") == flag]
    
    if keyword:
        filtered = [img for img in filtered if keyword in img.get("keywords", [])]
    
    return {
        "count": len(filtered),
        "images": filtered
    }