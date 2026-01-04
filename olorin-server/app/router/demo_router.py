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
