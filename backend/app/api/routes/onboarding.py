"""
AI Onboarding API for voice-based account creation.
Provides a conversational interface powered by Claude for frictionless signup.
"""
from datetime import datetime
from typing import Optional

from app.core.security import create_access_token, get_password_hash
from app.models.user import TokenResponse, User, UserResponse
from app.services.ai_onboarding import OnboardingStep, ai_onboarding_service
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================


class StartOnboardingRequest(BaseModel):
    language: str = "he"  # "he" or "en"


class StartOnboardingResponse(BaseModel):
    conversation_id: str
    message: str
    mascot_mood: str
    mascot_animation: str
    current_step: str


class SendMessageRequest(BaseModel):
    conversation_id: str
    message: str
    message_type: str = "text"  # "text" or "voice"


class SendMessageResponse(BaseModel):
    message: str
    mascot_mood: str
    mascot_animation: str
    current_step: str
    collected_data: dict
    ready_for_completion: bool


class CompleteOnboardingRequest(BaseModel):
    conversation_id: str
    password: Optional[str] = None  # Optional - can be set later


class CompleteOnboardingResponse(BaseModel):
    success: bool
    access_token: Optional[str] = None
    user: Optional[UserResponse] = None
    message: str


# ============================================================================
# REST Endpoints
# ============================================================================


@router.post("/start", response_model=StartOnboardingResponse)
async def start_onboarding(request: StartOnboardingRequest):
    """
    Start a new AI-powered onboarding conversation.

    The Bayit mascot will guide the user through:
    1. Name collection
    2. Email collection (supports spelled-out emails)
    3. Email verification
    4. Account creation
    """
    session, greeting = await ai_onboarding_service.start_session(request.language)

    return StartOnboardingResponse(
        conversation_id=session.conversation_id,
        message=greeting,
        mascot_mood=session.mascot_mood,
        mascot_animation=session.mascot_animation,
        current_step=session.current_step.value,
    )


@router.post("/message", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest):
    """
    Send a message in the onboarding conversation.

    The AI will:
    - Process the user's input (text or voice transcription)
    - Extract relevant data (name, email)
    - Progress through onboarding steps
    - Return appropriate mascot mood/animation

    For voice input, the AI understands spelled-out emails like:
    - "d a v i d at gmail dot com" -> david@gmail.com
    - "דוד שטרודל גימייל נקודה קום" -> david@gmail.com
    """
    session, response_message = await ai_onboarding_service.process_message(
        request.conversation_id,
        request.message,
        request.message_type,
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Check if ready for completion
    ready = (
        session.collected_data.get("name")
        and session.collected_data.get("email")
        and session.collected_data.get("email_confirmed", False)
    )

    return SendMessageResponse(
        message=response_message,
        mascot_mood=session.mascot_mood,
        mascot_animation=session.mascot_animation,
        current_step=session.current_step.value,
        collected_data={
            "name": session.collected_data.get("name"),
            "email": session.collected_data.get("email"),
            "email_confirmed": session.collected_data.get("email_confirmed", False),
        },
        ready_for_completion=ready,
    )


@router.post("/complete", response_model=CompleteOnboardingResponse)
async def complete_onboarding(request: CompleteOnboardingRequest):
    """
    Complete the onboarding and create the user account.

    If password is not provided, a temporary password will be generated
    and the user can set their password later via email.
    """
    session, data = await ai_onboarding_service.complete_onboarding(
        request.conversation_id
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if data.get("error"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=data["error"],
        )

    name = data["name"]
    email = data["email"]

    # Check if user already exists
    existing_user = await User.find_one(User.email == email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please login instead.",
        )

    # Generate password if not provided
    import secrets

    password = request.password or secrets.token_urlsafe(16)

    # Create user
    user = User(
        email=email,
        name=name,
        hashed_password=get_password_hash(password),
        auth_provider="ai_onboarding",
    )
    await user.insert()

    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})

    # Clean up session
    await ai_onboarding_service.remove_session(request.conversation_id)

    return CompleteOnboardingResponse(
        success=True,
        access_token=access_token,
        user=user.to_response(),
        message="ברוך הבא לבית+!" if session.language == "he" else "Welcome to Bayit+!",
    )


@router.get("/session/{conversation_id}")
async def get_session(conversation_id: str):
    """
    Get the current state of an onboarding session.
    """
    session = await ai_onboarding_service.get_session(conversation_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return session.to_dict()


@router.delete("/session/{conversation_id}")
async def cancel_session(conversation_id: str):
    """
    Cancel an onboarding session.
    """
    await ai_onboarding_service.remove_session(conversation_id)
    return {"status": "cancelled"}
