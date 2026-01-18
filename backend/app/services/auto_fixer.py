"""
Auto-Fixer Service
Safe automated issue resolution with rollback capability
"""
import logging
import re
import httpx
from io import BytesIO
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from uuid import uuid4

from beanie import PydanticObjectId
from PIL import Image
from app.models.content import Content, Category
from app.models.librarian import LibrarianAction
from app.services.tmdb_service import tmdb_service
from app.core.config import settings

logger = logging.getLogger(__name__)


def clean_title(title: str) -> str:
    """
    Clean movie/TV title by removing release group tags, quality indicators, etc.

    Examples:
        "Coco p Rip -EVO" -> "Coco"
        "Django Unchained Upscaled Soup" -> "Django Unchained"
        "Ice Age p multisub-HighCode" -> "Ice Age"
        "Inception.2010.720p.BRRip.x264.AAC-ETRG" -> "Inception"
    """
    original = title

    # Remove file extensions
    title = re.sub(r'\.(mkv|mp4|avi|mov)$', '', title, flags=re.IGNORECASE)

    # Remove year if followed by quality indicators (e.g., ".2010.720p" -> remove everything after title)
    # This handles "Movie.2010.1080p.BluRay" -> "Movie"
    title = re.sub(r'\.\d{4}\.(1080|720|480|360|2160)p.*$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\.\d{4}\.(BluRay|BRRip|WEBRip|HDRip).*$', '', title, flags=re.IGNORECASE)

    # Replace dots with spaces (common in file names)
    title = title.replace('.', ' ')

    # Remove resolution/quality indicators
    quality_patterns = [
        r'\b(2160|1080|720|480|360)p?\b',
        r'\b(4K|UHD|HD|SD)\b',
        r'\b(BluRay|BRRip|BDRip|WEBRip|WEB-DL|HDRip|DVDRip)\b',
        r'\b(PROPER|REPACK|INTERNAL|LIMITED)\b',
    ]
    for pattern in quality_patterns:
        title = re.sub(pattern, '', title, flags=re.IGNORECASE)

    # Remove codec info
    codec_patterns = [
        r'\b(x264|x265|H\.?264|H\.?265|HEVC|XviD|DivX)\b',
        r'\b(AAC|AC3|DTS|MP3|FLAC)\b',
        r'\b(5\.1|7\.1|2\.0)\b',
    ]
    for pattern in codec_patterns:
        title = re.sub(pattern, '', title, flags=re.IGNORECASE)

    # Remove release group tags (usually at the end)
    title = re.sub(r'-[A-Z0-9]+\]?$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\[[A-Z0-9]+\]?$', '', title, flags=re.IGNORECASE)

    # Remove common release keywords and mysterious suffixes
    release_keywords = [
        r'\bRip\b',
        r'\bUpscaled\b',
        r'\bmultisub\b',
        r'\bExtended\b',
        r'\bUnrated\b',
        r'\bDirector\'?s? Cut\b',
        r'\bTheatrical\b',
        r'\bRemastered\b',
        r'\bUltra\b',
        r'\bEdition\b',
        r'\bRemix\b',
        r'\bSoup\b',
        r'\banoXmous\b',
        r'\bHighCode\b',
        r'\bN O K\b',
        r'\bChina\b',
        r'\bCyber\b',  # Mysterious suffix like "Children Of A Lesser God Cyber"
        r'\bMX\b',     # Release group
        r'\bEVO\b',    # Release group
        r'\bETRG\b',   # Release group
        r'\bSPARKS\b', # Release group
    ]
    for keyword in release_keywords:
        title = re.sub(keyword, '', title, flags=re.IGNORECASE)

    # Remove standalone 'p' (usually part of "1080p" but sometimes separated)
    title = re.sub(r'\s+p\s+', ' ', title, flags=re.IGNORECASE)
    title = re.sub(r'\s+p$', '', title, flags=re.IGNORECASE)

    # Remove years at the end if preceded by space (e.g., "Movie 2010" when year is already in metadata)
    # But be careful not to remove years that are part of the title (e.g., "2012" the movie)
    title = re.sub(r'\s+\d{4}$', '', title)

    # Remove extra spaces, dashes, brackets
    title = re.sub(r'\s+', ' ', title)
    title = re.sub(r'\s*-\s*$', '', title)
    title = re.sub(r'^\s*-\s*', '', title)
    title = title.strip()

    # Remove trailing/leading special characters
    title = title.strip(' -[]()_.')

    if title != original:
        logger.debug(f"Cleaned title: '{original}' -> '{title}'")

    return title


