#!/usr/bin/env python3
"""
Geographic Validation Rules
Comprehensive validation for location data, IP geolocation, country codes,
postal codes, and geographic consistency checks.
"""

import math
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple


@dataclass
class GeographicCoordinate:
    """Geographic coordinate with validation"""

    latitude: float
    longitude: float

    def __post_init__(self):
        if not -90 <= self.latitude <= 90:
            raise ValueError(f"Invalid latitude: {self.latitude}")
        if not -180 <= self.longitude <= 180:
            raise ValueError(f"Invalid longitude: {self.longitude}")


class GeographicValidationRules:
    """
    Advanced geographic validation rules for location data integrity.
    """

    # ISO 3166-1 alpha-2 country codes with validation data
    COUNTRY_DATA = {
        "US": {
            "name": "United States",
            "continent": "NA",
            "postal_pattern": r"^\d{5}(-\d{4})?$",
        },
        "GB": {
            "name": "United Kingdom",
            "continent": "EU",
            "postal_pattern": r"^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$",
        },
        "DE": {"name": "Germany", "continent": "EU", "postal_pattern": r"^\d{5}$"},
        "FR": {"name": "France", "continent": "EU", "postal_pattern": r"^\d{5}$"},
        "CA": {
            "name": "Canada",
            "continent": "NA",
            "postal_pattern": r"^[A-Z]\d[A-Z]\s*\d[A-Z]\d$",
        },
        "AU": {"name": "Australia", "continent": "OC", "postal_pattern": r"^\d{4}$"},
        "JP": {"name": "Japan", "continent": "AS", "postal_pattern": r"^\d{3}-\d{4}$"},
        "IT": {"name": "Italy", "continent": "EU", "postal_pattern": r"^\d{5}$"},
        "ES": {"name": "Spain", "continent": "EU", "postal_pattern": r"^\d{5}$"},
        "NL": {
            "name": "Netherlands",
            "continent": "EU",
            "postal_pattern": r"^\d{4}\s*[A-Z]{2}$",
        },
        "SE": {
            "name": "Sweden",
            "continent": "EU",
            "postal_pattern": r"^\d{3}\s*\d{2}$",
        },
        "NO": {"name": "Norway", "continent": "EU", "postal_pattern": r"^\d{4}$"},
        "DK": {"name": "Denmark", "continent": "EU", "postal_pattern": r"^\d{4}$"},
        "FI": {"name": "Finland", "continent": "EU", "postal_pattern": r"^\d{5}$"},
        "CH": {"name": "Switzerland", "continent": "EU", "postal_pattern": r"^\d{4}$"},
        "BR": {
            "name": "Brazil",
            "continent": "SA",
            "postal_pattern": r"^\d{5}-?\d{3}$",
        },
        "CN": {"name": "China", "continent": "AS", "postal_pattern": r"^\d{6}$"},
        "IN": {"name": "India", "continent": "AS", "postal_pattern": r"^\d{6}$"},
        "RU": {"name": "Russia", "continent": "EU", "postal_pattern": r"^\d{6}$"},
        "KR": {"name": "South Korea", "continent": "AS", "postal_pattern": r"^\d{5}$"},
        "SG": {"name": "Singapore", "continent": "AS", "postal_pattern": r"^\d{6}$"},
        "HK": {
            "name": "Hong Kong",
            "continent": "AS",
            "postal_pattern": r"^$",
        },  # No postal codes
        "TH": {"name": "Thailand", "continent": "AS", "postal_pattern": r"^\d{5}$"},
        "MY": {"name": "Malaysia", "continent": "AS", "postal_pattern": r"^\d{5}$"},
        "ID": {"name": "Indonesia", "continent": "AS", "postal_pattern": r"^\d{5}$"},
    }

    # Timezone validation data
    TIMEZONE_DATA = {
        "US": [
            "America/New_York",
            "America/Chicago",
            "America/Denver",
            "America/Los_Angeles",
            "America/Anchorage",
            "Pacific/Honolulu",
        ],
        "GB": ["Europe/London"],
        "DE": ["Europe/Berlin"],
        "FR": ["Europe/Paris"],
        "CA": [
            "America/Toronto",
            "America/Vancouver",
            "America/Montreal",
            "America/Edmonton",
        ],
        "AU": [
            "Australia/Sydney",
            "Australia/Melbourne",
            "Australia/Brisbane",
            "Australia/Perth",
        ],
        "JP": ["Asia/Tokyo"],
        "CN": ["Asia/Shanghai"],
        "IN": ["Asia/Kolkata"],
        "RU": [
            "Europe/Moscow",
            "Asia/Yekaterinburg",
            "Asia/Novosibirsk",
            "Asia/Irkutsk",
            "Asia/Vladivostok",
        ],
    }

    # High-risk geographic regions for fraud detection
    RISK_REGIONS = {
        "high_risk_countries": {
            "NG",
            "PK",
            "BD",
            "ID",
            "PH",
            "VN",
            "LK",
            "GH",
            "KE",
            "EG",
            "MA",
            "DZ",
            "TN",
            "LB",
            "JO",
            "IQ",
            "AF",
            "MM",
            "KH",
            "LA",
        },
        "medium_risk_countries": {
            "RU",
            "UA",
            "BY",
            "MD",
            "RS",
            "BA",
            "MK",
            "AL",
            "BG",
            "RO",
            "TR",
            "GE",
            "AM",
            "AZ",
            "KZ",
            "UZ",
            "KG",
            "TJ",
            "TM",
        },
        "sanctions_countries": {
            "IR",
            "KP",
            "SY",
            "CU",
            "VE",
            "MM",  # Example sanctioned countries
        },
    }

    # Major cities with coordinates for distance validation
    MAJOR_CITIES = {
        "US": {
            "New York": (40.7128, -74.0060),
            "Los Angeles": (34.0522, -118.2437),
            "Chicago": (41.8781, -87.6298),
            "Houston": (29.7604, -95.3698),
            "Miami": (25.7617, -80.1918),
        },
        "GB": {
            "London": (51.5074, -0.1278),
            "Manchester": (53.4808, -2.2426),
            "Birmingham": (52.4862, -1.8904),
        },
        "DE": {
            "Berlin": (52.5200, 13.4050),
            "Munich": (48.1351, 11.5820),
            "Hamburg": (53.5511, 9.9937),
        },
        "FR": {
            "Paris": (48.8566, 2.3522),
            "Lyon": (45.7640, 4.8357),
            "Marseille": (43.2965, 5.3698),
        },
    }

    def __init__(self):
        """Initialize geographic validation rules"""
        self.distance_cache = {}

    def validate_country_code(
        self, country_code: str
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate ISO 3166-1 alpha-2 country code with risk assessment.

        Args:
            country_code: Two-letter country code

        Returns:
            Tuple of (is_valid, error_message, country_analysis)
        """
        if not country_code or len(country_code) != 2:
            return False, "Invalid country code format", {}

        country_code = country_code.upper()

        if country_code not in self.COUNTRY_DATA:
            return False, f"Unsupported country code: {country_code}", {}

        country_info = self.COUNTRY_DATA[country_code]
        risk_level = self._assess_country_risk(country_code)

        country_analysis = {
            "country_name": country_info["name"],
            "continent": country_info["continent"],
            "risk_level": risk_level["level"],
            "risk_factors": risk_level["factors"],
            "is_sanctioned": country_code in self.RISK_REGIONS["sanctions_countries"],
        }

        # Block sanctioned countries
        if country_analysis["is_sanctioned"]:
            return (
                False,
                f"Transactions from {country_info['name']} are not permitted",
                country_analysis,
            )

        return True, None, country_analysis

    def validate_postal_code(
        self, postal_code: str, country_code: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate postal code format for specific country.

        Args:
            postal_code: Postal/ZIP code to validate
            country_code: Associated country code

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not postal_code:
            return True, None  # Postal codes are optional for some countries

        country_code = country_code.upper()
        if country_code not in self.COUNTRY_DATA:
            return (
                False,
                f"Cannot validate postal code for unknown country: {country_code}",
            )

        postal_pattern = self.COUNTRY_DATA[country_code]["postal_pattern"]
        if not postal_pattern:
            return True, None  # No postal code system (like Hong Kong)

        if not re.match(postal_pattern, postal_code.upper()):
            country_name = self.COUNTRY_DATA[country_code]["name"]
            return False, f"Invalid postal code format for {country_name}"

        return True, None

    def validate_coordinates(
        self, latitude: float, longitude: float
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate geographic coordinates and provide location analysis.

        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate

        Returns:
            Tuple of (is_valid, error_message, location_analysis)
        """
        try:
            coord = GeographicCoordinate(latitude, longitude)

            # Analyze location characteristics
            location_analysis = {
                "coordinates": {"lat": latitude, "lon": longitude},
                "hemisphere": self._get_hemisphere(latitude, longitude),
                "ocean_check": self._is_ocean_location(latitude, longitude),
                "timezone_estimate": self._estimate_timezone(longitude),
                "nearest_major_city": self._find_nearest_major_city(
                    latitude, longitude
                ),
            }

            return True, None, location_analysis

        except ValueError as e:
            return False, str(e), {}

    def validate_location_consistency(
        self, location_data: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate consistency between different location data points.

        Args:
            location_data: Dictionary with location information

        Returns:
            Tuple of (is_consistent, error_message, consistency_analysis)
        """
        inconsistencies = []
        consistency_score = 1.0

        country_code = location_data.get("country_code", "").upper()
        city = location_data.get("city", "")
        coordinates = location_data.get("coordinates")
        timezone = location_data.get("timezone", "")
        ip_location = location_data.get("ip_location", {})

        # Country-timezone consistency
        if country_code and timezone:
            expected_timezones = self.TIMEZONE_DATA.get(country_code, [])
            if expected_timezones and timezone not in expected_timezones:
                inconsistencies.append(
                    f"Timezone {timezone} not typical for {country_code}"
                )
                consistency_score -= 0.2

        # Coordinates-country consistency
        if coordinates and country_code:
            lat, lon = coordinates.get("lat"), coordinates.get("lon")
            if lat is not None and lon is not None:
                estimated_country = self._estimate_country_from_coordinates(lat, lon)
                if estimated_country and estimated_country != country_code:
                    inconsistencies.append(
                        f"Coordinates suggest {estimated_country} but country is {country_code}"
                    )
                    consistency_score -= 0.3

        # IP location consistency
        if ip_location and country_code:
            ip_country = ip_location.get("country_code", "").upper()
            if ip_country and ip_country != country_code:
                # Calculate distance between IP and stated location
                ip_coords = ip_location.get("coordinates")
                if ip_coords and coordinates:
                    distance = self._calculate_distance(
                        ip_coords.get("lat"),
                        ip_coords.get("lon"),
                        coordinates.get("lat"),
                        coordinates.get("lon"),
                    )
                    if distance > 1000:  # More than 1000 km apart
                        inconsistencies.append(
                            f"IP location ({ip_country}) far from stated location ({country_code})"
                        )
                        consistency_score -= 0.4

        # City-coordinates consistency
        if city and coordinates and country_code:
            city_coords = self._get_city_coordinates(city, country_code)
            if city_coords:
                distance = self._calculate_distance(
                    city_coords[0],
                    city_coords[1],
                    coordinates.get("lat"),
                    coordinates.get("lon"),
                )
                if distance > 100:  # More than 100 km from city center
                    inconsistencies.append(f"Coordinates far from stated city: {city}")
                    consistency_score -= 0.2

        is_consistent = consistency_score > 0.6
        error_message = None

        if not is_consistent:
            error_message = (
                f"Location inconsistencies detected: {', '.join(inconsistencies[:2])}"
            )

        consistency_analysis = {
            "consistency_score": max(consistency_score, 0.0),
            "inconsistencies": inconsistencies,
            "is_consistent": is_consistent,
            "requires_review": consistency_score < 0.8,
        }

        return is_consistent, error_message, consistency_analysis

    def validate_ip_geolocation(
        self, ip: str, stated_location: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate IP geolocation against stated location.

        Args:
            ip: IP address to geolocate
            stated_location: User's stated location

        Returns:
            Tuple of (is_consistent, error_message, geolocation_analysis)
        """
        # This would typically use a geolocation service
        # For now, return a basic analysis structure

        # Mock geolocation data (would be from MaxMind, IP2Location, etc.)
        mock_ip_location = {
            "country_code": "US",
            "city": "San Francisco",
            "coordinates": {"lat": 37.7749, "lon": -122.4194},
            "isp": "Example ISP",
            "is_vpn": False,
            "is_proxy": False,
            "accuracy_radius": 50,
        }

        inconsistencies = []
        risk_score = 0.0

        stated_country = stated_location.get("country_code", "").upper()
        stated_coords = stated_location.get("coordinates", {})

        # Compare countries
        if stated_country and mock_ip_location["country_code"] != stated_country:
            inconsistencies.append(
                f"IP country ({mock_ip_location['country_code']}) differs from stated ({stated_country})"
            )
            risk_score += 0.4

        # Compare coordinates if available
        if stated_coords and mock_ip_location["coordinates"]:
            distance = self._calculate_distance(
                stated_coords.get("lat"),
                stated_coords.get("lon"),
                mock_ip_location["coordinates"]["lat"],
                mock_ip_location["coordinates"]["lon"],
            )

            if distance > 500:  # More than 500 km difference
                inconsistencies.append(
                    f"IP location {distance:.0f} km from stated location"
                )
                risk_score += 0.3

        # Check for VPN/Proxy usage
        if mock_ip_location.get("is_vpn") or mock_ip_location.get("is_proxy"):
            inconsistencies.append("VPN/Proxy usage detected")
            risk_score += 0.5

        is_consistent = risk_score < 0.5
        error_message = None

        if not is_consistent:
            error_message = (
                f"IP geolocation inconsistencies: {', '.join(inconsistencies[:2])}"
            )

        geolocation_analysis = {
            "ip_location": mock_ip_location,
            "distance_km": distance if "distance" in locals() else None,
            "inconsistencies": inconsistencies,
            "risk_score": min(risk_score, 1.0),
            "is_consistent": is_consistent,
        }

        return is_consistent, error_message, geolocation_analysis

    def _assess_country_risk(self, country_code: str) -> Dict[str, Any]:
        """Assess fraud/security risk level for country"""
        factors = []

        if country_code in self.RISK_REGIONS["high_risk_countries"]:
            level = "high"
            factors.append("High fraud rate region")
        elif country_code in self.RISK_REGIONS["medium_risk_countries"]:
            level = "medium"
            factors.append("Elevated fraud risk")
        elif country_code in self.RISK_REGIONS["sanctions_countries"]:
            level = "critical"
            factors.append("Sanctioned country")
        else:
            level = "low"

        return {"level": level, "factors": factors}

    def _get_hemisphere(self, latitude: float, longitude: float) -> Dict[str, str]:
        """Determine hemisphere information"""
        return {
            "north_south": "North" if latitude >= 0 else "South",
            "east_west": "East" if longitude >= 0 else "West",
        }

    def _is_ocean_location(self, latitude: float, longitude: float) -> bool:
        """Simple check if coordinates are likely in ocean"""
        # This is a very basic check - real implementation would use land/water datasets
        # Major ocean areas (rough approximation)
        ocean_areas = [
            # Atlantic Ocean areas
            ((-60, 60), (-80, 20)),
            # Pacific Ocean areas
            ((-60, 60), (-180, -80)),
            ((-60, 60), (120, 180)),
        ]

        for lat_range, lon_range in ocean_areas:
            if (
                lat_range[0] <= latitude <= lat_range[1]
                and lon_range[0] <= longitude <= lon_range[1]
            ):
                return True

        return False

    def _estimate_timezone(self, longitude: float) -> str:
        """Estimate timezone from longitude"""
        # Simple timezone estimation (longitude-based)
        offset = longitude / 15  # 15 degrees per hour

        if -7.5 <= offset < 7.5:
            return "UTC"
        elif offset >= 7.5:
            hours = int(offset + 0.5)
            return f"UTC+{hours}"
        else:
            hours = int(-offset + 0.5)
            return f"UTC-{hours}"

    def _find_nearest_major_city(
        self, latitude: float, longitude: float
    ) -> Dict[str, Any]:
        """Find nearest major city to coordinates"""
        nearest_city = None
        min_distance = float("inf")

        for country, cities in self.MAJOR_CITIES.items():
            for city_name, (city_lat, city_lon) in cities.items():
                distance = self._calculate_distance(
                    latitude, longitude, city_lat, city_lon
                )
                if distance < min_distance:
                    min_distance = distance
                    nearest_city = {
                        "name": city_name,
                        "country": country,
                        "distance_km": distance,
                    }

        return nearest_city

    def _calculate_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two points using Haversine formula"""
        if any(x is None for x in [lat1, lon1, lat2, lon2]):
            return 0.0

        # Use cache for performance
        cache_key = f"{lat1:.4f},{lon1:.4f},{lat2:.4f},{lon2:.4f}"
        if cache_key in self.distance_cache:
            return self.distance_cache[cache_key]

        # Convert to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))

        # Earth's radius in kilometers
        r = 6371
        distance = r * c

        # Cache result
        if len(self.distance_cache) < 1000:
            self.distance_cache[cache_key] = distance

        return distance

    def _estimate_country_from_coordinates(
        self, latitude: float, longitude: float
    ) -> Optional[str]:
        """Estimate country from coordinates (simplified)"""
        # This is a very basic implementation
        # Real implementation would use a geographic database

        # North America
        if 25 <= latitude <= 70 and -170 <= longitude <= -50:
            if longitude > -130:
                return "US"
            else:
                return "CA"

        # Europe
        elif 35 <= latitude <= 75 and -15 <= longitude <= 50:
            if 50 <= latitude <= 60 and -5 <= longitude <= 5:
                return "GB"
            elif 47 <= latitude <= 55 and 5 <= longitude <= 15:
                return "DE"
            elif 42 <= latitude <= 52 and -5 <= longitude <= 10:
                return "FR"

        # Asia
        elif 0 <= latitude <= 60 and 60 <= longitude <= 180:
            if 20 <= latitude <= 45 and 100 <= longitude <= 130:
                return "CN"
            elif 30 <= latitude <= 46 and 130 <= longitude <= 146:
                return "JP"

        return None

    def _get_city_coordinates(
        self, city: str, country_code: str
    ) -> Optional[Tuple[float, float]]:
        """Get coordinates for a known city"""
        cities = self.MAJOR_CITIES.get(country_code, {})
        return cities.get(city)
