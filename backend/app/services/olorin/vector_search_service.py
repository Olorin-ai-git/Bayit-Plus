"""
Vector Search Service for Olorin.ai Platform

Hybrid search using Pinecone vector database and MongoDB text search.
Supports timestamp deep-linking for subtitle/dialogue matches.
"""

import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, List, AsyncIterator

from app.core.config import settings
from app.models.content import Content
from app.models.content_embedding import (
    ContentEmbedding,
    SemanticSearchResult,
    SearchQuery,
    DialogueSearchQuery,
)

logger = logging.getLogger(__name__)

# Try to import Pinecone
try:
    from pinecone import Pinecone, ServerlessSpec
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False
    logger.warning("Pinecone not available - vector search disabled")

# Try to import OpenAI for embeddings
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not available - embeddings disabled")


class VectorSearchService:
    """
    Hybrid search service combining vector and text search.

    Features:
    - Semantic search via Pinecone
    - Exact match fallback via MongoDB text index
    - Result fusion with weighted ranking
    - Timestamp deep-linking for subtitle matches
    """

    def __init__(self):
        """Initialize vector search service."""
        self._pinecone_client: Optional[Pinecone] = None
        self._pinecone_index = None
        self._openai_client: Optional[AsyncOpenAI] = None
        self._initialized = False

    async def initialize(self) -> bool:
        """
        Initialize Pinecone and OpenAI clients.

        Returns:
            True if initialization successful
        """
        if self._initialized:
            return True

        try:
            # Initialize Pinecone
            if PINECONE_AVAILABLE and settings.PINECONE_API_KEY:
                self._pinecone_client = Pinecone(api_key=settings.PINECONE_API_KEY)

                # Get or create index
                index_name = settings.PINECONE_INDEX_NAME
                existing_indexes = [idx.name for idx in self._pinecone_client.list_indexes()]

                if index_name not in existing_indexes:
                    logger.info(f"Creating Pinecone index: {index_name}")
                    self._pinecone_client.create_index(
                        name=index_name,
                        dimension=settings.EMBEDDING_DIMENSIONS,
                        metric="cosine",
                        spec=ServerlessSpec(
                            cloud="aws",
                            region=settings.PINECONE_ENVIRONMENT.split("-")[0],
                        ),
                    )

                self._pinecone_index = self._pinecone_client.Index(index_name)
                logger.info(f"Connected to Pinecone index: {index_name}")

            # Initialize OpenAI
            if OPENAI_AVAILABLE and settings.OPENAI_API_KEY:
                self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI client initialized for embeddings")

            self._initialized = True
            return True

        except Exception as e:
            logger.error(f"Failed to initialize vector search: {e}")
            return False

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding vector for text.

        Args:
            text: Text to embed

        Returns:
            Embedding vector or None if failed
        """
        if not self._openai_client:
            await self.initialize()

        if not self._openai_client:
            logger.error("OpenAI client not available")
            return None

        try:
            response = await self._openai_client.embeddings.create(
                model=settings.EMBEDDING_MODEL,
                input=text,
            )
            return response.data[0].embedding

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    async def index_content(
        self,
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
        if not self._initialized:
            await self.initialize()

        try:
            # Get content
            content = await Content.get(content_id)
            if not content:
                return {"status": "failed", "error": "Content not found"}

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
            title = content.title or content.title_en or ""
            if title:
                title_embedding = await self.generate_embedding(title)
                if title_embedding:
                    vector_id = self._generate_vector_id(content_id, "title", 0)
                    vectors_to_upsert.append({
                        "id": vector_id,
                        "values": title_embedding,
                        "metadata": {
                            "content_id": content_id,
                            "content_type": content.content_type,
                            "embedding_type": "title",
                            "language": "he",
                            "text": title[:1000],  # Metadata limit
                        },
                    })
                    embeddings_to_save.append(
                        ContentEmbedding(
                            content_id=content_id,
                            content_type=content.content_type,
                            embedding_type="title",
                            segment_text=title,
                            embedding_model=settings.EMBEDDING_MODEL,
                            pinecone_vector_id=vector_id,
                            language="he",
                            genre_ids=[str(g) for g in (content.genre_ids or [])],
                            section_ids=[str(s) for s in (content.section_ids or [])],
                            partner_id=partner_id,
                        )
                    )

            # Index description
            description = content.description or content.description_en or ""
            if description:
                desc_embedding = await self.generate_embedding(description)
                if desc_embedding:
                    vector_id = self._generate_vector_id(content_id, "description", 0)
                    vectors_to_upsert.append({
                        "id": vector_id,
                        "values": desc_embedding,
                        "metadata": {
                            "content_id": content_id,
                            "content_type": content.content_type,
                            "embedding_type": "description",
                            "language": "he",
                            "text": description[:1000],
                        },
                    })
                    embeddings_to_save.append(
                        ContentEmbedding(
                            content_id=content_id,
                            content_type=content.content_type,
                            embedding_type="description",
                            segment_text=description,
                            embedding_model=settings.EMBEDDING_MODEL,
                            pinecone_vector_id=vector_id,
                            language="he",
                            genre_ids=[str(g) for g in (content.genre_ids or [])],
                            section_ids=[str(s) for s in (content.section_ids or [])],
                            partner_id=partner_id,
                        )
                    )

            # Upsert to Pinecone
            if vectors_to_upsert and self._pinecone_index:
                self._pinecone_index.upsert(vectors=vectors_to_upsert)

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

    async def index_subtitles(
        self,
        content_id: str,
        subtitles: List[dict],
        language: str = "he",
        segment_duration: float = 30.0,
        partner_id: Optional[str] = None,
    ) -> dict:
        """
        Index subtitle segments for dialogue search.

        Args:
            content_id: Content document ID
            subtitles: List of {text, start_time, end_time} dicts
            language: Subtitle language
            segment_duration: Group subtitles into segments of this duration
            partner_id: Optional partner ID

        Returns:
            Indexing status
        """
        if not self._initialized:
            await self.initialize()

        try:
            # Get content metadata
            content = await Content.get(content_id)
            content_type = content.content_type if content else None

            # Group subtitles into segments
            segments = self._group_subtitles(subtitles, segment_duration)

            vectors_to_upsert = []
            embeddings_to_save = []

            for idx, segment in enumerate(segments):
                text = segment["text"]
                if len(text) < 10:  # Skip very short segments
                    continue

                embedding = await self.generate_embedding(text)
                if not embedding:
                    continue

                vector_id = self._generate_vector_id(content_id, "subtitle_segment", idx)

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
                        "language": language,
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
                        language=language,
                        partner_id=partner_id,
                    )
                )

                # Batch upsert every 100 vectors
                if len(vectors_to_upsert) >= 100:
                    if self._pinecone_index:
                        self._pinecone_index.upsert(vectors=vectors_to_upsert)
                    vectors_to_upsert = []

            # Upsert remaining vectors
            if vectors_to_upsert and self._pinecone_index:
                self._pinecone_index.upsert(vectors=vectors_to_upsert)

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

    async def semantic_search(
        self,
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
        if not self._initialized:
            await self.initialize()

        results = []

        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query.query)
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
            if self._pinecone_index:
                pinecone_results = self._pinecone_index.query(
                    vector=query_embedding,
                    top_k=query.limit * 2,  # Get extra for deduplication
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

                    # Deduplicate by content_id (keep highest score)
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
                        timestamp_formatted = self._format_timestamp(timestamp_seconds)

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
            results = await self._mongodb_text_search(query)

        return results

    async def dialogue_search(
        self,
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
        if not self._initialized:
            await self.initialize()

        results = []

        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query.query)
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
            if self._pinecone_index:
                pinecone_results = self._pinecone_index.query(
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
                    timestamp_formatted = self._format_timestamp(timestamp_seconds) if timestamp_seconds else None

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

    async def _mongodb_text_search(
        self,
        query: SearchQuery,
    ) -> List[SemanticSearchResult]:
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
                        relevance_score=0.5,  # Normalized score for text search
                    )
                )

        except Exception as e:
            logger.error(f"MongoDB text search failed: {e}")

        return results

    def _generate_vector_id(self, content_id: str, embedding_type: str, index: int) -> str:
        """Generate a unique vector ID."""
        raw = f"{content_id}:{embedding_type}:{index}"
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    def _group_subtitles(
        self,
        subtitles: List[dict],
        segment_duration: float,
    ) -> List[dict]:
        """Group subtitles into time-based segments."""
        if not subtitles:
            return []

        segments = []
        current_segment = {
            "text": "",
            "start_time": subtitles[0].get("start_time", 0),
            "end_time": 0,
        }

        for sub in subtitles:
            start = sub.get("start_time", 0)
            end = sub.get("end_time", start)
            text = sub.get("text", "")

            # Check if we need to start a new segment
            if start - current_segment["start_time"] >= segment_duration:
                if current_segment["text"]:
                    segments.append(current_segment)
                current_segment = {
                    "text": text,
                    "start_time": start,
                    "end_time": end,
                }
            else:
                current_segment["text"] += " " + text
                current_segment["end_time"] = end

        # Add final segment
        if current_segment["text"]:
            segments.append(current_segment)

        return segments

    def _format_timestamp(self, seconds: float) -> str:
        """Format seconds as HH:MM:SS."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)

        if hours > 0:
            return f"{hours}:{minutes:02d}:{secs:02d}"
        return f"{minutes}:{secs:02d}"


# Singleton instance
vector_search_service = VectorSearchService()
