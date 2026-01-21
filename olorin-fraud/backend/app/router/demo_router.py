"""
Demo Router for Marketing Portal and Internal Demo Mode

Provides endpoints for:
1. Marketing portal interactive demos (rate-limited, sandboxed)
2. Internal demo mode for testing
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from starlette.requests import Request

from app.models.api_models import LocationInfo
from app.models.location_risk import LocationRiskAssessment
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)
router = APIRouter(prefix="/demo")

# --- DEMO CACHE ---
demo_cache: Dict[str, Dict[str, Any]] = {}
demo_mode_users: set[str] = set()


def run_async_in_background(async_func, *args, **kwargs):
    asyncio.create_task(async_func(*args, **kwargs))


default_time_range = "2m"


@router.post("/{user_id}/off")
async def disable_demo_mode(user_id: str):
    demo_mode_users.discard(user_id)
    return {"message": f"Demo mode disabled for user {user_id}"}


@router.get("/{user_id}/all")
async def get_all_demo_agent_responses(user_id: str) -> Dict[str, Any]:
    if user_id not in demo_mode_users or user_id not in demo_cache:
        return {
            "error": f"User {user_id} is not in demo mode or demo data is not cached. Please call /demo/{user_id} first."
        }
    return {
        "user_id": user_id,
        "demo_mode": True,
        "network": demo_cache[user_id].get("network"),
        "device": demo_cache[user_id].get("device"),
        "location": demo_cache[user_id].get("location"),
        "logs": demo_cache[user_id].get("logs"),
        "oii": demo_cache[user_id].get("oii"),
    }


# ============================================================================
# MARKETING PORTAL DEMO ENDPOINTS
# Rate-limited, sandboxed endpoints for interactive marketing demos
# ============================================================================


class StartDemoRequest(BaseModel):
    """Request model for starting a marketing demo investigation."""

    scenario_id: str = Field(..., description="Demo scenario ID to run")


class DemoScenarioResponse(BaseModel):
    """Response model for demo scenario details."""

    id: str
    type: str
    title: str
    description: str
    risk_level: str
    entity_type: str
    showcase_agents: List[str]
    display_data: Dict[str, Any]


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("/marketing/scenarios", response_model=List[DemoScenarioResponse])
async def get_marketing_demo_scenarios() -> List[Dict[str, Any]]:
    """
    Get all available demo scenarios for marketing portal.

    Returns list of demo scenarios with descriptions and metadata
    for the interactive demo selection UI.
    """
    from app.service.demo import get_demo_scenarios

    return get_demo_scenarios()


@router.post("/marketing/start")
async def start_marketing_demo_investigation(
    body: StartDemoRequest,
    request: Request,
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    """
    Start a new marketing demo investigation.

    Rate-limited to prevent abuse. Returns investigation ID and initial status.
    The investigation runs in the background with real-time progress updates.
    """
    from app.service.demo import get_demo_service

    client_ip = _get_client_ip(request)
    service = get_demo_service()

    result = service.start_demo_investigation(body.scenario_id, client_ip)

    if result["status"] == "rate_limited":
        raise HTTPException(
            status_code=429,
            detail=result["error"],
            headers={"Retry-After": str(result["rate_limit"]["retry_after_seconds"])},
        )

    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["error"])

    if result["status"] == "busy":
        raise HTTPException(status_code=503, detail=result["error"])

    # Schedule background investigation execution
    investigation_id = result["investigation_id"]
    scenario_id = body.scenario_id

    async def _run_demo_investigation():
        await _execute_demo_investigation(investigation_id, scenario_id)

    background_tasks.add_task(_run_demo_investigation)

    return result


@router.get("/marketing/investigation/{investigation_id}/status")
async def get_marketing_demo_status(investigation_id: str) -> Dict[str, Any]:
    """
    Get real-time status of a marketing demo investigation.

    Returns current progress, active agent, and partial results.
    """
    from app.service.demo import get_demo_service

    service = get_demo_service()
    status = service.get_investigation_status(investigation_id)

    if not status:
        raise HTTPException(
            status_code=404, detail=f"Demo investigation {investigation_id} not found"
        )

    return status


@router.get("/marketing/rate-limit")
async def get_demo_rate_limit_status(request: Request) -> Dict[str, Any]:
    """
    Get current rate limit status for the requesting client.

    Returns remaining requests and reset time without consuming a request.
    """
    from app.service.demo import get_demo_service

    client_ip = _get_client_ip(request)
    service = get_demo_service()

    return service.rate_limiter.get_status(client_ip)


async def _execute_demo_investigation(investigation_id: str, scenario_id: str) -> None:
    """
    Execute demo investigation with progress updates.

    Simulates agent execution with realistic timing and progress updates
    to showcase the investigation workflow to marketing visitors.
    """
    from app.service.demo import get_demo_scenario, get_demo_service

    service = get_demo_service()
    scenario = get_demo_scenario(scenario_id)

    if not scenario:
        service.update_investigation_progress(
            investigation_id, "error", 0.0, error=f"Scenario {scenario_id} not found"
        )
        return

    try:
        # Update to running
        service.update_investigation_progress(
            investigation_id, "running", 0.05, current_agent="Initializing"
        )
        await asyncio.sleep(1)

        # Simulate agent execution with progress updates
        agents = scenario.showcase_agents
        total_agents = len(agents)

        for idx, agent_name in enumerate(agents):
            progress = 0.1 + (0.8 * (idx / total_agents))
            service.update_investigation_progress(
                investigation_id, "running", progress, current_agent=agent_name
            )

            # Simulate agent processing time
            await asyncio.sleep(2)

            # Add agent result
            agent_key = agent_name.lower().replace(" ", "_")
            expected = scenario.expected_findings.get(agent_key, {})
            service.update_investigation_progress(
                investigation_id,
                "running",
                progress + 0.1,
                current_agent=agent_name,
                agent_results={
                    agent_key: {
                        "status": "completed",
                        "risk_level": expected.get("risk_level", "MEDIUM"),
                        "confidence": expected.get("confidence", 0.8),
                        "findings_count": 3,
                    }
                },
            )

        # Complete the investigation
        service.update_investigation_progress(
            investigation_id, "completed", 1.0, current_agent=None
        )

        logger.info(f"Demo investigation {investigation_id} completed successfully")

    except Exception as e:
        logger.error(f"Demo investigation {investigation_id} failed: {e}")
        service.update_investigation_progress(
            investigation_id, "error", 0.0, error=str(e)
        )
