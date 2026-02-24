"""
Audiobook Metadata Cleanup Script

One-time script that fixes title and author metadata for published audiobooks.

Detects and fixes:
- "Audio - " / "Audio Book - " prefixes -> extracts real title and author
- "- Chapter N" / "- Disc N" / "-Part N" / "- Nof6" suffixes -> strips from title
- Author name embedded in title (e.g. "Adventures of Huckleberry Finn Mark Twain")
- "Author Name - Book Title" or "Title - Author Name" in title field -> splits
- "Reversed Name - Title" (e.g. "Gabaldon Diana - Outlander")
- title == author (no real author) -> attempts to parse from title
- "audiobook" / "audio book" word in author field -> strips it
- Underscores in author names -> replaced with spaces
- Junk suffixes: (Unabridged), [Audiobook], ( ILLUSTRATED), ALBW, 64k Unabr
- ALL CAPS or all lowercase author names -> title-cases
- "by" / "written by" / "narrated by" prefixes in author field

Usage:
    python -m app.scripts.clean_audiobook_metadata            # dry-run
    python -m app.scripts.clean_audiobook_metadata --apply    # commit changes
"""

import asyncio
import logging
import re
import sys
from typing import Dict, List

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


# ── Title junk patterns (applied iteratively until stable) ───────────

_TITLE_JUNK_PATTERNS = [
    # Chapter / Disc / Part / NofM suffixes
    re.compile(r"\s*-\s*Chapter\s+\d+\s*$", re.IGNORECASE),
    re.compile(r"\s*-\s*Disc\s+\d+\s*$", re.IGNORECASE),
    re.compile(r"\s*-?\s*Part\s+\d+\s*$", re.IGNORECASE),
    re.compile(r"\s*-\s*\d+of\d+\s*$", re.IGNORECASE),
    # Audiobook markers
    re.compile(r"\s*-\s*Unabridged\s+Audiobook\s*(-\s*English)?\s*$", re.IGNORECASE),
    re.compile(r"\s*\(?\s*Unabridged\s*\)?\s*$", re.IGNORECASE),
    re.compile(r"\s*\(?\s*Abridged\s*\)?\s*$", re.IGNORECASE),
    re.compile(r"\s*\[?\s*Audiobook\s*\]?\s*$", re.IGNORECASE),
    re.compile(r"\s*-\s*Audiobook\s*$", re.IGNORECASE),
    re.compile(r"\s*\(?\s*Audio\s*Edition\s*\)?\s*$", re.IGNORECASE),
    re.compile(r"\s*\(?\s*Complete\s*\)?\s*$", re.IGNORECASE),
    # Quality / source / language markers
    re.compile(r"\s*-?\s*\d+k\s+Unabr\s*$", re.IGNORECASE),
    re.compile(r"\s+ALBW\s*$"),
    re.compile(r"\s*\(\s*ILLUSTRATED\s*\)\s*$", re.IGNORECASE),
    re.compile(r"\s*-\s*English\s*$", re.IGNORECASE),
]

_AUDIO_PREFIX_RE = re.compile(r"^Audio\s*(?:Book)?\s*-\s*", re.IGNORECASE)

_AUTHOR_PREFIX_RE = re.compile(
    r"^(by|written\s+by|narrated\s+by|read\s+by|author:\s*)\s+",
    re.IGNORECASE,
)

# Known authors (lowercased) for disambiguation
_KNOWN_AUTHORS = {
    "anne de graaf",
    "anne frank",
    "arthur c clarke", "arthur charles clarke",
    "charles dickens",
    "cornelia funke",
    "dan brown",
    "dean koontz",
    "diana gabaldon", "gabaldon diana",
    "emily bront\u00eb",
    "george orwell",
    "isaac asimov",
    "j.k. rowling", "jk rowling", "jrr tolkien",
    "james patterson",
    "john grisham",
    "jules verne",
    "ken follett",
    "louis sachar",
    "mark twain", "twain mark",
    "michael crichton",
    "nora roberts",
    "robert ludlum",
    "stephen king",
    "thomas malory",
    "tom clancy",
    "vince flynn",
}

# Reversed name -> canonical name
_REVERSED_NAMES = {
    "gabaldon diana": "Diana Gabaldon",
    "twain mark": "Mark Twain",
}

_SOURCE_LABELS = {"kingstar", "audible", "librivox", "bbc", "penguin"}


# ── Helpers ──────────────────────────────────────────────────────────

