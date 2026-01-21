"""
Jewish Community models for US Jewish community resources directory.

Stores scraped data from:
- Chabad.org directory (synagogues, Chabad houses)
- OU Kosher database (kosher restaurants)
- JCC Association (JCC locations)
- Mikvah.org directory
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Tuple

from beanie import Document
from pydantic import BaseModel, Field


class OrganizationType(str, Enum):
    """Types of Jewish community organizations."""

    SYNAGOGUE = "synagogue"
    JCC = "jcc"
    SCHOOL = "school"
    MIKVAH = "mikvah"
    RESTAURANT = "restaurant"
    GROCERY = "grocery"
    CATERING = "catering"
    BUTCHER = "butcher"
    BAKERY = "bakery"
    CHABAD = "chabad"
    COMMUNITY_CENTER = "community_center"
    KOLLEL = "kollel"
    YESHIVA = "yeshiva"
    DAY_SCHOOL = "day_school"
    CAMP = "camp"
    OTHER = "other"


class Denomination(str, Enum):
    """Jewish denominations."""

    ORTHODOX = "orthodox"
    MODERN_ORTHODOX = "modern_orthodox"
    CONSERVATIVE = "conservative"
    REFORM = "reform"
    RECONSTRUCTIONIST = "reconstructionist"
    CHABAD = "chabad"
    SEPHARDIC = "sephardic"
    UNAFFILIATED = "unaffiliated"
    NON_DENOMINATIONAL = "non_denominational"


class KosherCertification(str, Enum):
    """Kosher certification types."""

    OU = "ou"
    OK = "ok"
    STAR_K = "star_k"
    CRC = "crc"
    KOF_K = "kof_k"
    CHOF_K = "chof_k"
    LOCAL_VAAD = "local_vaad"
    CHABAD = "chabad"
    OTHER = "other"


class USRegion(str, Enum):
    """Major US Jewish community regions."""

    NYC = "nyc"
    LA = "la"
    CHICAGO = "chicago"
    MIAMI = "miami"
    BOSTON = "boston"
    PHILADELPHIA = "philadelphia"
    ATLANTA = "atlanta"
    DALLAS = "dallas"
    DENVER = "denver"
    SEATTLE = "seattle"
    BALTIMORE = "baltimore"
    CLEVELAND = "cleveland"
    DETROIT = "detroit"


class GeoLocation(BaseModel):
    """Geographic coordinates for geospatial queries."""

    type: str = "Point"
    coordinates: Tuple[float, float]  # [longitude, latitude]


class JewishOrganization(Document):
    """
    A Jewish community organization (synagogue, JCC, kosher restaurant, etc.).

    Data sourced from various directories via web scraping.
    """

    name: str
    name_he: Optional[str] = None
    organization_type: OrganizationType
    denomination: Optional[Denomination] = None

    # Address
    address: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    country: str = "US"

    # Geolocation for proximity searches
    location: Optional[GeoLocation] = None

    # Region for quick filtering
    region: Optional[USRegion] = None

    # Contact
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None

    # Hours of operation
    hours: Optional[dict] = (
        None  # {"sunday": "9:00-17:00", "monday": "9:00-17:00", ...}
    )

    # Services offered (for synagogues)
    services: List[str] = Field(
        default_factory=list
    )  # ["shabbat", "daily_minyan", "youth", "mikvah"]

    # Kosher info (for restaurants/food establishments)
    kosher_certification: Optional[KosherCertification] = None
    kosher_certifier_name: Optional[str] = None
    cuisine_type: Optional[str] = None  # "Israeli", "Italian", "Sushi", etc.
    price_range: Optional[str] = None  # "$", "$$", "$$$"

    # Additional metadata
    description: Optional[str] = None
    description_he: Optional[str] = None
    logo_url: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)

    # Rabbi/leadership info (for synagogues)
    rabbi_name: Optional[str] = None
    rabbi_name_he: Optional[str] = None

    # Source tracking
    source: str  # "chabad", "ou_kosher", "jcc_association", "mikvah_org", "manual"
    source_url: Optional[str] = None
    source_id: Optional[str] = None  # ID from the source system

    # Verification and quality
    is_verified: bool = False
    is_active: bool = True
    last_verified_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "jewish_organizations"
        indexes = [
            "name",
            "organization_type",
            "denomination",
            "city",
            "state",
            "region",
            "zip_code",
            "source",
            "is_active",
            ("organization_type", "region"),
            ("organization_type", "city", "state"),
            ("kosher_certification", "region"),
            [("location", "2dsphere")],  # Geospatial index
        ]


class CommunityEvent(Document):
    """
    A community event at a Jewish organization.

    Events can be scraped from organization websites or entered manually.
    """

    organization_id: str  # Reference to JewishOrganization
    organization_name: str  # Denormalized for quick display
    title: str
    title_he: Optional[str] = None
    description: Optional[str] = None
    description_he: Optional[str] = None

    # Event timing
    start_time: datetime
    end_time: Optional[datetime] = None
    is_all_day: bool = False
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None  # iCal RRULE format

    # Location
    location: Optional[str] = None  # May differ from organization address
    is_virtual: bool = False
    virtual_url: Optional[str] = None

    # Event type
    event_type: str  # "shiur", "shabbaton", "holiday", "community", "youth", "singles"

    # Registration
    requires_registration: bool = False
    registration_url: Optional[str] = None
    cost: Optional[str] = None  # "Free", "$10", "Donation requested"

    # Region for quick filtering
    region: Optional[USRegion] = None

    # Metadata
    image_url: Optional[str] = None
    source: str  # "scraped", "manual"
    source_url: Optional[str] = None

    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "community_events"
        indexes = [
            "organization_id",
            "start_time",
            "event_type",
            "region",
            "is_active",
            ("region", "start_time"),
            ("event_type", "start_time"),
        ]


class ScrapingJob(Document):
    """
    Tracks scraping jobs for community data.

    Stores job status and results for admin monitoring.
    """

    source: str  # "chabad", "ou_kosher", "jcc_association", "mikvah_org"
    region: Optional[str] = None  # Target region if applicable
    status: str  # "pending", "running", "completed", "failed"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Results
    items_found: int = 0
    items_created: int = 0
    items_updated: int = 0
    items_failed: int = 0
    error_message: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "scraping_jobs"
        indexes = [
            "source",
            "status",
            "created_at",
        ]


# Response models


class OrganizationResponse(BaseModel):
    """Response model for a Jewish organization."""

    id: str
    name: str
    name_he: Optional[str] = None
    organization_type: str
    denomination: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    region: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[dict] = None
    services: List[str] = Field(default_factory=list)
    kosher_certification: Optional[str] = None
    cuisine_type: Optional[str] = None
    price_range: Optional[str] = None
    description: Optional[str] = None
    rabbi_name: Optional[str] = None
    logo_url: Optional[str] = None
    is_verified: bool = False
    distance_miles: Optional[float] = None  # Populated for geo queries

    class Config:
        from_attributes = True


class EventResponse(BaseModel):
    """Response model for a community event."""

    id: str
    organization_id: str
    organization_name: str
    title: str
    title_he: Optional[str] = None
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    is_all_day: bool
    location: Optional[str] = None
    is_virtual: bool
    virtual_url: Optional[str] = None
    event_type: str
    requires_registration: bool
    registration_url: Optional[str] = None
    cost: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommunitySearchResponse(BaseModel):
    """Response model for community directory search."""

    organizations: List[OrganizationResponse]
    pagination: dict
    region: Optional[str] = None
    total_count: int


class RegionInfo(BaseModel):
    """Information about a supported US region."""

    id: str
    name: str
    name_he: Optional[str] = None
    state: str
    organization_count: int = 0


class RegionsResponse(BaseModel):
    """Response model for available regions endpoint."""

    regions: List[RegionInfo]
