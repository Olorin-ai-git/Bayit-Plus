"""
Semantic Search Operations

Performs vector and text search across content.
Includes resilience patterns for external service calls.
"""

import logging
from typing import List, Optional

from app.models.content_embedding import (DialogueSearchQuery, SearchQuery,
                                          SemanticSearchResult)
from app.services.olorin.content_metadata_service import \
    content_metadata_service
from app.services.olorin.search.client import client_manager
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.helpers import format_timestamp
from app.services.olorin.search.pinecone_ops import safe_pinecone_query

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

        # Query Pinecone with resilience
        pinecone_index = client_manager.pinecone_index
        pinecone_results = None
        if pinecone_index:
            pinecone_results = await safe_pinecone_query(
                pinecone_index,
                vector=query_embedding,
                top_k=query.limit * 2,
                filter_dict=filter_dict if filter_dict else None,
                include_metadata=True,
            )

        if pinecone_results:
            # First pass: collect unique content IDs and their match data
            seen_content_ids = set()
            matches_to_process = []

            for match in pinecone_results.matches:
                if match.score < query.min_score:
                    continue

                metadata = match.metadata or {}
                content_id = metadata.get("content_id")

                # Deduplicate by content_id
                if content_id in seen_content_ids:
                    continue
                seen_content_ids.add(content_id)
                matches_to_process.append((content_id, match, metadata))

                if len(matches_to_process) >= query.limit:
                    break

            # Batch load all content documents
            content_ids_to_fetch = [m[0] for m in matches_to_process if m[0]]
            contents_map = await content_metadata_service.get_contents_batch(
                content_ids_to_fetch
            )

            # Build results using cached content data
            for content_id, match, metadata in matches_to_process:
                content = contents_map.get(content_id)
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
                        thumbnail_url=content.thumbnail,
                        matched_text=metadata.get("text", ""),
                        match_type=metadata.get("embedding_type", "title"),
                        relevance_score=match.score,
                        timestamp_seconds=timestamp_seconds,
                        timestamp_formatted=timestamp_formatted,
                    )
                )

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

        # Query Pinecone with resilience
        pinecone_index = client_manager.pinecone_index
        pinecone_results = None
        if pinecone_index:
            pinecone_results = await safe_pinecone_query(
                pinecone_index,
                vector=query_embedding,
                top_k=query.limit,
                filter_dict=filter_dict,
                include_metadata=True,
            )

        if pinecone_results:
            # First pass: collect matches and content IDs
            matches_to_process = []
            content_ids_to_fetch = set()

            for match in pinecone_results.matches:
                if match.score < query.min_score:
                    continue

                metadata = match.metadata or {}
                content_id = metadata.get("content_id")

                matches_to_process.append((content_id, match, metadata))
                if content_id:
                    content_ids_to_fetch.add(content_id)

            # Batch load all content documents
            contents_map = await content_metadata_service.get_contents_batch(
                list(content_ids_to_fetch)
            )

            # Build results using cached content data
            for content_id, match, metadata in matches_to_process:
                content = contents_map.get(content_id) if content_id else None

                timestamp_seconds = metadata.get("start_time")
                timestamp_formatted = (
                    format_timestamp(timestamp_seconds) if timestamp_seconds else None
                )

                results.append(
                    SemanticSearchResult(
                        content_id=content_id or "",
                        title=content.title if content else "",
                        title_en=content.title_en if content else None,
                        content_type=content.content_type if content else None,
                        thumbnail_url=content.thumbnail if content else None,
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
        # Use content metadata service for text search
        # This maintains proper separation while providing fallback search
        search_results = await content_metadata_service.text_search(
            query_text=query.query,
            content_types=query.content_types,
            limit=query.limit,
        )

        for content in search_results:
            results.append(
                SemanticSearchResult(
                    content_id=str(content.id),
                    title=content.title or "",
                    title_en=content.title_en,
                    content_type=content.content_type,
                    thumbnail_url=content.thumbnail,
                    matched_text=content.title or content.description or "",
                    match_type="title",
                    relevance_score=0.5,
                )
            )

    except Exception as e:
        logger.error(f"MongoDB text search failed: {e}")

    return results
