# Security Assessment: Location-Aware Content Feature ("Israelis in [City]")
## Bayit+ Platform

**Assessment Date:** January 27, 2026
**Assessor:** Security Specialist
**Feature:** Location-based content discovery for Israeli diaspora communities
**Severity:** MEDIUM (Multiple security concerns requiring immediate remediation)

---

## EXECUTIVE SUMMARY

The location-aware content feature implements geolocation detection and reverse geocoding to deliver localized content. While the architecture is generally sound, **five critical security vulnerabilities** have been identified that require remediation before production deployment:

| # | Vulnerability | Severity | Status |
|---|---|---|---|
| 1 | Missing GeoNames API configuration | CRITICAL | NOT CONFIGURED |
| 2 | No rate limiting on reverse geocoding endpoint | HIGH | UNPROTECTED |
| 3 | Unauthenticated API access to location content | MEDIUM | OPEN TO ALL |
| 4 | MongoDB injection risk in location queries | HIGH | POTENTIAL |
| 5 | Privacy violation: Location stored without explicit consent | MEDIUM | MISSING CONSENT |

**Recommendation:** Do not deploy to production until all CRITICAL and HIGH issues are remediated.

---

## DETAILED VULNERABILITY ANALYSIS

### 1. MISSING GEONAMES API CONFIGURATION
**Severity:** CRITICAL
**Component:** `backend/app/services/location_service.py` (line 168-172)
**Risk Level:** CRITICAL - Feature will not function

#### Description
The location service attempts to retrieve the GeoNames API username from settings:

```python
geonames_username = settings.get("GEONAMES_USERNAME")

if not geonames_username:
    logger.warning("GEONAMES_USERNAME not configured")
    return None
```

**Issues Identified:**
- `GEONAMES_USERNAME` is not defined in `/backend/app/core/config.py`
- No validation to ensure the credential is configured
- When missing, the entire reverse geocoding fails silently
- Frontend will receive `null` location data, causing location-based content to fail

#### Attack Scenario
1. Attacker observes location feature returning no results
2. No error feedback to user indicates misconfiguration
3. Application appears broken; users unable to access location-based content
4. Silent failure may mask other security issues

#### Remediation Steps

**Step 1: Add GeoNames Configuration to Settings** (`backend/app/core/config.py`)

Add after line 409 (OpenSubtitles configuration):

```python
# GeoNames API Configuration (for location reverse geocoding)
GEONAMES_USERNAME: str = ""  # Required for location feature
GEONAMES_TIMEOUT_SECONDS: int = 10
GEONAMES_MAX_RETRIES: int = 2

@field_validator("GEONAMES_USERNAME")
@classmethod
def validate_geonames_username(cls, v: str) -> str:
    """Validate GeoNames username is configured for production."""
    import os
    is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")

    if is_prod and not v:
        raise ValueError(
            "GEONAMES_USERNAME must be configured in production. "
            "Obtain free account from https://www.geonames.org/login"
        )
    return v
```

**Step 2: Update Location Service** (`backend/app/services/location_service.py`)

```python
async def _fetch_from_geonames(
    self, latitude: float, longitude: float
) -> Optional[LocationData]:
    """Fetch location data from GeoNames API."""
    try:
        geonames_username = settings.GEONAMES_USERNAME

        if not geonames_username:
            logger.error("GeoNames API not configured - location feature unavailable")
            raise ValueError("GeoNames API username not configured")

        # Validate coordinates
        if not self._validate_coordinates(latitude, longitude):
            logger.warning(f"Invalid coordinates: ({latitude}, {longitude})")
            return None

        url = f"{self.GEONAMES_BASE_URL}/findNearbyJSON"
        params = {
            "lat": latitude,
            "lng": longitude,
            "username": geonames_username,
            "featureClass": "P",  # Cities only
            "maxRows": 1,
        }

        async with httpx.AsyncClient(
            timeout=settings.GEONAMES_TIMEOUT_SECONDS
        ) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            if data.get("geonames"):
                location = data["geonames"][0]
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

    except httpx.TimeoutException:
        logger.error(f"GeoNames API timeout for coordinates ({latitude}, {longitude})")
        return None
    except httpx.HTTPError as e:
        logger.error(f"GeoNames API error: {e}")
        return None
    except Exception as e:
        logger.error(f"Error parsing GeoNames response: {e}")
        return None

@staticmethod
def _validate_coordinates(latitude: float, longitude: float) -> bool:
    """Validate geographic coordinates are within valid ranges."""
    try:
        # Latitude: -90 to 90
        if not -90 <= float(latitude) <= 90:
            return False
        # Longitude: -180 to 180
        if not -180 <= float(longitude) <= 180:
            return False
        return True
    except (ValueError, TypeError):
        return False
```

**Step 3: Update Environment Configuration**

Create `.env` entry:
```bash
GEONAMES_USERNAME=your_geonames_username
GEONAMES_TIMEOUT_SECONDS=10
GEONAMES_MAX_RETRIES=2
```

---

### 2. NO RATE LIMITING ON REVERSE GEOCODING ENDPOINT
**Severity:** HIGH
**Component:** `backend/app/api/routes/location.py` (line 20-73)
**Risk Level:** HIGH - DDoS vulnerability

#### Description
The `/location/reverse-geocode` endpoint has NO authentication requirement and NO rate limiting:

```python
@router.get("/location/reverse-geocode")
async def reverse_geocode(
    latitude: float = Query(...),
    longitude: float = Query(...),
):
    """Convert geographic coordinates to city/state/county."""
    # NO authentication check
    # NO rate limiting
    # Direct call to external API (GeoNames)
```

**Security Implications:**

1. **Unauthenticated Abuse:** Any user can call endpoint without authentication
2. **API Quota Exhaustion:** GeoNames has usage limits; abuse exhausts quota
3. **DDoS Vector:** Attackers can hammer endpoint with random coordinates
4. **Cost Explosion:** GeoNames premium accounts may incur charges for abuse
5. **Service Degradation:** Legitimate users unable to access feature during attack

