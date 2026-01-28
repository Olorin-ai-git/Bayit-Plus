"""MongoDB cache for location data with automatic TTL expiration and encryption."""
from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class LocationCache(Document):
    """Cached reverse geocoding results with TTL and field-level encryption.

    MongoDB automatically removes documents when expires_at time is reached.
    Sensitive fields (city, state, county) are encrypted at rest.
    """

    coord_hash: str = Field(..., description="SHA-256 hash of coordinates")
    latitude: float = Field(..., description="Original latitude")
    longitude: float = Field(..., description="Original longitude")
    city_encrypted: str = Field(..., description="Encrypted city name")
    state_encrypted: str = Field(..., description="Encrypted state code")
    county_encrypted: Optional[str] = Field(None, description="Encrypted county name")
    source: str = Field(default="geonames", description="Data source")
    cached_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Indexed(datetime) = Field(..., description="Expiration timestamp")

    # Convenience properties for unencrypted access (set at runtime via service)
    _city: Optional[str] = None
    _state: Optional[str] = None
    _county: Optional[str] = None

    @property
    def city(self) -> Optional[str]:
        """Get unencrypted city (only available if decrypted by service)."""
        return self._city

    @property
    def state(self) -> Optional[str]:
        """Get unencrypted state (only available if decrypted by service)."""
        return self._state

    @property
    def county(self) -> Optional[str]:
        """Get unencrypted county (only available if decrypted by service)."""
        return self._county

    def set_unencrypted_values(
        self, city: str = None, state: str = None, county: str = None
    ) -> None:
        """Set unencrypted values (for internal use after decryption)."""
        self._city = city
        self._state = state
        self._county = county

    class Config:
        from_attributes = True

    class Settings:
        name = "location_cache"
        indexes = ["expires_at"]
