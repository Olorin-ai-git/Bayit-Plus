"""
Pydantic request/response models for Judaism routes.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class JudaismContentResponse(BaseModel):
    """Response model for Judaism content items."""
    id: str
    title: str
    title_en: Optional[str] = None
    title_es: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    rabbi: Optional[str] = None
    category: str
    type: str = "vod"


class JudaismCategoryItem(BaseModel):
    """Judaism category item."""
    id: str
    name: str
    name_en: str
    name_es: str
    icon: str


class CategoriesResponse(BaseModel):
    """Response for categories endpoint."""
    categories: List[JudaismCategoryItem]


class ContentListResponse(BaseModel):
    """Response for content list endpoints."""
    content: List[JudaismContentResponse]
    pagination: dict


class FeaturedResponse(BaseModel):
    """Response for featured content endpoint."""
    featured: List[JudaismContentResponse]


class LiveShiurItem(BaseModel):
    """Live shiur/class item."""
    id: str
    name: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    is_live: bool = True
    current_program: Optional[str] = None


class LiveShiurimResponse(BaseModel):
    """Response for live shiurim endpoint."""
    live: List[LiveShiurItem]


class DailyShiurResponse(BaseModel):
    """Response for daily shiur endpoint."""
    daily_shiur: Optional[JudaismContentResponse] = None


class ShabbatFeaturedSection(BaseModel):
    """Shabbat featured content section."""
    parasha_content: List[JudaismContentResponse] = Field(default_factory=list)
    shabbat_music: List[JudaismContentResponse] = Field(default_factory=list)
    preparation: List[JudaismContentResponse] = Field(default_factory=list)
    featured: List[JudaismContentResponse] = Field(default_factory=list)


class ShabbatFeaturedResponse(BaseModel):
    """Response for Shabbat featured endpoint."""
    parasha: str
    parasha_he: str
    is_shabbat: bool
    sections: ShabbatFeaturedSection
    all_content: List[JudaismContentResponse]


class ShabbatStatusResponse(BaseModel):
    """Response for Shabbat status endpoint."""
    status: str
    is_erev_shabbat: bool
    is_shabbat: bool
    candle_lighting: Optional[str] = None
    havdalah: Optional[str] = None
    parasha: Optional[str] = None
    parasha_he: Optional[str] = None
    city: str
    state: str
    timezone: str
