"""
Content Metadata Embedding

Embeds content titles and descriptions.
"""

import logging
from datetime import datetime, timezone
from typing import List

from app.core.config import settings
from app.models.content import Content
from app.models.content_embedding import ContentEmbedding

from scripts.olorin.embedder.client import EmbeddingClient

logger = logging.getLogger(__name__)


async def embed_content_metadata(
    client: EmbeddingClient,
    batch_size: int,
    force: bool,
    dry_run: bool,
) -> dict:
    """
    Embed content metadata (titles, descriptions).

    Args:
        client: Embedding client
        batch_size: Items per batch
        force: Re-embed existing content
        dry_run: Preview without changes

    Returns:
        Stats dict with processed, embedded, skipped, errors
    """
    logger.info("Embedding content metadata...")

    stats = {"processed": 0, "embedded": 0, "skipped": 0, "errors": 0}

    cursor = Content.find_all()
    batch: List[Content] = []

    async for content in cursor:
        batch.append(content)

        if len(batch) >= batch_size:
            result = await _process_content_batch(client, batch, force, dry_run)
            stats["processed"] += result["processed"]
            stats["embedded"] += result["embedded"]
            stats["skipped"] += result["skipped"]
            stats["errors"] += result["errors"]
            batch = []

    if batch:
        result = await _process_content_batch(client, batch, force, dry_run)
        stats["processed"] += result["processed"]
        stats["embedded"] += result["embedded"]
        stats["skipped"] += result["skipped"]
        stats["errors"] += result["errors"]

    logger.info(f"Content metadata embedding complete: {stats}")
    return stats


async def _process_content_batch(
    client: EmbeddingClient,
    batch: List[Content],
    force: bool,
    dry_run: bool,
) -> dict:
    """Process a batch of content for embedding."""
    stats = {"processed": 0, "embedded": 0, "skipped": 0, "errors": 0}
    vectors_to_upsert = []

    for content in batch:
        stats["processed"] += 1
        content_id = str(content.id)

        if not force:
            existing = await ContentEmbedding.find_one(
                ContentEmbedding.content_id == content_id,
                ContentEmbedding.embedding_type == "title",
            )
            if existing:
                stats["skipped"] += 1
                continue

        title = content.title or ""
        title_en = content.title_en or ""
        title_es = content.title_es or ""
        description = content.description or ""
        description_en = content.description_en or ""

        combined_text = (
            f"{title} {title_en} {title_es} {description} {description_en}".strip()
        )

        if not combined_text:
            stats["skipped"] += 1
            continue

        embedding = await client.generate_embedding(combined_text)
        if not embedding:
            stats["errors"] += 1
            continue

        vector_id = f"content_{content_id}_title"

        metadata = {
            "content_id": content_id,
            "type": "title",
            "title": title[:500],
            "content_type": content.content_type or "unknown",
            "language": "he",
        }

        if content.genre_ids:
            metadata["genre_ids"] = content.genre_ids[:10]

        vectors_to_upsert.append(
            {
                "id": vector_id,
                "values": embedding,
                "metadata": metadata,
            }
        )

        if not dry_run:
            embedding_doc = ContentEmbedding(
                content_id=content_id,
                embedding_type="title",
                embedding_model=settings.EMBEDDING_MODEL,
                embedding_dimensions=settings.EMBEDDING_DIMENSIONS,
                pinecone_vector_id=vector_id,
                language="he",
                content_type=content.content_type,
                genre_ids=content.genre_ids or [],
                created_at=datetime.now(timezone.utc),
            )
            await embedding_doc.insert()

        stats["embedded"] += 1

    if vectors_to_upsert:
        if not client.upsert_vectors(vectors_to_upsert):
            stats["errors"] += len(vectors_to_upsert)
            stats["embedded"] -= len(vectors_to_upsert)
        else:
            logger.info(f"Upserted {len(vectors_to_upsert)} content vectors")

    return stats
