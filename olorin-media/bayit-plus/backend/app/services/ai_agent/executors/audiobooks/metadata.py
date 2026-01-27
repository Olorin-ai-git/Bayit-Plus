"""
AI Agent Executors - Audiobook Metadata Enrichment

Functions for fetching and applying audiobook metadata from external APIs.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from bson import ObjectId

from app.models.content import Content
from app.services.ai_agent.executors._shared import handle_dry_run, log_librarian_action

from .discovery import extract_part_info

logger = logging.getLogger(__name__)


async def fetch_google_books_metadata(
    title: str, author: Optional[str] = None
) -> Optional[dict]:
    """Fetch audiobook metadata from Google Books API."""
    try:
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

            identifiers = book.get("industryIdentifiers", [])
            isbn = None
            for identifier in identifiers:
                if identifier.get("type") in ("ISBN_13", "ISBN_10"):
                    isbn = identifier.get("identifier")
                    break

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
                "isbn": isbn,
                "publisher_name": book.get("publisher"),
                "categories": book.get("categories", []),
                "source": "google_books",
            }
    except Exception as e:
        logger.warning(f"Google Books API error for '{title}': {e}")
        return None


async def fetch_open_library_metadata(
    title: str, author: Optional[str] = None
) -> Optional[dict]:
    """Fetch audiobook metadata from Open Library API (fallback)."""
    try:
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
                "source": "open_library",
            }
    except Exception as e:
        logger.warning(f"Open Library API error for '{title}': {e}")
        return None


async def execute_enrich_audiobook_metadata(
    audiobook_id: str,
    search_title: Optional[str] = None,
    search_author: Optional[str] = None,
    reason: Optional[str] = None,
    *,
    audit_id: str,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Fetch and apply metadata for an audiobook from external APIs."""
    dry_run_result = handle_dry_run(dry_run, "enrich audiobook metadata")
    if dry_run_result:
        return dry_run_result

    try:
        audiobook = await Content.get(ObjectId(audiobook_id))
        if not audiobook:
            return {"success": False, "error": f"Audiobook not found: {audiobook_id}"}

        # Determine search terms
        title = search_title or audiobook.title or ""
        author = search_author or audiobook.author

        # Clean title for search - remove part numbers
        base_title, _ = extract_part_info(title)
        title = base_title

        # Fetch metadata from Google Books first
        metadata = await fetch_google_books_metadata(title, author)

        # Fallback to Open Library
        if not metadata or not metadata.get("thumbnail"):
            ol_metadata = await fetch_open_library_metadata(title, author)
            if ol_metadata:
                if not metadata:
                    metadata = ol_metadata
                elif not metadata.get("thumbnail") and ol_metadata.get("thumbnail"):
                    metadata["thumbnail"] = ol_metadata["thumbnail"]
                    metadata["source"] = "open_library"

        if not metadata:
            return {
                "success": True,
                "message": "No metadata found for this audiobook",
                "audiobook_id": audiobook_id,
                "searched_title": title,
                "searched_author": author,
            }

        # Build updates
        updates = {}

        if metadata.get("thumbnail"):
            if not audiobook.thumbnail:
                updates["thumbnail"] = metadata["thumbnail"]
            if not audiobook.poster_url:
                updates["poster_url"] = metadata["thumbnail"]

        if metadata.get("description") and not audiobook.description:
            updates["description"] = metadata["description"]

        if metadata.get("year") and not audiobook.year:
            updates["year"] = metadata["year"]

        if metadata.get("isbn") and not audiobook.isbn:
            updates["isbn"] = metadata["isbn"]

        if metadata.get("publisher_name") and not audiobook.publisher_name:
            updates["publisher_name"] = metadata["publisher_name"]

        if metadata.get("author") and not audiobook.author:
            updates["author"] = metadata["author"]

        if metadata.get("categories") and not audiobook.topic_tags:
            updates["topic_tags"] = metadata["categories"][:5]

        if not updates:
            return {
                "success": True,
                "message": "Audiobook already has all available metadata",
                "audiobook_id": audiobook_id,
                "metadata_source": metadata.get("source"),
            }

        # Apply updates
        updates["updated_at"] = datetime.now(timezone.utc)
        await audiobook.set(updates)

        await log_librarian_action(
            audit_id=audit_id,
            action_type="enrich_audiobook_metadata",
            content_id=audiobook_id,
            description=reason or "Enriched audiobook metadata from external API",
            issue_type="missing_metadata",
            after_state=updates,
        )

        return {
            "success": True,
            "audiobook_id": audiobook_id,
            "title": audiobook.title,
            "metadata_source": metadata.get("source"),
            "fields_updated": list(updates.keys()),
        }

    except Exception as e:
        logger.error(f"Error enriching audiobook metadata: {e}")
        return {"success": False, "error": str(e)}
