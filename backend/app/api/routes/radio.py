from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.models.content import RadioStation

router = APIRouter()


@router.get("/stations")
async def get_stations(
    culture_id: Optional[str] = Query(None, description="Filter by culture ID"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
):
    """Get radio stations, optionally filtered by culture and genre."""
    # Build query conditions
    query_conditions = [RadioStation.is_active == True]

    if culture_id:
        query_conditions.append(RadioStation.culture_id == culture_id)

    if genre:
        query_conditions.append(RadioStation.genre == genre)

    stations = await RadioStation.find(*query_conditions).sort("order").to_list()

    return {
        "stations": [
            {
                "id": str(station.id),
                "name": station.name,
                "description": station.description,
                "logo": station.logo,
                "genre": station.genre,
                "culture_id": station.culture_id,
                "currentShow": station.current_show,
                "currentSong": station.current_song,
            }
            for station in stations
        ],
        "total": len(stations),
    }


@router.get("/{station_id}")
async def get_station(station_id: str):
    """Get radio station details."""
    station = await RadioStation.get(station_id)
    if not station or not station.is_active:
        raise HTTPException(status_code=404, detail="Station not found")

    return {
        "id": str(station.id),
        "name": station.name,
        "description": station.description,
        "logo": station.logo,
        "genre": station.genre,
        "currentShow": station.current_show,
        "currentSong": station.current_song,
    }


@router.get("/{station_id}/stream")
async def get_stream_url(station_id: str):
    """Get radio stream URL (available to all users)."""
    station = await RadioStation.get(station_id)
    if not station or not station.is_active:
        raise HTTPException(status_code=404, detail="Station not found")

    return {
        "url": station.stream_url,
        "type": station.stream_type,
    }
