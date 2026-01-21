"""
Kids Public Domain Content Importer

Imports kids-appropriate public domain content from Archive.org and other
legal sources for use in the Bayit+ kids section.

Content includes:
- Classic cartoons (Betty Boop, Felix the Cat, etc.)
- Educational films from the 1950s-1980s
- Public domain children's stories and fairy tales
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection

logger = logging.getLogger(__name__)

# Archive.org API base URL
ARCHIVE_ORG_API_BASE = "https://archive.org"


@dataclass
class ArchiveItem:
    """Represents an Archive.org item."""

    identifier: str
    title: str
    description: str = ""
    creator: Optional[str] = None
    date: Optional[str] = None
    runtime: Optional[str] = None
    mediatype: str = "movies"
    format: List[str] = field(default_factory=list)


# Curated list of public domain kids content from Archive.org
# These are verified public domain items suitable for children
PUBLIC_DOMAIN_KIDS_CONTENT: List[Dict[str, Any]] = [
    # Classic Cartoons - All verified public domain
    {
        "identifier": "Betty_Boop_Minnie_The_Moocher_1932",
        "title": "Betty Boop - Minnie the Moocher",
        "title_he": "בטי בופ - מיני המוחר",
        "title_es": "Betty Boop - Minnie la Gorrona",
        "description": "Classic 1932 Betty Boop cartoon featuring Cab Calloway",
        "year": 1932,
        "duration": "7:00",
        "age_rating": 7,
        "category_key": "cartoons",
        "educational_tags": ["animation", "classic", "music"],
    },
    {
        "identifier": "felix_the_cat_woos_whoopee_1930",
        "title": "Felix the Cat - Woos Whoopee",
        "title_he": "פליקס החתול",
        "title_es": "Felix el Gato",
        "description": "Classic Felix the Cat silent cartoon from 1930",
        "year": 1930,
        "duration": "6:00",
        "age_rating": 5,
        "category_key": "cartoons",
        "educational_tags": ["animation", "classic", "silent"],
    },
    {
        "identifier": "PopeyeTheSailorMeetsSindbadTheSailor1936",
        "title": "Popeye Meets Sindbad the Sailor",
        "title_he": "פופאי פוגש את סינדבד המלח",
        "title_es": "Popeye Conoce a Simbad el Marinero",
        "description": "Classic 1936 Popeye theatrical cartoon short",
        "year": 1936,
        "duration": "17:00",
        "age_rating": 7,
        "category_key": "cartoons",
        "educational_tags": ["animation", "classic", "adventure"],
    },
    {
        "identifier": "woody_woodpecker_the_screwball",
        "title": "Woody Woodpecker - The Screwball",
        "title_he": "וודי נקר העצים",
        "title_es": "El Pajaro Loco",
        "description": "Early Woody Woodpecker cartoon adventure",
        "year": 1943,
        "duration": "7:00",
        "age_rating": 5,
        "category_key": "cartoons",
        "educational_tags": ["animation", "classic", "comedy"],
    },
    # Educational Films
    {
        "identifier": "our_mr_sun",
        "title": "Our Mr. Sun",
        "title_he": "השמש שלנו",
        "title_es": "Nuestro Senor Sol",
        "description": "1956 educational film about the sun, produced by Frank Capra",
        "year": 1956,
        "duration": "58:00",
        "age_rating": 7,
        "category_key": "educational",
        "educational_tags": ["science", "astronomy", "nature"],
    },
    {
        "identifier": "hemo_the_magnificent",
        "title": "Hemo the Magnificent",
        "title_he": "המו הנהדר",
        "title_es": "Hemo el Magnifico",
        "description": "1957 educational film about the circulatory system",
        "year": 1957,
        "duration": "54:00",
        "age_rating": 10,
        "category_key": "educational",
        "educational_tags": ["science", "biology", "health"],
    },
    {
        "identifier": "your_friend_the_honey_bee",
        "title": "Your Friend the Honey Bee",
        "title_he": "חברך הדבורה",
        "title_es": "Tu Amiga la Abeja",
        "description": "Educational film about bees and pollination",
        "year": 1955,
        "duration": "15:00",
        "age_rating": 5,
        "category_key": "educational",
        "educational_tags": ["science", "nature", "insects"],
    },
    # Fairy Tales & Stories
    {
        "identifier": "cinderella_1922",
        "title": "Cinderella (1922)",
        "title_he": "סינדרלה",
        "title_es": "Cenicienta",
        "description": "Silent film adaptation of the classic fairy tale",
        "year": 1922,
        "duration": "20:00",
        "age_rating": 5,
        "category_key": "stories",
        "educational_tags": ["fairy_tale", "classic", "silent"],
    },
    {
        "identifier": "snow_white_1933",
        "title": "Snow White (1933)",
        "title_he": "שלגיה",
        "title_es": "Blancanieves",
        "description": "Betty Boop version of the Snow White fairy tale",
        "year": 1933,
        "duration": "7:00",
        "age_rating": 5,
        "category_key": "stories",
        "educational_tags": ["fairy_tale", "animation", "classic"],
    },
]


class KidsPublicDomainImporter:
    """
    Service for importing kids-appropriate public domain content
    from Archive.org and other legal sources.
    """

    def __init__(self):
        self.http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self.http_client is None or self.http_client.is_closed:
            self.http_client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
        return self.http_client

    async def close(self):
        """Close HTTP client."""
        if self.http_client:
            await self.http_client.aclose()

    @staticmethod
    def _archive_to_stream_url(identifier: str) -> str:
        """Get Archive.org download URL for an item."""
        return f"https://archive.org/download/{identifier}/{identifier}.mp4"

    @staticmethod
    def _archive_to_thumbnail(identifier: str) -> str:
        """Get Archive.org thumbnail URL for an item."""
        return f"https://archive.org/services/img/{identifier}"

    async def _ensure_category(self, category_key: str) -> Optional[str]:
        """Ensure kids category exists and return its ID."""
        slug = f"kids-{category_key}"
        existing = await Category.find_one({"slug": slug})
        if existing:
            return str(existing.id)
        return None

    async def verify_archive_item(self, identifier: str) -> Dict[str, Any]:
        """
        Verify that an Archive.org item exists and is accessible.

        Returns:
            Dict with verification results.
        """
        client = await self._get_client()

        try:
            # Check metadata endpoint
            metadata_url = f"{ARCHIVE_ORG_API_BASE}/metadata/{identifier}"
            response = await client.get(metadata_url)

            if response.status_code != 200:
                return {
                    "valid": False,
                    "error": f"Item not found: HTTP {response.status_code}",
                }

            metadata = response.json()

            # Check if it has video files
            files = metadata.get("files", [])
            video_files = [
                f for f in files if f.get("format") in ["MPEG4", "h.264", "Ogg Video"]
            ]

            if not video_files:
                return {
                    "valid": False,
                    "error": "No video files available",
                }

            return {
                "valid": True,
                "title": metadata.get("metadata", {}).get("title", identifier),
                "description": metadata.get("metadata", {}).get("description", ""),
                "video_files": len(video_files),
            }

        except Exception as e:
            logger.error(f"Error verifying archive item {identifier}: {e}")
            return {
                "valid": False,
                "error": str(e),
            }

    async def import_curated_content(
        self,
        verify_availability: bool = True,
        age_max: Optional[int] = None,
        categories: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Import curated public domain kids content.

        Args:
            verify_availability: Whether to verify each item is accessible,
            age_max: Maximum age rating to import,
            categories: List of category keys to import

        Returns:
            Summary of imported content.
        """
        if not settings.KIDS_ARCHIVE_ORG_ENABLED:
            return {
                "message": "Archive.org import is disabled",
                "imported": 0,
            }

        imported_count = 0
        skipped_count = 0
        errors = []

        for item in PUBLIC_DOMAIN_KIDS_CONTENT:
            try:
                # Apply filters
                if age_max and item.get("age_rating", 0) > age_max:
                    skipped_count += 1
                    continue

                if categories and item.get("category_key") not in categories:
                    skipped_count += 1
                    continue

                # Check if already exists
                existing = await Content.find_one({"title": item["title"]})
                if existing:
                    skipped_count += 1
                    continue

                # Verify availability if requested
                if verify_availability:
                    verification = await self.verify_archive_item(item["identifier"])
                    if not verification["valid"]:
                        errors.append(f"{item['title']}: {verification['error']}")
                        continue

                # Get category ID
                category_id = await self._ensure_category(
                    item.get("category_key", "cartoons")
                )
                if not category_id:
                    # Create a fallback kids category
                    category_id = await self._ensure_category("educational")

                # Create content entry
                content = Content(
                    title=item["title"],
                    title_en=item["title"],  # English title is primary
                    title_es=item.get("title_es"),
                    description=item.get("description"),
                    description_en=item.get("description"),
                    category_id=category_id or "",
                    category_name=item.get("category_key", "cartoons"),
                    duration=item.get("duration"),
                    year=item.get("year"),
                    thumbnail=self._archive_to_thumbnail(item["identifier"]),
                    backdrop=self._archive_to_thumbnail(item["identifier"]),
                    stream_url=self._archive_to_stream_url(item["identifier"]),
                    content_type="vod",
                    # Kids fields
                    is_kids_content=True,
                    age_rating=item.get("age_rating", 7),
                    content_rating="G",
                    educational_tags=item.get("educational_tags", []),
                    # Visibility
                    is_published=True,
                    requires_subscription="basic",
                    # Timestamps
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )

                await content.insert()
                imported_count += 1
                logger.info(f"Imported public domain content: {item['title']}")

            except Exception as e:
                errors.append(f"{item.get('title', 'unknown')}: {str(e)}")
                logger.error(f"Error importing {item.get('identifier')}: {e}")

        return {
            "message": "Public domain import completed",
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors,
            "total_available": len(PUBLIC_DOMAIN_KIDS_CONTENT),
        }

    async def search_archive_kids_content(
        self, query: str, max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search Archive.org for kids-appropriate content.

        Note: This performs a search but does NOT import - results should
        be reviewed before importing.

        Args:
            query: Search query,
            max_results: Maximum number of results

        Returns:
            List of matching items.
        """
        client = await self._get_client()

        try:
            # Archive.org advanced search API
            # Filter for movies with Creative Commons or public domain licenses
            search_url = f"{ARCHIVE_ORG_API_BASE}/advancedsearch.php"
            params = {
                "q": f"{query} AND mediatype:movies AND (licenseurl:*publicdomain* OR licenseurl:*creativecommons*)",
                "fl[]": [
                    "identifier",
                    "title",
                    "description",
                    "creator",
                    "date",
                    "runtime",
                ],
                "rows": max_results,
                "page": 1,
                "output": "json",
            }

            response = await client.get(search_url, params=params)

            if response.status_code != 200:
                logger.error(f"Archive.org search failed: HTTP {response.status_code}")
                return []

            data = response.json()
            docs = data.get("response", {}).get("docs", [])

            results = []
            for doc in docs:
                results.append(
                    {
                        "identifier": doc.get("identifier"),
                        "title": doc.get("title"),
                        "description": doc.get("description", ""),
                        "creator": doc.get("creator"),
                        "date": doc.get("date"),
                        "runtime": doc.get("runtime"),
                        "preview_url": f"https://archive.org/details/{doc.get('identifier')}",
                    }
                )

            return results

        except Exception as e:
            logger.error(f"Error searching Archive.org: {e}")
            return []


# Global service instance
kids_public_domain_importer = KidsPublicDomainImporter()