#### Attack Scenario
```bash
# Attacker script
for i in {1..10000}; do
  lat=$(shuf -i -9000-9000 -n 1)
  lng=$(shuf -i -18000-18000 -n 1)
  curl "https://api.bayit.tv/api/v1/location/reverse-geocode?latitude=$lat&longitude=$lng"
done
```

**Impact:**
- GeoNames quota exhausted in minutes
- Legitimate location feature stops working
- Platform reputation damaged
- Potential financial impact if premium tier

#### Remediation Steps

**Step 1: Create Rate Limiting Middleware**

Create `backend/app/middleware/rate_limit.py`:

```python
"""
Rate limiting middleware for API endpoints.
Uses sliding window with Redis or in-memory storage.
"""

import logging
import time
from typing import Optional
from collections import defaultdict
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


class RateLimiter:
    """In-memory rate limiter with sliding window algorithm."""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.window_seconds = 60

    def is_allowed(self, key: str) -> bool:
        """
        Check if request from key is allowed under rate limit.

        Args:
            key: Identifier (IP address, user ID, etc.)

        Returns:
            True if request allowed, False if rate limited
        """
        now = time.time()
        cutoff = now - self.window_seconds

        # Remove old requests outside window
        if key in self.requests:
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if req_time > cutoff
            ]

        # Check if under limit
        if len(self.requests[key]) < self.requests_per_minute:
            self.requests[key].append(now)
            return True

        return False

    def get_remaining(self, key: str) -> int:
        """Get remaining requests for key."""
        now = time.time()
        cutoff = now - self.window_seconds

        if key in self.requests:
            valid_requests = [
                req_time for req_time in self.requests[key]
                if req_time > cutoff
            ]
            return max(0, self.requests_per_minute - len(valid_requests))

        return self.requests_per_minute


# Global rate limiters for different endpoints
geolocation_limiter = RateLimiter(requests_per_minute=30)  # 30/min per IP
location_content_limiter = RateLimiter(requests_per_minute=60)  # 60/min per IP


class RateLimitException(Exception):
    """Raised when rate limit is exceeded."""

    def __init__(self, retry_after: int = 60):
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded. Retry after {retry_after}s")
```

**Step 2: Apply Rate Limiting to Endpoints**

Update `backend/app/api/routes/location.py`:

```python
"""Location service endpoints for geolocation and reverse geocoding."""

import logging
from typing import Optional

from fastapi import APIRouter, Query, Request, status, HTTPException
from fastapi.responses import JSONResponse

from app.services.location_service import LocationService
from app.middleware.rate_limit import geolocation_limiter, RateLimitException

router = APIRouter()
logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    # Check X-Forwarded-For header (behind proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # Fall back to direct connection
    return request.client.host if request.client else "unknown"


@router.get("/location/reverse-geocode")
async def reverse_geocode(
    request: Request,
    latitude: float = Query(..., description="Geographic latitude", ge=-90, le=90),
    longitude: float = Query(..., description="Geographic longitude", ge=-180, le=180),
):
    """
    Convert geographic coordinates to city/state/county.

    Rate Limited: 30 requests per minute per IP

    Query Parameters:
        latitude: Geographic latitude (-90 to 90) - REQUIRED
        longitude: Geographic longitude (-180 to 180) - REQUIRED

    Returns:
        {
            "city": string,
            "state": string,
            "county": string or null,
            "latitude": float,
            "longitude": float,
            "source": "geonames" or "cache"
        }

    Error Responses:
        429 Too Many Requests - Rate limit exceeded
        400 Bad Request - Invalid coordinates
        503 Service Unavailable - GeoNames API unavailable
    """
    try:
        # Rate limiting by IP
        client_ip = get_client_ip(request)

        if not geolocation_limiter.is_allowed(client_ip):
            remaining = geolocation_limiter.get_remaining(client_ip)
            logger.warning(
                f"Rate limit exceeded for geolocation from {client_ip}",
                extra={"client_ip": client_ip}
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Too many requests. Maximum 30 per minute.",
                    "retry_after": 60,
                },
                headers={"Retry-After": "60"},
            )

        # Validate coordinates
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            logger.warning(
                f"Invalid coordinates: ({latitude}, {longitude}) from {client_ip}",
                extra={"client_ip": client_ip, "lat": latitude, "lng": longitude}
            )
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "invalid_coordinates",
                    "message": "Latitude must be -90 to 90, longitude -180 to 180",
                },
            )

        # Perform reverse geocoding
        service = LocationService()
        location = await service.reverse_geocode(latitude, longitude)

        if location:
            logger.info(
                f"Reverse geocode: ({latitude}, {longitude}) -> {location.city}, {location.state}",
                extra={"client_ip": client_ip, "city": location.city, "state": location.state}
            )
            return location.to_dict()

        logger.warning(
            f"No location found for coordinates: ({latitude}, {longitude})",
            extra={"client_ip": client_ip, "lat": latitude, "lng": longitude}
        )
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "location_not_found",
                "message": f"Could not determine location for coordinates ({latitude}, {longitude})",
            },
        )

    except Exception as e:
        logger.error(
            f"Error in reverse_geocode: {e}",
            extra={"client_ip": get_client_ip(request), "latitude": latitude, "longitude": longitude},
            exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "service_error",
                "message": "Location service temporarily unavailable",
            },
        )
```

**Step 3: Add Rate Limiting to Content Endpoint**

Update `backend/app/api/routes/content/location.py`:

