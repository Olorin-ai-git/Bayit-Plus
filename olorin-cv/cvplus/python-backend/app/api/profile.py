"""
Public Profile API Endpoints
Handles public CV profiles, sharing, and contact forms
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.core.security import get_current_user
from app.services import ProfileService

router = APIRouter()
profile_service = ProfileService()

# Request/Response Models
class ProfileCreateRequest(BaseModel):
    cv_id: str
    slug: Optional[str] = None
    visibility: str = "public"  # public, private, unlisted

class ProfileResponse(BaseModel):
    profile_id: str
    slug: str
    public_url: str
    qr_code_url: Optional[str] = None

class ContactFormRequest(BaseModel):
    sender_name: str
    sender_email: EmailStr
    sender_phone: Optional[str] = None
    company: Optional[str] = None
    message: str

@router.post("/create", response_model=ProfileResponse)
async def create_public_profile(
    request: ProfileCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a public profile for a CV
    Generates shareable link and QR code
    """
    try:
        profile = await profile_service.create_profile(
            cv_id=request.cv_id,
            user_id=current_user["id"],
            slug=request.slug,
            visibility=request.visibility
        )

        return ProfileResponse(
            profile_id=str(profile.id),
            slug=profile.slug,
            public_url=profile.public_url,
            qr_code_url=profile.qr_code_url
        )

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile creation failed: {str(e)}")

@router.get("/{slug}")
async def view_public_profile(slug: str):
    """
    View a public profile (no authentication required)
    Returns CV data for public viewing
    """
    profile = await profile_service.get_profile_by_slug(slug)

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    from app.models import CV, CVAnalysis
    cv = await CV.get(profile.cv_id)
    analysis = None

    if cv and cv.analysis_id:
        analysis = await CVAnalysis.get(cv.analysis_id)

    return {
        "slug": profile.slug,
        "cv_url": cv.storage_url if cv else None,
        "skills": analysis.skills if analysis else [],
        "experience_years": analysis.experience_years if analysis else None,
        "education_level": analysis.education_level if analysis else None,
        "work_history": analysis.work_history if analysis else [],
        "education": analysis.education if analysis else [],
        "show_contact_form": profile.show_contact_form,
        "show_download_button": profile.show_download_button,
        "theme": profile.theme,
        "view_count": profile.view_count,
    }

@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_public_profile(
    profile_id: str,
    visibility: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update public profile settings"""
    try:
        updates = {}
        if visibility:
            updates["visibility"] = visibility

        profile = await profile_service.update_profile(
            profile_id=profile_id,
            user_id=current_user["id"],
            **updates
        )

        return ProfileResponse(
            profile_id=str(profile.id),
            slug=profile.slug,
            public_url=profile.public_url,
            qr_code_url=profile.qr_code_url
        )

    except PermissionError:
        raise HTTPException(status_code=403, detail="Access denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@router.post("/{slug}/contact")
async def contact_profile_owner(
    slug: str,
    request: ContactFormRequest
):
    """
    Send contact message to profile owner
    Sends email notification to CV owner
    """
    try:
        contact = await profile_service.submit_contact_request(
            slug=slug,
            sender_name=request.sender_name,
            sender_email=request.sender_email,
            message=request.message,
            sender_phone=request.sender_phone,
            company=request.company
        )

        return {
            "status": "sent",
            "message": "Your message has been sent to the profile owner",
            "contact_id": str(contact.id)
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@router.delete("/{profile_id}")
async def delete_public_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a public profile"""
    try:
        await profile_service.delete_profile(
            profile_id=profile_id,
            user_id=current_user["id"]
        )

        return {"status": "deleted", "profile_id": profile_id}

    except PermissionError:
        raise HTTPException(status_code=403, detail="Access denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")
