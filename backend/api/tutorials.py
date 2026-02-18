from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api", tags=["tutorials"])

class Tutorial(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str  # beginner, intermediate, advanced
    duration_minutes: int
    steps: List[str]
    video_url: Optional[str] = None

@router.get("/tutorials")
async def get_tutorials(difficulty: Optional[str] = None, category: Optional[str] = None):
    """Get available tutorials"""
    tutorials = [
        {
            "id": "basic-adjustments",
            "title": "Basic Photo Adjustments",
            "description": "Learn fundamental exposure and color adjustments",
            "difficulty": "beginner",
            "duration_minutes": 10,
            "category": "basics",
            "completed": False
        },
        {
            "id": "advanced-retouching",
            "title": "Advanced Portrait Retouching",
            "description": "Master healing brush and frequency separation",
            "difficulty": "advanced",
            "duration_minutes": 25,
            "category": "retouching",
            "completed": False
        }
    ]
    return {"tutorials": tutorials, "total": len(tutorials)}

@router.get("/tutorials/{tutorial_id}")
async def get_tutorial(tutorial_id: str):
    """Get detailed tutorial with steps"""
    return {
        "id": tutorial_id,
        "title": "Sample Tutorial",
        "steps": [
            {"step": 1, "title": "Open image", "description": "Import your photo"},
            {"step": 2, "title": "Adjust exposure", "description": "Use exposure slider"}
        ],
        "video_url": None
    }

@router.post("/tutorials/{tutorial_id}/complete")
async def mark_tutorial_complete(tutorial_id: str, user_id: str):
    """Mark tutorial as completed"""
    return {"tutorial_id": tutorial_id, "user_id": user_id, "completed": True}

@router.get("/progress/{user_id}")
async def get_user_progress(user_id: str):
    """Get user's learning progress"""
    return {
        "user_id": user_id,
        "completed_tutorials": 0,
        "total_tutorials": 0,
        "skill_level": "beginner",
        "achievements": []
    }

@router.get("/tips")
async def get_contextual_tips(context: str):
    """Get contextual tips based on current tool/panel"""
    return {
        "tips": [
            "Press 'C' to activate the crop tool",
            "Hold Shift while dragging to maintain aspect ratio"
        ]
    }