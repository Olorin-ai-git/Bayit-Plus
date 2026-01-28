"""
Location service for reverse geocoding and coordinate-to-address conversion.

Uses GeoNames API for coordinate-based city lookup with caching.
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.core.config import settings
from app.core.database import db

logger = logging.getLogger(__name__)


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


class LocationService:
    """Service for reverse geocoding coordinates to city/state."""

    GEONAMES_BASE_URL = "https://secure.geonames.org"
    CACHE_TTL_HOURS = 24
    CACHE_COLLECTION = "location_cache"

    async def reverse_geocode(
        self, latitude: float, longitude: float
    ) -> Optional[LocationData]:
        """
        Convert geographic coordinates to city/state/county.

        Args:
            latitude: Geographic latitude
            longitude: Geographic longitude

        Returns:
            LocationData with city, state, county info or None if lookup failed
        """
        try:
            # Check cache first
            cached = await self._get_cached_location(latitude, longitude)
            if cached:
                logger.info(f"Cache hit for {latitude}, {longitude}")
                return cached

            # Fetch from GeoNames API
            location = await self._fetch_from_geonames(latitude, longitude)

            if location:
                # Cache the result
                await self._cache_location(latitude, longitude, location)
                return location

            return None

        except Exception as e:
            logger.error(f"Error reverse geocoding {latitude}, {longitude}: {e}")
            return None

    async def _get_cached_location(
        self, latitude: float, longitude: float
    ) -> Optional[LocationData]:
        """Retrieve cached location data if available and fresh."""
        try:
            cache_collection = db.get_collection(self.CACHE_COLLECTION)

            # Use coordinate hash as cache key for efficiency
            coord_hash = self._hash_coordinates(latitude, longitude)

            cache_entry = await cache_collection.find_one(
                {
                    "coord_hash": coord_hash,
                    "expires_at": {
                        "$gte": datetime.now(timezone.utc),
                    },
                }
            )

            if cache_entry:
                return LocationData(
                    city=cache_entry["city"],
                    state=cache_entry["state"],
                    county=cache_entry.get("county"),
                    latitude=cache_entry["latitude"],
                    longitude=cache_entry["longitude"],
                    source="cache",
                )

            return None

        except Exception as e:
            logger.warning(f"Error checking location cache: {e}")
            return None

    async def _cache_location(
        self, latitude: float, longitude: float, location: LocationData
    ) -> None:
        """Cache geocoding result with TTL."""
        try:
            cache_collection = db.get_collection(self.CACHE_COLLECTION)

            coord_hash = self._hash_coordinates(latitude, longitude)

            await cache_collection.update_one(
                {"coord_hash": coord_hash},
                {
                    "$set": {
                        "coord_hash": coord_hash,
                        "latitude": latitude,
                        "longitude": longitude,
                        "city": location.city,
                        "state": location.state,
                        "county": location.county,
                        "source": location.source,
                        "cached_at": datetime.now(timezone.utc),
                        "expires_at": datetime.now(timezone.utc)
                        + timedelta(hours=self.CACHE_TTL_HOURS),
                    }
                },
                upsert=True,
            )

            logger.info(f"Cached location for {latitude}, {longitude}")

        except Exception as e:
            logger.warning(f"Error caching location: {e}")

    async def _fetch_from_geonames(
        self, latitude: float, longitude: float
    ) -> Optional[LocationData]:
        """Fetch location data from GeoNames API."""
        try:
            geonames_username = settings.get("GEONAMES_USERNAME")

            if not geonames_username:
                logger.warning("GEONAMES_USERNAME not configured")
                return None

            url = f"{self.GEONAMES_BASE_URL}/findNearbyJSON"
            params = {
                "lat": latitude,
                "lng": longitude,
                "username": geonames_username,
                "featureClass": "P",  # Cities only
                "maxRows": 1,
            }

            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()

                data = response.json()

                if data.get("geonames"):
                    location = data["geonames"][0]

                    # Extract US state code (adminCode1)
                    state_code = location.get("adminCode1")
                    city_name = location.get("name")
                    county_name = location.get("adminName2")

                    if state_code and city_name:
                        return LocationData(
                            city=city_name,
                            state=state_code,
                            county=county_name,
                            latitude=latitude,
                            longitude=longitude,
                            source="geonames",
                        )

                logger.warning(
                    f"No location found by GeoNames for {latitude}, {longitude}"
                )
                return None

        except httpx.HTTPError as e:
            logger.error(f"GeoNames API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing GeoNames response: {e}")
            return None

    @staticmethod
    def _hash_coordinates(latitude: float, longitude: float) -> str:
        """Create a hash of coordinates for efficient cache lookup."""
        # Round to 4 decimal places (~11m accuracy) for cache efficiency
        rounded = f"{latitude:.4f},{longitude:.4f}"
        return hashlib.sha256(rounded.encode()).hexdigest()[:16]
