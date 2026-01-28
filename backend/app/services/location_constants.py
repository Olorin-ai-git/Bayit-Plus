"""Location service constants and configuration."""

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
