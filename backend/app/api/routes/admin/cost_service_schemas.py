"""Response schemas for cost services, platforms, and health."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, PlainSerializer

# Serialize Decimal as float in JSON responses (iOS expects numbers, not strings)
JsonDecimal = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float)]


class CostCategoryEnum(str, Enum):
    """Service cost category."""

    AI = "ai"
    INFRASTRUCTURE = "infrastructure"
    THIRD_PARTY = "third_party"
    FIXED = "fixed"


class PlatformEnum(str, Enum):
    """Olorin platform."""

    SHARED = "shared"
    BAYIT_PLUS = "bayit_plus"
    OLORIN_FRAUD = "olorin_fraud"
    CVPLUS = "cvplus"
    STATION_AI = "station_ai"


class DataSourceEnum(str, Enum):
    """How cost data was obtained."""

    API = "api"
    CONFIG = "config"
    ESTIMATED = "estimated"


class ServiceCostResponse(BaseModel):
    """Single service cost entry."""

    service_name: str
    category: CostCategoryEnum
    current_month_cost: JsonDecimal
    previous_month_cost: JsonDecimal
    trend_pct: float
    pct_of_total: float
    platform: PlatformEnum
    data_source: DataSourceEnum


class ServicesCostListResponse(BaseModel):
    """Response for /admin/costs/services."""

    services: list[ServiceCostResponse]
    total_current_month: JsonDecimal
    total_previous_month: JsonDecimal
    service_count: int


class PlatformTopService(BaseModel):
    """Top service within a platform."""

    service_name: str
    cost: JsonDecimal


class PlatformCostResponse(BaseModel):
    """Single platform cost entry."""

    platform: PlatformEnum
    total_cost: JsonDecimal
    service_count: int
    top_services: list[PlatformTopService]
    trend_pct: float


class PlatformsCostListResponse(BaseModel):
    """Response for /admin/costs/platforms."""

    platforms: list[PlatformCostResponse]
    total_cost: JsonDecimal


class ProviderHealthResponse(BaseModel):
    """Single provider health entry."""

    name: str
    enabled: bool
    is_healthy: bool
    last_success_at: Optional[datetime] = None
    last_error: Optional[str] = None


class CostHealthResponse(BaseModel):
    """Response for /admin/costs/health."""

    providers: list[ProviderHealthResponse]
    healthy_count: int
    total_count: int
    data_freshness_minutes: Optional[int] = None


class ToggleSourceEnum(str, Enum):
    """Where the provider toggle state comes from."""

    CONFIG = "config"
    OVERRIDE = "override"


class ProviderToggleResponse(BaseModel):
    """Single provider toggle state."""

    provider_key: str
    display_name: str
    enabled: bool
    source: ToggleSourceEnum
    category: CostCategoryEnum
    updated_at: Optional[datetime] = None


class ProviderToggleListResponse(BaseModel):
    """Response for GET /admin/costs/toggles."""

    providers: list[ProviderToggleResponse]


class ProviderToggleRequest(BaseModel):
    """Request body for PUT /admin/costs/toggles/{key}."""

    enabled: bool
