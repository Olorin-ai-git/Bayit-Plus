"""
LLM Model Management API endpoints.
Provides model selection, listing, and configuration.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import verify_api_key
from app.service.llm_manager import get_llm_manager
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)
router = APIRouter()


class ModelSelectionRequest(BaseModel):
    """Request to change the selected model."""

    model_id: str
    is_verification: bool = False


class ModelInvocationRequest(BaseModel):
    """Request to invoke a model."""

    prompt: str
    system_prompt: str = None
    verify: bool = False


class ModelResponse(BaseModel):
    """Response from model operations."""

    success: bool
    message: str = None
    data: Dict[str, Any] = None


@router.get("/models", response_model=Dict[str, Any])
async def get_available_models(
    api_key: str = Depends(verify_api_key),
) -> Dict[str, Any]:
    """
    Get list of available LLM models.

    Returns:
        List of available models with their status
    """
    try:
        llm_manager = get_llm_manager()
        models = llm_manager.get_available_models()

        return {
            "status": "success",
            "models": models,
            "selected_model": llm_manager.selected_model_id,
            "verification_model": llm_manager.verification_model_id,
        }

    except Exception as e:
        logger.error(f"Failed to get models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/select", response_model=ModelResponse)
async def select_model(
    request: ModelSelectionRequest, api_key: str = Depends(verify_api_key)
) -> ModelResponse:
    """
    Select a model for use.

    Args:
        request: Model selection request

    Returns:
        Selection result
    """
    try:
        llm_manager = get_llm_manager()

        if request.is_verification:
            # Update verification model
            llm_manager.verification_model_id = request.model_id
            llm_manager._initialize_models()
            message = f"Verification model set to: {request.model_id}"
        else:
            # Update selected model
            success = llm_manager.switch_model(request.model_id)
            if not success:
                return ModelResponse(
                    success=False,
                    message=f"Failed to switch to model: {request.model_id}",
                )
            message = f"Selected model set to: {request.model_id}"

        logger.info(message)

        return ModelResponse(
            success=True,
            message=message,
            data={
                "selected_model": llm_manager.selected_model_id,
                "verification_model": llm_manager.verification_model_id,
            },
        )

    except Exception as e:
        logger.error(f"Failed to select model: {e}")
        return ModelResponse(success=False, message=str(e))


@router.post("/models/invoke", response_model=Dict[str, Any])
async def invoke_model(
    request: ModelInvocationRequest, api_key: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """
    Invoke the selected model with a prompt.

    Args:
        request: Model invocation request

    Returns:
        Model response with optional verification
    """
    try:
        from langchain.schema import HumanMessage, SystemMessage

        llm_manager = get_llm_manager()

        # Build messages
        messages = []
        if request.system_prompt:
            messages.append(SystemMessage(content=request.system_prompt))
        messages.append(HumanMessage(content=request.prompt))

        # Invoke model with optional verification
        result = await llm_manager.invoke_with_verification(
            messages=messages, verify=request.verify
        )

        return {
            "status": "success",
            "model_used": result.get("model_used"),
            "response": result.get("response"),
            "verification": result.get("verification"),
            "error": result.get("error"),
        }

    except Exception as e:
        logger.error(f"Model invocation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/config", response_model=Dict[str, Any])
async def get_model_config(api_key: str = Depends(verify_api_key)) -> Dict[str, Any]:
    """
    Get current model configuration.

    Returns:
        Current configuration details
    """
    try:
        llm_manager = get_llm_manager()

        # Check which API keys are configured
        has_anthropic = bool(llm_manager.anthropic_api_key)
        has_openai = bool(llm_manager.openai_api_key)
        has_gemini = bool(llm_manager.gemini_api_key)

        return {
            "status": "success",
            "configuration": {
                "selected_model": llm_manager.selected_model_id,
                "verification_model": llm_manager.verification_model_id,
                "api_keys_configured": {
                    "anthropic": has_anthropic,
                    "openai": has_openai,
                    "google": has_gemini,
                },
                "models_initialized": {
                    "selected": llm_manager.selected_model is not None,
                    "verification": llm_manager.verification_model is not None,
                },
            },
        }

    except Exception as e:
        logger.error(f"Failed to get config: {e}")
        raise HTTPException(status_code=500, detail=str(e))
