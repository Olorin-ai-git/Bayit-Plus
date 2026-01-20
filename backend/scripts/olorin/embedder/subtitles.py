"""
Subtitle Embedding

Embeds subtitle segments for dialogue search.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.models.content_embedding import ContentEmbedding
from app.models.subtitles import SubtitleTrackDoc
from scripts.olorin.embedder.client import EmbeddingClient

logger = logging.getLogger(__name__)

SEGMENT_DURATION = 30.0  # seconds


async def embed_subtitles(
    client: EmbeddingClient,
    force: bool,
    dry_run: bool,
) -> dict:
    """
    Embed subtitle segments for dialogue search.

    Args:
        client: Embedding client
        force: Re-embed existing content
        dry_run: Preview without changes

    Returns:
        Stats dict with processed, embedded, skipped, errors
    """
    logger.info("Embedding subtitle segments...")

    stats = {"processed": 0, "embedded": 0, "skipped": 0, "errors": 0}

    cursor = SubtitleTrackDoc.find_all()

    async for track in cursor:
        stats["processed"] += 1

        if not track.cues:
            stats["skipped"] += 1
            continue

        content_id = track.content_id

        if not force:
            existing = await ContentEmbedding.find_one(
                ContentEmbedding.content_id == content_id,
                ContentEmbedding.embedding_type == "subtitle_segment",
            )
            if existing:
                stats["skipped"] += 1
                continue

        result = await _embed_subtitle_segments(
            client=client,
            content_id=content_id,
            cues=track.cues,
            language=track.language or "he",
            dry_run=dry_run,
        )

        stats["embedded"] += result["embedded"]
        stats["errors"] += result["errors"]

    logger.info(f"Subtitle embedding complete: {stats}")
    return stats


async def _embed_subtitle_segments(
    client: EmbeddingClient,
    content_id: str,
    cues: List[dict],
    language: str,
    dry_run: bool,
) -> dict:
    """Embed subtitle cues in segments."""
    stats = {"embedded": 0, "errors": 0}
    vectors_to_upsert = []

    sorted_cues = sorted(cues, key=lambda c: c.get("start_time", 0))

    current_segment_start = 0.0
    current_segment_text = []
    segment_index = 0

    for cue in sorted_cues:
        start_time = cue.get("start_time", 0)
        text = cue.get("text", "")

        if not text:
            continue

        if start_time >= current_segment_start + SEGMENT_DURATION:
            if current_segment_text:
                result = await _embed_single_segment(
                    client=client,
                    content_id=content_id,
                    segment_index=segment_index,
                    segment_start=current_segment_start,
                    segment_end=current_segment_start + SEGMENT_DURATION,
                    text=" ".join(current_segment_text),
                    language=language,
                    dry_run=dry_run,
                )

                if result:
                    vectors_to_upsert.append(result)
                    stats["embedded"] += 1
                else:
                    stats["errors"] += 1

            current_segment_start = (start_time // SEGMENT_DURATION) * SEGMENT_DURATION
            current_segment_text = [text]
            segment_index += 1
        else:
            current_segment_text.append(text)

    if current_segment_text:
        result = await _embed_single_segment(
            client=client,
            content_id=content_id,
            segment_index=segment_index,
            segment_start=current_segment_start,
            segment_end=current_segment_start + SEGMENT_DURATION,
            text=" ".join(current_segment_text),
            language=language,
            dry_run=dry_run,
        )

        if result:
            vectors_to_upsert.append(result)
            stats["embedded"] += 1
        else:
            stats["errors"] += 1

    # Upsert in batches
    batch_size = 100
    for i in range(0, len(vectors_to_upsert), batch_size):
        batch = vectors_to_upsert[i:i + batch_size]
        if not client.upsert_vectors(batch):
            stats["errors"] += len(batch)

    return stats


async def _embed_single_segment(
    client: EmbeddingClient,
    content_id: str,
    segment_index: int,
    segment_start: float,
    segment_end: float,
    text: str,
    language: str,
    dry_run: bool,
) -> Optional[dict]:
    """Embed a single subtitle segment."""
    if not text.strip():
        return None

    embedding = await client.generate_embedding(text)
    if not embedding:
        return None

    vector_id = f"content_{content_id}_subtitle_{segment_index}"

    if not dry_run:
        embedding_doc = ContentEmbedding(
            content_id=content_id,
            embedding_type="subtitle_segment",
            segment_index=segment_index,
            segment_start_time=segment_start,
            segment_end_time=segment_end,
            segment_text=text[:1000],
            embedding_model=settings.EMBEDDING_MODEL,
            embedding_dimensions=settings.EMBEDDING_DIMENSIONS,
            pinecone_vector_id=vector_id,
            language=language,
            created_at=datetime.now(timezone.utc),
        )
        await embedding_doc.insert()

    return {
        "id": vector_id,
        "values": embedding,
        "metadata": {
            "content_id": content_id,
            "type": "subtitle",
            "segment_index": segment_index,
            "start_time": segment_start,
            "end_time": segment_end,
            "text": text[:500],
            "language": language,
        },
    }