def is_youtube_thumbnail_url(url: str) -> bool:
    """Check if a URL is a YouTube thumbnail URL."""
    if not url:
        return False
    return "img.youtube.com" in url or "i.ytimg.com" in url


async def download_and_upload_youtube_thumbnail(
    youtube_url: str,
    content_id: str,
    image_type: str = "thumbnail"
) -> Optional[str]:
    """
    Download a YouTube thumbnail and upload it to storage.

    Args:
        youtube_url: The YouTube thumbnail URL (e.g., https://img.youtube.com/vi/{id}/maxresdefault.jpg)
        content_id: The content ID for organizing storage
        image_type: Type of image ("thumbnail" or "backdrop")

    Returns:
        The new storage URL, or None if failed
    """
    try:
        # Download the image from YouTube
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(youtube_url)
            response.raise_for_status()
            image_bytes = response.content

        # Validate it's a real image
        try:
            img = Image.open(BytesIO(image_bytes))
            img.verify()
            # Reopen after verify (verify closes the file)
            img = Image.open(BytesIO(image_bytes))
        except Exception as e:
            logger.warning(f"Invalid image from YouTube URL {youtube_url}: {e}")
            return None

        # Check minimum image dimensions (skip placeholder images)
        if img.width < 120 or img.height < 90:
            logger.warning(f"Image too small ({img.width}x{img.height}), likely a placeholder")
            return None

        # Optimize and convert to JPEG for storage
        output = BytesIO()
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (0, 0, 0))  # Black background for video thumbnails
            if img.mode == "P":
                img = img.convert("RGBA")
            if img.mode in ("RGBA", "LA"):
                background.paste(img, mask=img.split()[-1])
            else:
                background.paste(img)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize if too large
        max_width = 1920
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        img.save(output, format="JPEG", quality=85, optimize=True)
        optimized_bytes = output.getvalue()

        # Upload to storage (GCS)
        if settings.STORAGE_TYPE == "gcs" and settings.GCS_BUCKET_NAME:
            from google.cloud import storage as gcs_storage

            client = gcs_storage.Client(project=settings.GCS_PROJECT_ID or None)
            bucket = client.bucket(settings.GCS_BUCKET_NAME)

            # Generate storage path
            filename = f"{uuid4()}.jpg"
            blob_name = f"images/judaism/{image_type}/{filename}"

            blob = bucket.blob(blob_name)

            # Set cache control before upload
            blob.cache_control = "public, max-age=31536000"

            blob.upload_from_string(
                optimized_bytes,
                content_type="image/jpeg",
                timeout=60
            )

            # Note: With uniform bucket-level access, we don't call make_public()
            # The bucket itself should be configured to allow public access

            # Return the public URL
            if settings.CDN_BASE_URL:
                new_url = f"{settings.CDN_BASE_URL}/{blob_name}"
            else:
                new_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{blob_name}"

            logger.info(f"✅ Uploaded YouTube thumbnail to storage: {new_url}")
            return new_url

        else:
            # Local storage fallback
            from pathlib import Path

            upload_dir = Path(settings.UPLOAD_DIR) / "images" / "judaism" / image_type
            upload_dir.mkdir(parents=True, exist_ok=True)

            filename = f"{uuid4()}.jpg"
            file_path = upload_dir / filename

            with open(file_path, "wb") as f:
                f.write(optimized_bytes)

            new_url = f"/uploads/images/judaism/{image_type}/{filename}"
            logger.info(f"✅ Saved YouTube thumbnail locally: {new_url}")
            return new_url

    except httpx.HTTPStatusError as e:
        logger.warning(f"Failed to download YouTube thumbnail {youtube_url}: HTTP {e.response.status_code}")
        return None
    except Exception as e:
        logger.error(f"Error downloading YouTube thumbnail {youtube_url}: {e}")
        return None


