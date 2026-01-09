"""
Admin Radio Station Management Routes
CRUD operations for radio stations
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Request

from app.models.user import User
from app.models.content import RadioStation
from app.models.admin import Permission, AuditAction
from .admin_content_utils import has_permission, log_audit
from .admin_content_schemas import RadioStationCreateRequest, RadioStationUpdateRequest

router = APIRouter()


@router.get("/radio-stations")
async def get_radio_stations(
    search: Optional[str] = None,
    genre: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=500),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    """Get all radio stations with filters."""
    query = RadioStation.find()

    if search:
        query = query.find({
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]
        })
    if genre:
        query = query.find(RadioStation.genre == genre)
    if is_active is not None:
        query = query.find(RadioStation.is_active == is_active)

    total = await query.count()
    skip = (page - 1) * page_size
    items = await query.sort(RadioStation.order).skip(skip).limit(page_size).to_list()

    return {
        "items": [{
            "id": str(item.id), "name": item.name, "description": item.description,
            "logo": item.logo, "genre": item.genre, "stream_url": item.stream_url,
            "stream_type": item.stream_type, "current_show": item.current_show,
            "current_song": item.current_song, "is_active": item.is_active,
            "order": item.order, "created_at": item.created_at.isoformat(),
        } for item in items],
        "total": total, "page": page, "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/radio-stations/{station_id}")
async def get_radio_station(
    station_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    """Get single radio station by ID."""
    try:
        station = await RadioStation.get(station_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Station not found")
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return {
        "id": str(station.id), "name": station.name, "description": station.description,
        "logo": station.logo, "genre": station.genre, "stream_url": station.stream_url,
        "stream_type": station.stream_type, "current_show": station.current_show,
        "current_song": station.current_song, "is_active": station.is_active,
        "order": station.order, "created_at": station.created_at.isoformat(),
    }


@router.post("/radio-stations")
async def create_radio_station(
    data: RadioStationCreateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Create new radio station."""
    station = RadioStation(
        name=data.name, description=data.description, logo=data.logo, genre=data.genre,
        stream_url=data.stream_url, stream_type=data.stream_type, current_show=data.current_show,
        current_song=data.current_song, is_active=data.is_active, order=data.order,
    )
    await station.insert()
    await log_audit(str(current_user.id), AuditAction.RADIO_STATION_CREATED, "radio_station",
                    str(station.id), {"name": station.name, "genre": station.genre}, request)
    return {"id": str(station.id), "name": station.name}


@router.patch("/radio-stations/{station_id}")
async def update_radio_station(
    station_id: str,
    data: RadioStationUpdateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Update radio station fields."""
    try:
        station = await RadioStation.get(station_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Station not found")

    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    changes = {}

    if data.name is not None:
        changes["name"] = {"old": station.name, "new": data.name}
        station.name = data.name
    if data.description is not None:
        changes["description"] = {"old": station.description, "new": data.description}
        station.description = data.description
    if data.logo is not None:
        changes["logo"] = {"changed": True}
        station.logo = data.logo
    if data.genre is not None:
        changes["genre"] = {"old": station.genre, "new": data.genre}
        station.genre = data.genre
    if data.stream_url is not None:
        changes["stream_url"] = {"changed": True}
        station.stream_url = data.stream_url
    if data.stream_type is not None:
        changes["stream_type"] = {"old": station.stream_type, "new": data.stream_type}
        station.stream_type = data.stream_type
    if data.current_show is not None:
        changes["current_show"] = {"old": station.current_show, "new": data.current_show}
        station.current_show = data.current_show
    if data.current_song is not None:
        changes["current_song"] = {"old": station.current_song, "new": data.current_song}
        station.current_song = data.current_song
    if data.is_active is not None:
        changes["is_active"] = {"old": station.is_active, "new": data.is_active}
        station.is_active = data.is_active
    if data.order is not None:
        changes["order"] = {"old": station.order, "new": data.order}
        station.order = data.order

    await station.save()

    await log_audit(str(current_user.id), AuditAction.RADIO_STATION_UPDATED, "radio_station", station_id, changes, request)

    return {"message": "Station updated", "id": station_id}


@router.delete("/radio-stations/{station_id}")
async def delete_radio_station(
    station_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE))
):
    """Delete radio station."""
    try:
        station = await RadioStation.get(station_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Station not found")

    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    await log_audit(
        str(current_user.id),
        AuditAction.RADIO_STATION_DELETED,
        "radio_station",
        station_id,
        {"name": station.name},
        request
    )
    await station.delete()

    return {"message": "Station deleted"}
