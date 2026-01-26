import asyncio
import logging
from typing import Optional

import aiohttp
from fastapi import APIRouter, HTTPException, Query

from app.models.content import RadioStation

router = APIRouter()
logger = logging.getLogger(__name__)


async def validate_stream_url(url: str, timeout: int = 15) -> bool:
    """
    Validate that a stream URL is accessible with timeout handling.

    This function prevents clients from attempting to play unavailable streams
    by validating stream accessibility before returning URLs to the frontend.

    Args:
        url: Stream URL to validate
        timeout: Connection timeout in seconds (default 15, increased for reliable CDN response times)

    Returns:
        True if stream is accessible (200-299 or 206), False otherwise
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.head(
                url,
                timeout=aiohttp.ClientTimeout(total=timeout),
                allow_redirects=True,
                ssl=False
            ) as response:
                # Accept 200-299 (success) and 206 (partial content for streaming)
                is_valid = response.status in range(200, 300) or response.status == 206
                if is_valid:
                    logger.debug(f"[Radio] Stream validation succeeded: {response.status}")
                return is_valid
    except asyncio.TimeoutError:
        logger.warning(f"[Radio] Stream validation timeout for {url}")
        return False
    except aiohttp.ClientError as e:
        logger.warning(f"[Radio] Stream validation failed for {url}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"[Radio] Unexpected error during stream validation: {str(e)}")
        return False


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
async def get_stream_url(
    station_id: str,
    validate: bool = Query(False, description="Validate stream URL accessibility")
):
    """
    Get radio stream URL with optional validation.

    Returns the stream URL for playback. Client-side players handle stream validation
    and provide better error handling for network issues.

    Args:
        station_id: ID of the radio station
        validate: Whether to validate stream URL (default: False for performance)

    Returns:
        JSON object with:
        - url: Stream URL for playback
        - type: Stream type (e.g., 'hls')

    Raises:
        404: Station not found or inactive
    """
    # Get station from database
    station = await RadioStation.get(station_id)
    if not station or not station.is_active:
        logger.warning(f"[Radio] Station not found or inactive: {station_id}")
        raise HTTPException(status_code=404, detail="Station not found")

    # Optional validation (disabled by default for performance)
    if validate:
        is_accessible = await validate_stream_url(station.stream_url, timeout=5)
        if not is_accessible:
            logger.warning(
                f"[Radio] Stream validation failed for {station.name}",
                extra={
                    "station_id": station_id,
                    "station_name": station.name,
                    "stream_url": station.stream_url,
                }
            )

    logger.info(
        f"[Radio] Stream URL retrieved for {station.name}",
        extra={
            "station_id": station_id,
            "station_name": station.name,
            "stream_type": station.stream_type,
            "validation_enabled": validate
        }
    )

    return {
        "url": station.stream_url,
        "type": station.stream_type,
    }
