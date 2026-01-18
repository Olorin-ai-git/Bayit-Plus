"""
Admin Culture Management Routes

Provides CRUD endpoints for managing cultures, cities, and news sources.
Requires admin authentication.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.routes.admin import require_admin
from app.models.user import User
from app.models.culture import (
    Culture,
    CultureCity,
    CultureNewsSource,
    CultureCityCategory,
    ScrapingConfig,
    CultureResponse,
    CultureCityResponse,
    CultureNewsSourceResponse,
)
from app.services.culture_content_service import culture_content_service

router = APIRouter()


# ==================== Request Models ====================


class CultureCreate(BaseModel):
    """Request model for creating a culture."""

    culture_id: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    name_localized: Dict[str, str] = Field(default_factory=dict)
    flag_emoji: str = ""
    country_code: str = Field("", max_length=2)
    primary_timezone: str = Field(..., min_length=1)
    primary_language: str = "en"
    supported_languages: List[str] = Field(default_factory=lambda: ["en"])
    keyword_weight_native: float = 2.0
    keyword_weight_english: float = 1.0
    has_shabbat_mode: bool = False
    has_lunar_calendar: bool = False
    has_special_holidays: bool = False
    display_order: int = 0
    is_active: bool = True
    is_default: bool = False
    background_image_key: Optional[str] = None
    accent_color: Optional[str] = None


class CultureUpdate(BaseModel):
    """Request model for updating a culture."""

    name: Optional[str] = None
    name_localized: Optional[Dict[str, str]] = None
    flag_emoji: Optional[str] = None
    country_code: Optional[str] = None
    primary_timezone: Optional[str] = None
    primary_language: Optional[str] = None
    supported_languages: Optional[List[str]] = None
    keyword_weight_native: Optional[float] = None
    keyword_weight_english: Optional[float] = None
    has_shabbat_mode: Optional[bool] = None
    has_lunar_calendar: Optional[bool] = None
    has_special_holidays: Optional[bool] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    background_image_key: Optional[str] = None
    accent_color: Optional[str] = None


class CultureCityCreate(BaseModel):
    """Request model for creating a city."""

    city_id: str = Field(..., min_length=2, max_length=50)
    culture_id: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    name_localized: Dict[str, str] = Field(default_factory=dict)
    name_native: Optional[str] = None
    timezone: str = Field(..., min_length=1)
    coordinates: Optional[Dict[str, float]] = None
    categories: List[CultureCityCategory] = Field(default_factory=list)
    display_order: int = 0
    is_active: bool = True
    is_featured: bool = True
    background_image_key: Optional[str] = None
    thumbnail_image_key: Optional[str] = None
    accent_color: Optional[str] = None


class CultureCityUpdate(BaseModel):
    """Request model for updating a city."""

    name: Optional[str] = None
    name_localized: Optional[Dict[str, str]] = None
    name_native: Optional[str] = None
    timezone: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    categories: Optional[List[CultureCityCategory]] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    background_image_key: Optional[str] = None
    thumbnail_image_key: Optional[str] = None
    accent_color: Optional[str] = None


class CultureNewsSourceCreate(BaseModel):
    """Request model for creating a news source."""

    source_id: str = Field(..., min_length=2, max_length=100)
    culture_id: str = Field(..., min_length=2, max_length=50)
    city_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    name_localized: Dict[str, str] = Field(default_factory=dict)
    name_native: Optional[str] = None
    source_type: str = "rss"
    rss_url: Optional[str] = None
    website_url: str = Field(..., min_length=1)
    api_endpoint: Optional[str] = None
    scraping_config: Optional[ScrapingConfig] = None
    content_type: str = "news"
    language: str = "en"
    categories: List[str] = Field(default_factory=list)
    keyword_filters: List[str] = Field(default_factory=list)
    is_active: bool = True
    priority: int = 0


class CultureNewsSourceUpdate(BaseModel):
    """Request model for updating a news source."""

    name: Optional[str] = None
    name_localized: Optional[Dict[str, str]] = None
    name_native: Optional[str] = None
    source_type: Optional[str] = None
    rss_url: Optional[str] = None
    website_url: Optional[str] = None
    api_endpoint: Optional[str] = None
    scraping_config: Optional[ScrapingConfig] = None
    content_type: Optional[str] = None
    language: Optional[str] = None
    categories: Optional[List[str]] = None
    keyword_filters: Optional[List[str]] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None


# ==================== Culture CRUD ====================


@router.get("", response_model=List[CultureResponse])
async def list_all_cultures(
    active_only: bool = Query(False, description="Only return active cultures"),
    current_admin: User = Depends(require_admin),
):
    """List all cultures (admin view, includes inactive)."""
    return await culture_content_service.get_all_cultures(active_only=active_only)


@router.post("", response_model=CultureResponse)
async def create_culture(
    data: CultureCreate,
    current_admin: User = Depends(require_admin),
):
    """Create a new culture."""
    # Check if culture_id already exists
    existing = await Culture.find_one(Culture.culture_id == data.culture_id)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Culture already exists: {data.culture_id}",
        )

    # If this is set as default, unset other defaults
    if data.is_default:
        await Culture.find(Culture.is_default == True).update({"$set": {"is_default": False}})

    culture = Culture(**data.model_dump())
    await culture.insert()

    return CultureResponse(
        id=str(culture.id),
        culture_id=culture.culture_id,
        name=culture.name,
        name_localized=culture.name_localized,
        flag_emoji=culture.flag_emoji,
        country_code=culture.country_code,
        primary_timezone=culture.primary_timezone,
        primary_language=culture.primary_language,
        supported_languages=culture.supported_languages,
        has_shabbat_mode=culture.has_shabbat_mode,
        has_lunar_calendar=culture.has_lunar_calendar,
        display_order=culture.display_order,
        is_active=culture.is_active,
        is_default=culture.is_default,
        background_image_key=culture.background_image_key,
        accent_color=culture.accent_color,
    )


@router.put("/{culture_id}", response_model=CultureResponse)
async def update_culture(
    culture_id: str,
    data: CultureUpdate,
    current_admin: User = Depends(require_admin),
):
    """Update a culture."""
    culture = await Culture.find_one(Culture.culture_id == culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )

    # If this is set as default, unset other defaults
    if data.is_default:
        await Culture.find(Culture.is_default == True).update({"$set": {"is_default": False}})

    # Update fields
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    await culture.update({"$set": update_data})
    await culture.sync()

    return CultureResponse(
        id=str(culture.id),
        culture_id=culture.culture_id,
        name=culture.name,
        name_localized=culture.name_localized,
        flag_emoji=culture.flag_emoji,
        country_code=culture.country_code,
        primary_timezone=culture.primary_timezone,
        primary_language=culture.primary_language,
        supported_languages=culture.supported_languages,
        has_shabbat_mode=culture.has_shabbat_mode,
        has_lunar_calendar=culture.has_lunar_calendar,
        display_order=culture.display_order,
        is_active=culture.is_active,
        is_default=culture.is_default,
        background_image_key=culture.background_image_key,
        accent_color=culture.accent_color,
    )


@router.delete("/{culture_id}")
async def delete_culture(
    culture_id: str,
    current_admin: User = Depends(require_admin),
):
    """Delete a culture and all associated cities and sources."""
    culture = await Culture.find_one(Culture.culture_id == culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )

    # Delete associated cities
    await CultureCity.find(CultureCity.culture_id == culture_id).delete()

    # Delete associated sources
    await CultureNewsSource.find(CultureNewsSource.culture_id == culture_id).delete()

    # Delete culture
    await culture.delete()

    # Clear cache
    culture_content_service.clear_cache(culture_id)

    return {"message": f"Culture deleted: {culture_id}"}


# ==================== City CRUD ====================


@router.get("/{culture_id}/cities", response_model=List[CultureCityResponse])
async def list_all_cities(
    culture_id: str,
    active_only: bool = Query(False, description="Only return active cities"),
    current_admin: User = Depends(require_admin),
):
    """List all cities for a culture (admin view)."""
    query = {"culture_id": culture_id}
    if active_only:
        query["is_active"] = True

    cities = await CultureCity.find(query).sort("display_order").to_list()

    return [
        CultureCityResponse(
            id=str(city.id),
            city_id=city.city_id,
            culture_id=city.culture_id,
            name=city.name,
            name_localized=city.name_localized,
            name_native=city.name_native,
            timezone=city.timezone,
            coordinates=city.coordinates,
            categories=city.categories,
            display_order=city.display_order,
            is_active=city.is_active,
            is_featured=city.is_featured,
            background_image_key=city.background_image_key,
            thumbnail_image_key=city.thumbnail_image_key,
            accent_color=city.accent_color,
        )
        for city in cities
    ]


@router.post("/{culture_id}/cities", response_model=CultureCityResponse)
async def create_city(
    culture_id: str,
    data: CultureCityCreate,
    current_admin: User = Depends(require_admin),
):
    """Create a new city."""
    # Verify culture exists
    culture = await Culture.find_one(Culture.culture_id == culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )

    # Override culture_id from path
    data_dict = data.model_dump()
    data_dict["culture_id"] = culture_id

    # Check if city_id already exists for this culture
    existing = await CultureCity.find_one(
        CultureCity.culture_id == culture_id,
        CultureCity.city_id == data.city_id,
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"City already exists: {culture_id}/{data.city_id}",
        )

    city = CultureCity(**data_dict)
    await city.insert()

    return CultureCityResponse(
        id=str(city.id),
        city_id=city.city_id,
        culture_id=city.culture_id,
        name=city.name,
        name_localized=city.name_localized,
        name_native=city.name_native,
        timezone=city.timezone,
        coordinates=city.coordinates,
        categories=city.categories,
        display_order=city.display_order,
        is_active=city.is_active,
        is_featured=city.is_featured,
        background_image_key=city.background_image_key,
        thumbnail_image_key=city.thumbnail_image_key,
        accent_color=city.accent_color,
    )


@router.put("/{culture_id}/cities/{city_id}", response_model=CultureCityResponse)
async def update_city(
    culture_id: str,
    city_id: str,
    data: CultureCityUpdate,
    current_admin: User = Depends(require_admin),
):
    """Update a city."""
    city = await CultureCity.find_one(
        CultureCity.culture_id == culture_id,
        CultureCity.city_id == city_id,
    )
    if not city:
        raise HTTPException(
            status_code=404,
            detail=f"City not found: {culture_id}/{city_id}",
        )

    # Update fields
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    await city.update({"$set": update_data})
    await city.sync()

    return CultureCityResponse(
        id=str(city.id),
        city_id=city.city_id,
        culture_id=city.culture_id,
        name=city.name,
        name_localized=city.name_localized,
        name_native=city.name_native,
        timezone=city.timezone,
        coordinates=city.coordinates,
        categories=city.categories,
        display_order=city.display_order,
        is_active=city.is_active,
        is_featured=city.is_featured,
        background_image_key=city.background_image_key,
        thumbnail_image_key=city.thumbnail_image_key,
        accent_color=city.accent_color,
    )


@router.delete("/{culture_id}/cities/{city_id}")
async def delete_city(
    culture_id: str,
    city_id: str,
    current_admin: User = Depends(require_admin),
):
    """Delete a city and associated sources."""
    city = await CultureCity.find_one(
        CultureCity.culture_id == culture_id,
        CultureCity.city_id == city_id,
    )
    if not city:
        raise HTTPException(
            status_code=404,
            detail=f"City not found: {culture_id}/{city_id}",
        )

    # Delete associated sources
    await CultureNewsSource.find(
        CultureNewsSource.culture_id == culture_id,
        CultureNewsSource.city_id == city_id,
    ).delete()

    # Delete city
    await city.delete()

    # Clear cache
    culture_content_service.clear_cache(culture_id, city_id)

    return {"message": f"City deleted: {culture_id}/{city_id}"}


# ==================== Source CRUD ====================


@router.get("/{culture_id}/sources", response_model=List[CultureNewsSourceResponse])
async def list_all_sources(
    culture_id: str,
    city_id: Optional[str] = Query(None, description="Filter by city"),
    active_only: bool = Query(False, description="Only return active sources"),
    current_admin: User = Depends(require_admin),
):
    """List all news sources for a culture (admin view)."""
    return await culture_content_service.get_sources(
        culture_id=culture_id,
        city_id=city_id,
        active_only=active_only,
    )


@router.post("/{culture_id}/sources", response_model=CultureNewsSourceResponse)
async def create_source(
    culture_id: str,
    data: CultureNewsSourceCreate,
    current_admin: User = Depends(require_admin),
):
    """Create a new news source."""
    # Verify culture exists
    culture = await Culture.find_one(Culture.culture_id == culture_id)
    if not culture:
        raise HTTPException(
            status_code=404,
            detail=f"Culture not found: {culture_id}",
        )

    # Override culture_id from path
    data_dict = data.model_dump()
    data_dict["culture_id"] = culture_id

    # Check if source_id already exists
    existing = await CultureNewsSource.find_one(
        CultureNewsSource.source_id == data.source_id,
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Source already exists: {data.source_id}",
        )

    source = CultureNewsSource(**data_dict)
    await source.insert()

    return CultureNewsSourceResponse(
        id=str(source.id),
        source_id=source.source_id,
        culture_id=source.culture_id,
        city_id=source.city_id,
        name=source.name,
        name_localized=source.name_localized,
        source_type=source.source_type,
        website_url=source.website_url,
        content_type=source.content_type,
        language=source.language,
        categories=source.categories,
        is_active=source.is_active,
        priority=source.priority,
        last_fetched_at=source.last_fetched_at,
    )


@router.put("/{culture_id}/sources/{source_id}", response_model=CultureNewsSourceResponse)
async def update_source(
    culture_id: str,
    source_id: str,
    data: CultureNewsSourceUpdate,
    current_admin: User = Depends(require_admin),
):
    """Update a news source."""
    source = await CultureNewsSource.find_one(
        CultureNewsSource.culture_id == culture_id,
        CultureNewsSource.source_id == source_id,
    )
    if not source:
        raise HTTPException(
            status_code=404,
            detail=f"Source not found: {culture_id}/{source_id}",
        )

    # Update fields
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    await source.update({"$set": update_data})
    await source.sync()

    return CultureNewsSourceResponse(
        id=str(source.id),
        source_id=source.source_id,
        culture_id=source.culture_id,
        city_id=source.city_id,
        name=source.name,
        name_localized=source.name_localized,
        source_type=source.source_type,
        website_url=source.website_url,
        content_type=source.content_type,
        language=source.language,
        categories=source.categories,
        is_active=source.is_active,
        priority=source.priority,
        last_fetched_at=source.last_fetched_at,
    )


@router.delete("/{culture_id}/sources/{source_id}")
async def delete_source(
    culture_id: str,
    source_id: str,
    current_admin: User = Depends(require_admin),
):
    """Delete a news source."""
    source = await CultureNewsSource.find_one(
        CultureNewsSource.culture_id == culture_id,
        CultureNewsSource.source_id == source_id,
    )
    if not source:
        raise HTTPException(
            status_code=404,
            detail=f"Source not found: {culture_id}/{source_id}",
        )

    await source.delete()

    return {"message": f"Source deleted: {source_id}"}


# ==================== Cache Management ====================


@router.post("/{culture_id}/refresh")
async def refresh_culture_cache(
    culture_id: str,
    city_id: Optional[str] = Query(None, description="Specific city to refresh"),
    current_admin: User = Depends(require_admin),
):
    """Refresh the content cache for a culture."""
    culture_content_service.clear_cache(culture_id, city_id)
    return {
        "message": f"Cache cleared for {culture_id}" + (f"/{city_id}" if city_id else ""),
        "status": "success",
    }
