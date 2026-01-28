"""Location data container."""
from datetime import datetime, timezone
from typing import Optional


class LocationData:
    """Container for geocoded location data."""

    def __init__(
        self,
        city: str,
        state: str,
        county: Optional[str] = None,
        latitude: float = 0.0,
        longitude: float = 0.0,
        source: str = "geonames",
    ):
        self.city = city
        self.state = state
        self.county = county
        self.latitude = latitude
        self.longitude = longitude
        self.source = source
        self.timestamp = datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "city": self.city,
            "state": self.state,
            "county": self.county,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "timestamp": self.timestamp.isoformat(),
            "source": self.source,
        }
