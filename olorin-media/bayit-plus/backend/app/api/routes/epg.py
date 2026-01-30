from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_active_user, get_optional_user
from app.models.user import User
from app.services.catchup_service import catchup_service
from app.services.epg_service import EPGService
from app.services.llm_search_service import llm_search_service

router = APIRouter()


# Pydantic models
class LLMSearchRequest(BaseModel):
    query: str
    timezone: str = "UTC"
    include_user_context: bool = True


def get_current_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Dependency to ensure user has premium access"""
    if not current_user.can_access_premium_features():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for LLM search feature",
        )
    return current_user


@router.get("")
async def get_epg_data(
    channel_ids: Optional[List[str]] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    timezone: str = Query("UTC"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get EPG data for specified channels and time range

    Query Parameters:
    - channel_ids: Optional list of channel IDs (comma-separated)
    - start_time: ISO 8601 datetime string (default: now - 2 hours)
    - end_time: ISO 8601 datetime string (default: now + 4 hours)
    - timezone: Timezone name (default: UTC)

    Returns:
    - programs: List of EPG programs
    - channels: List of live channels
    - current_time: Current server time (UTC)
    - time_window: Requested time window
    """
    epg_service = EPGService()

    # Parse datetime strings
    start_dt = None
    end_dt = None

    try:
        if start_time:
            start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        if end_time:
            end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid datetime format. Use ISO 8601 format. Error: {str(e)}",
        )

    # Fetch EPG data
    try:
        data = await epg_service.get_epg_data(
            channel_ids=channel_ids,
            start_time=start_dt,
            end_time=end_dt,
            timezone=timezone,
        )
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch EPG data: {str(e)}"
        )


@router.post("/search")
async def search_epg(
    query: str = Query(..., min_length=1),
    channel_ids: Optional[List[str]] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    """
    Traditional text search in EPG data

    Query Parameters:
    - query: Search query string (required)
    - channel_ids: Filter by channel IDs
    - start_time: Filter by start time (ISO 8601)
    - end_time: Filter by end time (ISO 8601)
    - category: Filter by category

    Returns:
    - results: List of matching programs
    - total: Total number of results
    """
    epg_service = EPGService()

    # Parse datetime strings
    start_dt = None
    end_dt = None

    try:
        if start_time:
            start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        if end_time:
            end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid datetime format: {str(e)}"
        )

    # Execute search
    try:
        results = await epg_service.search_epg(
            query=query,
            channel_ids=channel_ids,
            start_time=start_dt,
            end_time=end_dt,
            category=category,
        )

        return {"results": results, "total": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/llm-search")
async def llm_search_epg(
    request: LLMSearchRequest, current_user: User = Depends(get_current_premium_user)
):
    """
    LLM-powered natural language search in EPG data (Premium Feature)

    Uses Claude AI to interpret natural language queries and intelligently
    search through EPG programming data.

    Request Body:
    - query: Natural language search query (e.g., "Show me all shows with actress Tali Sharon")
    - timezone: User's timezone (default: UTC)
    - include_user_context: Whether to include user preferences in search (default: true)

    Returns:
    - success: Whether search succeeded
    - query: Original query
    - interpretation: Claude's interpretation of the query
    - results: List of matching programs with relevance scores
    - total_results: Total number of results
    - execution_time_ms: Total execution time

    Requires: Premium subscription
    """
    try:
        # Build user context if requested
        user_context = None
        if request.include_user_context:
            user_context = {
                "subscription_tier": current_user.subscription_tier,
                "preferred_language": current_user.preferred_language,
                "preferences": current_user.preferences,
            }

        # Execute LLM search
        result = await llm_search_service.search(
            query=request.query, timezone=request.timezone, user_context=user_context
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM search failed: {str(e)}")


@router.get("/{channel_id}/schedule")
async def get_channel_schedule(channel_id: str, date: Optional[str] = Query(None)):
    """
    Get full day schedule for a specific channel

    Path Parameters:
    - channel_id: Live channel ID

    Query Parameters:
    - date: Date in YYYY-MM-DD format (default: today)

    Returns:
    - programs: List of programs for the day
    - channel_id: Channel ID
    - date: Requested date
    """
    epg_service = EPGService()

    # Parse date string
    date_dt = None
    if date:
        try:
            date_dt = datetime.fromisoformat(date)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid date format. Use YYYY-MM-DD format."
            )

    # Fetch schedule
    try:
        programs = await epg_service.get_channel_schedule(
            channel_id=channel_id, date=date_dt
        )

        return {
            "programs": programs,
            "channel_id": channel_id,
            "date": date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "total": len(programs),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch schedule: {str(e)}"
        )


@router.get("/{channel_id}/current")
async def get_current_program(channel_id: str):
    """
    Get currently airing program for a channel

    Path Parameters:
    - channel_id: Live channel ID

    Returns:
    - program: Current program or null
    """
    epg_service = EPGService()

    try:
        program = await epg_service.get_current_program(channel_id)

        if not program:
            return {"program": None, "message": "No program currently airing"}

        return {"program": program}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch current program: {str(e)}"
        )


@router.get("/{channel_id}/next")
async def get_next_program(channel_id: str):
    """
    Get next program for a channel

    Path Parameters:
    - channel_id: Live channel ID

    Returns:
    - program: Next program or null
    """
    epg_service = EPGService()

    try:
        program = await epg_service.get_next_program(channel_id)

        if not program:
            return {"program": None, "message": "No upcoming program scheduled"}

        return {"program": program}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch next program: {str(e)}"
        )


@router.get("/catchup/{program_id}/stream")
async def get_catchup_stream(
    program_id: str, current_user: User = Depends(get_current_premium_user)
):
    """
    Get catch-up TV stream for a past program (Premium Feature)

    Enables time-shifted playback of programs that have already aired,
    using DVR-style recordings.

    Path Parameters:
    - program_id: EPG program ID

    Returns:
    - stream_url: Video stream URL
    - seek_seconds: Seek position in recording (seconds from start)
    - duration_seconds: Program duration
    - subtitle_url: Subtitle file URL (if available)
    - metadata: Program information

    Requires: Premium subscription

    Availability:
    - Programs within 7-day retention period
    - Only if recording exists for that time slot
    """
    try:
        result = await catchup_service.get_catchup_stream(
            program_id=program_id, user_id=str(current_user.id)
        )

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Catch-up not available for this program. It may not have been recorded or is outside the retention period.",
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get catch-up stream: {str(e)}"
        )


@router.get("/catchup/{program_id}/availability")
async def check_catchup_availability(
    program_id: str, current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Check if catch-up is available for a program

    Path Parameters:
    - program_id: EPG program ID

    Returns:
    - available: Boolean indicating availability
    - reason: Reason if not available
    - metadata: Additional information
    """
    try:
        result = await catchup_service.check_availability(program_id)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check catch-up availability: {str(e)}"
        )


@router.get("/catchup/available")
async def get_available_catchup_programs(
    channel_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get list of programs available for catch-up

    Query Parameters:
    - channel_id: Optional filter by channel ID
    - limit: Maximum number of programs to return (default: 50, max: 100)

    Returns:
    - programs: List of available catch-up programs
    - total: Total number of programs
    """
    try:
        programs = await catchup_service.get_available_catchup_programs(
            channel_id=channel_id, limit=limit
        )

        return {"programs": programs, "total": len(programs)}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get available catch-up programs: {str(e)}",
        )