```python
"""Location-based Israeli content endpoint."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import JSONResponse

from app.api.routes.content.utils import is_series_by_category
from app.core.security import get_optional_user, get_passkey_session
from app.models.user import User
from app.services.location_content_service import LocationContentService
from app.middleware.rate_limit import location_content_limiter

router = APIRouter()
logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("/israelis-in-city")
async def get_israelis_in_city(
    request: Request,
    city: str = Query(..., description="City name (e.g., 'New York')", min_length=2, max_length=100),
    state: str = Query(..., description="Two-letter state code (e.g., 'NY')", regex="^[A-Z]{2}$"),
    county: Optional[str] = Query(None, description="County name (optional)", max_length=100),
    limit_per_type: int = Query(
        10, ge=1, le=50, description="Max items per content type"
    ),
    include_articles: bool = Query(True, description="Include news articles"),
    include_reels: bool = Query(True, description="Include news reels"),
    include_events: bool = Query(True, description="Include community events"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get Israeli-focused content for a specific US city.

    Rate Limited: 60 requests per minute per IP

    Returns aggregated content (news articles, reels, community events) related
    to the Israeli community in the specified city.

    Query Parameters:
        city: City name (required, 2-100 chars)
        state: Two-letter state code (required, e.g., "NY", "CA")
        county: County name (optional, 2-100 chars)
        limit_per_type: Max items per content type (1-50, default 10)
        include_articles: Include news articles (default true)
        include_reels: Include news reels (default true)
        include_events: Include community events (default true)
    """
    try:
        # Rate limiting by IP
        client_ip = get_client_ip(request)

        if not location_content_limiter.is_allowed(client_ip):
            logger.warning(
                f"Rate limit exceeded for location content from {client_ip}",
                extra={"client_ip": client_ip, "city": city, "state": state}
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Too many requests. Maximum 60 per minute.",
                    "retry_after": 60,
                },
                headers={"Retry-After": "60"},
            )

        # Validate input
        city = city.strip()
        state = state.upper().strip()

        if len(city) < 2:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "invalid_city",
                    "message": "City must be at least 2 characters",
                },
            )

        if len(state) != 2:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "invalid_state",
                    "message": "State must be a two-letter code (e.g., 'NY')",
                },
            )

        # Log request
        logger.info(
            f"Location content query: {city}, {state}",
            extra={
                "client_ip": client_ip,
                "city": city,
                "state": state,
                "user_id": current_user.id if current_user else None,
            }
        )

        # Fetch location-based content
        service = LocationContentService()
        result = await service.get_israelis_in_city(
            city=city,
            state=state,
            county=county,
            limit_per_type=limit_per_type,
            include_articles=include_articles,
            include_reels=include_reels,
            include_events=include_events,
        )

        return result

    except Exception as e:
        logger.error(
            f"Error in get_israelis_in_city: {e}",
            extra={"client_ip": get_client_ip(request), "city": city, "state": state},
            exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "service_error",
                "message": "Failed to fetch location-based content",
            },
        )
```

**Step 4: Update Application Startup**

Add rate limiter setup to `backend/app/main.py`:

```python
# Add after FastAPI app initialization
from app.middleware.rate_limit import geolocation_limiter, location_content_limiter

# Configure rate limiters
geolocation_limiter = RateLimiter(requests_per_minute=30)
location_content_limiter = RateLimiter(requests_per_minute=60)

# Log configuration
logger.info(
    "Rate limiters configured",
    extra={
        "geolocation_limit": 30,
        "location_content_limit": 60,
    }
)
```

---

### 3. UNAUTHENTICATED API ACCESS TO LOCATION CONTENT
**Severity:** MEDIUM
**Component:** `backend/app/api/routes/content/location.py` (line 22-35)
**Risk Level:** MEDIUM - Information disclosure

#### Description
The `/content/israelis-in-city` endpoint accepts unauthenticated requests:

```python
current_user: Optional[User] = Depends(get_optional_user),
```

The endpoint is accessible to all users (authenticated and unauthenticated). While the content itself is public (news articles, events), there are privacy and policy considerations:

**Security Implications:**

1. **Privacy Policy Violation:** Users haven't agreed to location tracking if unauthenticated
2. **Abuse Vector:** Can be used to discover which cities have content
3. **Analytics Gap:** Cannot associate usage with users for metrics
4. **Subscription Bypass:** Premium features might use location data

#### Remediation Steps

**Option 1: Require Authentication (Recommended)**

Add authentication requirement to endpoint:

```python
from app.core.security import get_current_user  # Changed from get_optional_user

@router.get("/israelis-in-city")
async def get_israelis_in_city(
    request: Request,
    city: str = Query(...),
    state: str = Query(...),
    # ... other parameters
    current_user: User = Depends(get_current_user),  # REQUIRED
):
    """
    Get Israeli-focused content for a specific US city.

    Requires authentication to:
    - Track user location preferences
    - Comply with privacy policy
    - Enable personalization
    """
```

**Option 2: Allow Unauthenticated but Require Consent**

If unauthenticated access is required for discoverability:

```python
@router.get("/israelis-in-city")
async def get_israelis_in_city(
    request: Request,
    city: str = Query(...),
    state: str = Query(...),
    consent: bool = Query(
        ...,
        description="User acknowledges location data usage per privacy policy",
    ),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Require explicit consent for location data usage."""

    if not consent:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "consent_required",
                "message": "Location tracking requires explicit consent. See privacy policy.",
                "privacy_policy_url": "https://bayit.tv/privacy",
            },
        )

    # Log consent
    client_ip = get_client_ip(request)
    logger.info(
        f"Location consent given for {city}, {state}",
        extra={
            "client_ip": client_ip,
            "user_id": current_user.id if current_user else None,
            "city": city,
            "state": state,
        }
    )
```

**Recommended Implementation:**

Use Option 1 (require authentication). Update OAuth flow to include location features as part of onboarding.

---

### 4. MONGODB INJECTION RISK IN LOCATION QUERIES
**Severity:** HIGH
**Component:** `backend/app/services/location_content_service.py` (lines 166-191, 254-286, 354-370)
**Risk Level:** HIGH - Data exposure/manipulation

#### Description
The service builds MongoDB aggregation queries using string interpolation without sanitization:

```python
# Line 172-173: VULNERABLE
"title": {
    "$regex": f"(?i)({city}|{state}|israeli)",
},

# Line 256-257: VULNERABLE
"title": {
    "$regex": f"(?i)({city}|{state}|israeli)",
},

# Line 354: VULNERABLE
"location": {"$regex": f"(?i){city}"},
```

