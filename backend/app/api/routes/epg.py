from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from app.models.user import User
from app.core.security import get_current_active_user, get_optional_user
from app.services.epg_service import EPGService

router = APIRouter()


@router.get("")
async def get_epg_data(
    channel_ids: Optional[List[str]] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    timezone: str = Query("UTC"),
    current_user: Optional[User] = Depends(get_optional_user)
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
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        if end_time:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid datetime format. Use ISO 8601 format. Error: {str(e)}"
        )

    # Fetch EPG data
    try:
        data = await epg_service.get_epg_data(
            channel_ids=channel_ids,
            start_time=start_dt,
            end_time=end_dt,
            timezone=timezone
        )
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch EPG data: {str(e)}"
        )


@router.post("/search")
async def search_epg(
    query: str = Query(..., min_length=1),
    channel_ids: Optional[List[str]] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
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
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        if end_time:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid datetime format: {str(e)}"
        )

    # Execute search
    try:
        results = await epg_service.search_epg(
            query=query,
            channel_ids=channel_ids,
            start_time=start_dt,
            end_time=end_dt,
            category=category
        )

        return {
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/{channel_id}/schedule")
async def get_channel_schedule(
    channel_id: str,
    date: Optional[str] = Query(None)
):
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
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD format."
            )

    # Fetch schedule
    try:
        programs = await epg_service.get_channel_schedule(
            channel_id=channel_id,
            date=date_dt
        )

        return {
            "programs": programs,
            "channel_id": channel_id,
            "date": date or datetime.utcnow().strftime("%Y-%m-%d"),
            "total": len(programs)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch schedule: {str(e)}"
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
            status_code=500,
            detail=f"Failed to fetch current program: {str(e)}"
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
            status_code=500,
            detail=f"Failed to fetch next program: {str(e)}"
        )
