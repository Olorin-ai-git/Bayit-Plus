#!/usr/bin/env python3
"""
Audiobook Organization Script for Bayit+.

This script organizes all audiobooks in the database by:
1. Unifying multi-part audiobooks into single parent entries with chapters
2. Retrieving book posters from Google Books API / Open Library
3. Verifying and cleaning title names
4. Verifying folder/file structure mapping to audiobook titles
5. Checking stream integrity (audio playability)
6. Overall cleanup and organization
7. Generating a final report

Multi-part audiobooks (e.g., "Book Title - Part 1", "Book Title - Chapter 2")
are unified under a single parent entry that appears in:
- Content Library
- Audiobook Page (with chapter list)
- Homepage

Usage:
    poetry run python scripts/backend/organize_audiobooks.py [options]

Options:
    --dry-run       Preview changes without applying them
    --verbose       Show detailed output
    --limit N       Limit processing to N audiobooks
    --fix           Auto-fix issues where possible
    --report FILE   Save report to file (default: stdout)
"""

import argparse
import asyncio
import logging
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
backend_dir = os.path.join(project_root, "backend")
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / "backend" / ".env")

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Patterns to detect multi-part audiobooks
# Note: [\s_]* matches whitespace or underscores for flexibility
PART_PATTERNS = [
    # English patterns with flexible whitespace/underscore handling
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Pp]art[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Cc]hapter[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Dd]isc[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Vv]ol(?:ume)?\.?[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*[Bb]ook[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*\(?[\s_]*[Pp]art[\s_]*(\d+)[\s_]*\)?[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*\(?[\s_]*(\d+)[\s_]*of[\s_]*\d+[\s_]*\)?[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*(\d+)[\s_]*$",  # "Title - 1", "Title_-_1"
    # Hebrew patterns
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*חלק[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*פרק[\s_]*(\d+)[\s_]*$",
    r"^(?:\d+[\s_]*)?(.+?)[\s_]*[-–_][\s_]*דיסק[\s_]*(\d+)[\s_]*$",
]


class AudiobookOrganizer:
    """Organizes audiobook content in the database."""

    def __init__(self, db, dry_run: bool = False, verbose: bool = False):
        self.db = db
        self.dry_run = dry_run
        self.verbose = verbose
        self.stats = {
            "total_audiobooks": 0,
            "unique_audiobooks": 0,  # After grouping multi-part books
            "multi_part_groups": 0,
            "standalone_audiobooks": 0,
            "parent_audiobooks_created": 0,
            "existing_parents_found": 0,
            "parts_linked": 0,
            "posters_found": 0,
            "posters_updated": 0,
            "titles_cleaned": 0,
            "streams_verified": 0,
            "streams_broken": 0,
            "metadata_enriched": 0,
            "issues_found": 0,
            "issues_fixed": 0,
            "errors": 0,
        }
        self.issues: list[dict[str, Any]] = []
        self.report_lines: list[str] = []

    def log(self, message: str, level: str = "info"):
        """Log message and add to report."""
        if level == "info":
            logger.info(message)
        elif level == "warning":
            logger.warning(message)
        elif level == "error":
            logger.error(message)
        self.report_lines.append(message)

    async def scan_audiobooks(self, limit: Optional[int] = None) -> list[dict]:
        """Scan database for all audiobook content."""
        self.log("🔍 Scanning database for audiobooks...")

        query = {"content_format": "audiobook"}

        cursor = self.db.content.find(query)
        if limit:
            cursor = cursor.limit(limit)

        audiobooks = await cursor.to_list(None)
        self.stats["total_audiobooks"] = len(audiobooks)
        self.log(f"   Found {len(audiobooks)} audiobooks")

        return audiobooks

    def extract_part_info(self, title: str) -> tuple[str, Optional[int]]:
        """
        Extract base title and part number from an audiobook title.

        Returns: (base_title, part_number) or (original_title, None)
        """
        if not title:
            return title, None

        for pattern in PART_PATTERNS:
            match = re.match(pattern, title.strip(), re.IGNORECASE)
            if match:
                base_title = match.group(1).strip()
                # Clean up underscores and normalize title
                base_title = base_title.replace("_", " ")
                base_title = " ".join(base_title.split())  # Normalize whitespace
                part_number = int(match.group(2))
                return base_title, part_number

        return title, None

    def extract_gcs_parent_folder(self, stream_url: str) -> Optional[str]:
        """
        Extract the parent folder name from a GCS stream URL.

        Examples:
            .../audiobooks/A_time_to_kill/01_A_Time.../file.mp3 -> "A_time_to_kill"
            .../audiobooks/Anne_Frank_-_The_Diary.../file.mp3 -> "Anne_Frank_-_The_Diary..."
        """
        if not stream_url:
            return None

        # Pattern: bucket/audiobooks/{PARENT_FOLDER}/...
        pattern = r"/audiobooks/([^/]+)/"
        match = re.search(pattern, stream_url)
        if match:
            return match.group(1)
        return None

    def clean_folder_name_to_title(self, folder_name: str) -> str:
        """Convert a GCS folder name back to a readable title."""
        if not folder_name:
            return folder_name

        # Replace underscores with spaces
        title = folder_name.replace("_", " ")

        # Remove common suffixes
        title = re.sub(r"\s*\(?Audio\s*Book\)?$", "", title, flags=re.IGNORECASE)
        title = re.sub(r"\s*\[?Audiobook\]?$", "", title, flags=re.IGNORECASE)
        title = re.sub(r"\s*-\s*Audiobook$", "", title, flags=re.IGNORECASE)
        title = re.sub(r"\s*\(?Unabridged\)?$", "", title, flags=re.IGNORECASE)

        # Normalize whitespace
        title = " ".join(title.split())

        return title.strip()

    def extract_part_number_from_filename(self, title: str) -> int:
        """Extract part/disc/chapter number from a filename-based title."""
        patterns = [
            r"[-_\s]Disc[-_\s]*(\d+)",
            r"[-_\s]Part[-_\s]*(\d+)",
            r"[-_\s]Chapter[-_\s]*(\d+)",
            r"(\d+)[-_\s]*of[-_\s]*\d+",
            r"^(\d+)[-_\s]",  # Leading number like "01_Title"
            r"[-_](\d+)$",  # Trailing number
        ]

        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return int(match.group(1))

        return 1

    def group_multi_part_audiobooks(
        self, audiobooks: list[dict]
    ) -> dict[str, list[dict]]:
        """
        Group audiobooks that are parts of the same book.

        PRIMARY: Groups by GCS parent folder from stream_url
        FALLBACK: Groups by title patterns if no stream_url

        Returns dict: {group_key: [list of part audiobooks]}
        """
        groups: dict[str, list[dict]] = defaultdict(list)
        standalone: list[dict] = []

        for audiobook in audiobooks:
            stream_url = audiobook.get("stream_url", "")
            title = audiobook.get("title", "")

            # Skip if already a parent (no stream_url)
            if not stream_url:
                # Check if it looks like a parent entry
                if audiobook.get("is_series") and audiobook.get("total_episodes"):
                    standalone.append(audiobook)
                    continue

            # PRIMARY: Group by GCS parent folder
            gcs_folder = self.extract_gcs_parent_folder(stream_url)

            if gcs_folder:
                # Extract part number from title/filename
                part_number = self.extract_part_number_from_filename(title)
                clean_title = self.clean_folder_name_to_title(gcs_folder)

                audiobook["_parsed_base_title"] = clean_title
                audiobook["_parsed_gcs_folder"] = gcs_folder
                audiobook["_parsed_part_number"] = part_number
                groups[gcs_folder].append(audiobook)
            else:
                # FALLBACK: Try title-based grouping
                base_title, part_number = self.extract_part_info(title)

                if part_number is not None:
                    normalized_base = self._normalize_for_grouping(base_title)
                    audiobook["_parsed_base_title"] = base_title
                    audiobook["_parsed_part_number"] = part_number
                    groups[f"title:{normalized_base}"].append(audiobook)
                else:
                    standalone.append(audiobook)

        # Filter to only multi-part groups (2+ parts)
        multi_part_groups = {k: v for k, v in groups.items() if len(v) >= 2}

        # Add single items back to standalone
        for key, items in groups.items():
            if len(items) == 1:
                standalone.extend(items)

        self.log(f"   Found {len(multi_part_groups)} multi-part audiobook groups")
        self.log(f"   Found {len(standalone)} standalone audiobooks")

        # Log some group examples for verification
        if self.verbose and multi_part_groups:
            self.log("\n   Sample groups:")
            for key, parts in list(multi_part_groups.items())[:5]:
                clean_title = parts[0].get("_parsed_base_title", key)
                self.log(f"      • {clean_title}: {len(parts)} parts")

        return multi_part_groups, standalone

    def _normalize_for_grouping(self, text: str) -> str:
        """Normalize text for grouping comparison."""
        # Lowercase, remove special chars, normalize whitespace
        normalized = re.sub(r"[^\w\s]", "", text.lower())
        normalized = " ".join(normalized.split())
        return normalized

    async def find_or_create_audiobook_parent(
        self,
        base_title: str,
        parts: list[dict],
        fix: bool = False,
    ) -> Optional[str]:
        """
        Find existing parent audiobook or create a new one.

        Returns parent ID if successful.
        """
        # Check if a parent already exists (no series_id, matching title)
        existing_parent = await self.db.content.find_one(
            {
                "content_format": "audiobook",
                "title": {"$regex": f"^{re.escape(base_title)}$", "$options": "i"},
                "$or": [
                    {"series_id": None},
                    {"series_id": {"$exists": False}},
                ],
                # Parent should not have a part number in title
                "stream_url": {"$in": ["", None]},
            }
        )

        if existing_parent:
            self.log(f"   📚 Found existing parent: {existing_parent['_id']}")
            self.stats["existing_parents_found"] += 1
            return str(existing_parent["_id"])

        # Also check if any part is already linked to a parent
        for part in parts:
            if part.get("series_id"):
                self.log(f"   📚 Parts already linked to parent: {part['series_id']}")
                self.stats["existing_parents_found"] += 1
                return part["series_id"]

        if not fix or self.dry_run:
            self.log(f"   📚 Would create parent audiobook for: {base_title}")
            return None

        # Create new parent audiobook
        self.log(f"   📚 Creating parent audiobook: {base_title}")

        # Get metadata from first part or richest part
        best_part = self._get_best_metadata_part(parts)

        now = datetime.now(timezone.utc)
        parent_doc = {
            "_id": ObjectId(),
            "title": base_title,
            "title_en": best_part.get("title_en"),
            "description": best_part.get("description"),
            "description_en": best_part.get("description_en"),
            "author": best_part.get("author"),
            "narrator": best_part.get("narrator"),
            "thumbnail": best_part.get("thumbnail"),
            "poster_url": best_part.get("poster_url"),
            "backdrop": best_part.get("backdrop"),
            "content_format": "audiobook",
            "section_ids": best_part.get("section_ids", []),
            "primary_section_id": best_part.get("primary_section_id"),
            "category_id": best_part.get("category_id"),
            "is_series": True,  # Indicates it has parts/chapters
            "series_id": None,  # Parent has no parent
            "total_episodes": len(parts),  # Total parts
            "stream_url": "",  # Parent has no direct stream
            "stream_type": "audio",
            "is_published": True,
            "is_featured": best_part.get("is_featured", False),
            "requires_subscription": best_part.get("requires_subscription", "basic"),
            "visibility_mode": best_part.get("visibility_mode", "public"),
            "year": best_part.get("year"),
            "isbn": best_part.get("isbn"),
            "publisher_name": best_part.get("publisher_name"),
            "audio_quality": best_part.get("audio_quality"),
            "genre_ids": best_part.get("genre_ids", []),
            "topic_tags": best_part.get("topic_tags", []),
            "created_at": now,
            "updated_at": now,
        }

        # Calculate total duration from parts
        total_duration = self._calculate_total_duration(parts)
        if total_duration:
            parent_doc["duration"] = total_duration

        result = await self.db.content.insert_one(parent_doc)
        parent_id = str(result.inserted_id)
        self.stats["parent_audiobooks_created"] += 1

        self.log(f"      ✅ Created parent: {parent_id}")
        return parent_id

    def _get_best_metadata_part(self, parts: list[dict]) -> dict:
        """Get the part with the most complete metadata."""
        def metadata_score(part: dict) -> int:
            score = 0
            if part.get("thumbnail") or part.get("poster_url"):
                score += 10
            if part.get("description"):
                score += 5
            if part.get("author"):
                score += 3
            if part.get("narrator"):
                score += 2
            if part.get("year"):
                score += 1
            if part.get("isbn"):
                score += 1
            return score

        return max(parts, key=metadata_score)

    def _calculate_total_duration(self, parts: list[dict]) -> Optional[str]:
        """Calculate total duration from all parts."""
        total_seconds = 0

        for part in parts:
            duration = part.get("duration")
            if duration:
                try:
                    # Parse HH:MM:SS or MM:SS format
                    time_parts = duration.split(":")
                    if len(time_parts) == 3:
                        h, m, s = map(int, time_parts)
                        total_seconds += h * 3600 + m * 60 + s
                    elif len(time_parts) == 2:
                        m, s = map(int, time_parts)
                        total_seconds += m * 60 + s
                except (ValueError, TypeError):
                    pass

        if total_seconds > 0:
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            return f"{hours}:{minutes:02d}:{seconds:02d}"

        return None

    async def link_parts_to_parent(
        self,
        parent_id: str,
        parts: list[dict],
        fix: bool = False,
    ):
        """Link all parts to the parent audiobook."""
        # Sort parts by part number
        sorted_parts = sorted(
            parts, key=lambda p: p.get("_parsed_part_number", 0)
        )

        for part in sorted_parts:
            part_id = part["_id"]
            part_number = part.get("_parsed_part_number", 1)
            current_series_id = part.get("series_id")

            # Skip if already linked to correct parent
            if current_series_id == parent_id:
                if self.verbose:
                    self.log(f"      Part {part_number} already linked")
                continue

            if not fix or self.dry_run:
                self.log(
                    f"      Would link part {part_number}: {part.get('title')}"
                )
                continue

            update_data = {
                "series_id": parent_id,
                "is_series": True,  # Part of a multi-part audiobook
                "episode": part_number,  # Use episode field for part number
                "updated_at": datetime.now(timezone.utc),
            }

            await self.db.content.update_one(
                {"_id": part_id}, {"$set": update_data}
            )
            self.stats["parts_linked"] += 1

            if self.verbose:
                self.log(f"      ✅ Linked part {part_number}")

    def clean_title(self, title: str) -> dict[str, Any]:
        """
        Clean and normalize audiobook title.

        Returns dict with:
            - cleaned_title: The cleaned title
            - author: Extracted author if found in title
            - issues: List of issues found
        """
        result = {"cleaned_title": title, "author": None, "issues": []}

        if not title:
            result["issues"].append("Empty title")
            return result

        original = title
        cleaned = title

        # Remove common audiobook suffixes
        patterns_to_remove = [
            r"\s*\(?(Unabridged|Abridged)\)?$",
            r"\s*\[?(Audiobook)\]?$",
            r"\s*-\s*Audiobook$",
            r"\s*\(Audio(book)?\)$",
            r"\s*\[Audio(book)?\]$",
            r"\s*-\s*Audio$",
            r"\s*\(MP3\)$",
            r"\s*\[MP3\]$",
            r"\s*\(M4B\)$",
            r"\s*\[M4B\]$",
        ]

        for pattern in patterns_to_remove:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

        # Extract author from common patterns
        author_patterns = [
            r"^(.+?)\s*[-–]\s*(?:by\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$",
            r"^(.+?)\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$",
        ]

        for pattern in author_patterns:
            match = re.match(pattern, cleaned)
            if match:
                potential_title = match.group(1).strip()
                potential_author = match.group(2).strip()
                if self._looks_like_author_name(potential_author):
                    cleaned = potential_title
                    result["author"] = potential_author
                    break

        # Clean up whitespace and punctuation
        cleaned = " ".join(cleaned.split())
        cleaned = re.sub(r"\s*[-–:]\s*$", "", cleaned)
        cleaned = cleaned.strip()

        # Detect issues
        if cleaned != original:
            result["issues"].append(f"Title cleaned: '{original}' -> '{cleaned}'")

        if re.search(r"\d{3,}", cleaned):
            result["issues"].append("Title contains long number sequence")

        if len(cleaned) < 3:
            result["issues"].append("Title is too short")

        if len(cleaned) > 200:
            result["issues"].append("Title is unusually long")

        if "�" in cleaned or "\\x" in cleaned:
            result["issues"].append("Title contains encoding artifacts")

        result["cleaned_title"] = cleaned
        return result

    def _looks_like_author_name(self, text: str) -> bool:
        """Heuristic to determine if text looks like an author name."""
        words = text.strip().split()
        if len(words) < 2 or len(words) > 5:
            return False
        if not text[0].isupper():
            return False
        title_words = {"the", "a", "an", "of", "and", "in", "to", "for", "with"}
        first_word = words[0].lower()
        if first_word in title_words:
            return False
        return True

    async def fetch_google_books_metadata(
        self, title: str, author: Optional[str] = None
    ) -> Optional[dict]:
        """Fetch audiobook metadata from Google Books API."""
        try:
            import httpx

            api_key = os.environ.get("GOOGLE_BOOKS_API_KEY")

            query = f"intitle:{title}"
            if author:
                query += f"+inauthor:{author}"

            params = {"q": query, "maxResults": 1}
            if api_key:
                params["key"] = api_key

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/books/v1/volumes",
                    params=params,
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()

                if not data.get("items"):
                    return None

                book = data["items"][0]["volumeInfo"]

                thumbnail = None
                if "imageLinks" in book:
                    thumbnail = book["imageLinks"].get(
                        "thumbnail"
                    ) or book["imageLinks"].get("smallThumbnail")
                    if thumbnail:
                        thumbnail = thumbnail.replace("zoom=1", "zoom=2")
                        thumbnail = thumbnail.replace("http://", "https://")

                return {
                    "title": book.get("title"),
                    "author": (
                        ", ".join(book.get("authors", []))
                        if book.get("authors")
                        else None
                    ),
                    "description": book.get("description"),
                    "year": (
                        int(book.get("publishedDate", "")[:4])
                        if book.get("publishedDate")
                        else None
                    ),
                    "thumbnail": thumbnail,
                    "isbn": self._extract_isbn(book.get("industryIdentifiers", [])),
                    "publisher_name": book.get("publisher"),
                    "categories": book.get("categories", []),
                    "rating": book.get("averageRating"),
                    "page_count": book.get("pageCount"),
                    "source": "google_books",
                }
        except Exception as e:
            if self.verbose:
                logger.warning(f"Google Books API error for '{title}': {e}")
            return None

    async def fetch_open_library_metadata(
        self, title: str, author: Optional[str] = None
    ) -> Optional[dict]:
        """Fetch audiobook metadata from Open Library API (fallback)."""
        try:
            import httpx

            query = title
            if author:
                query += f" {author}"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://openlibrary.org/search.json",
                    params={"q": query, "limit": 1},
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()

                if not data.get("docs"):
                    return None

                book = data["docs"][0]

                cover_id = book.get("cover_i")
                thumbnail = (
                    f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
                    if cover_id
                    else None
                )

                return {
                    "title": book.get("title"),
                    "author": (
                        ", ".join(book.get("author_name", []))
                        if book.get("author_name")
                        else None
                    ),
                    "description": None,
                    "year": book.get("first_publish_year"),
                    "thumbnail": thumbnail,
                    "isbn": book.get("isbn", [None])[0] if book.get("isbn") else None,
                    "publisher_name": (
                        book.get("publisher", [None])[0]
                        if book.get("publisher")
                        else None
                    ),
                    "categories": (
                        book.get("subject", [])[:5] if book.get("subject") else []
                    ),
                    "rating": None,
                    "source": "open_library",
                }
        except Exception as e:
            if self.verbose:
                logger.warning(f"Open Library API error for '{title}': {e}")
            return None

    def _extract_isbn(self, identifiers: list[dict]) -> Optional[str]:
        """Extract ISBN from Google Books industry identifiers."""
        for identifier in identifiers:
            if identifier.get("type") in ("ISBN_13", "ISBN_10"):
                return identifier.get("identifier")
        return None

    async def verify_stream_url(self, stream_url: str) -> dict[str, Any]:
        """Verify that an audio stream URL is accessible and valid."""
        result = {"accessible": False, "content_type": None, "size": None, "issues": []}

        if not stream_url:
            result["issues"].append("No stream URL")
            return result

        try:
            import httpx

            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.head(stream_url, timeout=10.0)

                if response.status_code == 200:
                    result["accessible"] = True
                    result["content_type"] = response.headers.get("content-type")
                    result["size"] = response.headers.get("content-length")

                    valid_types = [
                        "audio/",
                        "application/octet-stream",
                        "binary/octet-stream",
                    ]
                    content_type = result["content_type"] or ""
                    if not any(vt in content_type.lower() for vt in valid_types):
                        result["issues"].append(
                            f"Unexpected content type: {content_type}"
                        )
                elif response.status_code == 403:
                    result["issues"].append("Stream URL returns 403 Forbidden")
                elif response.status_code == 404:
                    result["issues"].append("Stream URL returns 404 Not Found")
                else:
                    result["issues"].append(
                        f"Stream URL returns HTTP {response.status_code}"
                    )

        except Exception as e:
            if "Timeout" in str(type(e).__name__):
                result["issues"].append("Stream URL timeout")
            elif "Connect" in str(type(e).__name__):
                result["issues"].append("Stream URL connection failed")
            else:
                result["issues"].append(f"Stream verification error: {str(e)}")

        return result

    async def verify_gcs_structure(self, stream_url: str) -> dict[str, Any]:
        """Verify GCS folder structure matches expected audiobook organization."""
        result = {"valid_structure": False, "extracted_info": {}, "issues": []}

        if not stream_url:
            return result

        gcs_pattern = r"https://storage\.googleapis\.com/([^/]+)/audiobooks/([^/]+)/([^/]+)/(.+)"
        match = re.match(gcs_pattern, stream_url)

        if match:
            result["valid_structure"] = True
            result["extracted_info"] = {
                "bucket": match.group(1),
                "author_folder": match.group(2).replace("_", " "),
                "title_folder": match.group(3).replace("_", " "),
                "filename": match.group(4),
            }
        else:
            alt_pattern = r"https://storage\.googleapis\.com/([^/]+)/audiobooks/([^/]+)/(.+)"
            alt_match = re.match(alt_pattern, stream_url)

            if alt_match:
                result["valid_structure"] = True
                result["extracted_info"] = {
                    "bucket": alt_match.group(1),
                    "title_folder": alt_match.group(2).replace("_", " "),
                    "filename": alt_match.group(3),
                }
                result["issues"].append("Missing author folder in GCS structure")
            else:
                result["issues"].append(
                    "Stream URL does not match expected GCS structure"
                )

        return result

    async def enrich_audiobook_metadata(
        self, audiobook: dict, fix: bool = False
    ) -> dict[str, Any]:
        """Fetch and apply metadata enrichment for an audiobook."""
        audiobook_id = audiobook.get("_id")
        title = audiobook.get("title", "")
        author = audiobook.get("author", "")

        updates = {}

        # Check if needs poster or metadata
        needs_poster = not audiobook.get("thumbnail") and not audiobook.get(
            "poster_url"
        )
        needs_metadata = not audiobook.get("description") or not audiobook.get("year")

        if not (needs_poster or needs_metadata):
            return updates

        # Clean title for search
        title_result = self.clean_title(title)
        search_title = title_result["cleaned_title"]
        search_author = author or title_result.get("author")

        # Remove part numbers for better search
        base_title, _ = self.extract_part_info(search_title)
        search_title = base_title

        # Try Google Books first
        metadata = await self.fetch_google_books_metadata(search_title, search_author)

        # Fallback to Open Library
        if not metadata or not metadata.get("thumbnail"):
            ol_metadata = await self.fetch_open_library_metadata(
                search_title, search_author
            )
            if ol_metadata:
                if not metadata:
                    metadata = ol_metadata
                elif not metadata.get("thumbnail") and ol_metadata.get("thumbnail"):
                    metadata["thumbnail"] = ol_metadata["thumbnail"]
                    metadata["source"] = "open_library"

        if metadata:
            if metadata.get("thumbnail"):
                self.stats["posters_found"] += 1
                if needs_poster and fix:
                    updates["thumbnail"] = metadata["thumbnail"]
                    updates["poster_url"] = metadata["thumbnail"]
                    self.stats["posters_updated"] += 1

            if fix:
                if metadata.get("description") and not audiobook.get("description"):
                    updates["description"] = metadata["description"]

                if metadata.get("year") and not audiobook.get("year"):
                    updates["year"] = metadata["year"]

                if metadata.get("isbn") and not audiobook.get("isbn"):
                    updates["isbn"] = metadata["isbn"]

                if metadata.get("publisher_name") and not audiobook.get(
                    "publisher_name"
                ):
                    updates["publisher_name"] = metadata["publisher_name"]

                if metadata.get("author") and not audiobook.get("author"):
                    updates["author"] = metadata["author"]

                if metadata.get("categories") and not audiobook.get("topic_tags"):
                    updates["topic_tags"] = metadata["categories"][:5]

                if updates:
                    self.stats["metadata_enriched"] += 1

        # Apply updates
        if updates and fix and not self.dry_run:
            updates["updated_at"] = datetime.now(timezone.utc)
            await self.db.content.update_one(
                {"_id": audiobook_id}, {"$set": updates}
            )

        return updates

    async def process_standalone_audiobook(
        self, audiobook: dict, fix: bool = False
    ) -> dict[str, Any]:
        """Process a standalone (single-part) audiobook."""
        audiobook_id = str(audiobook.get("_id"))
        title = audiobook.get("title", "")
        stream_url = audiobook.get("stream_url", "")

        result = {"id": audiobook_id, "title": title, "issues": [], "updates": {}}

        if self.verbose:
            self.log(f"\n📖 Processing standalone: {title}")

        # Verify stream
        if stream_url:
            stream_result = await self.verify_stream_url(stream_url)
            if stream_result["accessible"]:
                self.stats["streams_verified"] += 1
            else:
                self.stats["streams_broken"] += 1
                result["issues"].extend(stream_result["issues"])

        # Enrich metadata
        updates = await self.enrich_audiobook_metadata(audiobook, fix)
        result["updates"] = updates

        if result["issues"]:
            self.stats["issues_found"] += len(result["issues"])
            self.issues.append(result)

        return result

    async def organize_all_audiobooks(
        self, limit: Optional[int] = None, fix: bool = False
    ):
        """Main method to organize all audiobooks."""
        self.log("=" * 80)
        self.log("AUDIOBOOK ORGANIZATION SCRIPT")
        self.log("=" * 80)
        self.log(f"Dry Run: {self.dry_run}")
        self.log(f"Auto-Fix: {fix}")
        if limit:
            self.log(f"Limit: {limit}")
        self.log("")

        # Scan audiobooks
        audiobooks = await self.scan_audiobooks(limit)

        if not audiobooks:
            self.log("No audiobooks found in database.")
            return

        # Group multi-part audiobooks
        self.log("\n" + "=" * 80)
        self.log("GROUPING MULTI-PART AUDIOBOOKS")
        self.log("=" * 80)

        multi_part_groups, standalone = self.group_multi_part_audiobooks(audiobooks)
        self.stats["multi_part_groups"] = len(multi_part_groups)
        self.stats["standalone_audiobooks"] = len(standalone)
        self.stats["unique_audiobooks"] = len(multi_part_groups) + len(standalone)

        self.log(f"\n📊 GROUPING SUMMARY:")
        self.log(f"   Total DB entries:      {self.stats['total_audiobooks']}")
        self.log(f"   Multi-part groups:     {self.stats['multi_part_groups']}")
        self.log(f"   Standalone audiobooks: {self.stats['standalone_audiobooks']}")
        self.log(f"   ─────────────────────────────────────")
        self.log(f"   UNIQUE AUDIOBOOKS:     {self.stats['unique_audiobooks']}")

        # Process multi-part groups
        if multi_part_groups:
            self.log("\n" + "-" * 60)
            self.log("PROCESSING MULTI-PART AUDIOBOOKS")
            self.log("-" * 60)

            for normalized_title, parts in sorted(multi_part_groups.items()):
                base_title = parts[0].get("_parsed_base_title", normalized_title)
                self.log(f"\n📚 {base_title} ({len(parts)} parts)")

                try:
                    # Find or create parent
                    parent_id = await self.find_or_create_audiobook_parent(
                        base_title, parts, fix
                    )

                    if parent_id:
                        # Link parts to parent
                        await self.link_parts_to_parent(parent_id, parts, fix)

                        # Enrich parent metadata
                        parent_doc = await self.db.content.find_one(
                            {"_id": ObjectId(parent_id)}
                        )
                        if parent_doc:
                            await self.enrich_audiobook_metadata(parent_doc, fix)

                    # Verify streams for all parts
                    for part in parts:
                        stream_url = part.get("stream_url", "")
                        if stream_url:
                            stream_result = await self.verify_stream_url(stream_url)
                            if stream_result["accessible"]:
                                self.stats["streams_verified"] += 1
                            else:
                                self.stats["streams_broken"] += 1
                                self.issues.append({
                                    "id": str(part["_id"]),
                                    "title": part.get("title"),
                                    "issues": stream_result["issues"],
                                })

                except Exception as e:
                    self.stats["errors"] += 1
                    logger.error(f"Error processing group '{base_title}': {e}")

                await asyncio.sleep(0.3)

        # Process standalone audiobooks
        if standalone:
            self.log("\n" + "-" * 60)
            self.log("PROCESSING STANDALONE AUDIOBOOKS")
            self.log("-" * 60)

            for idx, audiobook in enumerate(standalone, 1):
                if not self.verbose and idx % 10 == 0:
                    logger.info(f"Progress: {idx}/{len(standalone)}")

                try:
                    await self.process_standalone_audiobook(audiobook, fix)
                except Exception as e:
                    self.stats["errors"] += 1
                    logger.error(
                        f"Error processing audiobook {audiobook.get('_id')}: {e}"
                    )

                await asyncio.sleep(0.3)

        # Generate report
        self.generate_report()

    def generate_report(self) -> str:
        """Generate final organization report."""
        self.log("\n" + "=" * 80)
        self.log("AUDIOBOOK ORGANIZATION REPORT")
        self.log("=" * 80)

        self.log(f"\n📊 SUMMARY STATISTICS")
        self.log(f"   Total DB entries:            {self.stats['total_audiobooks']}")
        self.log(f"   ─────────────────────────────────────────────")
        self.log(f"   Multi-part groups:           {self.stats['multi_part_groups']}")
        self.log(f"   Standalone audiobooks:       {self.stats['standalone_audiobooks']}")
        self.log(f"   ─────────────────────────────────────────────")
        self.log(f"   UNIQUE AUDIOBOOKS:           {self.stats['unique_audiobooks']}")
        self.log(f"   ─────────────────────────────────────────────")
        self.log(f"   Existing parents found:      {self.stats['existing_parents_found']}")
        self.log(f"   Parent audiobooks created:   {self.stats['parent_audiobooks_created']}")
        self.log(f"   Parts linked to parents:     {self.stats['parts_linked']}")
        self.log(f"   Posters found:               {self.stats['posters_found']}")
        self.log(f"   Posters updated:             {self.stats['posters_updated']}")
        self.log(f"   Titles cleaned:              {self.stats['titles_cleaned']}")
        self.log(f"   Streams verified (OK):       {self.stats['streams_verified']}")
        self.log(f"   Streams broken:              {self.stats['streams_broken']}")
        self.log(f"   Metadata enriched:           {self.stats['metadata_enriched']}")
        self.log(f"   Total issues found:          {self.stats['issues_found']}")
        self.log(f"   Issues fixed:                {self.stats['issues_fixed']}")
        self.log(f"   Errors:                      {self.stats['errors']}")

        if self.issues:
            self.log(f"\n⚠️  ISSUES BY AUDIOBOOK ({len(self.issues)} with issues)")
            self.log("-" * 60)

            issue_types = defaultdict(list)
            for item in self.issues:
                for issue in item.get("issues", []):
                    issue_type = issue.split(":")[0] if ":" in issue else issue
                    issue_types[issue_type].append(item["title"])

            self.log("\n📋 ISSUES BY TYPE:")
            for issue_type, titles in sorted(
                issue_types.items(), key=lambda x: -len(x[1])
            ):
                self.log(f"\n   {issue_type}: {len(titles)} audiobooks")
                if self.verbose:
                    for title in titles[:5]:
                        self.log(f"      - {title[:50]}...")
                    if len(titles) > 5:
                        self.log(f"      ... and {len(titles) - 5} more")

        self.log("\n💡 RECOMMENDATIONS:")
        if self.stats["multi_part_groups"] > self.stats["parent_audiobooks_created"]:
            pending = self.stats["multi_part_groups"] - self.stats["parent_audiobooks_created"]
            self.log(
                f"   • {pending} multi-part audiobooks need parent entries - "
                "run with --fix to create"
            )
        if self.stats["streams_broken"] > 0:
            self.log(
                f"   • {self.stats['streams_broken']} audiobooks have broken streams - "
                "consider re-uploading or removing"
            )
        if self.stats["posters_found"] > self.stats["posters_updated"]:
            pending = self.stats["posters_found"] - self.stats["posters_updated"]
            self.log(
                f"   • {pending} audiobooks can have posters attached - "
                "run with --fix to apply"
            )

        self.log("\n" + "=" * 80)
        self.log("END OF REPORT")
        self.log("=" * 80)

        return "\n".join(self.report_lines)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Organize audiobooks in Bayit+ database"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Show detailed output"
    )
    parser.add_argument(
        "--limit", type=int, help="Limit number of audiobooks to process"
    )
    parser.add_argument(
        "--fix", action="store_true", help="Auto-fix issues where possible"
    )
    parser.add_argument("--report", type=str, help="Save report to file")

    args = parser.parse_args()

    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        logger.error("MONGODB_URI environment variable not set")
        sys.exit(1)

    client = AsyncIOMotorClient(mongodb_uri)
    db = client["bayit_plus"]

    logger.info("📡 Connected to MongoDB")

    try:
        organizer = AudiobookOrganizer(
            db, dry_run=args.dry_run, verbose=args.verbose
        )
        await organizer.organize_all_audiobooks(limit=args.limit, fix=args.fix)

        if args.report:
            report_content = "\n".join(organizer.report_lines)
            with open(args.report, "w", encoding="utf-8") as f:
                f.write(report_content)
            logger.info(f"Report saved to: {args.report}")

    finally:
        client.close()
        logger.info("🔌 Disconnected from MongoDB")


if __name__ == "__main__":
    asyncio.run(main())
