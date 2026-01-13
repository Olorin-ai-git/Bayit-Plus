"""
TMDB Service
Fetch movie/series metadata from The Movie Database (TMDB) API
"""

from typing import Optional, Dict, Any, List
import httpx
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class TMDBService:
    """Service for fetching metadata from TMDB API"""

    BASE_URL = "https://api.themoviedb.org/3"
    IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

    def __init__(self):
        # Import here to avoid circular dependency
        from app.core.config import settings
        self.api_key = settings.TMDB_API_KEY
        if not self.api_key:
            logger.warning("⚠️ TMDB_API_KEY is not configured. TMDB metadata fetching will not work.")
        self.client = httpx.AsyncClient(timeout=10.0)

    async def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make a request to TMDB API"""
        if not self.api_key:
            logger.error("❌ TMDB API key not configured - cannot make request to TMDB")
            return None

        url = f"{self.BASE_URL}{endpoint}"
        request_params = {"api_key": self.api_key}
        if params:
            request_params.update(params)

        try:
            response = await self.client.get(url, params=request_params)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(
                    f"❌ TMDB API request failed: {endpoint} - "
                    f"Status {response.status_code}: {response.text[:200]}"
                )
                return None
        except httpx.TimeoutException:
            logger.error(f"⏱️ TMDB API timeout: {endpoint}")
            return None
        except Exception as e:
            logger.error(f"❌ TMDB API error: {endpoint} - {str(e)}")
            return None

    async def search_movie(self, title: str, year: Optional[int] = None) -> Optional[Dict]:
        """
        Search for a movie by title.
        Returns the first matching result.
        """
        params = {"query": title}
        if year:
            params["year"] = year

        data = await self._make_request("/search/movie", params)
        if data and data.get("results"):
            return data["results"][0]
        return None

    async def search_tv_series(self, title: str, year: Optional[int] = None) -> Optional[Dict]:
        """
        Search for a TV series by title.
        Returns the first matching result.
        """
        params = {"query": title}
        if year:
            params["first_air_date_year"] = year

        data = await self._make_request("/search/tv", params)
        if data and data.get("results"):
            return data["results"][0]
        return None

    async def get_movie_details(self, tmdb_id: int) -> Optional[Dict]:
        """
        Get detailed movie information including external IDs (IMDB).
        """
        data = await self._make_request(
            f"/movie/{tmdb_id}",
            params={"append_to_response": "external_ids,videos,credits"}
        )
        return data

    async def get_tv_series_details(self, tmdb_id: int) -> Optional[Dict]:
        """
        Get detailed TV series information.
        """
        data = await self._make_request(
            f"/tv/{tmdb_id}",
            params={"append_to_response": "external_ids,videos,credits"}
        )
        return data

    async def get_tv_season(self, tmdb_id: int, season_number: int) -> Optional[Dict]:
        """
        Get details for a specific TV season including episodes.
        """
        data = await self._make_request(f"/tv/{tmdb_id}/season/{season_number}")
        return data

    async def get_movie_videos(self, tmdb_id: int) -> List[Dict]:
        """
        Get trailers and videos for a movie.
        Returns list of video objects with YouTube/Vimeo keys.
        """
        data = await self._make_request(f"/movie/{tmdb_id}/videos")
        if data and data.get("results"):
            # Prioritize trailers
            videos = data["results"]
            trailers = [v for v in videos if v.get("type") == "Trailer"]
            return trailers if trailers else videos
        return []

    async def get_tv_videos(self, tmdb_id: int) -> List[Dict]:
        """
        Get trailers and videos for a TV series.
        """
        data = await self._make_request(f"/tv/{tmdb_id}/videos")
        if data and data.get("results"):
            videos = data["results"]
            trailers = [v for v in videos if v.get("type") == "Trailer"]
            return trailers if trailers else videos
        return []

    def get_youtube_url(self, video_key: str) -> str:
        """Convert YouTube video key to full URL"""
        return f"https://www.youtube.com/watch?v={video_key}"

    def get_youtube_embed_url(self, video_key: str) -> str:
        """Convert YouTube video key to embeddable URL"""
        return f"https://www.youtube.com/embed/{video_key}"

    def get_image_url(self, path: str, size: str = "original") -> str:
        """
        Get full image URL from TMDB image path.
        Sizes: w92, w154, w185, w342, w500, w780, original
        """
        if not path:
            return ""
        return f"{self.IMAGE_BASE_URL}/{size}{path}"

    async def enrich_movie_content(self, title: str, year: Optional[int] = None) -> Dict[str, Any]:
        """
        Search for a movie and return enriched metadata.
        Returns dict with tmdb_id, imdb_id, imdb_rating, trailer_url, etc.
        """
        result = {
            "tmdb_id": None,
            "imdb_id": None,
            "imdb_rating": None,
            "imdb_votes": None,
            "trailer_url": None,
            "poster": None,
            "backdrop": None,
            "overview": None,
            "runtime": None,
            "genres": [],
            "cast": [],
            "director": None,
            "release_year": None,
            "original_title": None,
            "original_language": None,
            "tagline": None,
            "status": None,
            "popularity": None,
        }

        # Search for the movie
        search_result = await self.search_movie(title, year)
        if not search_result:
            logger.warning(f"🔍 TMDB: No search results for movie '{title}' ({year})")
            return result

        tmdb_id = search_result.get("id")
        result["tmdb_id"] = tmdb_id
        logger.info(f"🔍 TMDB: Found movie '{title}' with ID {tmdb_id}")

        # Get full details
        details = await self.get_movie_details(tmdb_id)
        if not details:
            logger.error(f"❌ TMDB: Failed to get details for movie ID {tmdb_id}")
            return result

        # Extract IMDB ID
        external_ids = details.get("external_ids", {})
        result["imdb_id"] = external_ids.get("imdb_id")

        # Extract other metadata
        result["overview"] = details.get("overview")
        result["runtime"] = details.get("runtime")
        result["genres"] = [g.get("name") for g in details.get("genres", [])]
        
        # Extract ratings (TMDB provides vote_average, not IMDB rating directly)
        result["imdb_rating"] = details.get("vote_average")  # TMDB's rating (0-10 scale)
        result["imdb_votes"] = details.get("vote_count")
        
        # Extract release date and year
        release_date = details.get("release_date")  # Format: "YYYY-MM-DD"
        if release_date:
            try:
                result["release_year"] = int(release_date.split("-")[0])
            except (ValueError, IndexError):
                pass
        
        # Extract additional metadata
        result["original_title"] = details.get("original_title")
        result["original_language"] = details.get("original_language")
        result["tagline"] = details.get("tagline")
        result["status"] = details.get("status")  # "Released", "Post Production", etc.
        result["popularity"] = details.get("popularity")

        # Poster image (tall vertical - for thumbnail/cover)
        if details.get("poster_path"):
            result["poster"] = self.get_image_url(details["poster_path"], "w500")

        # Backdrop image (wide horizontal - for background)
        if details.get("backdrop_path"):
            result["backdrop"] = self.get_image_url(details["backdrop_path"], "w1280")

        # Extract cast and director from credits
        credits = details.get("credits", {})
        cast = credits.get("cast", [])[:10]  # Top 10 cast members
        result["cast"] = [c.get("name") for c in cast]

        crew = credits.get("crew", [])
        directors = [c.get("name") for c in crew if c.get("job") == "Director"]
        result["director"] = directors[0] if directors else None

        # Get trailer
        videos = details.get("videos", {}).get("results", [])
        trailers = [v for v in videos if v.get("type") == "Trailer" and v.get("site") == "YouTube"]
        if trailers:
            result["trailer_url"] = self.get_youtube_embed_url(trailers[0]["key"])

        return result

    async def enrich_series_content(self, title: str, year: Optional[int] = None) -> Dict[str, Any]:
        """
        Search for a TV series and return enriched metadata.
        """
        result = {
            "tmdb_id": None,
            "imdb_id": None,
            "imdb_rating": None,
            "imdb_votes": None,
            "trailer_url": None,
            "poster": None,
            "backdrop": None,
            "overview": None,
            "total_seasons": None,
            "total_episodes": None,
            "genres": [],
            "cast": [],
            "release_year": None,
            "original_title": None,
            "original_language": None,
            "tagline": None,
            "status": None,
            "popularity": None,
        }

        # Search for the series
        search_result = await self.search_tv_series(title, year)
        if not search_result:
            logger.warning(f"🔍 TMDB: No search results for series '{title}' ({year})")
            return result

        tmdb_id = search_result.get("id")
        result["tmdb_id"] = tmdb_id
        logger.info(f"🔍 TMDB: Found series '{title}' with ID {tmdb_id}")

        # Get full details
        details = await self.get_tv_series_details(tmdb_id)
        if not details:
            logger.error(f"❌ TMDB: Failed to get details for series ID {tmdb_id}")
            return result

        # Extract IMDB ID
        external_ids = details.get("external_ids", {})
        result["imdb_id"] = external_ids.get("imdb_id")

        # Extract metadata
        result["overview"] = details.get("overview")
        result["total_seasons"] = details.get("number_of_seasons")
        result["total_episodes"] = details.get("number_of_episodes")
        result["genres"] = [g.get("name") for g in details.get("genres", [])]
        
        # Extract ratings (TMDB provides vote_average)
        result["imdb_rating"] = details.get("vote_average")
        result["imdb_votes"] = details.get("vote_count")
        
        # Extract first air date and year
        first_air_date = details.get("first_air_date")  # Format: "YYYY-MM-DD"
        if first_air_date:
            try:
                result["release_year"] = int(first_air_date.split("-")[0])
            except (ValueError, IndexError):
                pass
        
        # Extract additional metadata
        result["original_title"] = details.get("original_name")
        result["original_language"] = details.get("original_language")
        result["tagline"] = details.get("tagline")
        result["status"] = details.get("status")
        result["popularity"] = details.get("popularity")

        # Poster image (tall vertical - for thumbnail/cover)
        if details.get("poster_path"):
            result["poster"] = self.get_image_url(details["poster_path"], "w500")

        # Backdrop image (wide horizontal - for background)
        if details.get("backdrop_path"):
            result["backdrop"] = self.get_image_url(details["backdrop_path"], "w1280")

        # Extract cast from credits
        credits = details.get("credits", {})
        cast = credits.get("cast", [])[:10]
        result["cast"] = [c.get("name") for c in cast]

        # Get trailer
        videos = details.get("videos", {}).get("results", [])
        trailers = [v for v in videos if v.get("type") == "Trailer" and v.get("site") == "YouTube"]
        if trailers:
            result["trailer_url"] = self.get_youtube_embed_url(trailers[0]["key"])

        return result

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Singleton instance
tmdb_service = TMDBService()