**Attack Scenario:**

Attacker provides malicious input:
```
city = "New York) }; db.content.deleteMany({": ""
```

This could potentially escape the regex and inject MongoDB operations.

**Remediation Steps**

**Step 1: Create Input Sanitization**

Create `backend/app/utils/query_sanitizer.py`:

```python
"""
Sanitization utilities for MongoDB query construction.
Prevents injection and validates input.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class QuerySanitizer:
    """Sanitizes user input for safe MongoDB queries."""

    # Maximum lengths for various fields
    MAX_CITY_LENGTH = 100
    MAX_STATE_LENGTH = 2
    MAX_COUNTY_LENGTH = 100

    # Valid state codes (US only)
    VALID_US_STATES = {
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
        "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
        # Also allow DC, AS, GU, MP, PR, UM, VI
        "DC", "AS", "GU", "MP", "PR", "UM", "VI",
    }

    @staticmethod
    def sanitize_city(city: str) -> str:
        """
        Sanitize city name for safe use in queries.

        Args:
            city: User-provided city name

        Returns:
            Sanitized city name

        Raises:
            ValueError: If city fails validation
        """
        if not city:
            raise ValueError("City cannot be empty")

        city = city.strip()

        if len(city) > QuerySanitizer.MAX_CITY_LENGTH:
            raise ValueError(f"City exceeds maximum length ({QuerySanitizer.MAX_CITY_LENGTH})")

        if len(city) < 2:
            raise ValueError("City must be at least 2 characters")

        # Remove dangerous characters (only allow alphanumeric, spaces, hyphens, apostrophes)
        # This is strict but safe
        sanitized = re.sub(r"[^a-zA-Z\s\-']", "", city)

        if not sanitized:
            raise ValueError("City contains no valid characters")

        # Prevent MongoDB operators
        if any(op in sanitized.lower() for op in ["$", "{", "}", ";", "\\"]):
            raise ValueError("City contains prohibited characters")

        # Escape special regex characters for safe regex use
        escaped = re.escape(sanitized)

        logger.debug(f"Sanitized city: '{city}' -> '{escaped}'")
        return escaped

    @staticmethod
    def sanitize_state(state: str) -> str:
        """
        Sanitize state code for safe use in queries.

        Args:
            state: User-provided state code

        Returns:
            Validated state code (uppercase)

        Raises:
            ValueError: If state is invalid
        """
        if not state:
            raise ValueError("State cannot be empty")

        state = state.upper().strip()

        if len(state) != 2:
            raise ValueError("State must be exactly 2 characters")

        if not state.isalpha():
            raise ValueError("State must contain only letters")

        if state not in QuerySanitizer.VALID_US_STATES:
            raise ValueError(f"'{state}' is not a valid US state code")

        logger.debug(f"Validated state: {state}")
        return state

    @staticmethod
    def sanitize_county(county: Optional[str]) -> Optional[str]:
        """
        Sanitize county name for safe use in queries.

        Args:
            county: User-provided county name (optional)

        Returns:
            Sanitized county name or None

        Raises:
            ValueError: If county fails validation
        """
        if county is None:
            return None

        if not county:
            return None

        county = county.strip()

        if len(county) > QuerySanitizer.MAX_COUNTY_LENGTH:
            raise ValueError(f"County exceeds maximum length ({QuerySanitizer.MAX_COUNTY_LENGTH})")

        # Remove dangerous characters
        sanitized = re.sub(r"[^a-zA-Z\s\-']", "", county)

        if not sanitized:
            return None

        # Escape special regex characters
        escaped = re.escape(sanitized)

        logger.debug(f"Sanitized county: '{county}' -> '{escaped}'")
        return escaped

    @staticmethod
    def build_regex_pattern(keywords: list[str]) -> str:
        """
        Build a safe MongoDB regex pattern from keywords.

        Args:
            keywords: List of keywords to search for

        Returns:
            Safe regex pattern string
        """
        if not keywords:
            raise ValueError("Keywords list cannot be empty")

        # Escape each keyword and join with OR operator
        escaped_keywords = [re.escape(kw) for kw in keywords if kw]

        if not escaped_keywords:
            raise ValueError("No valid keywords after sanitization")

        # Create case-insensitive pattern
        pattern = f"({'|'.join(escaped_keywords)})"

        logger.debug(f"Built regex pattern: {pattern}")
        return pattern


# Validation decorator
def validate_city_state(func):
    """Decorator to validate city and state parameters before function execution."""

    def wrapper(*args, city: str, state: str, county: Optional[str] = None, **kwargs):
        try:
            # Validate and sanitize inputs
            sanitized_city = QuerySanitizer.sanitize_city(city)
            sanitized_state = QuerySanitizer.sanitize_state(state)
            sanitized_county = QuerySanitizer.sanitize_county(county)

            # Call function with sanitized values
            return func(
                *args,
                city=sanitized_city,
                state=sanitized_state,
                county=sanitized_county,
                **kwargs
            )
        except ValueError as e:
            logger.warning(f"Input validation failed: {e}", extra={"city": city, "state": state})
            raise

    return wrapper
```

**Step 2: Update Location Content Service**

Update `backend/app/services/location_content_service.py`:

