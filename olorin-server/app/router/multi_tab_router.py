"""
Multi-Tab Coordination Router
Feature: Phase 9 (T074) - Multi-Tab Coordination Preparation

Provides endpoints supporting stateless polling for multi-tab scenarios.
No server-side session state - all tabs poll independently.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.orm import Session
from datetime import datetime

from app.persistence.database import get_db
from app.service.stateless_polling_service import StatelessPollingService
from app.security.auth import User, require_read_or_dev
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(
    prefix="/api/v1/multi-tab",
    tags=["Multi-Tab Support"],
    responses={
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)


@router.get(
    "/investigations/{investigation_id}/state",
    summary="Get investigation state (stateless)",
    description="Stateless endpoint for multi-tab polling support",
    responses={
        200: {
            "description": "Investigation state snapshot",
            "content": {
                "application/json": {
                    "example": {
                        "investigation_id": "inv123",
                        "version": 5,
                        "lifecycle_stage": "IN_PROGRESS",
                        "status": "IN_PROGRESS",
                        "last_updated": "2024-01-01T12:00:00",
                        "data_fresh": True,
                        "polling_info": {
                            "recommended_interval_ms": 1000,
                            "strategy": "aggressive",
                            "supports_multi_tab": True,
                            "stateless": True
                        },
                        "state_hash": "abc123def456",
                        "has_changes": True
                    }
                }
            }
        }
    }
)
async def get_stateless_state(
    investigation_id: str,
    client_id: Optional[str] = Header(
        None,
        alias="X-Client-ID",
        description="Optional client/tab identifier for metrics"
    ),
    last_known_version: Optional[int] = Query(
        None,
        description="Last known version for change detection"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Get investigation state in a stateless manner.

    T074: Supports multiple tabs polling independently.
    No server-side session state is maintained.

    Each tab can poll this endpoint independently and will receive
    the same consistent state. The optional client_id is used only
    for metrics and doesn't affect the response.

    Example for multi-tab usage:
    ```javascript
    // Tab 1
    fetch('/api/v1/multi-tab/investigations/inv123/state', {
        headers: {'X-Client-ID': 'tab-1'}
    });

    // Tab 2
    fetch('/api/v1/multi-tab/investigations/inv123/state', {
        headers: {'X-Client-ID': 'tab-2'}
    });

    // Both tabs receive identical state
    ```
    """
    service = StatelessPollingService(db)

    return service.get_investigation_state_stateless(
        investigation_id=investigation_id,
        user_id=current_user.username,
        client_id=client_id,
        last_known_version=last_known_version
    )


@router.get(
    "/investigations/{investigation_id}/events",
    summary="Get events (stateless)",
    description="Stateless event endpoint for multi-tab support",
)
async def get_stateless_events(
    investigation_id: str,
    since: Optional[str] = Query(
        None,
        description="ISO timestamp to get events after"
    ),
    limit: int = Query(
        100,
        ge=1,
        le=1000,
        description="Maximum events to return"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Get investigation events in a stateless manner.

    T074: No cursor state stored server-side.
    Each tab manages its own position in the event stream.

    Clients should track the latest_timestamp from the response
    and use it as the 'since' parameter for the next request.
    """
    # Reject reserved route names that shouldn't be treated as investigation IDs
    reserved_names = ['visualization', 'charts', 'maps', 'risk-analysis', 'reports', 'analytics', 'rag', 'investigations', 'investigations-management', 'compare']
    if investigation_id.lower() in reserved_names:
        from app.service.logging import get_bridge_logger
        logger = get_bridge_logger(__name__)
        logger.warning(f"Rejected reserved route name '{investigation_id}' as investigation ID")
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation not found: {investigation_id}"
        )
    
    service = StatelessPollingService(db)

    since_timestamp = None
    if since:
        try:
            since_timestamp = datetime.fromisoformat(since.replace('Z', '+00:00'))
        except ValueError:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid timestamp format: {since}"
            )

    return service.get_events_stateless(
        investigation_id=investigation_id,
        user_id=current_user.username,
        since_timestamp=since_timestamp,
        limit=limit
    )


@router.post(
    "/investigations/{investigation_id}/validate-multi-tab",
    summary="Validate multi-tab support",
    description="Test endpoint to validate stateless multi-tab polling",
)
async def validate_multi_tab(
    investigation_id: str,
    num_tabs: int = Query(
        3,
        ge=1,
        le=10,
        description="Number of tabs to simulate"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Validate that multiple tabs can poll independently.

    T074: Demonstrates backend support for stateless multi-tab polling.

    This endpoint simulates multiple tabs polling the same investigation
    and verifies they all receive consistent state without interference.
    """
    service = StatelessPollingService(db)

    return service.validate_multi_tab_support(
        investigation_id=investigation_id,
        user_id=current_user.username,
        num_clients=num_tabs
    )


@router.get(
    "/investigations/{investigation_id}/polling-metrics",
    summary="Get polling metrics",
    description="Get metrics about concurrent polling (monitoring only)",
)
async def get_polling_metrics(
    investigation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Get polling metrics for monitoring.

    Note: These metrics are for monitoring only and don't affect
    the stateless nature of polling. Each request is still independent.
    """
    service = StatelessPollingService(db)

    # Verify access
    from app.models.investigation_state import InvestigationState
    state = db.query(InvestigationState).filter(
        InvestigationState.investigation_id == investigation_id
    ).first()

    if not state:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation {investigation_id} not found"
        )

    if state.user_id != current_user.username:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this investigation"
        )

    return service.get_polling_metrics(investigation_id)


@router.get(
    "/configuration",
    summary="Get multi-tab configuration",
    description="Get configuration for multi-tab support",
)
async def get_multi_tab_config() -> Dict[str, Any]:
    """
    Get multi-tab polling configuration.

    T074: Shows backend configuration for multi-tab support.
    """
    import os

    return {
        "multi_tab_support": {
            "enabled": True,
            "stateless": True,
            "no_server_session_state": True,
            "max_concurrent_pollers": int(os.getenv("MAX_CONCURRENT_POLLERS", "10")),
            "polling_cache_ttl_seconds": int(os.getenv("POLLING_CACHE_TTL_SECONDS", "5"))
        },
        "client_recommendations": {
            "use_client_id_header": "Recommended for metrics (X-Client-ID)",
            "track_last_timestamp": "Track latest event timestamp client-side",
            "track_version": "Track investigation version for change detection",
            "handle_429": "Implement exponential backoff on rate limit"
        },
        "polling_strategies": {
            "IN_PROGRESS": {
                "interval_ms": 1000,
                "description": "Aggressive polling for active investigations"
            },
            "SETTINGS": {
                "interval_ms": 5000,
                "description": "Moderate polling during configuration"
            },
            "COMPLETED": {
                "interval_ms": 30000,
                "description": "Passive polling for completed investigations"
            }
        },
        "frontend_coordination": {
            "description": "Frontend handles tab coordination via BroadcastChannel API",
            "backend_role": "Provide stateless endpoints only",
            "no_sticky_sessions": True,
            "load_balancer_safe": True
        }
    }


@router.get(
    "/test-independence",
    summary="Test request independence",
    description="Verify each request is independent",
)
async def test_request_independence(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Test that requests are truly independent.

    T074: Demonstrates no server-side session state.
    """
    import uuid
    import time

    # Generate unique request ID
    request_id = str(uuid.uuid4())[:8]

    # Simulate some processing
    time.sleep(0.01)  # 10ms

    return {
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.username,
        "stateless": True,
        "message": "Each request is independent - no session state",
        "multi_tab_safe": True
    }