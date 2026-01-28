"""Location endpoints for reverse geocoding coordinates to city/state."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from app.core.rate_limiter import limiter
from app.models.location_schemas import ReverseGeocodeResponse
from app.services.location_service import LocationService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_location_service() -> LocationService:
    """Dependency injection for LocationService."""
    return LocationService()


@router.get("/location/reverse-geocode", response_model=ReverseGeocodeResponse)
@limiter.limit("30/minute")
async def reverse_geocode(
    request: Request,
    latitude: float = Query(..., description="Geographic latitude"),
    longitude: float = Query(..., description="Geographic longitude"),
    service: LocationService = Depends(get_location_service),
) -> ReverseGeocodeResponse:
    """Convert coordinates to city/state/county using reverse geocoding."""
    try:
        location = await service.reverse_geocode(latitude, longitude)
        if location:
            logger.info(
                "Reverse geocode successful",
                extra={
                    "latitude": latitude,
                    "longitude": longitude,
                    "city": location.city,
                    "state": location.state,
                },
            )
            return ReverseGeocodeResponse(
                city=location.city,
                state=location.state,
                county=location.county,
                latitude=location.latitude,
                longitude=location.longitude,
                timestamp=location.timestamp,
                source=location.source,
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not determine location for coordinates",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Reverse geocoding failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reverse geocode coordinates",
        )
