"""
OpenSubtitles Service
Fetch subtitles from OpenSubtitles.com REST API v1

Features:
- JWT authentication with automatic token refresh
- Rate limiting (40 requests per 10 seconds)
- Daily quota tracking (configurable limit)
- Search result caching
- Automatic retry with exponential backoff
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from app.models.subtitles import SubtitleQuotaTrackerDoc, SubtitleSearchCacheDoc

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 1.0  # seconds
MAX_RETRY_DELAY = 30.0  # seconds


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
            logger.warning(
                "⚠️ OPENSUBTITLES_API_KEY is not configured. External subtitle fetching will not work."
            )

        # Note: Username/password are optional - API key alone is sufficient for downloads
        # JWT auth is only needed for advanced features (user-specific operations)

        self.client = httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,  # Important: follow 301/302 redirects
            headers={
                "Api-Key": self.api_key,
                "User-Agent": self.user_agent,
                "Content-Type": "application/json",
            },
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
                json={"username": self.username, "password": self.password},
            )

            if response.status_code == 200:
                data = response.json()
                self.jwt_token = data.get("token")

                # Token typically expires in 24 hours
                self.jwt_expires_at = datetime.utcnow() + timedelta(
                    hours=23, minutes=50
                )

                logger.info(f"✅ Logged into OpenSubtitles as {self.username}")
                return True
            else:
                logger.error(f"❌ OpenSubtitles login failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ OpenSubtitles login error: {e}")
            return False

    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict] = None,
        method: str = "GET",
        json_body: Optional[Dict] = None,
        use_auth: bool = False,
        retry_count: int = 0,
    ) -> Optional[Dict]:
        """
        Make a request to OpenSubtitles API with rate limiting and automatic retry.

        Features:
        - Exponential backoff retry on transient errors
        - Rate limit handling with wait-and-retry
        - Proper header management for authenticated requests
        """
        if not self.api_key:
            logger.error("❌ OpenSubtitles API key not configured - cannot make request")
            return None

        # Check rate limit before making request
        rate_limit_ok = await self.rate_limit_check()
        if not rate_limit_ok:
            if retry_count < MAX_RETRIES:
                # Wait and retry
                wait_time = min(
                    INITIAL_RETRY_DELAY * (2**retry_count), MAX_RETRY_DELAY
                )
                logger.warning(
                    f"⚠️ Rate limit reached - waiting {wait_time:.1f}s before retry {retry_count + 1}"
                )
                await asyncio.sleep(wait_time)
                return await self._make_request(
                    endpoint, params, method, json_body, use_auth, retry_count + 1
                )
            else:
                logger.error("❌ Rate limit exceeded after max retries")
                return None

        # Ensure logged in if auth required
        if use_auth:
            if not await self._ensure_logged_in():
                logger.error("❌ Cannot make authenticated request - login failed")
                return None

        url = f"{self.base_url}{endpoint}"

        try:
            # Build headers for this specific request
            request_headers = {
                "Api-Key": self.api_key,
                "User-Agent": self.user_agent,
                "Content-Type": "application/json",
            }
            if use_auth and self.jwt_token:
                request_headers["Authorization"] = f"Bearer {self.jwt_token}"

            # Make request with explicit headers (don't mutate client headers)
            if method == "POST":
                response = await self.client.post(
                    url, json=json_body, headers=request_headers
                )
            else:
                response = await self.client.get(
                    url, params=params, headers=request_headers
                )

            # Track request for rate limiting
            await self.increment_quota(operation="search")

            if response.status_code == 200:
                return response.json()

            elif response.status_code == 429:
                # Rate limit hit - retry with backoff
                if retry_count < MAX_RETRIES:
                    wait_time = min(
                        INITIAL_RETRY_DELAY * (2**retry_count), MAX_RETRY_DELAY
                    )
                    logger.warning(
                        f"⚠️ Rate limit (429) - waiting {wait_time:.1f}s before retry {retry_count + 1}"
                    )
                    await asyncio.sleep(wait_time)
                    return await self._make_request(
                        endpoint, params, method, json_body, use_auth, retry_count + 1
                    )
                else:
                    logger.error("❌ Rate limit (429) exceeded after max retries")
                    return None

            elif response.status_code == 401:
                # Unauthorized - clear token and retry once
                if use_auth and retry_count == 0:
                    logger.warning("⚠️ Auth token expired - re-authenticating")
                    self.jwt_token = None
                    self.jwt_expires_at = None
                    return await self._make_request(
                        endpoint, params, method, json_body, use_auth, retry_count + 1
                    )
                else:
                    logger.error(f"❌ Authentication failed: {response.text[:200]}")
                    return None

            elif response.status_code >= 500:
                # Server error - retry with backoff
                if retry_count < MAX_RETRIES:
                    wait_time = min(
                        INITIAL_RETRY_DELAY * (2**retry_count), MAX_RETRY_DELAY
                    )
                    logger.warning(
                        f"⚠️ Server error ({response.status_code}) - waiting {wait_time:.1f}s before retry"
                    )
                    await asyncio.sleep(wait_time)
                    return await self._make_request(
                        endpoint, params, method, json_body, use_auth, retry_count + 1
                    )
                else:
                    logger.error(
                        f"❌ Server error after max retries: {response.status_code}"
                    )
                    return None

            else:
                logger.error(
                    f"❌ OpenSubtitles API request failed: {endpoint} - "
                    f"Status {response.status_code}: {response.text[:200]}"
                )
                return None

        except httpx.TimeoutException:
            if retry_count < MAX_RETRIES:
                wait_time = min(
                    INITIAL_RETRY_DELAY * (2**retry_count), MAX_RETRY_DELAY
                )
                logger.warning(
                    f"⏱️ Timeout on {endpoint} - retrying in {wait_time:.1f}s"
                )
                await asyncio.sleep(wait_time)
                return await self._make_request(
                    endpoint, params, method, json_body, use_auth, retry_count + 1
                )
            else:
                logger.error(
                    f"⏱️ OpenSubtitles API timeout after {MAX_RETRIES} retries: {endpoint}"
                )
                return None

        except httpx.ConnectError as e:
            if retry_count < MAX_RETRIES:
                wait_time = min(
                    INITIAL_RETRY_DELAY * (2**retry_count), MAX_RETRY_DELAY
                )
                logger.warning(
                    f"🔌 Connection error - retrying in {wait_time:.1f}s: {e}"
                )
                await asyncio.sleep(wait_time)
                return await self._make_request(
                    endpoint, params, method, json_body, use_auth, retry_count + 1
                )
            else:
                logger.error(f"🔌 Connection failed after {MAX_RETRIES} retries: {e}")
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
        tomorrow = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        resets_at = tomorrow

        return {
            "available": available,
            "remaining": remaining,
            "used": tracker.downloads_used,
            "daily_limit": self.daily_limit,
            "resets_at": resets_at,
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
            tracker.recent_requests = tracker.recent_requests[
                -self.rate_limit_requests :
            ]

        await tracker.save()

        logger.info(
            f"📊 OpenSubtitles quota: {tracker.downloads_used}/{self.daily_limit} downloads, "
            f"{tracker.searches_performed} searches today"
        )

    async def search_subtitles(
        self,
        imdb_id: str,
        language: str,
        content_id: Optional[str] = None,
        season_number: Optional[int] = None,
        episode_number: Optional[int] = None,
        parent_imdb_id: Optional[str] = None,
        query: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for subtitles by IMDB ID.
        Supports both movies and TV series episodes.

        For TV series, you can provide:
        - imdb_id: Episode's IMDB ID (if available)
        - OR parent_imdb_id + season_number + episode_number
        - OR query (title search) + season_number + episode_number

        Checks cache first, then API.
        Returns list of subtitle matches with file_id, download_url, rating, etc.
        """
        # Check cache first
        if content_id:
            cache = await SubtitleSearchCacheDoc.get_cached_search(content_id, language)
            if cache:
                logger.info(f"✅ Cache hit for {content_id} ({language})")
                if cache.found:
                    return [
                        {
                            "file_id": cache.external_id,
                            "download_url": cache.external_url,
                            "language": language,
                            "source": "cache",
                        }
                    ]
                else:
                    # Cached negative result
                    return []

        # Build search params
        params = {
            "languages": language,
        }

        # Determine search strategy based on available info
        if parent_imdb_id and season_number is not None and episode_number is not None:
            # TV series episode search with series IMDB ID
            parent_clean = parent_imdb_id.replace("tt", "")
            params["parent_imdb_id"] = parent_clean
            params["season_number"] = season_number
            params["episode_number"] = episode_number
            logger.info(
                f"🔍 Searching OpenSubtitles for series IMDB {parent_clean} S{season_number:02d}E{episode_number:02d}"
            )
        elif imdb_id:
            # Movie or episode-specific IMDB ID
            imdb_id_clean = imdb_id.replace("tt", "")
            params["imdb_id"] = imdb_id_clean
            # Add season/episode if this is a TV episode search
            if season_number is not None and episode_number is not None:
                params["season_number"] = season_number
                params["episode_number"] = episode_number
                logger.info(
                    f"🔍 Searching OpenSubtitles for IMDB {imdb_id_clean} S{season_number:02d}E{episode_number:02d}"
                )
            else:
                logger.info(f"🔍 Searching OpenSubtitles for IMDB {imdb_id_clean}")
        elif query:
            # Fallback to title search
            params["query"] = query
            if season_number is not None:
                params["season_number"] = season_number
            if episode_number is not None:
                params["episode_number"] = episode_number
            logger.info(f"🔍 Searching OpenSubtitles by query: '{query}'")
        else:
            logger.warning("⚠️ No valid search criteria provided for OpenSubtitles")
            return []

        data = await self._make_request("/subtitles", params)

        if not data or not data.get("data"):
            # Cache negative result
            if content_id:
                await self._cache_search_result(
                    content_id=content_id,
                    imdb_id=imdb_id,
                    language=language,
                    found=False,
                )
            return []

        # Extract subtitle results
        results = []
        for item in data["data"]:
            file_info = item.get("attributes", {}).get("files", [{}])[0]
            file_id = file_info.get("file_id")
            results.append(
                {
                    "file_id": str(file_id) if file_id is not None else None,
                    "download_url": item.get("attributes", {}).get("url"),
                    "language": language,
                    "rating": item.get("attributes", {}).get("ratings", 0),
                    "download_count": item.get("attributes", {}).get(
                        "download_count", 0
                    ),
                    "source": "opensubtitles",
                }
            )

        # Cache positive result (first match)
        if results and content_id:
            await self._cache_search_result(
                content_id=content_id,
                imdb_id=imdb_id,
                language=language,
                found=True,
                external_id=results[0]["file_id"],
                external_url=results[0]["download_url"],
            )

        logger.info(f"🔍 Found {len(results)} subtitles for IMDB {imdb_id} ({language})")
        return results

    async def download_subtitle(
        self, file_id: str, content_id: str, language: str
    ) -> Optional[str]:
        """
        Download subtitle file and return content.
        Updates quota tracker.
        Returns subtitle text content (SRT format).

        Features:
        - Automatic retry on transient errors
        - Quota checking before download
        - Proper error logging
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
        endpoint = "/download"

        # Validate file_id
        try:
            file_id_int = int(file_id)
        except (ValueError, TypeError):
            logger.error(f"❌ Invalid file_id format: {file_id}")
            return None

        data = await self._make_request(
            endpoint,
            method="POST",
            json_body={"file_id": file_id_int},
            use_auth=False,  # Try with API key only first
        )

        if not data or not data.get("link"):
            # If API key auth failed, try with full auth
            if data is None:
                logger.info("🔄 Retrying download with JWT authentication...")
                data = await self._make_request(
                    endpoint,
                    method="POST",
                    json_body={"file_id": file_id_int},
                    use_auth=True,
                )

            if not data or not data.get("link"):
                logger.error(f"❌ Failed to get download link for file_id: {file_id}")
                return None

        download_url = data["link"]
        logger.info(f"📥 Downloading subtitle from: {download_url[:50]}...")

        # Download with retry
        for retry in range(MAX_RETRIES):
            try:
                response = await self.client.get(download_url, follow_redirects=True)

                if response.status_code == 200:
                    subtitle_content = response.text

                    # Validate content - should contain WEBVTT or SRT markers
                    if not subtitle_content or len(subtitle_content) < 10:
                        logger.warning(f"⚠️ Downloaded subtitle is empty or too short")
                        return None

                    # Check for common subtitle format markers
                    content_lower = subtitle_content[:100].lower()
                    if not any(
                        marker in content_lower
                        for marker in ["webvtt", "1\n", "1\r", "-->"]
                    ):
                        logger.warning(
                            f"⚠️ Downloaded content doesn't appear to be a subtitle file"
                        )
                        # Still return it - might be a valid format we don't recognize

                    # Increment download quota
                    await self.increment_quota(operation="download")

                    logger.info(
                        f"✅ Downloaded subtitle {file_id} for {content_id} ({language}) - {len(subtitle_content)} chars"
                    )
                    return subtitle_content

                elif response.status_code == 429:
                    # Rate limited on download
                    wait_time = min(INITIAL_RETRY_DELAY * (2**retry), MAX_RETRY_DELAY)
                    logger.warning(
                        f"⚠️ Download rate limited - waiting {wait_time:.1f}s"
                    )
                    await asyncio.sleep(wait_time)
                    continue

                elif response.status_code >= 500:
                    # Server error - retry
                    wait_time = min(INITIAL_RETRY_DELAY * (2**retry), MAX_RETRY_DELAY)
                    logger.warning(
                        f"⚠️ Server error ({response.status_code}) - retrying in {wait_time:.1f}s"
                    )
                    await asyncio.sleep(wait_time)
                    continue

                else:
                    logger.error(
                        f"❌ Failed to download subtitle file: {response.status_code}"
                    )
                    return None

            except httpx.TimeoutException:
                wait_time = min(INITIAL_RETRY_DELAY * (2**retry), MAX_RETRY_DELAY)
                logger.warning(f"⏱️ Download timeout - retrying in {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
                continue

            except httpx.ConnectError as e:
                wait_time = min(INITIAL_RETRY_DELAY * (2**retry), MAX_RETRY_DELAY)
                logger.warning(
                    f"🔌 Connection error during download: {e} - retrying in {wait_time:.1f}s"
                )
                await asyncio.sleep(wait_time)
                continue

            except Exception as e:
                logger.error(f"❌ Error downloading subtitle file: {str(e)}")
                return None

        logger.error(f"❌ Failed to download subtitle after {MAX_RETRIES} retries")
        return None

    async def _cache_search_result(
        self,
        content_id: str,
        imdb_id: str,
        language: str,
        found: bool,
        external_id: Optional[str] = None,
        external_url: Optional[str] = None,
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
            SubtitleSearchCacheDoc.language == language,
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
                expires_at=expires_at,
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
