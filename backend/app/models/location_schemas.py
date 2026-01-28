"""Pydantic response schemas for location-based content endpoints."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class LocationData(BaseModel):
    """Geographic location information."""

    city: str = Field(..., description="City name")
    state: str = Field(..., description="Two-letter state code")
    county: Optional[str] = Field(None, description="County name")
    latitude: float = Field(..., description="Geographic latitude")
    longitude: float = Field(..., description="Geographic longitude")
    timestamp: datetime = Field(..., description="Detection timestamp")
    source: str = Field(..., description="Data source (geonames, cache, etc)")

    class Config:
        from_attributes = True


class LocationCoverageInfo(BaseModel):
    """Coverage information for location-based content."""

    has_content: bool = Field(..., description="Whether content exists for this location")
    nearest_major_city: Optional[str] = Field(None, description="Nearest major city if no exact match")
    fallback_region: Optional[str] = Field(None, description="Regional fallback suggestion")

    class Config:
        from_attributes = True


class ReverseGeocodeResponse(BaseModel):
    """Response for reverse geocoding endpoint."""

    city: str
    state: str
    county: Optional[str] = None
    latitude: float
    longitude: float
    timestamp: datetime
    source: str

    class Config:
        from_attributes = True


class ContentItem(BaseModel):
    """Minimal content item for location-based results."""

    id: str
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None

    class Config:
        from_attributes = True


class IsraelisInCityResponse(BaseModel):
    """Response for israelis-in-city endpoint."""

    location: LocationData = Field(..., description="User location information")
    content: dict = Field(
        ...,
        description="Aggregated content: news_articles, news_reels, community_events",
    )
    total_items: int = Field(..., description="Total number of returned items")
    updated_at: datetime = Field(..., description="Last update timestamp")
    coverage: LocationCoverageInfo = Field(..., description="Content coverage info")

    class Config:
        from_attributes = True