@dataclass
class FixResult:
    """Result of a fix operation"""
    success: bool
    action_id: Optional[str] = None
    error_message: Optional[str] = None
    fields_updated: Optional[List[str]] = None


async def fix_content_issues(
    missing_metadata: List[Dict[str, Any]],
    misclassifications: List[Dict[str, Any]],
    audit_id: str
) -> Dict[str, Any]:
    """
    Fix content issues safely with rollback capability.

    Args:
        missing_metadata: List of items with missing metadata
        misclassifications: List of misclassified items
        audit_id: Parent audit report ID

    Returns:
        Dictionary with fix results
    """
    logger.info("🔧 Auto-fixing issues...")

    results = {
        "metadata_fixes": 0,
        "youtube_thumbnails_downloaded": 0,
        "reclassifications": 0,
        "failed_fixes": 0,
    }

    # Fix missing metadata
    for item in missing_metadata:
        try:
            fix_result = await fix_missing_metadata(
                item["content_id"],
                item["issues"],
                audit_id
            )
            if fix_result.success:
                results["metadata_fixes"] += 1
                # Count YouTube thumbnail downloads separately
                if fix_result.fields_updated:
                    if "downloaded_youtube_thumbnail" in fix_result.fields_updated:
                        results["youtube_thumbnails_downloaded"] += 1
                    if "downloaded_youtube_backdrop" in fix_result.fields_updated:
                        results["youtube_thumbnails_downloaded"] += 1
            else:
                results["failed_fixes"] += 1
        except Exception as e:
            logger.error(f"❌ Failed to fix metadata for {item['content_id']}: {e}")
            results["failed_fixes"] += 1

    # Fix misclassifications (only high confidence)
    for item in misclassifications:
        confidence = item.get("confidence", 0)

        # Only auto-fix if confidence > 90%
        if confidence > 0.9:
            try:
                fix_result = await fix_misclassification(
                    item["content_id"],
                    item["suggested_category"],
                    confidence,
                    audit_id
                )
                if fix_result.success:
                    results["reclassifications"] += 1
                else:
                    results["failed_fixes"] += 1
            except Exception as e:
                logger.error(f"❌ Failed to reclassify {item['content_id']}: {e}")
                results["failed_fixes"] += 1
        else:
            logger.info(f"   Skipping reclassification (confidence {confidence:.0%} < 90%)")

    logger.info(f"   ✅ Fixed {results['metadata_fixes']} metadata issues")
    if results["youtube_thumbnails_downloaded"] > 0:
        logger.info(f"   📥 Downloaded {results['youtube_thumbnails_downloaded']} YouTube thumbnails")
    logger.info(f"   ✅ Reclassified {results['reclassifications']} items")
    logger.info(f"   ❌ Failed to fix {results['failed_fixes']} issues")

    return results