```python
"""Location-based content service with injection prevention."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
import asyncio

from app.core.database import db
from app.models.content import Content
from app.utils.query_sanitizer import QuerySanitizer

logger = logging.getLogger(__name__)


class LocationContentService:
    """Service for aggregating Israeli-focused content by US location."""

    async def get_israelis_in_city(
        self,
        city: str,
        state: str,
        county: Optional[str] = None,
        limit_per_type: int = 10,
        include_articles: bool = True,
        include_reels: bool = True,
        include_events: bool = True,
    ) -> dict:
        """
        Get all Israeli-focused content for a specific city.

        Sanitizes all inputs to prevent MongoDB injection.
        """
        try:
            # Sanitize inputs
            city = QuerySanitizer.sanitize_city(city)
            state = QuerySanitizer.sanitize_state(state)
            county = QuerySanitizer.sanitize_county(county)

        except ValueError as e:
            logger.warning(f"Input validation failed: {e}")
            raise

        result = {
            "location": {
                "city": city,
                "state": state,
                "county": county,
            },
            "content": {
                "news_articles": [],
                "news_reels": [],
                "community_events": [],
            },
            "total_items": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "coverage": {
                "has_content": False,
                "nearest_major_city": None,
                "fallback_region": None,
            },
        }

        # Fetch content in parallel
        tasks = []

        if include_articles:
            tasks.append(self.fetch_news_articles(city, state, limit_per_type))

        if include_reels:
            tasks.append(self.fetch_news_reels(city, state, limit_per_type))

        if include_events:
            tasks.append(self.fetch_community_events(city, state, limit_per_type))

        # Execute all tasks concurrently
        if tasks:
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(f"Error fetching content: {response}")
                    continue

                if include_articles and i == 0:
                    result["content"]["news_articles"] = response
                elif include_reels and (
                    (include_articles and i == 1) or (not include_articles and i == 0)
                ):
                    result["content"]["news_reels"] = response
                elif include_events:
                    result["content"]["community_events"] = response

        # Calculate totals
        total = (
            len(result["content"]["news_articles"])
            + len(result["content"]["news_reels"])
            + len(result["content"]["community_events"])
        )

        result["total_items"] = total
        result["coverage"]["has_content"] = total > 0

        return result

    async def fetch_news_articles(
        self, city: str, state: str, limit: int = 10
    ) -> list:
        """
        Fetch news articles with INJECTION-SAFE queries.
        """
        try:
            content_collection = db.get_collection("content")

            # Build keywords list - already sanitized by caller
            keywords = [city, state, "israeli"]

            # Build safe regex pattern
            regex_pattern = QuerySanitizer.build_regex_pattern(keywords)

            # Build query with validated inputs
            match = {
                "$and": [
                    {
                        "$or": [
                            {"title": {"$regex": regex_pattern, "$options": "i"}},
                            {"description": {"$regex": regex_pattern, "$options": "i"}},
                            {
                                "topic_tags": {
                                    "$in": ["israeli", "israel", "jewish_community"]
                                }
                            },
                        ]
                    },
                    {"is_published": True},
                    {"content_format": {"$in": ["documentary", "news", "article"]}},
                    {"visibility_mode": {"$in": ["public", None]}},
                ]
            }

            pipeline = [
                {"$match": match},
                {"$sort": {"published_at": -1, "created_at": -1}},
                {"$limit": limit},
                {
                    "$project": {
                        "id": "$_id",
                        "title": 1,
                        "description": 1,
                        "thumbnail": 1,
                        "content_format": 1,
                        "topic_tags": 1,
                        "published_at": 1,
                        "view_count": 1,
                    }
                },
            ]

            cursor = content_collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)

            return [
                {
                    "id": str(r.get("id")),
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "thumbnail": r.get("thumbnail"),
                    "type": "article",
                    "content_format": r.get("content_format", "article"),
                    "published_at": (
                        r.get("published_at", {}).isoformat()
                        if r.get("published_at")
                        else None
                    ),
                }
                for r in results
            ]

        except Exception as e:
            logger.error(f"Error fetching articles for {city}, {state}: {e}")
            return []

    async def fetch_news_reels(
        self, city: str, state: str, limit: int = 10
    ) -> list:
        """Fetch news reels with injection-safe queries."""
        try:
            content_collection = db.get_collection("content")

            keywords = [city, state, "israeli"]
            regex_pattern = QuerySanitizer.build_regex_pattern(keywords)

            match = {
                "$and": [
                    {
                        "$or": [
                            {"title": {"$regex": regex_pattern, "$options": "i"}},
                            {"description": {"$regex": regex_pattern, "$options": "i"}},
                            {
                                "topic_tags": {
                                    "$in": ["israeli", "israel", "jewish_community"]
                                }
                            },
                        ]
                    },
                    {"is_published": True},
                    {"content_format": "news_reel"},
                    {"visibility_mode": {"$in": ["public", None]}},
                    {
                        "$or": [
                            {
                                "published_at": {
                                    "$gte": datetime.now(timezone.utc) - timedelta(days=30)
                                }
                            },
                            {"published_at": {"$exists": False}},
                        ]
                    },
                ]
            }

            pipeline = [
                {"$match": match},
                {"$sort": {"published_at": -1, "created_at": -1}},
                {"$limit": limit},
                {
                    "$project": {
                        "id": "$_id",
                        "title": 1,
                        "description": 1,
                        "thumbnail": 1,
                        "stream_url": 1,
                        "duration": 1,
                        "content_format": 1,
                        "topic_tags": 1,
                        "published_at": 1,
                        "view_count": 1,
                    }
                },
            ]

            cursor = content_collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)

            return [
                {
                    "id": str(r.get("id")),
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "thumbnail": r.get("thumbnail"),
                    "stream_url": r.get("stream_url"),
                    "duration": r.get("duration"),
                    "type": "reel",
                    "content_format": "news_reel",
                    "published_at": (
                        r.get("published_at", {}).isoformat()
                        if r.get("published_at")
                        else None
                    ),
                }
                for r in results
            ]

        except Exception as e:
            logger.error(f"Error fetching reels for {city}, {state}: {e}")
            return []

    async def fetch_community_events(
        self, city: str, state: str, limit: int = 10
    ) -> list:
        """Fetch community events with injection-safe queries."""
        try:
            events_collection = db.get_collection("community_events")

            keywords = [city, "israeli", "israel", "yom ha'atzmaut", "yom hazikaron"]
            regex_pattern = QuerySanitizer.build_regex_pattern(keywords)

            match = {
                "$and": [
                    {
                        "$or": [
                            {"location": {"$regex": regex_pattern, "$options": "i"}},
                            {"title": {"$regex": regex_pattern, "$options": "i"}},
                            {"description": {"$regex": "(?i)(israeli|israel)"}},
                            {
                                "event_type": {
                                    "$in": ["community", "holiday", "shiur"]
                                }
                            },
                        ]
                    },
                    {"is_active": True},
                    {"start_time": {"$gte": datetime.now(timezone.utc)}},
                ]
            }

            pipeline = [
                {"$match": match},
                {"$sort": {"start_time": 1}},
                {"$limit": limit},
                {
                    "$project": {
                        "id": "$_id",
                        "title": 1,
                        "description": 1,
                        "image_url": 1,
                        "start_time": 1,
                        "location": 1,
                        "organization_name": 1,
                        "event_type": 1,
                    }
                },
            ]

            cursor = events_collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)

            return [
                {
                    "id": str(r.get("id")),
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "thumbnail": r.get("image_url"),
                    "event_date": (
                        r.get("start_time", {}).isoformat()
                        if r.get("start_time")
                        else None
                    ),
                    "event_location": r.get("location") or r.get("organization_name"),
                    "type": "event",
                    "content_format": "event",
                }
                for r in results
            ]

        except Exception as e:
            logger.error(f"Error fetching events for {city}, {state}: {e}")
            return []
```

