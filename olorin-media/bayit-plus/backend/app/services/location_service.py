"""Location service for reverse geocoding coordinates to city/state via GeoNames API."""
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.core.config import settings
from app.core.encryption import get_field_encryption
from app.models.location_cache import LocationCache
from app.models.location_data import LocationData

logger = logging.getLogger(__name__)


class LocationService:
    """Service for reverse geocoding coordinates to city/state."""

    async def reverse_geocode(
        self, latitude: float, longitude: float
    ) -> Optional[LocationData]:
        """Convert geographic coordinates to city/state/county."""
        try:
            if not self._validate_coordinates(latitude, longitude):
                logger.warning(f"Invalid coordinates: {latitude}, {longitude}")
                return None
            cached = await self._get_cached_location(latitude, longitude)
            if cached:
                logger.debug(f"Cache hit for {latitude}, {longitude}")
                return cached
            location = await self._fetch_from_geonames(latitude, longitude)
            if location:
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
            coord_hash = self._hash_coordinates(latitude, longitude)
            now = datetime.now(timezone.utc)
            cache_entry = await LocationCache.find_one(
                {
                    "coord_hash": coord_hash,
                    "expires_at": {"$gte": now},
                }
            )
            if cache_entry:
                encryption = get_field_encryption()
                city = encryption.decrypt(cache_entry.city_encrypted)
                state = encryption.decrypt(cache_entry.state_encrypted)
                county = (
                    encryption.decrypt(cache_entry.county_encrypted)
                    if cache_entry.county_encrypted
                    else None
                )
                return LocationData(
                    city=city,
                    state=state,
                    county=county,
                    latitude=cache_entry.latitude,
                    longitude=cache_entry.longitude,
                    source="cache",
                )
            return None
        except Exception as e:
            logger.warning("Error checking location cache", extra={"error": str(e)})
            return None

    async def _cache_location(
        self, latitude: float, longitude: float, location: LocationData
    ) -> None:
        """Cache geocoding result with TTL and encryption."""
        try:
            encryption = get_field_encryption()
            if not settings.LOCATION_ENCRYPTION_KEY:
                logger.warning("Location encryption not configured - skipping cache")
                return

            coord_hash = self._hash_coordinates(latitude, longitude)
            now = datetime.now(timezone.utc)
            expires_at = now + timedelta(hours=settings.LOCATION_CACHE_TTL_HOURS)

            city_encrypted = encryption.encrypt(location.city)
            state_encrypted = encryption.encrypt(location.state)
            county_encrypted = (
                encryption.encrypt(location.county) if location.county else None
            )

            cache_entry = await LocationCache.find_one({"coord_hash": coord_hash})
            if cache_entry:
                cache_entry.latitude = latitude
                cache_entry.longitude = longitude
                cache_entry.city_encrypted = city_encrypted
                cache_entry.state_encrypted = state_encrypted
                cache_entry.county_encrypted = county_encrypted
                cache_entry.source = location.source
                cache_entry.cached_at = now
                cache_entry.expires_at = expires_at
                await cache_entry.save()
            else:
                new_cache = LocationCache(
                    coord_hash=coord_hash,
                    latitude=latitude,
                    longitude=longitude,
                    city_encrypted=city_encrypted,
                    state_encrypted=state_encrypted,
                    county_encrypted=county_encrypted,
                    source=location.source,
                    cached_at=now,
                    expires_at=expires_at,
                )
                await new_cache.insert()
            logger.debug("Location cached", extra={"latitude": latitude, "longitude": longitude})
        except Exception as e:
            logger.warning("Error caching location", extra={"error": str(e)})

    async def _fetch_from_geonames(
        self, latitude: float, longitude: float
    ) -> Optional[LocationData]:
        """Fetch location data from GeoNames API."""
        try:
            if not settings.GEONAMES_USERNAME:
                logger.warning("GEONAMES_USERNAME not configured")
                return None

            params = {
                "lat": latitude,
                "lng": longitude,
                "username": settings.GEONAMES_USERNAME,
                "featureClass": "P",
                "maxRows": 1,
            }
            url = f"{settings.GEONAMES_API_BASE_URL}/findNearbyJSON"

            async with httpx.AsyncClient(
                timeout=settings.GEONAMES_TIMEOUT_SECONDS
            ) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                if data.get("geonames"):
                    loc = data["geonames"][0]
                    state_code = loc.get("adminCode1")
                    city_name = loc.get("name")
                    if state_code and city_name:
                        return LocationData(
                            city=city_name,
                            state=state_code,
                            county=loc.get("adminName2"),
                            latitude=latitude,
                            longitude=longitude,
                            source="geonames",
                        )
                logger.debug(f"No location found by GeoNames for {latitude}, {longitude}")
                return None
        except httpx.HTTPError as e:
            logger.error(f"GeoNames API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing GeoNames response: {e}")
            return None

    @staticmethod
    def _validate_coordinates(latitude: float, longitude: float) -> bool:
        return -90 <= latitude <= 90 and -180 <= longitude <= 180

    @staticmethod
    def _hash_coordinates(latitude: float, longitude: float) -> str:
        rounded = f"{latitude:.4f},{longitude:.4f}"
        return hashlib.sha256(rounded.encode()).hexdigest()[:16]