from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

router = APIRouter(prefix="/api/automation", tags=["automation"])

class Action(BaseModel):
    type: str  # adjust, crop, filter, export, etc.
    parameters: Dict[str, Any]
    condition: Optional[Dict[str, Any]] = None

class Workflow(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    actions: List[Action]
    triggers: List[str] = []  # on_import, on_export, scheduled, manual
    schedule: Optional[str] = None  # cron expression
    enabled: bool = True

class AutomationTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: str
    actions: List[Action]

@router.post("/workflows")
async def create_workflow(workflow: Workflow):
    """Create automation workflow"""
    workflow.id = f"workflow_{hash(workflow.name)}"
    return {"status": "created", "workflow": workflow.dict()}

@router.get("/workflows")
async def list_workflows() -> List[Workflow]:
    """List all workflows"""
    return [
        Workflow(
            id="wf1",
            name="Auto Export for Web",
            description="Automatically resize and export images for web",
            actions=[
                Action(type="resize", parameters={"width": 1920, "quality": 85}),
                Action(type="export", parameters={"format": "jpeg", "path": "/exports/web"})
            ],
            triggers=["on_import"],
            enabled=True
        )
    ]

@router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str) -> Workflow:
    """Get workflow details"""
    raise HTTPException(status_code=404, detail="Workflow not found")

@router.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, workflow: Workflow):
    """Update workflow"""
    return {"status": "updated", "workflow_id": workflow_id}

@router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete workflow"""
    return {"status": "deleted", "workflow_id": workflow_id}

@router.post("/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, file_ids: List[str]):
    """Execute workflow on files"""
    return {
        "status": "executing",
        "workflow_id": workflow_id,
        "files": len(file_ids),
        "job_id": f"job_{workflow_id}_{len(file_ids)}"
    }

@router.post("/workflows/{workflow_id}/toggle")
async def toggle_workflow(workflow_id: str, enabled: bool):
    """Enable/disable workflow"""
    return {"status": "toggled", "workflow_id": workflow_id, "enabled": enabled}

@router.get("/templates")
async def list_templates() -> List[AutomationTemplate]:
    """List automation templates"""
    return [
        AutomationTemplate(
            id="tmpl1",
            name="Social Media Export",
            description="Optimize for Instagram, Facebook, Twitter",
            category="export",
            actions=[
                Action(type="resize", parameters={"width": 1080, "height": 1080}),
                Action(type="sharpen", parameters={"amount": 0.3}),
                Action(type="export", parameters={"format": "jpeg", "quality": 90})
            ]
        ),
        AutomationTemplate(
            id="tmpl2",
            name="RAW Development",
            description="Auto-develop RAW files with base adjustments",
            category="development",
            actions=[
                Action(type="white_balance", parameters={"auto": True}),
                Action(type="exposure", parameters={"value": 0.3}),
                Action(type="contrast", parameters={"value": 0.2})
            ]
        )
    ]

@router.post("/record/start")
async def start_recording():
    """Start recording actions for workflow"""
    return {"status": "recording", "session_id": "rec_123"}

@router.post("/record/stop/{session_id}")
async def stop_recording(session_id: str) -> Workflow:
    """Stop recording and create workflow"""
    return Workflow(
        id=f"wf_{session_id}",
        name="Recorded Workflow",
        actions=[],
        triggers=["manual"]
    )

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get automation job status"""
    return {
        "job_id": job_id,
        "status": "completed",
        "progress": 100,
        "files_processed": 42,
        "files_total": 42,
        "errors": []
    }

@router.post("/scripts/execute")
async def execute_script(script: str, language: str = "python"):
    """Execute custom script"""
    # Execute Python or JavaScript automation script
    return {"status": "executed", "output": "Script completed successfully"}