---

### 5. PRIVACY VIOLATION: LOCATION STORED WITHOUT EXPLICIT CONSENT
**Severity:** MEDIUM
**Component:** `web/src/hooks/useUserGeolocation.ts` (lines 236-265)
**Component:** `backend/app/models/user.py` (lines 226-227)
**Risk Level:** MEDIUM - GDPR/Privacy policy violation

#### Description
Location data is stored in user preferences without explicit consent tracking:

**Frontend (useUserGeolocation.ts):**
```typescript
// Line 253-254: Stores without consent record
"location_permission": "granted",  // String value, not full consent
```

**Backend (user.py):**
```python
# Line 226-227: Location stored directly
"detected_location": None,  # No consent metadata
"location_permission": "prompt",  # Insufficient tracking
```

**Privacy Issues:**

1. **GDPR Non-Compliance:** No explicit consent timestamp or audit trail
2. **Privacy Policy Mismatch:** Users may not expect location storage
3. **No Consent Withdrawal:** No mechanism to revoke location tracking
4. **Data Subject Rights:** No "right to be forgotten" for location data
5. **Consent Model:** Should track which consent version was accepted

#### Remediation Steps

**Step 1: Update User Model** (`backend/app/models/user.py`)

```python
from datetime import datetime

class LocationConsentRecord(BaseModel):
    """Record of user's location consent."""

    consented: bool  # Whether user gave consent
    timestamp: datetime  # When consent was given/withdrawn
    consent_version: str  # Which privacy policy version was accepted
    ip_address: Optional[str] = None  # IP where consent was given
    user_agent: Optional[str] = None  # Browser/device that gave consent
    method: str = "browser_geolocation"  # How consent was collected

class User(Document):
    # ... existing fields ...

    # Enhanced location tracking with consent
    preferences: dict = Field(
        default_factory=lambda: {
            # ... existing preferences ...

            # Location detection settings
            "detected_location": None,  # { city, state, county, latitude, longitude, timestamp, source }
            "location_permission": "prompt",  # granted, denied, prompt

            # NEW: Explicit consent tracking
            "location_consent": None,  # LocationConsentRecord
            "location_last_updated": None,  # datetime when location was last updated
            "location_retention_days": 90,  # Auto-delete location after N days
        }
    )

def set_location(
    self,
    city: str,
    state: str,
    county: Optional[str],
    latitude: float,
    longitude: float,
    source: str,
    request: Request,
) -> None:
    """
    Set user's detected location with consent tracking.

    Args:
        city: City name
        state: State code
        county: County name
        latitude: Geographic latitude
        longitude: Geographic longitude
        source: Source of location (geolocation, timezone_inferred, manual)
        request: HTTP request (for IP and User-Agent)
    """
    self.preferences["detected_location"] = {
        "city": city,
        "state": state,
        "county": county,
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
    }

    # Track location update timestamp
    self.preferences["location_last_updated"] = datetime.now(timezone.utc).isoformat()


def set_location_consent(
    self,
    consented: bool,
    consent_version: str,
    request: Request,
) -> None:
    """
    Record user's explicit location consent.

    Args:
        consented: Whether user gave consent
        consent_version: Which consent form version (e.g., "1.0")
        request: HTTP request (for IP and User-Agent)
    """
    self.preferences["location_consent"] = {
        "consented": consented,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "consent_version": consent_version,
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("User-Agent"),
        "method": "browser_geolocation",
    }

    self.preferences["location_permission"] = "granted" if consented else "denied"


async def revoke_location_consent(self) -> None:
    """Revoke location consent and schedule deletion."""
    # Mark as revoked
    self.preferences["location_permission"] = "denied"

    # Keep consent record for audit trail, but mark as revoked
    if self.preferences["location_consent"]:
        self.preferences["location_consent"]["revoked"] = True
        self.preferences["location_consent"]["revoked_at"] = datetime.now(timezone.utc).isoformat()

    # Schedule deletion after retention period
    retention_days = self.preferences.get("location_retention_days", 90)
    self.preferences["location_deletion_scheduled_at"] = (
        datetime.now(timezone.utc) + timedelta(days=retention_days)
    ).isoformat()


async def purge_location_data(self) -> None:
    """Permanently delete location data (user exercised right to be forgotten)."""
    self.preferences["detected_location"] = None
    self.preferences["location_last_updated"] = None
    self.preferences["location_deletion_completed_at"] = datetime.now(timezone.utc).isoformat()
```

**Step 2: Update Frontend Hook** (`web/src/hooks/useUserGeolocation.ts`)

