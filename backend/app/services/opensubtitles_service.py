"""
OpenSubtitles Service
Fetch subtitles from OpenSubtitles.com REST API v1
"""

from typing import Optional, Dict, Any, List
import httpx
from datetime import datetime, timedelta
import logging

from app.models.subtitles import SubtitleSearchCacheDoc, SubtitleQuotaTrackerDoc

logger = logging.getLogger(__name__)


class OpenSubtitlesService:
    """Service for fetching subtitles from OpenSubtitles.com API"""

    def __init__(self):
        # Import here to avoid circular dependency
        from app.core.config import settings
        self.api_key = settings.OPENSUBTITLES_API_KEY
        self.username = settings.OPENSUBTITLES_USERNAME
        self.password = settings.OPENSUBTITLES_PASSWORD
        self.base_url = settings.OPENSUBTITLES_API_BASE_URL
        self.user_agent = settings.OPENSUBTITLES_USER_AGENT
        self.daily_limit = settings.OPENSUBTITLES_DOWNLOAD_LIMIT_PER_DAY
        self.rate_limit_requests = settings.OPENSUBTITLES_RATE_LIMIT_REQUESTS
        self.rate_limit_window = settings.OPENSUBTITLES_RATE_LIMIT_WINDOW_SECONDS
        
        # JWT token cache (in-memory for now)
        self.jwt_token: Optional[str] = None
        self.jwt_expires_at: Optional[datetime] = None

        if not self.api_key:
            logger.warning("⚠️ OPENSUBTITLES_API_KEY is not configured. External subtitle fetching will not work.")
        
        # Note: Username/password are optional - API key alone is sufficient for downloads
        # JWT auth is only needed for advanced features (user-specific operations)

        self.client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,  # Important: follow 301/302 redirects
            headers={
                "Api-Key": self.api_key,
                "User-Agent": self.user_agent,
                "Content-Type": "application/json"
            }
        )

    async def _ensure_logged_in(self) -> bool:
        """Ensure we have a valid JWT token, login if needed"""
        if not self.username or not self.password:
            return False  # Can't login without credentials
        
        # Check if token is still valid
        if self.jwt_token and self.jwt_expires_at:
            if datetime.utcnow() < self.jwt_expires_at - timedelta(minutes=5):
                return True  # Token still valid
        
        # Login to get JWT token
        try:
            login_endpoint = f"{self.base_url}/login"
            response = await self.client.post(
                login_endpoint,
                json={
                    "username": self.username,
                    "password": self.password
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.jwt_token = data.get("token")
                
                # Token typically expires in 24 hours
                self.jwt_expires_at = datetime.utcnow() + timedelta(hours=23, minutes=50)
                
                logger.info(f"✅ Logged into OpenSubtitles as {self.username}")
                return True
            else:
                logger.error(f"❌ OpenSubtitles login failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ OpenSubtitles login error: {e}")
            return False
    
    async def _make_request(self, endpoint: str, params: Optional[Dict] = None, method: str = "GET", json_body: Optional[Dict] = None, use_auth: bool = False) -> Optional[Dict]:
        """Make a request to OpenSubtitles API with rate limiting"""
        if not self.api_key:
            logger.error("❌ OpenSubtitles API key not configured - cannot make request")
            return None

        # Check rate limit before making request
        if not await self.rate_limit_check():
            logger.warning("⚠️ OpenSubtitles rate limit reached - waiting before retry")
            return None
        
        # Ensure logged in if auth required
        if use_auth:
            if not await self._ensure_logged_in():
                logger.error("❌ Cannot make authenticated request - login failed")
                return None

        url = f"{self.base_url}{endpoint}"

        try:
            # Prepare extra headers for authenticated requests
            extra_headers = {}
            if use_auth and self.jwt_token:
                extra_headers["Authorization"] = f"Bearer {self.jwt_token}"
            
            # Make request based on method
            # Note: Don't pass headers param to avoid overriding client defaults
            # Instead, update client headers temporarily if needed
            if extra_headers:
                old_headers = dict(self.client.headers)
                self.client.headers.update(extra_headers)
            
            if method == "POST":
                response = await self.client.post(url, json=json_body)
            else:
                response = await self.client.get(url, params=params)
            
            # Restore headers if changed
            if extra_headers:
                self.client.headers = old_headers

            # Track request for rate limiting
            await self.increment_quota(operation="search")

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                logger.warning("⚠️ OpenSubtitles rate limit hit (429)")
                return None
            else:
                logger.error(
                    f"❌ OpenSubtitles API request failed: {endpoint} - "
                    f"Status {response.status_code}: {response.text[:200]}"
                )
                return None
        except httpx.TimeoutException:
            logger.error(f"⏱️ OpenSubtitles API timeout: {endpoint}")
            return None
        except Exception as e:
            logger.error(f"❌ OpenSubtitles API error: {endpoint} - {str(e)}")
            return None

    async def check_quota_available(self) -> Dict[str, Any]:
        """Check if we have quota available today"""
        tracker = await SubtitleQuotaTrackerDoc.get_today()

        remaining = self.daily_limit - tracker.downloads_used
        available = remaining > 0

        # Calculate when quota resets (midnight UTC)
        now = datetime.utcnow()
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        resets_at = tomorrow

        return {
            "available": available,
            "remaining": remaining,
            "used": tracker.downloads_used,
            "daily_limit": self.daily_limit,
            "resets_at": resets_at
        }

    async def rate_limit_check(self) -> bool:
        """Check if we're within rate limits (40 requests per 10 seconds)"""
        tracker = await SubtitleQuotaTrackerDoc.get_today()

        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=self.rate_limit_window)

        # Filter recent requests within the time window
        recent = [req for req in tracker.recent_requests if req > cutoff]

        # Update tracker with filtered list
        tracker.recent_requests = recent
        await tracker.save()

        # Check if we're under the limit
        return len(recent) < self.rate_limit_requests

    async def increment_quota(self, operation: str = "download"):
        """Track API usage in SubtitleQuotaTrackerDoc"""
        tracker = await SubtitleQuotaTrackerDoc.get_today()

        now = datetime.utcnow()

        if operation == "download":
            tracker.downloads_used += 1
            tracker.last_download_at = now
        elif operation == "search":
            tracker.searches_performed += 1

        # Add to recent requests for rate limiting
        tracker.recent_requests.append(now)
        # Keep only last 40 requests
        if len(tracker.recent_requests) > self.rate_limit_requests:
            tracker.recent_requests = tracker.recent_requests[-self.rate_limit_requests:]

        await tracker.save()

        logger.info(
            f"📊 OpenSubtitles quota: {tracker.downloads_used}/{self.daily_limit} downloads, "
            f"{tracker.searches_performed} searches today"
        )

    async def search_subtitles(
        self,
        imdb_id: str,
        language: str,
        content_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for subtitles by IMDB ID.
        Checks cache first, then API.
        Returns list of subtitle matches with file_id, download_url, rating, etc.
        """
        # Check cache first
        if content_id:
            cache = await SubtitleSearchCacheDoc.get_cached_search(content_id, language)
            if cache:
                logger.info(f"✅ Cache hit for {content_id} ({language})")
                if cache.found:
                    return [{
                        "file_id": cache.external_id,
                        "download_url": cache.external_url,
                        "language": language,
                        "source": "cache"
                    }]
                else:
                    # Cached negative result
                    return []

        # Format IMDB ID (remove 'tt' prefix if present)
        imdb_id_clean = imdb_id.replace("tt", "")

        # Search OpenSubtitles API
        params = {
            "imdb_id": imdb_id_clean,
            "languages": language,
        }

        data = await self._make_request("/subtitles", params)

        if not data or not data.get("data"):
            # Cache negative result
            if content_id:
                await self._cache_search_result(
                    content_id=content_id,
                    imdb_id=imdb_id,
                    language=language,
                    found=False
                )
            return []

        # Extract subtitle results
        results = []
        for item in data["data"]:
            file_info = item.get("attributes", {}).get("files", [{}])[0]
            file_id = file_info.get("file_id")
            results.append({
                "file_id": str(file_id) if file_id is not None else None,
                "download_url": item.get("attributes", {}).get("url"),
                "language": language,
                "rating": item.get("attributes", {}).get("ratings", 0),
                "download_count": item.get("attributes", {}).get("download_count", 0),
                "source": "opensubtitles"
            })

        # Cache positive result (first match)
        if results and content_id:
            await self._cache_search_result(
                content_id=content_id,
                imdb_id=imdb_id,
                language=language,
                found=True,
                external_id=results[0]["file_id"],
                external_url=results[0]["download_url"]
            )

        logger.info(f"🔍 Found {len(results)} subtitles for IMDB {imdb_id} ({language})")
        return results

    async def download_subtitle(
        self,
        file_id: str,
        content_id: str,
        language: str
    ) -> Optional[str]:
        """
        Download subtitle file and return content.
        Updates quota tracker.
        Returns subtitle text content (SRT format).
        """
        # Check quota before download
        quota = await self.check_quota_available()
        if not quota["available"]:
            logger.error(
                f"❌ OpenSubtitles quota exhausted: {quota['used']}/{quota['daily_limit']} "
                f"(resets at {quota['resets_at']})"
            )
            return None

        # Download endpoint - POST with JSON body
        endpoint = f"/download"
        data = await self._make_request(
            endpoint, 
            method="POST",
            json_body={"file_id": int(file_id)},
            use_auth=False  # Try with API key only first
        )

        if not data or not data.get("link"):
            logger.error(f"❌ Failed to get download link for file_id: {file_id}")
            return None

        download_url = data["link"]

        try:
            # Download subtitle file content
            response = await self.client.get(download_url)
            if response.status_code == 200:
                subtitle_content = response.text

                # Increment download quota
                await self.increment_quota(operation="download")

                logger.info(f"✅ Downloaded subtitle {file_id} for {content_id} ({language})")
                return subtitle_content
            else:
                logger.error(f"❌ Failed to download subtitle file: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"❌ Error downloading subtitle file: {str(e)}")
            return None

    async def _cache_search_result(
        self,
        content_id: str,
        imdb_id: str,
        language: str,
        found: bool,
        external_id: Optional[str] = None,
        external_url: Optional[str] = None
    ):
        """Save search results to cache"""
        from app.core.config import settings

        # Set expiry based on result
        if found:
            ttl_days = settings.SUBTITLE_SEARCH_CACHE_TTL_DAYS
        else:
            ttl_days = settings.SUBTITLE_NOT_FOUND_CACHE_TTL_DAYS

        expires_at = datetime.utcnow() + timedelta(days=ttl_days)

        # Check if cache entry exists
        existing = await SubtitleSearchCacheDoc.find_one(
            SubtitleSearchCacheDoc.content_id == content_id,
            SubtitleSearchCacheDoc.language == language
        )

        if existing:
            # Update existing
            existing.found = found
            existing.source = "opensubtitles" if found else None
            existing.external_id = external_id
            existing.external_url = external_url
            existing.search_date = datetime.utcnow()
            existing.expires_at = expires_at
            await existing.save()
        else:
            # Create new
            cache = SubtitleSearchCacheDoc(
                content_id=content_id,
                imdb_id=imdb_id,
                language=language,
                found=found,
                source="opensubtitles" if found else None,
                external_id=external_id,
                external_url=external_url,
                expires_at=expires_at
            )
            await cache.insert()

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# Singleton instance
_opensubtitles_service = None


def get_opensubtitles_service() -> OpenSubtitlesService:
    """Get singleton OpenSubtitles service instance"""
    global _opensubtitles_service
    if _opensubtitles_service is None:
        _opensubtitles_service = OpenSubtitlesService()
    return _opensubtitles_service
