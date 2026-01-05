from fastapi import APIRouter, HTTPException
from app.models.content import RadioStation

router = APIRouter()


@router.get("/stations")
async def get_stations():
    """Get all radio stations."""
    stations = await RadioStation.find(
        RadioStation.is_active == True
    ).sort("order").to_list()

    return {
        "stations": [
            {
                "id": str(station.id),
                "name": station.name,
                "description": station.description,
                "logo": station.logo,
                "genre": station.genre,
                "currentShow": station.current_show,
                "currentSong": station.current_song,
            }
            for station in stations
        ]
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