async def fix_missing_metadata(
    content_id: str,
    issues: List[str],
    audit_id: str
) -> FixResult:
    """
    Fix missing metadata using TMDB service.

    Auto-approved fixes:
    - Add missing poster/backdrop
    - Update IMDB ratings
    - Fix broken TMDB image URLs
    """
    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return FixResult(success=False, error_message="Content not found")

        # Store before state for rollback
        before_state = {
            "thumbnail": content.thumbnail,
            "backdrop": content.backdrop,
            "tmdb_id": content.tmdb_id,
            "imdb_id": content.imdb_id,
            "imdb_rating": content.imdb_rating,
            "imdb_votes": content.imdb_votes,
            "description": content.description,
            "genre": content.genre,
            "genres": getattr(content, 'genres', None),  # May not exist in old documents
            "cast": content.cast,
            "director": content.director,
            "year": content.year,
            "trailer_url": content.trailer_url,
        }

        changes_made = []
        after_state = before_state.copy()
        enriched = None

        # Enrich from TMDB if we have the title
        if "missing_tmdb_id" in issues or "missing_imdb_id" in issues or \
           "missing_thumbnail" in issues or "missing_backdrop" in issues or \
           "missing_trailer" in issues:

            logger.info(f"   🔍 Fetching TMDB data for '{content.title}' ({content.year})")
            if content.is_series:
                enriched = await tmdb_service.enrich_series_content(content.title, content.year)
            else:
                enriched = await tmdb_service.enrich_movie_content(content.title, content.year)

            # If initial search failed, retry with cleaned title
            if not enriched.get("tmdb_id"):
                cleaned_title = clean_title(content.title)
                if cleaned_title != content.title:
                    logger.info(f"   🧹 Retrying with cleaned title: '{cleaned_title}'")
                    if content.is_series:
                        enriched = await tmdb_service.enrich_series_content(cleaned_title, content.year)
                    else:
                        enriched = await tmdb_service.enrich_movie_content(cleaned_title, content.year)

            # Log what we got back from TMDB
            if not enriched.get("tmdb_id"):
                logger.warning(f"   ⚠️ TMDB search found no results for '{content.title}'")
            else:
                logger.info(f"   ✓ TMDB found ID {enriched.get('tmdb_id')}, has_poster={bool(enriched.get('poster'))}, has_backdrop={bool(enriched.get('backdrop'))}, has_metadata={bool(enriched.get('overview'))}")

            # Apply enriched data
            if enriched.get("tmdb_id") and not content.tmdb_id:
                content.tmdb_id = enriched["tmdb_id"]
                after_state["tmdb_id"] = enriched["tmdb_id"]
                changes_made.append("added_tmdb_id")

            if enriched.get("imdb_id") and not content.imdb_id:
                content.imdb_id = enriched["imdb_id"]
                after_state["imdb_id"] = enriched["imdb_id"]
                changes_made.append("added_imdb_id")

            # Add poster (thumbnail/cover photo)
            if enriched.get("poster"):
                if not content.thumbnail:
                    content.thumbnail = enriched["poster"]
                    after_state["thumbnail"] = enriched["poster"]
                    changes_made.append("added_thumbnail")
                
                if not content.poster_url:
                    content.poster_url = enriched["poster"]
                    after_state["poster_url"] = enriched["poster"]
                    changes_made.append("added_poster_url")

            # Add backdrop (wide background image)
            if enriched.get("backdrop") and not content.backdrop:
                content.backdrop = enriched["backdrop"]
                after_state["backdrop"] = enriched["backdrop"]
                changes_made.append("added_backdrop")

            if enriched.get("overview") and not content.description:
                content.description = enriched["overview"]
                after_state["description"] = enriched["overview"]
                changes_made.append("added_description")

            if enriched.get("genres"):
                # Store full genres list
                if not content.genres:
                    content.genres = enriched["genres"]
                    after_state["genres"] = content.genres
                    changes_made.append("added_genres")

                # Also update legacy genre field (for backward compatibility)
                if not content.genre:
                    content.genre = ", ".join(enriched["genres"][:2])  # First 2 genres
                    after_state["genre"] = content.genre
                    changes_made.append("added_genre")

            if enriched.get("cast") and not content.cast:
                content.cast = enriched["cast"]
                after_state["cast"] = enriched["cast"]
                changes_made.append("added_cast")

            if enriched.get("director") and not content.director:
                content.director = enriched["director"]
                after_state["director"] = enriched["director"]
                changes_made.append("added_director")
            
            # Update IMDB rating and votes
            if enriched.get("imdb_rating") is not None and content.imdb_rating is None:
                content.imdb_rating = enriched["imdb_rating"]
                after_state["imdb_rating"] = enriched["imdb_rating"]
                changes_made.append("added_imdb_rating")
            
            if enriched.get("imdb_votes") is not None and content.imdb_votes is None:
                content.imdb_votes = enriched["imdb_votes"]
                after_state["imdb_votes"] = enriched["imdb_votes"]
                changes_made.append("added_imdb_votes")
            
            # Update release year
            if enriched.get("release_year") and not content.year:
                content.year = enriched["release_year"]
                after_state["year"] = enriched["release_year"]
                changes_made.append("added_year")

            # Add trailer URL from TMDB
            if enriched.get("trailer_url") and not content.trailer_url:
                content.trailer_url = enriched["trailer_url"]
                after_state["trailer_url"] = enriched["trailer_url"]
                changes_made.append("added_trailer_url")

        # Download and upload YouTube thumbnails to our storage
        if "external_youtube_thumbnail" in issues:
            if is_youtube_thumbnail_url(content.thumbnail):
                logger.info(f"   📥 Downloading YouTube thumbnail for '{content.title}'")
                new_thumbnail_url = await download_and_upload_youtube_thumbnail(
                    content.thumbnail,
                    content_id,
                    "thumbnail"
                )
                if new_thumbnail_url:
                    content.thumbnail = new_thumbnail_url
                    after_state["thumbnail"] = new_thumbnail_url
                    changes_made.append("downloaded_youtube_thumbnail")

                    # Also update poster_url if it was the same YouTube URL
                    if is_youtube_thumbnail_url(content.poster_url):
                        content.poster_url = new_thumbnail_url
                        after_state["poster_url"] = new_thumbnail_url

        if "external_youtube_backdrop" in issues:
            if is_youtube_thumbnail_url(content.backdrop):
                logger.info(f"   📥 Downloading YouTube backdrop for '{content.title}'")
                new_backdrop_url = await download_and_upload_youtube_thumbnail(
                    content.backdrop,
                    content_id,
                    "backdrop"
                )
                if new_backdrop_url:
                    content.backdrop = new_backdrop_url
                    after_state["backdrop"] = new_backdrop_url
                    changes_made.append("downloaded_youtube_backdrop")

        # Set content type if missing
        if not content.content_type:
            content.content_type = "series" if content.is_series else "movie"
            after_state["content_type"] = content.content_type
            changes_made.append("added_content_type")

        # Update timestamp
        content.updated_at = datetime.utcnow()

        # Save changes
        if changes_made:
            await content.save()

            # Log action
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="update_metadata",
                content_id=content_id,
                content_type="content",
                issue_type="missing_metadata",
                before_state=before_state,
                after_state=after_state,
                auto_approved=True,
                rollback_available=True,
                description=f"Fixed missing metadata: {', '.join(changes_made)}",
            )
            await action.insert()

            logger.info(f"   ✓ Fixed metadata for '{content.title}': {', '.join(changes_made)}")
            return FixResult(success=True, action_id=str(action.id), fields_updated=changes_made)
        else:
            # No changes needed - check if it's an error or just no-op
            if not enriched or not enriched.get("tmdb_id"):
                # Actual error - couldn't find TMDB data
                error_msg = f"No TMDB search results found for '{content.title}'"
                logger.warning(f"   ⚠️ {error_msg}")
                return FixResult(success=False, error_message=error_msg)
            elif not enriched.get("poster") and not enriched.get("backdrop"):
                # TMDB found but no useful images
                error_msg = f"TMDB found but no images available for '{content.title}'"
                logger.warning(f"   ⚠️ {error_msg}")
                return FixResult(success=False, error_message=error_msg)
            else:
                # All fields already populated - this is success, not an error
                info_msg = f"Metadata already complete for '{content.title}' - no updates needed"
                logger.info(f"   ✅ {info_msg}")
                return FixResult(success=True, fields_updated=[], action_id=None)

    except Exception as e:
        logger.error(f"Failed to fix metadata: {e}")
        import traceback
        traceback.print_exc()
        return FixResult(success=False, error_message=str(e))