```typescript
import { useState, useEffect } from 'react';
import { logger as appLogger } from '../utils/logger';

const logger = appLogger.scope('useUserGeolocation');

interface LocationConsentData {
  consented: boolean;
  timestamp: string;
  consent_version: string;
  ip_address?: string;
  user_agent?: string;
  method: string;
}

interface LocationData {
  city: string;
  state: string;
  county?: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  source: 'geolocation' | 'cache' | 'timezone_inferred';
  consentGiven?: boolean;
  consentTimestamp?: Date;
}

const CACHE_KEY = 'bayit_user_location';
const CONSENT_KEY = 'bayit_location_consent';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const useUserGeolocation = (): GeolocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [consentGiven, setConsentGiven] = useState<boolean>(false);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        setIsDetecting(true);

        // 1. Check for explicit consent first
        const consent = getCachedConsent();
        if (!consent || !consent.consented) {
          logger.info('Location consent not given - requesting...');
          const userConsent = await requestLocationConsent();
          if (!userConsent) {
            logger.info('User denied location consent');
            setConsentGiven(false);
            setIsDetecting(false);
            return;
          }
          setConsentGiven(true);
        } else {
          setConsentGiven(true);
        }

        // 2. Check cache
        const cached = getCachedLocation();
        if (cached && cached.consentGiven) {
          logger.info('Location loaded from cache', cached);
          setLocation(cached);
          setIsDetecting(false);
          return;
        }

        // 3. Request geolocation
        if (!navigator.geolocation) {
          throw new Error('Geolocation API not available');
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;

              const locationData = await reverseGeocode(latitude, longitude);

              if (locationData) {
                logger.info('Location detected', locationData);

                // Add consent metadata
                locationData.consentGiven = true;
                locationData.consentTimestamp = new Date();

                setLocation(locationData);

                // Cache result
                cacheLocation(locationData);

                // Save to user preferences
                saveLocationToUserPreferences(locationData, consent).catch((err) => {
                  logger.warn('Failed to save location to user preferences', {
                    error: err.message,
                  });
                });
              }
            } catch (err) {
              logger.error('Error processing geolocation', { error: err });
              fallbackToTimezoneLocation();
            } finally {
              setIsDetecting(false);
            }
          },
          (err) => {
            logger.warn('Geolocation request denied', {
              code: err.code,
              message: err.message,
            });
            fallbackToTimezoneLocation();
            setIsDetecting(false);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 3600000,
          }
        );
      } catch (err) {
        logger.error('Geolocation detection failed', { error: err });
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsDetecting(false);
      }
    };

    detectLocation();
  }, []);

  return {
    location,
    error,
    isDetecting,
    consentGiven,
  };
};

/**
 * Request explicit consent for location tracking.
 */
async function requestLocationConsent(): Promise<boolean> {
  return new Promise((resolve) => {
    const consentGiven = confirm(
      'Bayit+ uses your location to show local Israeli community content. ' +
      'We store your city for 90 days per our privacy policy. ' +
      'You can revoke this at any time in settings.\n\n' +
      'Allow location access?'
    );

    if (consentGiven) {
      const consentRecord: LocationConsentData = {
        consented: true,
        timestamp: new Date().toISOString(),
        consent_version: '1.0',
        user_agent: navigator.userAgent,
        method: 'browser_geolocation',
      };

      localStorage.setItem(CONSENT_KEY, JSON.stringify(consentRecord));
      logger.info('Location consent recorded');
    }

    resolve(consentGiven);
  });
}

/**
 * Get cached consent record.
 */
function getCachedConsent(): LocationConsentData | null {
  try {
    const cached = localStorage.getItem(CONSENT_KEY);
    if (!cached) return null;

    return JSON.parse(cached) as LocationConsentData;
  } catch (err) {
    logger.warn('Error reading consent cache', { error: err });
    return null;
  }
}

/**
 * Cache location with consent metadata.
 */
function cacheLocation(location: LocationData): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...location,
        timestamp: location.timestamp.toISOString(),
        consentTimestamp: location.consentTimestamp?.toISOString(),
        cachedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    logger.warn('Failed to cache location', { error: err });
  }
}

/**
 * Save location with consent record to user preferences.
 */
async function saveLocationToUserPreferences(
  location: LocationData,
  consent: LocationConsentData | null
): Promise<void> {
  try {
    const response = await fetch('/api/v1/users/me/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detected_location: {
          city: location.city,
          state: location.state,
          county: location.county,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp.toISOString(),
          source: location.source,
        },
        location_permission: 'granted',
        location_consent: consent,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    logger.info('Location saved to user preferences with consent');
  } catch (err) {
    logger.error('Failed to save location to preferences', { error: err });
    throw err;
  }
}

/**
 * Revoke location consent and schedule deletion.
 */
export async function revokeLocationConsent(): Promise<void> {
  try {
    const response = await fetch('/api/v1/users/me/location/revoke-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Clear local storage
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CONSENT_KEY);

    logger.info('Location consent revoked');
  } catch (err) {
    logger.error('Failed to revoke location consent', { error: err });
    throw err;
  }
}
```

**Step 3: Create User Preferences Endpoint** (`backend/app/api/routes/users/preferences.py`)

Add location consent endpoints:

```python
@router.post("/me/location/revoke-consent")
async def revoke_location_consent(
    current_user: User = Depends(get_current_active_user),
):
    """
    Revoke location consent and schedule location data deletion.

    Implements user's right to withdraw consent under GDPR.
    Location data will be permanently deleted after retention period.
    """
    try:
        await current_user.revoke_location_consent()
        await current_user.save()

        logger.info(
            "Location consent revoked",
            extra={"user_id": current_user.id}
        )

        return {
            "success": True,
            "message": "Location consent revoked. Your data will be deleted in 90 days.",
            "deletion_scheduled_for": (
                datetime.now(timezone.utc) + timedelta(days=90)
            ).isoformat(),
        }

    except Exception as e:
        logger.error(
            f"Error revoking location consent: {e}",
            extra={"user_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke location consent",
        )


@router.delete("/me/location")
async def delete_location_data(
    current_user: User = Depends(get_current_active_user),
):
    """
    Immediately delete all location data (right to be forgotten).
    """
    try:
        await current_user.purge_location_data()
        await current_user.save()

        logger.info(
            "Location data permanently deleted",
            extra={"user_id": current_user.id}
        )

        return {
            "success": True,
            "message": "All location data has been permanently deleted.",
        }

    except Exception as e:
        logger.error(
            f"Error deleting location data: {e}",
            extra={"user_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete location data",
        )
```

