"""Location service constants and configuration."""

from typing import Dict, Tuple

# Israeli city coordinates with Hebrew translations
ISRAELI_CITIES: Dict[str, Dict[str, any]] = {
    "Jerusalem": {
        "latitude": 31.7683,
        "longitude": 35.2137,
        "hebrew": "ירושלים"
    },
    "Tel Aviv": {
        "latitude": 32.0853,
        "longitude": 34.7818,
        "hebrew": "תל אביב"
    },
    "Haifa": {
        "latitude": 32.7940,
        "longitude": 34.9896,
        "hebrew": "חיפה"
    },
    "Be'er Sheva": {
        "latitude": 31.2518,
        "longitude": 34.7913,
        "hebrew": "באר שבע"
    },
    "Eilat": {
        "latitude": 29.5577,
        "longitude": 34.9519,
        "hebrew": "אילת"
    },
    "Netanya": {
        "latitude": 32.3343,
        "longitude": 34.8539,
        "hebrew": "נתניה"
    },
    "Ashdod": {
        "latitude": 31.8044,
        "longitude": 34.6553,
        "hebrew": "אשדוד"
    },
    "Rishon LeZion": {
        "latitude": 31.9730,
        "longitude": 34.7925,
        "hebrew": "ראשון לציון"
    },
    "Petah Tikva": {
        "latitude": 32.0878,
        "longitude": 34.8883,
        "hebrew": "פתח תקווה"
    },
    "Holon": {
        "latitude": 32.0116,
        "longitude": 34.7750,
        "hebrew": "חולון"
    },
}

# Reference coordinates for content services
JERUSALEM_COORDS: Tuple[float, float] = (31.7683, 35.2137)
TEL_AVIV_COORDS: Tuple[float, float] = (32.0853, 34.7818)

# Default radius settings (confirmed by architectural decision)
JERUSALEM_DEFAULT_RADIUS_KM: float = 50.0
TEL_AVIV_DEFAULT_RADIUS_KM: float = 20.0

# Major US cities with coordinates for location-based content
MAJOR_US_CITIES = {
    "NY": {"city": "New York", "county": "New York County", "latitude": 40.7128, "longitude": -74.0060},
    "CA": {"city": "Los Angeles", "county": "Los Angeles County", "latitude": 34.0522, "longitude": -118.2437},
    "IL": {"city": "Chicago", "county": "Cook County", "latitude": 41.8781, "longitude": -87.6298},
    "TX": {"city": "Houston", "county": "Harris County", "latitude": 29.7604, "longitude": -95.3698},
    "AZ": {"city": "Phoenix", "county": "Maricopa County", "latitude": 33.4484, "longitude": -112.0742},
    "PA": {"city": "Philadelphia", "county": "Philadelphia County", "latitude": 39.9526, "longitude": -75.1652},
    "FL": {"city": "Miami", "county": "Miami-Dade County", "latitude": 25.7617, "longitude": -80.1918},
    "MA": {"city": "Boston", "county": "Suffolk County", "latitude": 42.3601, "longitude": -71.0589},
    "WA": {"city": "Seattle", "county": "King County", "latitude": 47.6062, "longitude": -122.3321},
}

# City coordinates lookup for common US cities
CITY_COORDINATES = {
    ("New York", "NY"): {"latitude": 40.7128, "longitude": -74.0060},
    ("Los Angeles", "CA"): {"latitude": 34.0522, "longitude": -118.2437},
    ("Chicago", "IL"): {"latitude": 41.8781, "longitude": -87.6298},
    ("Houston", "TX"): {"latitude": 29.7604, "longitude": -95.3698},
    ("Phoenix", "AZ"): {"latitude": 33.4484, "longitude": -112.0742},
    ("Philadelphia", "PA"): {"latitude": 39.9526, "longitude": -75.1652},
    ("Miami", "FL"): {"latitude": 25.7617, "longitude": -80.1918},
    ("Boston", "MA"): {"latitude": 42.3601, "longitude": -71.0589},
    ("Seattle", "WA"): {"latitude": 47.6062, "longitude": -122.3321},
    ("Denver", "CO"): {"latitude": 39.7392, "longitude": -104.9903},
    ("Austin", "TX"): {"latitude": 30.2672, "longitude": -97.7431},
    ("Portland", "OR"): {"latitude": 45.5152, "longitude": -122.6784},
    ("San Francisco", "CA"): {"latitude": 37.7749, "longitude": -122.4194},
    ("Washington", "DC"): {"latitude": 38.9072, "longitude": -77.0369},
    ("Nashville", "TN"): {"latitude": 36.1627, "longitude": -86.7816},
}