def _strip_title_junk(title: str) -> str:
    """Strip junk suffixes from a title (iterates until stable)."""
    cleaned = title.strip()
    changed = True
    while changed:
        changed = False
        for pattern in _TITLE_JUNK_PATTERNS:
            result = pattern.sub("", cleaned).strip()
            if result != cleaned:
                cleaned = result
                changed = True
    # Strip trailing "Audio book" / "Audio Book" from title
    cleaned = re.sub(r"\s+Audio\s*book\s*$", "", cleaned, flags=re.IGNORECASE)
    # Strip trailing dashes/colons left behind after suffix removal
    cleaned = cleaned.rstrip(" -:,")
    return " ".join(cleaned.split()).strip()


def _strip_author_junk(author: str) -> str:
    """Strip prefixes, junk suffixes, underscores; normalize casing."""
    cleaned = author.strip()
    # Replace underscores with spaces
    cleaned = cleaned.replace("_", " ")
    # Strip "Audio - ..." prefix from author field
    if _AUDIO_PREFIX_RE.match(cleaned):
        parsed = _parse_audio_prefixed(cleaned)
        if parsed.get("author"):
            cleaned = parsed["author"]
    # Strip "audiobook" / "audio book" suffix
    cleaned = re.sub(r"\s+(audiobook|audio\s*book)\s*$", "", cleaned, flags=re.IGNORECASE)
    # Strip known prefixes
    cleaned = _AUTHOR_PREFIX_RE.sub("", cleaned)
    # Canonicalize reversed names
    canonical = _REVERSED_NAMES.get(cleaned.strip().lower())
    if canonical:
        cleaned = canonical
    # Title-case if ALL CAPS or all lowercase
    if cleaned and (cleaned == cleaned.upper() or cleaned == cleaned.lower()):
        cleaned = cleaned.title()
    # Handle "Last, First" (only single-word parts)
    if "," in cleaned and cleaned.count(",") == 1:
        parts = [p.strip() for p in cleaned.split(",", 1)]
        if len(parts) == 2 and len(parts[0].split()) == 1 and len(parts[1].split()) == 1:
            cleaned = f"{parts[1]} {parts[0]}"
    return " ".join(cleaned.split()).strip()


def _is_known_author(text: str) -> bool:
    """Check if text matches a known author name."""
    normalized = text.strip().replace("_", " ").lower()
    return normalized in _KNOWN_AUTHORS


def _canonicalize_author(text: str) -> str:
    """Return the canonical form of a known author name."""
    normalized = text.strip().lower()
    canonical = _REVERSED_NAMES.get(normalized)
    if canonical:
        return canonical
    # Title-case the input as canonical
    return text.strip()


def _strip_author_from_title(title: str, author: str) -> str:
    """Remove author name from the end or beginning of a title."""
    if not author or not title:
        return title
    if title.endswith(author) and len(title) > len(author):
        cleaned = title[: -len(author)].rstrip(" -:,").strip()
        if cleaned:
            return cleaned
    if title.startswith(author) and len(title) > len(author):
        rest = title[len(author) :].lstrip(" -:,").strip()
        if rest:
            return rest
    return title


def _parse_audio_prefixed(text: str) -> Dict:
    """Parse 'Audio - Title - Author - Source' patterns."""
    stripped = _AUDIO_PREFIX_RE.sub("", text).strip()
    stripped = re.sub(r"\s*-\s*Audiobook\s*$", "", stripped, flags=re.IGNORECASE)
    parts = [p.strip() for p in stripped.split(" - ")]
    parts = [p for p in parts if p]
    if not parts:
        return {}
    for i, part in enumerate(parts):
        if _is_known_author(part):
            author = _canonicalize_author(part)
            title_parts = [p for j, p in enumerate(parts) if j != i]
            title_parts = [p for p in title_parts if p.strip().lower() not in _SOURCE_LABELS]
            title = " - ".join(title_parts) if title_parts else ""
            if title:
                return {"title": title, "author": author}
    if len(parts) >= 3:
        return {"title": parts[0], "author": parts[1]}
    if len(parts) == 2:
        return {"title": parts[0]}
    return {"title": parts[0]}


def _parse_author_dash_title(title: str) -> Dict:
    """Parse 'Author - Title' or 'Title - Author' when one side is a known author."""
    if " - " not in title:
        return {}
    parts = title.split(" - ", 1)
    left = parts[0].strip()
    right = parts[1].strip()
    if _is_known_author(left) and right:
        return {"title": right, "author": _canonicalize_author(left)}
    if _is_known_author(right) and left:
        return {"title": left, "author": _canonicalize_author(right)}
    return {}


# ── Main compute logic ───────────────────────────────────────────────

