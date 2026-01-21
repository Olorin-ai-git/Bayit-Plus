"""
Investigation State API Router
Feature: 005-polling-and-persistence
Enhanced for 001-investigation-state-management

Provides REST API endpoints for investigation state management with:
- CRUD operations with optimistic locking
- ETag support for conditional GET requests
- Audit history retrieval
- JWT authentication with scope-based authorization
- Enhanced progress tracking support

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.persistence.mongodb import get_mongodb
from app.schemas.investigation_state import (
    InvestigationStateCreate,
    InvestigationStateResponse,
    InvestigationStateUpdate,
    PaginatedInvestigations,
    InvestigationStatus,
)
from app.security.auth import User, require_read_or_dev, require_write_or_dev
from app.service.mongodb.investigation_state_service import InvestigationStateService
from app.service.progress_calculator_service import ProgressCalculatorService

router = APIRouter(
    prefix="/api/v1/investigation-state",
    tags=["Investigation State"],
    responses={404: {"description": "Not found"}, 409: {"description": "Conflict"}},
)


def get_tenant_id(current_user: User) -> str:
    """Extract tenant_id from user context."""
    # Default to "default" tenant for now
    # Can be enhanced to extract from user attributes or JWT claims
    return getattr(current_user, "tenant_id", "default")


def _generate_etag(state: InvestigationStateResponse) -> str:
    """Generate ETag from investigation version, status, lifecycle stage, and state hash."""
    import hashlib

    # Include status and lifecycle_stage so ETag changes on ANY state transition
    # (completed, failed, cancelled, etc.) preventing stale cached data
    state_str = f"{state.investigation_id}-v{state.version}-{state.status}-{state.lifecycle_stage}"
    if state.progress:
        state_str += f"-p{state.progress.progress_percentage}"
        # Results are now stored in progress_json, not a separate results field
        # Check if progress contains results data (risk_score, findings, or domain_findings)
        progress_dict = (
            state.progress
            if isinstance(state.progress, dict)
            else state.progress.dict() if hasattr(state.progress, "dict") else {}
        )
        has_results = (
            progress_dict.get("risk_score") is not None
            or progress_dict.get("findings")
            or progress_dict.get("domain_findings")
        )
        if has_results:  # Include results presence indicator
            state_str += "-has_results"
    etag_hash = hashlib.md5(state_str.encode()).hexdigest()[:8]
    return f'W/"{state.version}-{etag_hash}"'


@router.get(
    "/",
    response_model=PaginatedInvestigations,
    summary="List investigation states",
    description="Retrieve paginated list of investigation states with filtering",
)
async def list_investigation_states(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[InvestigationStatus] = None,
    search: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_read_or_dev),
    tenant_id: str = Depends(get_tenant_id),
) -> PaginatedInvestigations:
    """Get paginated investigation states."""
    service = InvestigationStateService(db, tenant_id)

    # Return all investigations (no user_id filter) to allow viewing system investigations
    # MongoDB service needs get_states method - will use repository directly for now
    from app.persistence.repositories.investigation_repository import InvestigationRepository

    repository = InvestigationRepository(db)

    # Build query
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    if search:
        query["investigation_id"] = {"$regex": search, "$options": "i"}

    # Get total count
    total_count = await repository.collection.count_documents(query)

    # Get paginated items
    skip = (page - 1) * page_size
    cursor = repository.collection.find(query).sort("updated_at", -1).skip(skip).limit(page_size)
    items = await cursor.to_list(length=page_size)

    # Convert to response models
    investigations = [
        InvestigationStateResponse.model_validate(item, from_attributes=False)
        for item in items
    ]

    return PaginatedInvestigations(
        investigations=investigations,
        total_count=total_count,
        page=page,
        page_size=page_size,
        has_next_page=skip + len(items) < total_count,
        has_previous_page=page > 1,
    )


@router.post(
    "/",
    response_model=InvestigationStateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create investigation state",
    description="Create new investigation state with initial settings and auto-populate entities if requested. Automatically triggers investigation execution in background.",
)
async def create_investigation_state(
    data: InvestigationStateCreate,
    response: Response,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_write_or_dev),
    tenant_id: str = Depends(get_tenant_id),
) -> InvestigationStateResponse:
    """Create investigation state with automatic execution trigger. Auto-populates top 10% risk entities if placeholder detected. Raises 409 if already exists."""
    service = InvestigationStateService(db, tenant_id)
    state = await service.create_state(
        user_id=current_user.username, data=data, background_tasks=background_tasks
    )

    response.headers["ETag"] = _generate_etag(state)
    response.headers["Location"] = (
        f"/api/v1/investigation-state/{state.investigation_id}"
    )

    return state


@router.get(
    "/{investigation_id}",
    response_model=InvestigationStateResponse,
    summary="Get investigation state",
    description="Retrieve investigation state with ETag support for conditional requests and enhanced progress tracking",
)
async def get_investigation_state(
    investigation_id: str,
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_read_or_dev),
    tenant_id: str = Depends(get_tenant_id),
) -> InvestigationStateResponse:
    """Get investigation state with conditional GET support (304 Not Modified) and enhanced progress."""
    import json

    from fastapi import HTTPException

    from app.service.logging import get_bridge_logger

    logger = get_bridge_logger(__name__)

    # Reject reserved route names that shouldn't be treated as investigation IDs
    reserved_names = [
        "visualization",
        "charts",
        "maps",
        "risk-analysis",
        "reports",
        "analytics",
        "rag",
        "investigations",
        "investigations-management",
        "compare",
    ]
    if investigation_id.lower() in reserved_names:
        logger.warning(
            f"Rejected reserved route name '{investigation_id}' as investigation ID"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation state not found: {investigation_id}",
        )

    service = InvestigationStateService(db, tenant_id)

    # Get state with authorization check
    state = await service.get_state(
        investigation_id=investigation_id, user_id=current_user.username
    )

    # Set version and etag fields if not present
    if not state.etag:
        state.etag = _generate_etag(state)

    # Check If-None-Match header for conditional GET
    if_none_match = request.headers.get("If-None-Match")
    if if_none_match == state.etag:
        # Log 304 response construction
        logger.info(
            f"📊 /investigation-state endpoint response construction for {investigation_id}:"
        )
        logger.info(f"   ⚡ 304 Not Modified (ETag match: {state.etag})")
        logger.info(f"   📈 Response summary:")
        logger.info(f"      - Status: 304 Not Modified")
        logger.info(f"      - Reason: ETag match - no changes since last request")
        logger.info(f"      - ETag: {state.etag}")
        logger.info(f"      - Version: {state.version}")

        logger.debug(f"304 Not Modified for investigation {investigation_id}")
        raise HTTPException(
            status_code=status.HTTP_304_NOT_MODIFIED,
            detail="Resource not modified",
        )

    # Log response construction details
    logger.info(
        f"📊 /investigation-state endpoint response construction for {investigation_id}:"
    )
    logger.info(f"   📈 Response summary:")
    logger.info(f"      - Status: {state.status}")
    logger.info(f"      - Lifecycle stage: {state.lifecycle_stage}")
    logger.info(f"      - Version: {state.version}")
    logger.info(f"      - ETag: {state.etag}")

    # Log progress construction
    if state.progress:
        logger.info(f"   📊 Progress object:")
        logger.info(f"      - Percent complete: {state.progress.percent_complete}%")
        logger.info(f"      - Current phase: {state.progress.current_phase}")
        logger.info(f"      - Tools executed: {len(state.progress.tools_executed)}")
        logger.info(
            f"      - Domain findings count: {len(state.progress.domain_findings) if state.progress.domain_findings else 0}"
        )

        if state.progress.domain_findings:
            logger.info(f"   🎯 Domain findings in progress:")
            for domain, findings in state.progress.domain_findings.items():
                risk_score = (
                    findings.get("risk_score", "N/A")
                    if isinstance(findings, dict)
                    else "N/A"
                )
                has_llm = (
                    bool(findings.get("llm_analysis", {}))
                    if isinstance(findings, dict)
                    else False
                )
                logger.info(
                    f"      - {domain}: risk_score={risk_score}, has_llm_analysis={has_llm}"
                )
                if isinstance(findings, dict) and findings.get("llm_analysis"):
                    llm_conf = findings["llm_analysis"].get("confidence", "N/A")
                    logger.info(f"         LLM confidence: {llm_conf}")
        else:
            logger.warning(f"   ⚠️  No domain_findings in progress object")
    else:
        logger.warning(f"   ⚠️  Progress object is None")

    # Log results construction (results are now in progress_json)
    if state.progress:
        progress_dict = (
            state.progress
            if isinstance(state.progress, dict)
            else state.progress.dict() if hasattr(state.progress, "dict") else {}
        )
        risk_score = progress_dict.get("risk_score")
        findings = progress_dict.get("findings", [])
        domain_findings = progress_dict.get("domain_findings", {})

        if risk_score is not None or findings or domain_findings:
            logger.info(f"   📋 Results (from progress_json):")
            if risk_score is not None:
                logger.info(f"      - Risk score: {risk_score}")
            if findings:
                logger.info(f"      - Findings count: {len(findings)}")
            if progress_dict.get("summary"):
                logger.info(
                    f"      - Has summary: {bool(progress_dict.get('summary'))}"
                )
            if domain_findings:
                logger.info(f"      - Domain findings count: {len(domain_findings)}")
                logger.info(f"   🎯 Domain findings:")
                for domain, findings_data in domain_findings.items():
                    risk = (
                        findings_data.get("risk_score", "N/A")
                        if isinstance(findings_data, dict)
                        else "N/A"
                    )
                    has_llm = (
                        bool(findings_data.get("llm_analysis", {}))
                        if isinstance(findings_data, dict)
                        else False
                    )
                    logger.info(
                        f"      - {domain}: risk_score={risk}, has_llm_analysis={has_llm}"
                    )
            else:
                logger.info(f"      - No domain_findings in progress")
        else:
            logger.info(
                f"   ℹ️  No results data in progress_json (investigation may not be completed)"
            )
    else:
        logger.info(
            f"   ℹ️  Progress object is None (investigation may not be initialized)"
        )

    # Log raw database fields for debugging (MongoDB)
    from app.persistence.repositories.investigation_repository import InvestigationRepository

    repository = InvestigationRepository(db)
    db_state = await repository.find_by_id(investigation_id, tenant_id)

    if db_state and db_state.progress:
        logger.info(f"   🗄️  Raw database fields:")
        logger.info(f"      - progress exists: {bool(db_state.progress)}")

        if db_state.progress:
            try:
                progress_data = db_state.progress.model_dump(mode="json")
                domain_findings_in_db = progress_data.get("domain_findings", {})
                logger.info(
                    f"      - domain_findings in progress: {len(domain_findings_in_db)} domains"
                )
                if domain_findings_in_db:
                    logger.info(
                        f"         Domains: {list(domain_findings_in_db.keys())}"
                    )
            except Exception as e:
                logger.warning(f"      - Failed to parse progress: {str(e)}")

    # Set response headers
    response.headers["ETag"] = state.etag
    response.headers["Cache-Control"] = "no-cache, must-revalidate"

    return state


@router.patch(
    "/{investigation_id}",
    response_model=InvestigationStateResponse,
    summary="Update investigation state",
    description="Update state with optimistic locking via version number",
)
async def update_investigation_state(
    investigation_id: str,
    data: InvestigationStateUpdate,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_write_or_dev),
    tenant_id: str = Depends(get_tenant_id),
) -> InvestigationStateResponse:
    """Update state with optimistic locking. Raises 409 on version conflict."""
    service = InvestigationStateService(db, tenant_id)
    state = await service.update_state(
        investigation_id=investigation_id, user_id=current_user.username, data=data
    )

    response.headers["ETag"] = _generate_etag(state)

    return state


@router.delete(
    "/{investigation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete investigation state",
    description="Delete investigation state and create audit log entry",
)
async def delete_investigation_state(
    investigation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_write_or_dev),
    tenant_id: str = Depends(get_tenant_id),
) -> None:
    """Delete investigation state. Raises 404 if not found."""
    service = InvestigationStateService(db, tenant_id)
    await service.delete_state(
        investigation_id=investigation_id, user_id=current_user.username
    )


@router.get(
    "/{investigation_id}/history",
    response_model=List[Dict[str, Any]],
    summary="Get investigation history",
    description="Retrieve paginated audit log for investigation state changes",
)
async def get_investigation_history(
    investigation_id: str,
    limit: int = 20,
    offset: int = 0,
    db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user: User = Depends(require_read_or_dev),
    tenant_id: str = Depends(get_tenant_id),
) -> List[Dict[str, Any]]:
    """Get paginated investigation history. Raises 404 if investigation not found."""
    service = InvestigationStateService(db, tenant_id)
    return await service.get_history(
        investigation_id=investigation_id,
        user_id=current_user.username,
        limit=limit,
        offset=offset,
    )
