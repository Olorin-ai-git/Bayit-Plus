"""
CV Processing API Endpoints
Handles CV upload, analysis, generation, and enhancement
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse
from typing import List, Optional
from pydantic import BaseModel

from app.core.security import get_current_user
from app.services import CVService
from app.models import CV

router = APIRouter()
cv_service = CVService()

# Request/Response Models
class CVAnalysisRequest(BaseModel):
    cv_text: str
    language: Optional[str] = "en"

class CVAnalysisResponse(BaseModel):
    job_id: str
    status: str
    analysis: Optional[dict] = None

class CVGenerationRequest(BaseModel):
    user_data: dict
    template: Optional[str] = "professional"
    language: Optional[str] = "en"

class CVGenerationResponse(BaseModel):
    job_id: str
    status: str
    cv_url: Optional[str] = None

@router.post("/upload", response_model=CVAnalysisResponse)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and analyze a CV file
    Supports PDF, DOCX, and TXT formats
    """
    try:
        cv = await cv_service.upload_and_analyze(
            file=file,
            user_id=current_user["id"],
            language="en"
        )

        # Get analysis if completed
        analysis_data = None
        if cv.status == "completed" and cv.structured_data:
            analysis_data = cv.structured_data

        return CVAnalysisResponse(
            job_id=str(cv.id),
            status=cv.status,
            analysis=analysis_data
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/analyze", response_model=CVAnalysisResponse)
async def analyze_cv(
    request: CVAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze CV text using Olorin AI Agent
    Returns structured analysis with skills, experience, and recommendations
    """
    try:
        from app.services.ai_agent_service import AIAgentService

        ai_agent = AIAgentService()

        analysis_result = await ai_agent.analyze_cv(
            cv_text=request.cv_text,
            language=request.language or "en"
        )

        return CVAnalysisResponse(
            job_id="direct_analysis",
            status="completed",
            analysis=analysis_result
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/generate", response_model=CVGenerationResponse)
async def generate_cv(
    request: CVGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a new CV from user data
    Uses AI to create professional CV content
    """
    try:
        cv = await cv_service.generate_cv(
            user_data=request.user_data,
            user_id=current_user["id"],
            template=request.template or "professional",
            language=request.language or "en"
        )

        return CVGenerationResponse(
            job_id=str(cv.id),
            status=cv.status,
            cv_url=cv.storage_url
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.get("/status/{job_id}")
async def get_cv_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get processing status for a CV job"""
    try:
        cv = await cv_service.get_cv(job_id, current_user["id"])

        if not cv:
            raise HTTPException(status_code=404, detail="CV not found")

        progress = 100 if cv.status == "completed" else (50 if cv.status == "processing" else 0)

        return {
            "job_id": job_id,
            "status": cv.status,
            "progress": progress,
            "result_url": cv.storage_url if cv.status == "completed" else None,
            "error": cv.processing_error
        }

    except PermissionError:
        raise HTTPException(status_code=403, detail="Access denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{job_id}")
async def download_cv(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download a processed CV"""
    try:
        cv = await cv_service.get_cv(job_id, current_user["id"])

        if not cv:
            raise HTTPException(status_code=404, detail="CV not found")

        from app.services import StorageService
        storage = StorageService()

        signed_url = await storage.get_signed_url(cv.filename, expiration_minutes=60)

        return RedirectResponse(url=signed_url, status_code=302)

    except PermissionError:
        raise HTTPException(status_code=403, detail="Access denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