def compute_changes(doc: Dict) -> Dict:
    """Compute metadata changes for a single audiobook document."""
    orig_title = (doc.get("title") or "").strip()
    orig_author = (doc.get("author") or "").strip()
    title = orig_title
    author = orig_author
    changes: Dict = {}

    if not title:
        return changes

    # ── Phase 1: Parse "Audio - ..." prefix in title ──

    if _AUDIO_PREFIX_RE.match(title):
        parsed = _parse_audio_prefixed(title)
        if parsed.get("title"):
            title = parsed["title"]
        if parsed.get("author"):
            author = parsed["author"]

    # ── Phase 1b: Parse "Audio - ..." prefix in author ──

    if _AUDIO_PREFIX_RE.match(author):
        parsed = _parse_audio_prefixed(author)
        if parsed.get("author"):
            author = parsed["author"]

    # ── Phase 1c: Always strip title junk from current title ──

    title = _strip_title_junk(title)

    # ── Phase 2: title == author (no real author info) ──

    author_normalized = author.replace("_", " ").strip()
    if author_normalized and (author_normalized == title or author_normalized == orig_title):
        parsed = _parse_author_dash_title(title)
        if parsed:
            title = _strip_title_junk(parsed.get("title", title))
            author = parsed["author"]
        else:
            author = _strip_author_junk(author)
        # Emit changes and return
        return _diff(orig_title, title, orig_author, author)

    # ── Phase 3: "Author - Title" or "Title - Author" in title ──

    parsed = _parse_author_dash_title(title)
    if parsed:
        new_title = _strip_title_junk(parsed["title"])
        parsed_author = parsed["author"]
        author_matches = (
            not author
            or author == parsed_author
            or author.startswith(parsed_author)
            or author.replace("_", " ").startswith(parsed_author)
        )
        if author_matches:
            title = new_title
            author = parsed_author
            return _diff(orig_title, title, orig_author, author)

    # ── Phase 4: Author name embedded in title ──

    if author and _is_known_author(author):
        stripped = _strip_author_from_title(title, author)
        if stripped != title:
            title = _strip_title_junk(stripped)

    # ── Phase 5: Clean author field ──

    author = _strip_author_junk(author)

    return _diff(orig_title, title, orig_author, author)


def _diff(orig_title: str, new_title: str, orig_author: str, new_author: str) -> Dict:
    """Return a dict of fields that changed."""
    result = {}
    if new_title and new_title != orig_title:
        result["title"] = new_title
    if new_author and new_author != orig_author:
        result["author"] = new_author
    return result


# ── Runner ───────────────────────────────────────────────────────────

async def run(apply: bool = False):
    uri = settings.MONGODB_URI
    client = AsyncIOMotorClient(uri)
    db = client[settings.MONGODB_DB_NAME]
    logger.info("Connected to MongoDB database: %s", settings.MONGODB_DB_NAME)
    logger.info("Mode: %s\n", "APPLY" if apply else "DRY RUN")

    query = {
        "content_format": "audiobook",
        "is_published": True,
    }
    cursor = db.content.find(query, {"_id": 1, "title": 1, "author": 1})
    docs: List[Dict] = await cursor.to_list(length=None)
    logger.info("Found %d published audiobooks\n", len(docs))

    stats = {"checked": 0, "would_update": 0, "updated": 0, "skipped": 0, "errors": 0}

    for doc in docs:
        stats["checked"] += 1
        doc_id = doc["_id"]
        title = doc.get("title", "")
        author = doc.get("author", "")

        changes = compute_changes(doc)
        if not changes:
            stats["skipped"] += 1
            continue

        logger.info("-" * 60)
        logger.info("ID: %s", doc_id)
        if "title" in changes:
            logger.info("  title:  %r -> %r", title, changes["title"])
        if "author" in changes:
            logger.info("  author: %r -> %r", author, changes["author"])

        stats["would_update"] += 1

        if apply:
            try:
                await db.content.update_one({"_id": doc_id}, {"$set": changes})
                stats["updated"] += 1
            except Exception as exc:
                logger.error("  Failed to update %s: %s", doc_id, exc)
                stats["errors"] += 1

    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("  Checked:      %d", stats["checked"])
    logger.info("  Would update: %d", stats["would_update"])
    if apply:
        logger.info("  Updated:      %d", stats["updated"])
        logger.info("  Errors:       %d", stats["errors"])
    logger.info("  Skipped:      %d", stats["skipped"])
    logger.info(
        "  Mode:         %s",
        "APPLY (writes committed)" if apply else "DRY RUN (no writes)",
    )
    logger.info("=" * 60)


def main():
    apply = "--apply" in sys.argv
    asyncio.run(run(apply=apply))


if __name__ == "__main__":
    main()
