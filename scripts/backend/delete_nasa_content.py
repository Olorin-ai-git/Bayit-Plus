#!/usr/bin/env python3
"""Remove all NASA-related content from MongoDB and GCS storage.

Searches for NASA in: title, title_en, title_he, title_es, topic_tags.
Dry run by default. Pass --execute to perform actual deletion.
"""
import asyncio
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.storage import GCSStorageProvider, get_storage_provider

NASA_PATTERN = re.compile(r"\bnasa\b", re.IGNORECASE)

SEARCH_FIELDS = ["title", "title_en", "title_he", "title_es", "title_fr"]
TAG_FIELD = "topic_tags"


def _match_reason(doc: dict) -> str:
    """Return human-readable reason why this doc matched."""
    for field in SEARCH_FIELDS:
        val = doc.get(field) or ""
        if NASA_PATTERN.search(val):
            return f'{field}="{val}"'
    for tag in doc.get(TAG_FIELD, []):
        if NASA_PATTERN.search(str(tag)):
            return f'topic_tag="{tag}"'
    return "unknown"


def _extract_gcs_prefix(stream_url: str, bucket_name: str, cdn_base: str | None) -> str | None:
    """Derive the GCS folder prefix from a stream URL."""
    if not stream_url:
        return None
    try:
        if cdn_base and stream_url.startswith(cdn_base):
            path = stream_url[len(cdn_base):].lstrip("/")
        else:
            parsed = urlparse(stream_url)
            path = parsed.path.lstrip("/")
            # https://storage.googleapis.com/BUCKET/path/to/file
            if parsed.netloc == "storage.googleapis.com":
                parts = path.split("/", 1)
                path = parts[1] if len(parts) == 2 else ""
        if not path:
            return None
        # movies/Title/file.mp4  ->  movies/Title/
        folder = "/".join(path.split("/")[:-1])
        return folder + "/" if folder else None
    except Exception:
        return None


async def find_nasa_content(content_col) -> list[dict]:
    """Query MongoDB for NASA-related content by title and topic tags."""
    query = {
        "$or": [
            *[{field: {"$regex": r"\bnasa\b", "$options": "i"}} for field in SEARCH_FIELDS],
            {TAG_FIELD: {"$regex": r"\bnasa\b", "$options": "i"}},
        ]
    }
    return await content_col.find(query).to_list(length=None)


async def main(dry_run: bool = True) -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    content_col = db["content"]

    docs = await find_nasa_content(content_col)

    provider = get_storage_provider()
    cdn_base = getattr(settings, "CDN_BASE_URL", None)
    bucket_name = getattr(settings, "GCS_BUCKET_NAME", None)

    print("=" * 80)
    print(f"NASA-RELATED CONTENT  {'[DRY RUN - NO CHANGES]' if dry_run else '[EXECUTING DELETION]'}")
    print("=" * 80)
    print(f"\nFound {len(docs)} document(s):\n")

    to_delete_ids = []
    gcs_deletions: list[tuple[str, str]] = []  # (display_title, gcs_prefix)

    for doc in docs:
        title = doc.get("title") or doc.get("title_en") or "Unknown"
        doc_id = doc["_id"]
        fmt = doc.get("content_format", "unknown")
        year = doc.get("year", "")
        stream_url = doc.get("stream_url", "")
        reason = _match_reason(doc)

        print(f"  [{fmt}] {title} ({year})")
        print(f"    ID         : {doc_id}")
        print(f"    Match      : {reason}")
        print(f"    Published  : {doc.get('is_published')}")
        print(f"    Stream URL : {stream_url or '(none)'}")

        to_delete_ids.append(doc_id)

        if stream_url and bucket_name:
            prefix = _extract_gcs_prefix(stream_url, bucket_name, cdn_base)
            if prefix:
                gcs_deletions.append((title, prefix))
                print(f"    GCS Prefix : {prefix}")
        print()

    print("=" * 80)

    if not docs:
        print("No NASA-related content found. Nothing to do.")
        return

    if dry_run:
        print(f"\nSummary (DRY RUN):")
        print(f"  MongoDB documents to delete : {len(to_delete_ids)}")
        print(f"  GCS prefixes to delete      : {len(gcs_deletions)}")
        print("\nRun with --execute to perform permanent deletion.")
        return

    # --- Destructive path ---
    print(f"\nDeleting {len(to_delete_ids)} MongoDB document(s)...")
    for doc_id in to_delete_ids:
        result = await content_col.delete_one({"_id": doc_id})
        status = "OK" if result.deleted_count else "FAILED"
        print(f"  {status}  {doc_id}")

    if gcs_deletions and isinstance(provider, GCSStorageProvider):
        print(f"\nDeleting GCS files for {len(gcs_deletions)} item(s)...")
        for display_title, prefix in gcs_deletions:
            blobs = list(provider.bucket.list_blobs(prefix=prefix))
            deleted = 0
            for blob in blobs:
                try:
                    blob.delete()
                    deleted += 1
                except Exception as exc:
                    print(f"  WARNING: failed to delete {blob.name}: {exc}")
            print(f"  [{display_title}] {deleted}/{len(blobs)} files deleted under {prefix}")
    elif gcs_deletions:
        print("\nNOTE: Local storage provider active - skipping GCS deletion.")

    print("\nDeletion complete.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Delete NASA-related content from Bayit+ DB and GCS")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Perform actual deletion. Default is dry run.",
    )
    args = parser.parse_args()

    asyncio.run(main(dry_run=not args.execute))
