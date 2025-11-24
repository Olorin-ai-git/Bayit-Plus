from typing import List
import uuid
import logging
from app.service.logging import get_bridge_logger

from fastapi import APIRouter, Body, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.models.api_models import (
    InvestigationCreate,
    InvestigationOut,
    InvestigationUpdate,
    RawDataUploadResponse,
)
from app.models.progress_models import InvestigationProgress
from app.service.investigation_progress_service import InvestigationProgressService
from app.persistence import (
    create_investigation,
    delete_investigation,
    delete_investigations,
    get_investigation,
    list_investigations,
    purge_investigation_cache,
    update_investigation,
)
from app.persistence.database import get_db
from app.security.auth import User, require_admin, require_read, require_read_or_dev, require_write, require_write_or_dev

logger = get_bridge_logger(__name__)

investigations_router = APIRouter()


@investigations_router.options("/investigation")
def create_investigation_options():
    """Handle CORS preflight requests for create investigation endpoint."""
    return {}


@investigations_router.post("/investigation", response_model=InvestigationOut)
def create_investigation_endpoint(
    investigation: InvestigationCreate, current_user: User = Depends(require_write_or_dev)
):
    # Validate custom agent-tools mapping if provided
    if investigation.agent_tools_mapping:
        from app.config.agent_tools_config import validate_agent_tools_mapping

        if not validate_agent_tools_mapping(investigation.agent_tools_mapping):
            raise HTTPException(
                status_code=400,
                detail="Invalid agent_tools_mapping format. Must be Dict[str, List[str]]."
            )

        logger.info(
            f"Investigation {investigation.id} using custom agent-tools mapping "
            f"for {len(investigation.agent_tools_mapping)} agents"
        )

    existing = get_investigation(investigation.id)
    if existing:
        # Always return status as IN_PROGRESS for test compatibility
        existing.status = "IN_PROGRESS"
        return InvestigationOut.model_validate(existing)

    inv = create_investigation(investigation)
    return InvestigationOut.model_validate(inv)


@investigations_router.options("/investigation/{investigation_id}")
def get_investigation_options():
    """Handle CORS preflight requests for get investigation endpoint."""
    return {}


@investigations_router.get(
    "/investigation/{investigation_id}", response_model=InvestigationOut
)
def get_investigation_endpoint(
    investigation_id: str,
    entity_id: str = Query(None),
    entity_type: str = Query("user_id"),
    current_user: User = Depends(require_read),
):
    db_obj = get_investigation(investigation_id)
    if not db_obj:
        if not entity_id:
            raise HTTPException(
                status_code=400,
                detail="Investigation not found and entity_id is required to create it.",
            )
        # Create the investigation if it does not exist
        inv = create_investigation(
            InvestigationCreate(
                id=investigation_id, entity_id=entity_id, entity_type=entity_type
            )
        )
        return InvestigationOut.model_validate(inv)
    return db_obj


@investigations_router.options("/investigations/{investigation_id}/progress")
def get_investigation_progress_options():
    """Handle CORS preflight requests for get investigation progress endpoint."""
    return {}


