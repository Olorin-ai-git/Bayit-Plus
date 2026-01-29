"""Geolocation enhancement service for adding proximity scoring to content.

This service enhances content headlines with geolocation metadata by:
1. Extracting city mentions from title/summary
2. Geocoding mentioned cities using GeoNames API
3. Calculating haversine distance from reference coordinates
4. Computing proximity scores based on distance
5. Filtering by radius if specified

Reuses existing LocationService for GeoNames API integration and caching.
"""

import logging
import math
import re
from typing import List, Optional, Tuple

from app.core.config import settings
from app.models.location_data import LocationData
from app.services.location_constants import ISRAELI_CITIES
from app.services.location_service import LocationService

logger = logging.getLogger(__name__)


class EnhancedHeadlineItem:
    """Headline enhanced with geolocation metadata."""

    def __init__(
        self,
        original_item: any,
        proximity_score: float,
        distance_km: Optional[float] = None,
        detected_location: Optional[str] = None,
    ):
        self.original_item = original_item
        self.proximity_score = proximity_score
        self.distance_km = distance_km
        self.detected_location = detected_location

    @property
    def title(self) -> str:
        return getattr(self.original_item, 'title', '')

    @property
    def summary(self) -> str:
        return getattr(self.original_item, 'summary', '')


class GeolocationEnhancer:
    """Enhance content with geolocation proximity scoring."""

    def __init__(self):
        self.location_service = LocationService()
        self._city_patterns = self._build_city_patterns()

    def _build_city_patterns(self) -> List[Tuple[str, str, float, float]]:
        """Build regex patterns for Israeli cities (Hebrew + English)."""
        patterns = []
        for city_name, city_data in ISRAELI_CITIES.items():
            patterns.append(
                (
                    city_name,
                    city_data["hebrew"],
                    city_data["latitude"],
                    city_data["longitude"],
                )
            )
        return patterns

    async def enhance_headlines(
        self,
        headlines: List[any],
        reference_coords: Tuple[float, float],
        radius_km: Optional[float] = None,
    ) -> List[EnhancedHeadlineItem]:
        """
        Add geolocation metadata to each headline.

        Args:
            headlines: List of headline items to enhance
            reference_coords: (latitude, longitude) reference point
            radius_km: Optional maximum distance filter (km)

        Returns:
            List of enhanced headlines with proximity scores
        """
        enhanced = []

        for headline in headlines:
            text = f"{headline.title} {headline.summary}"
            location_coords = await self.geocode_location_mentions(text)

            if location_coords:
                closest_coords = location_coords[0]
                distance_km = self.calculate_haversine_distance(
                    reference_coords, (closest_coords[1], closest_coords[2])
                )
                proximity_score = self.calculate_proximity_score(distance_km)
                detected_location = closest_coords[0]
            else:
                distance_km = None
                proximity_score = 0.0
                detected_location = None

            if radius_km is None or (distance_km is not None and distance_km <= radius_km):
                enhanced.append(
                    EnhancedHeadlineItem(
                        original_item=headline,
                        proximity_score=proximity_score,
                        distance_km=distance_km,
                        detected_location=detected_location,
                    )
                )

        return enhanced

    def calculate_proximity_score(
        self, distance_km: float, max_distance_km: float = 100.0
    ) -> float:
        """
        Calculate proximity score (0-10 scale).

        Formula: max(0, 10 * (1 - distance_km / max_distance_km))

        Examples:
            - 0km: 10.0 (exact location)
            - 50km: 5.0 (nearby)
            - 100km+: 0.0 (too far)

        Args:
            distance_km: Distance in kilometers
            max_distance_km: Maximum distance for scoring (default: 100km)

        Returns:
            Proximity score (0-10)
        """
        if distance_km is None:
            return 0.0
        return max(0.0, 10.0 * (1.0 - distance_km / max_distance_km))

    async def geocode_location_mentions(
        self, text: str
    ) -> List[Tuple[str, float, float]]:
        """
        Extract and geocode city mentions from text.

        Examples:
            - "Jerusalem Old City" → ("Jerusalem", 31.7683, 35.2137)
            - "Event at Tel Aviv beaches" → ("Tel Aviv", 32.0853, 34.7818)
            - "Haifa port protest" → ("Haifa", 32.7940, 34.9896)

        Args:
            text: Text to scan for city mentions

        Returns:
            List of (city_name, latitude, longitude) tuples
        """
        found_locations = []

        for city_name, hebrew_name, lat, lon in self._city_patterns:
            english_pattern = rf'\b{re.escape(city_name)}\b'

            if re.search(english_pattern, text, re.IGNORECASE) or hebrew_name in text:
                found_locations.append((city_name, lat, lon))
                logger.debug(
                    f"Detected location: {city_name} in text",
                    extra={"city": city_name, "coords": (lat, lon)},
                )

        return found_locations

    @staticmethod
    def calculate_haversine_distance(
        coords1: Tuple[float, float], coords2: Tuple[float, float]
    ) -> float:
        """
        Calculate great-circle distance between two points using Haversine formula.

        Args:
            coords1: (latitude, longitude) of first point
            coords2: (latitude, longitude) of second point

        Returns:
            Distance in kilometers
        """
        lat1, lon1 = coords1
        lat2, lon2 = coords2

        R = 6371.0

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        distance = R * c
        return distance
