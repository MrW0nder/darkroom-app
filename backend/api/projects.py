"""
Projects API
Manage photo editing projects (Lightroom-style)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.db import get_db
from backend.models.projects import Project
from backend.models.layers import Layer

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    layer_count: int
    
    class Config:
        orm_mode = True


@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project"""
    try:
        new_project = Project(name=project.name, description=project.description)
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        
        # Count layers
        layer_count = db.query(Layer).filter(Layer.project_id == new_project.id).count()
        
        response = ProjectResponse(
            id=new_project.id,
            name=new_project.name,
            description=new_project.description,
            created_at=new_project.created_at,
            updated_at=new_project.updated_at,
            layer_count=layer_count
        )
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(db: Session = Depends(get_db)):
    """List all projects"""
    try:
        projects = db.query(Project).all()
        
        result = []
        for project in projects:
            layer_count = db.query(Layer).filter(Layer.project_id == project.id).count()
            result.append(ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                created_at=project.created_at,
                updated_at=project.updated_at,
                layer_count=layer_count
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing projects: {str(e)}")


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a specific project"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        layer_count = db.query(Layer).filter(Layer.project_id == project.id).count()
        
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            created_at=project.created_at,
            updated_at=project.updated_at,
            layer_count=layer_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting project: {str(e)}")


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project and all its layers"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        db.delete(project)
        db.commit()
        
        return {"success": True, "message": f"Project {project_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting project: {str(e)}")