async def fix_misclassification(
    content_id: str,
    suggested_category: str,
    confidence: float,
    audit_id: str
) -> FixResult:
    """
    Fix misclassification by re-categorizing content.

    Only applied if confidence > 90%.
    """
    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return FixResult(success=False, error_message="Content not found")

        # Find the suggested category
        new_category = await Category.find_one({
            "$or": [
                {"name": suggested_category},
                {"name_en": suggested_category},
                {"slug": suggested_category.lower().replace(" ", "-")}
            ]
        })

        if not new_category:
            logger.warning(f"   Suggested category '{suggested_category}' not found")
            return FixResult(success=False, error_message="Category not found")

        # Store before state
        old_category = await Category.get(PydanticObjectId(content.category_id))
        before_state = {
            "category_id": content.category_id,
            "category_name": old_category.name if old_category else None,
        }

        # Apply change
        content.category_id = str(new_category.id)
        content.category_name = new_category.name
        content.updated_at = datetime.utcnow()

        await content.save()

        after_state = {
            "category_id": str(new_category.id),
            "category_name": new_category.name,
        }

        # Log action
        action = LibrarianAction(
            audit_id=audit_id,
            action_type="recategorize",
            content_id=content_id,
            content_type="content",
            issue_type="misclassification",
            before_state=before_state,
            after_state=after_state,
            confidence_score=confidence,
            auto_approved=True,
            rollback_available=True,
            description=f"Reclassified from '{before_state['category_name']}' to '{new_category.name}' (confidence: {confidence:.0%})",
        )
        await action.insert()

        logger.info(f"   ✓ Reclassified '{content.title}' to '{new_category.name}' ({confidence:.0%})")
        return FixResult(success=True, action_id=str(action.id))

    except Exception as e:
        logger.error(f"Failed to fix misclassification: {e}")
        return FixResult(success=False, error_message=str(e))


