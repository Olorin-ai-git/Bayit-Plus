"""
Content Indexer

Indexes content and subtitles for semantic search.
Uses IndexableContent protocol for loose coupling.
"""

import logging
from typing import Optional, List

from olorin import IndexableContent

from app.adapters import BayitContentAdapter
from app.core.config import settings
from app.models.content_embedding import ContentEmbedding
from app.services.olorin.search.client import client_manager
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.helpers import generate_vector_id, group_subtitles
from app.services.olorin.content_metadata_service import content_metadata_service

logger = logging.getLogger(__name__)


async def index_content(
    content_id: str,
    force_reindex: bool = False,
    partner_id: Optional[str] = None,
) -> dict:
    """
    Index content for semantic search.

    Args:
        content_id: Content document ID
        force_reindex: Re-index even if already indexed
        partner_id: Optional partner ID for filtering

    Returns:
        Indexing status
    """
    if not client_manager.is_initialized:
        await client_manager.initialize()

    try:
        # Get content via metadata service (supports both Phase 1 and Phase 2)
        content_model = await content_metadata_service.get_content(content_id)
        if not content_model:
            return {"status": "failed", "error": "Content not found"}

        # Wrap in adapter to implement IndexableContent protocol
        content = BayitContentAdapter(content_model)

        # Check if already indexed
        if not force_reindex:
            existing = await ContentEmbedding.find_one(
                ContentEmbedding.content_id == content_id,
                ContentEmbedding.embedding_type == "title",
            )
            if existing:
                return {"status": "completed", "message": "Already indexed"}

        vectors_to_upsert = []
        embeddings_to_save = []

        # Index title
        # Get multilingual variants from underlying Content model for indexing
        title = content_model.title or content_model.title_en or ""
        if title:
            title_result = await _index_text_field(
                content_id=content_id,
                content=content,
                text=title,
                embedding_type="title",
                partner_id=partner_id,
            )
            if title_result:
                vectors_to_upsert.append(title_result["vector"])
                embeddings_to_save.append(title_result["embedding"])

        # Index description
        description = content_model.description or content_model.description_en or ""
        if description:
            desc_result = await _index_text_field(
                content_id=content_id,
                content=content,
                text=description,
                embedding_type="description",
                partner_id=partner_id,
            )
            if desc_result:
                vectors_to_upsert.append(desc_result["vector"])
                embeddings_to_save.append(desc_result["embedding"])

        # Upsert to Pinecone
        pinecone_index = client_manager.pinecone_index
        if vectors_to_upsert and pinecone_index:
            pinecone_index.upsert(vectors=vectors_to_upsert)

        # Save to MongoDB
        for embedding in embeddings_to_save:
            await embedding.insert()

        return {
            "status": "completed",
            "content_id": content_id,
            "segments_indexed": len(embeddings_to_save),
        }

    except Exception as e:
        logger.error(f"Failed to index content {content_id}: {e}")
        return {"status": "failed", "error": str(e)}


async def _index_text_field(
    content_id: str,
    content: IndexableContent,
    text: str,
    embedding_type: str,
    partner_id: Optional[str] = None,
) -> Optional[dict]:
    """Index a single text field."""
    embedding = await generate_embedding(text)
    if not embedding:
        return None

    vector_id = generate_vector_id(content_id, embedding_type, 0)

    vector = {
        "id": vector_id,
        "values": embedding,
        "metadata": {
            "content_id": content_id,
            "content_type": content.content_type,
            "embedding_type": embedding_type,
            "language": content.original_language,
            "text": text[:1000],
        },
    }

    embedding_doc = ContentEmbedding(
        content_id=content_id,
        content_type=content.content_type,
        embedding_type=embedding_type,
        segment_text=text,
        embedding_model=settings.EMBEDDING_MODEL,
        pinecone_vector_id=vector_id,
        language=content.original_language,
        genre_ids=[str(g) for g in (content.genres or [])],
        section_ids=[str(t) for t in (content.tags or [])],
        partner_id=partner_id,
    )

    return {"vector": vector, "embedding": embedding_doc}


async def index_subtitles(
    content_id: str,
    subtitles: List[dict],
    language: Optional[str] = None,
    segment_duration: float = 30.0,
    partner_id: Optional[str] = None,
) -> dict:
    """
    Index subtitle segments for dialogue search.

    Args:
        content_id: Content document ID
        subtitles: List of {text, start_time, end_time} dicts
        language: Subtitle language (defaults to configured default_content_language)
        segment_duration: Group subtitles into segments of this duration
        partner_id: Optional partner ID

    Returns:
        Indexing status
    """
    if not client_manager.is_initialized:
        await client_manager.initialize()

    # Use configured default if language not provided
    subtitle_language = language or settings.olorin.default_content_language

    try:
        # Get content metadata via metadata service
        content = await content_metadata_service.get_content(content_id)
        content_type = content.content_type if content else None

        # Group subtitles into segments
        segments = group_subtitles(subtitles, segment_duration)

        vectors_to_upsert = []
        embeddings_to_save = []

        for idx, segment in enumerate(segments):
            text = segment["text"]
            if len(text) < 10:
                continue

            embedding = await generate_embedding(text)
            if not embedding:
                continue

            vector_id = generate_vector_id(content_id, "subtitle_segment", idx)

            vectors_to_upsert.append({
                "id": vector_id,
                "values": embedding,
                "metadata": {
                    "content_id": content_id,
                    "content_type": content_type,
                    "embedding_type": "subtitle_segment",
                    "segment_index": idx,
                    "start_time": segment["start_time"],
                    "end_time": segment["end_time"],
                    "language": subtitle_language,
                    "text": text[:1000],
                },
            })

            embeddings_to_save.append(
                ContentEmbedding(
                    content_id=content_id,
                    content_type=content_type,
                    embedding_type="subtitle_segment",
                    segment_index=idx,
                    segment_start_time=segment["start_time"],
                    segment_end_time=segment["end_time"],
                    segment_text=text,
                    embedding_model=settings.EMBEDDING_MODEL,
                    pinecone_vector_id=vector_id,
                    language=subtitle_language,
                    partner_id=partner_id,
                )
            )

            # Batch upsert every 100 vectors
            pinecone_index = client_manager.pinecone_index
            if len(vectors_to_upsert) >= 100 and pinecone_index:
                pinecone_index.upsert(vectors=vectors_to_upsert)
                vectors_to_upsert = []

        # Upsert remaining vectors
        pinecone_index = client_manager.pinecone_index
        if vectors_to_upsert and pinecone_index:
            pinecone_index.upsert(vectors=vectors_to_upsert)

        # Save to MongoDB
        for embedding in embeddings_to_save:
            await embedding.insert()

        return {
            "status": "completed",
            "content_id": content_id,
            "segments_indexed": len(embeddings_to_save),
        }

    except Exception as e:
        logger.error(f"Failed to index subtitles for {content_id}: {e}")
        return {"status": "failed", "error": str(e)}
