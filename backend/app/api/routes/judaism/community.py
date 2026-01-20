"""
Community directory endpoints for Judaism section.

Handles:
- GET /community/regions - Get list of supported US regions
- GET /community/synagogues - Get synagogues
- GET /community/kosher - Get kosher restaurants
- GET /community/jcc - Get JCC locations
- GET /community/mikvaot - Get mikvah locations
- GET /community/events - Get community events
- GET /community/organization/{org_id} - Get organization details
- GET /community/search - Search community directory
"""

from typing import Optional

from app.models.jewish_community import (
    Denomination,
    KosherCertification,
    OrganizationType,
)
from app.services.community_directory_service import community_directory_service
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


@router.get("/community/regions")
async def get_regions() -> dict:
    """Get list of supported US regions with organization counts."""
    return await community_directory_service.get_regions()


@router.get("/community/synagogues")
async def get_synagogues(
    region: Optional[str] = Query(
        None, description="Region filter (e.g., 'nyc', 'la')"
    ),
    denomination: Optional[str] = Query(None, description="Denomination filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """
    Get synagogues in the US Jewish community directory.

    Supports filtering by region and denomination.
    """
    denom = None
    if denomination:
        try:
            denom = Denomination(denomination)
        except ValueError:
            pass

    return await community_directory_service.get_synagogues(
        region=region,
        denomination=denom,
        page=page,
        limit=limit,
    )


@router.get("/community/kosher")
async def get_kosher_restaurants(
    region: Optional[str] = Query(None, description="Region filter"),
    city: Optional[str] = Query(None, description="City name"),
    state: Optional[str] = Query(None, description="State code"),
    certification: Optional[str] = Query(None, description="Kosher certification"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """
    Get kosher restaurants in the US.

    Supports filtering by region, city, state, and kosher certification.
    """
    cert = None
    if certification:
        try:
            cert = KosherCertification(certification)
        except ValueError:
            pass

    return await community_directory_service.get_kosher_restaurants(
        region=region,
        city=city,
        state=state,
        kosher_certification=cert,
        page=page,
        limit=limit,
    )


@router.get("/community/jcc")
async def get_jccs(
    region: Optional[str] = Query(None, description="Region filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """Get JCC locations in the US."""
    return await community_directory_service.get_jccs(
        region=region,
        page=page,
        limit=limit,
    )


@router.get("/community/mikvaot")
async def get_mikvaot(
    region: Optional[str] = Query(None, description="Region filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """Get mikvah locations in the US."""
    return await community_directory_service.get_mikvaot(
        region=region,
        page=page,
        limit=limit,
    )


@router.get("/community/events")
async def get_community_events(
    region: Optional[str] = Query(None, description="Region filter"),
    event_type: Optional[str] = Query(None, description="Event type filter"),
    days: int = Query(14, ge=1, le=90, description="Days to look ahead"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """
    Get upcoming community events.

    Supports filtering by region and event type
    (shiur, shabbaton, holiday, community, youth, singles).
    """
    return await community_directory_service.get_events(
        region=region,
        event_type=event_type,
        days=days,
        page=page,
        limit=limit,
    )


@router.get("/community/organization/{org_id}")
async def get_organization(org_id: str) -> dict:
    """Get details for a specific organization."""
    org = await community_directory_service.get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.get("/community/search")
async def search_community(
    organization_type: Optional[str] = Query(None, description="Organization type"),
    region: Optional[str] = Query(None, description="Region filter"),
    denomination: Optional[str] = Query(None, description="Denomination filter"),
    city: Optional[str] = Query(None, description="City name"),
    state: Optional[str] = Query(None, description="State code"),
    latitude: Optional[float] = Query(
        None, description="Latitude for proximity search"
    ),
    longitude: Optional[float] = Query(
        None, description="Longitude for proximity search"
    ),
    radius_miles: Optional[int] = Query(None, description="Search radius in miles"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """
    Search the community directory with various filters.

    Supports both region-based and geolocation-based proximity searches.
    """
    org_type = None
    if organization_type:
        try:
            org_type = OrganizationType(organization_type)
        except ValueError:
            pass

    denom = None
    if denomination:
        try:
            denom = Denomination(denomination)
        except ValueError:
            pass

    return await community_directory_service.search_organizations(
        organization_type=org_type,
        region=region,
        denomination=denom,
        city=city,
        state=state,
        latitude=latitude,
        longitude=longitude,
        radius_miles=radius_miles,
        page=page,
        limit=limit,
    )
