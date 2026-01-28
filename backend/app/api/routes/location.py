"""
Location service endpoints for geolocation and reverse geocoding.

Endpoints:
- POST /location/reverse-geocode: Convert coordinates to city/state
- POST /users/preferences/location: Save user's location preferences
"""

import logging
from typing import Optional

from fastapi import APIRouter, Query

from app.services.location_service import LocationService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/location/reverse-geocode")
async def reverse_geocode(
    latitude: float = Query(..., description="Geographic latitude"),
    longitude: float = Query(..., description="Geographic longitude"),
):
    """
    Convert geographic coordinates to city/state/county.

    Uses reverse geocoding (GeoNames API) to convert coordinates to location data.
    Results are cached for 24 hours for efficiency.

    Query Parameters:
        latitude: Geographic latitude (required)
        longitude: Geographic longitude (required)

    Returns:
        {
            "city": string,
            "state": string,
            "county": string or null,
            "latitude": float,
            "longitude": float,
            "source": "geonames" or "cache"
        }
    """
    try:
        service = LocationService()
        location = await service.reverse_geocode(latitude, longitude)

        if location:
            logger.info(f"Reverse geocode: ({latitude}, {longitude}) -> {location.city}, {location.state}")
            return location.to_dict()

        logger.warning(
            f"No location found for coordinates: ({latitude}, {longitude})"
        )
        return {
            "error": "Location not found",
            "message": f"Could not determine location for coordinates ({latitude}, {longitude})",
        }

    except ValueError as e:
        logger.error(f"Validation error in reverse_geocode: {e}")
        return {
            "error": "Validation error",
            "message": str(e),
        }

    except Exception as e:
        logger.error(f"Error in reverse_geocode: {e}", exc_info=True)
        return {
            "error": "Internal server error",
            "message": "Failed to reverse geocode coordinates",
        }