async def rollback_action(action_id: str) -> FixResult:
    """
    Rollback a librarian action to its previous state.

    Args:
        action_id: The action ID to rollback

    Returns:
        FixResult indicating success or failure
    """
    try:
        action = await LibrarianAction.get(PydanticObjectId(action_id))
        if not action:
            return FixResult(success=False, error_message="Action not found")

        if not action.rollback_available:
            return FixResult(success=False, error_message="Rollback not available for this action")

        if action.rolled_back:
            return FixResult(success=False, error_message="Action already rolled back")

        # Get the content
        content = await Content.get(PydanticObjectId(action.content_id))
        if not content:
            return FixResult(success=False, error_message="Content not found")

        # Restore previous state
        before_state = action.before_state

        if action.action_type == "update_metadata":
            # Restore metadata fields
            for field, value in before_state.items():
                setattr(content, field, value)

        elif action.action_type == "recategorize":
            # Restore category
            content.category_id = before_state["category_id"]
            content.category_name = before_state.get("category_name")

        content.updated_at = datetime.utcnow()
        await content.save()

        # Mark action as rolled back
        action.rolled_back = True
        action.rollback_timestamp = datetime.utcnow()
        await action.save()

        logger.info(f"   ✓ Rolled back action {action_id}")
        return FixResult(success=True)

    except Exception as e:
        logger.error(f"Failed to rollback action: {e}")
        return FixResult(success=False, error_message=str(e))
