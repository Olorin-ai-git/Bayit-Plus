"""
Semantic Search Operations

Performs vector and text search across content.
"""

import logging
from typing import Optional, List

from app.models.content import Content
from app.models.content_embedding import (
    SemanticSearchResult,
    SearchQuery,
    DialogueSearchQuery,
)
from app.services.olorin.search.client import client_manager
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.helpers import format_timestamp

logger = logging.getLogger(__name__)


async def semantic_search(
    query: SearchQuery,
    partner_id: Optional[str] = None,
) -> List[SemanticSearchResult]:
    """
    Perform semantic search across content.

    Args:
        query: Search query with filters
        partner_id: Optional partner ID filter

    Returns:
        List of search results
    """
    if not client_manager.is_initialized:
        await client_manager.initialize()

    results = []

    try:
        # Generate query embedding
        query_embedding = await generate_embedding(query.query)
        if not query_embedding:
            logger.error("Failed to generate query embedding")
            return results

        # Build filter
        filter_dict = {}
        if query.content_types:
            filter_dict["content_type"] = {"$in": query.content_types}
        if query.language:
            filter_dict["language"] = query.language
        if not query.include_timestamps:
            filter_dict["embedding_type"] = {"$in": ["title", "description"]}

        # Query Pinecone
        pinecone_index = client_manager.pinecone_index
        if pinecone_index:
            pinecone_results = pinecone_index.query(
                vector=query_embedding,
                top_k=query.limit * 2,
                filter=filter_dict if filter_dict else None,
                include_metadata=True,
            )

            # Process results
            seen_content_ids = set()
            for match in pinecone_results.matches:
                if match.score < query.min_score:
                    continue

                metadata = match.metadata or {}
                content_id = metadata.get("content_id")

                # Deduplicate by content_id
                if content_id in seen_content_ids:
                    continue
                seen_content_ids.add(content_id)

                # Get content details
                content = await Content.get(content_id)
                if not content:
                    continue

                # Format timestamp if subtitle match
                timestamp_seconds = metadata.get("start_time")
                timestamp_formatted = None
                if timestamp_seconds is not None:
                    timestamp_formatted = format_timestamp(timestamp_seconds)

                results.append(
                    SemanticSearchResult(
                        content_id=content_id,
                        title=content.title or "",
                        title_en=content.title_en,
                        content_type=content.content_type,
                        thumbnail_url=content.thumbnail_url,
                        matched_text=metadata.get("text", ""),
                        match_type=metadata.get("embedding_type", "title"),
                        relevance_score=match.score,
                        timestamp_seconds=timestamp_seconds,
                        timestamp_formatted=timestamp_formatted,
                    )
                )

                if len(results) >= query.limit:
                    break

    except Exception as e:
        logger.error(f"Semantic search failed: {e}")

    # Fallback to MongoDB text search if no results
    if not results:
        results = await mongodb_text_search(query)

    return results


async def dialogue_search(
    query: DialogueSearchQuery,
    partner_id: Optional[str] = None,
) -> List[SemanticSearchResult]:
    """
    Search specifically within dialogue/subtitles.

    Args:
        query: Dialogue search query
        partner_id: Optional partner ID filter

    Returns:
        List of results with timestamps
    """
    if not client_manager.is_initialized:
        await client_manager.initialize()

    results = []

    try:
        # Generate query embedding
        query_embedding = await generate_embedding(query.query)
        if not query_embedding:
            return results

        # Build filter
        filter_dict = {
            "embedding_type": "subtitle_segment",
            "language": query.language,
        }
        if query.content_id:
            filter_dict["content_id"] = query.content_id

        # Query Pinecone
        pinecone_index = client_manager.pinecone_index
        if pinecone_index:
            pinecone_results = pinecone_index.query(
                vector=query_embedding,
                top_k=query.limit,
                filter=filter_dict,
                include_metadata=True,
            )

            for match in pinecone_results.matches:
                if match.score < query.min_score:
                    continue

                metadata = match.metadata or {}
                content_id = metadata.get("content_id")

                # Get content details
                content = await Content.get(content_id) if content_id else None

                timestamp_seconds = metadata.get("start_time")
                timestamp_formatted = format_timestamp(timestamp_seconds) if timestamp_seconds else None

                results.append(
                    SemanticSearchResult(
                        content_id=content_id or "",
                        title=content.title if content else "",
                        title_en=content.title_en if content else None,
                        content_type=content.content_type if content else None,
                        thumbnail_url=content.thumbnail_url if content else None,
                        matched_text=metadata.get("text", ""),
                        match_type="subtitle_segment",
                        relevance_score=match.score,
                        timestamp_seconds=timestamp_seconds,
                        timestamp_formatted=timestamp_formatted,
                    )
                )

    except Exception as e:
        logger.error(f"Dialogue search failed: {e}")

    return results


async def mongodb_text_search(query: SearchQuery) -> List[SemanticSearchResult]:
    """
    Fallback text search using MongoDB.

    Args:
        query: Search query

    Returns:
        List of search results
    """
    results = []

    try:
        # Build MongoDB query
        mongo_query = {"$text": {"$search": query.query}}

        if query.content_types:
            mongo_query["content_type"] = {"$in": query.content_types}

        # Search content collection
        cursor = Content.find(
            mongo_query,
            projection={"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).limit(query.limit)

        async for content in cursor:
            results.append(
                SemanticSearchResult(
                    content_id=str(content.id),
                    title=content.title or "",
                    title_en=content.title_en,
                    content_type=content.content_type,
                    thumbnail_url=content.thumbnail_url,
                    matched_text=content.title or content.description or "",
                    match_type="title",
                    relevance_score=0.5,
                )
            )

    except Exception as e:
        logger.error(f"MongoDB text search failed: {e}")

    return results