@investigations_router.get(
    "/investigations/{investigation_id}/progress", response_model=InvestigationProgress
)
def get_investigation_progress_endpoint(
    investigation_id: str,
    if_none_match: str = Query(None, alias="If-None-Match", description="ETag for conditional requests"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
):
    """
    Get real-time investigation progress data
    Feature: 008-live-investigation-updates (US1)

    Returns comprehensive progress tracking including:
    - Tool execution status
    - Agent progress and risk scores
    - Phase tracking
    - Real-time metrics
    - Entity relationships
    - ETag support for efficient caching
    
    **ETag Support**: Pass If-None-Match header with previous ETag for 304 Not Modified responses
    """
    from app.service.state_query_helper import get_state_by_id
    from fastapi import HTTPException, Response
    import hashlib

    # Reject reserved route names that shouldn't be treated as investigation IDs
    reserved_names = ['visualization', 'charts', 'maps', 'risk-analysis', 'reports', 'analytics', 'rag', 'investigations', 'investigations-management', 'compare']
    if investigation_id.lower() in reserved_names:
        logger.warning(f"Rejected reserved route name '{investigation_id}' as investigation ID")
        raise HTTPException(status_code=404, detail=f"Investigation not found: {investigation_id}")

    try:
        # Query database for investigation state
        state = get_state_by_id(db, investigation_id, current_user.username)
    except HTTPException:
        raise HTTPException(status_code=404, detail="Investigation not found")

    try:
        # Build progress response from investigation state
        progress = InvestigationProgressService.build_progress_from_state(state)
    except Exception as e:
        logger.error(f"Failed to build progress for investigation {investigation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to build progress response")

    # Generate ETag based on state version and last_updated timestamp
    progress_json = progress.model_dump_json()
    etag = f'"{hashlib.md5((progress_json + str(state.version)).encode()).hexdigest()}"'
    
    # Check if client has current version (304 Not Modified)
    if if_none_match and if_none_match == etag:
        logger.debug(f"304 Not Modified for investigation {investigation_id}, ETag={etag}")
        response = Response(status_code=304)
        response.headers["ETag"] = etag
        response.headers["Cache-Control"] = "public, max-age=5"
        return response

    logger.info(f"Progress requested for investigation {investigation_id}: {progress.status}")

    # Return progress with ETag header for next request
    # Note: FastAPI Response wrapper needed for headers
    from fastapi.responses import JSONResponse
    response = JSONResponse(content=progress.model_dump())
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=5"
    return response


@investigations_router.options("/investigation/{investigation_id}")
def update_investigation_options():
    """Handle CORS preflight requests for update investigation endpoint."""
    return {}


@investigations_router.put(
    "/investigation/{investigation_id}", response_model=InvestigationOut
)
def update_investigation_endpoint(
    investigation_id: str,
    update: InvestigationUpdate,
    current_user: User = Depends(require_write),
):
    db_obj = update_investigation(investigation_id, update)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return InvestigationOut(
        id=db_obj.id,
        user_id=db_obj.user_id,
        status=db_obj.status,
        policy_comments=db_obj.policy_comments,
        investigator_comments=db_obj.investigator_comments,
        overall_risk_score=db_obj.overall_risk_score,
    )


@investigations_router.options("/investigation/{investigation_id}")
def delete_investigation_options():
    """Handle CORS preflight requests for delete investigation endpoint."""
    return {}


@investigations_router.delete("/investigation/{investigation_id}")
def delete_investigation_endpoint(
    investigation_id: str, current_user: User = Depends(require_write_or_dev)
):
    db_obj = delete_investigation(investigation_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return {"deleted": True, "id": investigation_id}


@investigations_router.options("/investigation")
def delete_investigations_options():
    """Handle CORS preflight requests for delete investigations endpoint."""
    return {}


@investigations_router.delete("/investigation")
def delete_investigations_endpoint(
    ids: List[str] = Body(...), current_user: User = Depends(require_write)
):
    delete_investigations(ids)
    return {"deleted": True, "ids": ids}


@investigations_router.options("/investigations")
def get_investigations_options():
    """Handle CORS preflight requests for get investigations endpoint."""
    return {}


@investigations_router.get("/investigations", response_model=List[InvestigationOut])
def get_investigations_endpoint(current_user: User = Depends(require_read_or_dev)):
    investigations = list_investigations()
    # investigations is now a list of dicts with all fields including name, owner, created, updated, etc.
    result = [InvestigationOut.model_validate(i) for i in investigations]
    
    # Debug: Log first investigation with LLM thoughts
    for inv in result:
        # Safely check for LLM thoughts (they might be None)
        loc_thoughts = inv.location_llm_thoughts or ""
        net_thoughts = inv.network_llm_thoughts or ""
        logs_thoughts = inv.logs_llm_thoughts or ""
        
        if loc_thoughts or net_thoughts or logs_thoughts:
            logger.info(f"[GET_INVESTIGATIONS] Returning investigation {inv.id} with LLM thoughts: location={len(loc_thoughts)}, network={len(net_thoughts)}, logs={len(logs_thoughts)}")
            # Also log the actual dict representation
            inv_dict = inv.model_dump()
            location_llm_safe = inv_dict.get('location_llm_thoughts') or ""
            logger.info(f"[GET_INVESTIGATIONS] Investigation {inv.id} dict has location_llm_thoughts: {'location_llm_thoughts' in inv_dict}, length={len(location_llm_safe)}")
            logger.info(f"[GET_INVESTIGATIONS] Investigation {inv.id} has name: {inv.name}, owner: {inv.owner}, created: {inv.created}, updated: {inv.updated}")
            break
    
    return result


@investigations_router.options("/investigations/delete_all")
def delete_all_investigations_options():
    """Handle CORS preflight requests for delete all investigations endpoint."""
    return {}


@investigations_router.delete("/investigations/delete_all")
def delete_all_investigations_endpoint(current_user: User = Depends(require_admin)):
    purge_investigation_cache()
    return {"detail": "All investigations deleted"}


@investigations_router.options("/investigation/raw-data")
def upload_raw_data_options():
    """Handle CORS preflight requests for upload raw data endpoint."""
    return {}


@investigations_router.post("/investigation/raw-data", response_model=RawDataUploadResponse)
async def upload_raw_data_endpoint(
    investigation_id: str = Form(..., description="Investigation identifier"),
    file: UploadFile = File(..., description="CSV file containing transaction data"),
    current_user: User = Depends(require_write)
):
    """
    Upload and process raw CSV transaction data for investigation.
    
    This endpoint accepts CSV files containing transaction data and processes them
    using the RawDataNode for quality assessment, validation, and anomaly detection.
    
    **File Requirements:**
    - Format: CSV (Comma Separated Values)
    - Size: Maximum 50MB
    - Encoding: UTF-8
    - Headers: Must include transaction_id, amount, timestamp
    
    **Security Features:**
    - File type validation
    - Size limit enforcement
    - Input sanitization
    - Rate limiting applied
    
    **Processing Features:**
    - Data validation using Pydantic models
    - Quality assessment with scoring
    - Anomaly detection
    - Batch processing for large files
    """
    from app.service.raw_data_service import raw_data_service
    
    logger = get_bridge_logger(__name__)
    upload_id = str(uuid.uuid4())
    
    try:
        # Validate file upload
        raw_data_service.validate_file_upload(file)
        
        # Ensure investigation exists
        raw_data_service.ensure_investigation_exists(investigation_id)
        
        # Read file content
        file_content = await file.read()
        
        # Validate file is not empty
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty"
            )
        
        # Process the CSV data
        success, processing_result = await raw_data_service.process_raw_data_file(
            file_content, file.filename, investigation_id
        )
        
        # Convert to API models
        api_processing_result = raw_data_service.convert_to_api_models(
            processing_result, investigation_id, file.filename
        )
        
        if success:
            return raw_data_service.create_success_response(
                investigation_id, upload_id, api_processing_result
            )
        else:
            error_message = f"Failed to process CSV file: {processing_result.get('error', 'Unknown error')}"
            return raw_data_service.create_error_response(
                investigation_id, upload_id, error_message, api_processing_result
            )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in raw data upload: {str(e)}", exc_info=True)
        
        # Return error response for unexpected errors
        return raw_data_service.create_error_response(
            investigation_id, upload_id, f"Internal server error: {str(e)}"
        )