---

## ADDITIONAL SECURITY RECOMMENDATIONS

### 6. Implement CORS Restrictions (MEDIUM)

Ensure `/location/reverse-geocode` is not accessible from unauthorized origins:

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)
```

### 7. Add Request Validation Decorators (HIGH)

Add comprehensive input validation:

```python
from pydantic import BaseModel, validator, Field

class LocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

    @validator('latitude', 'longitude')
    def validate_coordinates(cls, v):
        if v is None or (isinstance(v, float) and (v == float('inf') or v == float('-inf'))):
            raise ValueError('Invalid coordinate value')
        return v
```

### 8. Implement Geolocation Data Encryption (HIGH)

Encrypt location data at rest in MongoDB:

```python
from cryptography.fernet import Fernet

class LocationService:
    def __init__(self):
        self.cipher = Fernet(settings.LOCATION_ENCRYPTION_KEY.encode())

    def encrypt_location(self, location: dict) -> str:
        """Encrypt location data."""
        location_json = json.dumps(location)
        return self.cipher.encrypt(location_json.encode()).decode()

    def decrypt_location(self, encrypted: str) -> dict:
        """Decrypt location data."""
        decrypted = self.cipher.decrypt(encrypted.encode()).decode()
        return json.loads(decrypted)
```

### 9. Add Location Data Audit Logging (MEDIUM)

Track all location data access:

```python
async def log_location_access(
    user_id: str,
    action: str,  # read, write, delete
    location: dict,
    ip_address: str,
):
    """Log location data access for audit trail."""
    audit_log = {
        "timestamp": datetime.now(timezone.utc),
        "user_id": user_id,
        "action": action,
        "city": location.get("city"),
        "state": location.get("state"),
        "ip_address": ip_address,
    }

    db.get_collection("audit_logs").insert_one(audit_log)
```

### 10. Implement Location Data Retention Policy (MEDIUM)

Create background job to automatically delete old location data:

```python
# backend/app/tasks/location_retention.py
async def purge_old_location_data():
    """
    Background task to delete location data older than retention period.
    Runs daily via APScheduler.
    """
    retention_days = 90
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)

    result = await db.users.update_many(
        {
            "preferences.location_last_updated": {"$lt": cutoff_date},
            "preferences.location_permission": "denied",
        },
        {
            "$set": {
                "preferences.detected_location": None,
                "preferences.location_deletion_completed_at": datetime.now(timezone.utc),
            }
        }
    )

    logger.info(
        f"Purged location data for {result.modified_count} users",
        extra={"affected_users": result.modified_count}
    )
```

---

## DEPLOYMENT CHECKLIST

Before deploying to production, verify all items:

- [ ] **CRITICAL Fixes:**
  - [ ] GeoNames API credentials configured and validated
  - [ ] Rate limiting implemented on geolocation endpoint (30/min per IP)
  - [ ] Rate limiting implemented on content endpoint (60/min per IP)
  - [ ] MongoDB injection prevention (QuerySanitizer) implemented
  - [ ] Input validation with min/max lengths added

- [ ] **HIGH Priority:**
  - [ ] Location consent mechanism implemented and validated
  - [ ] Coordinate validation added (-90/90 lat, -180/180 lng)
  - [ ] Authentication required for location content (or explicit consent)
  - [ ] Error handling doesn't leak sensitive information
  - [ ] CORS properly configured

- [ ] **MEDIUM Priority:**
  - [ ] Audit logging for location data access
  - [ ] Location data encryption at rest
  - [ ] Data retention policy implemented (90-day purge)
  - [ ] Privacy policy updated to include location tracking
  - [ ] User settings include location consent revocation
  - [ ] Right to be forgotten endpoint implemented

- [ ] **Testing:**
  - [ ] Load test rate limiting (generate 1000 reqs/sec)
  - [ ] Injection attack tests (MongoDB injection patterns)
  - [ ] Consent flow tested with new users
  - [ ] Location data deletion tested
  - [ ] GeoNames API fallback tested
  - [ ] Cache TTL verified (24 hours)

- [ ] **Monitoring:**
  - [ ] Rate limit exceeded events logged
  - [ ] GeoNames API errors monitored
  - [ ] Location query performance monitored
  - [ ] MongoDB query performance verified
  - [ ] Consent tracking reports generated

- [ ] **Documentation:**
  - [ ] API documentation updated with rate limits
  - [ ] Privacy policy updated
  - [ ] Security runbook created
  - [ ] Incident response procedures documented

---

## RISK SUMMARY

| Vulnerability | Severity | Impact | Status |
|---|---|---|---|
| Missing GeoNames config | CRITICAL | Feature non-functional | REQUIRES IMMEDIATE FIX |
| No rate limiting | HIGH | DDoS/quota exhaustion | REQUIRES IMMEDIATE FIX |
| Unauthenticated access | MEDIUM | Privacy violation | REQUIRES POLICY DECISION |
| MongoDB injection | HIGH | Data exposure/manipulation | REQUIRES IMMEDIATE FIX |
| Missing consent | MEDIUM | GDPR violation | REQUIRES IMMEDIATE FIX |

**Overall Risk Level:** MEDIUM-HIGH

**Recommendation:** Do not deploy to production until CRITICAL and HIGH vulnerabilities are remediated.

---

## CONCLUSION

The location-aware content feature has significant security potential but requires comprehensive remediation before production deployment. The primary concerns are:

1. **Non-functional API (CRITICAL)** - GeoNames not configured
2. **DDoS vulnerability (HIGH)** - No rate limiting on external API calls
3. **Injection attacks (HIGH)** - Unsanitized MongoDB queries
4. **Privacy violations (MEDIUM)** - No explicit user consent tracking

All identified issues have detailed remediation steps provided in this assessment. Implementation should follow the prioritization matrix (CRITICAL → HIGH → MEDIUM).

