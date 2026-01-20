"""
Olorin.ai Content Embedding Script

Batch embeds content (subtitles, titles, descriptions) into Pinecone for semantic search.

Usage:
    poetry run python -m scripts.olorin.embed_content [OPTIONS]

Options:
    --content-type TYPE    Type of content to embed: all, movies, series, subtitles
    --batch-size SIZE      Number of items per batch (default: 100)
    --force               Re-embed existing content
    --dry-run             Preview without making changes

Examples:
    # Embed all content
    poetry run python -m scripts.olorin.embed_content

    # Embed only movie metadata
    poetry run python -m scripts.olorin.embed_content --content-type movies

    # Embed subtitles with custom batch size
    poetry run python -m scripts.olorin.embed_content --content-type subtitles --batch-size 50
"""

import argparse
import asyncio
import logging
import sys
from datetime import datetime, timezone
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.content import Content
from app.models.content_embedding import ContentEmbedding
from app.models.subtitles import SubtitleTrackDoc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Check for required dependencies
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not available - install with: poetry add openai")

try:
    from pinecone import Pinecone
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False
    logger.warning("Pinecone not available - install with: poetry add pinecone-client")


class ContentEmbedder:
    """Batch content embedder for Olorin.ai semantic search."""

    def __init__(self, batch_size: int = 100, force: bool = False, dry_run: bool = False):
        """Initialize embedder with options."""
        self.batch_size = batch_size
        self.force = force
        self.dry_run = dry_run

        self._openai_client: Optional[AsyncOpenAI] = None
        self._pinecone_client: Optional[Pinecone] = None
        self._pinecone_index = None

    async def initialize(self):
        """Initialize clients and connections."""
        if not OPENAI_AVAILABLE:
            raise RuntimeError("OpenAI client not available")

        if not PINECONE_AVAILABLE:
            raise RuntimeError("Pinecone client not available")

        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not configured")

        if not settings.PINECONE_API_KEY:
            raise RuntimeError("PINECONE_API_KEY not configured")

        # Initialize OpenAI
        self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # Initialize Pinecone
        self._pinecone_client = Pinecone(api_key=settings.PINECONE_API_KEY)

        # Get or create index
        index_name = settings.PINECONE_INDEX_NAME
        existing_indexes = [idx.name for idx in self._pinecone_client.list_indexes()]

        if index_name not in existing_indexes:
            logger.info(f"Creating Pinecone index: {index_name}")
            if not self.dry_run:
                self._pinecone_client.create_index(
                    name=index_name,
                    dimension=settings.EMBEDDING_DIMENSIONS,
                    metric="cosine",
                    spec={
                        "serverless": {
                            "cloud": "aws",
                            "region": settings.PINECONE_ENVIRONMENT.split("-")[0]
                            if "-" in settings.PINECONE_ENVIRONMENT
                            else "us-east-1",
                        }
                    },
                )
                # Wait for index to be ready
                logger.info("Waiting for index to be ready...")
                await asyncio.sleep(30)

        if not self.dry_run:
            self._pinecone_index = self._pinecone_client.Index(index_name)

        logger.info("Embedder initialized successfully")

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using OpenAI."""
        if not self._openai_client:
            return None

        try:
            # Truncate text if too long (max ~8000 tokens for embedding model)
            max_chars = 30000
            if len(text) > max_chars:
                text = text[:max_chars]

            response = await self._openai_client.embeddings.create(
                model=settings.EMBEDDING_MODEL,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    async def embed_content_metadata(self) -> dict:
        """Embed content metadata (titles, descriptions)."""
        logger.info("Embedding content metadata...")

        stats = {"processed": 0, "embedded": 0, "skipped": 0, "errors": 0}

        # Find all content
        cursor = Content.find_all()
        batch: List[Content] = []

        async for content in cursor:
            batch.append(content)

            if len(batch) >= self.batch_size:
                result = await self._process_content_batch(batch)
                stats["processed"] += result["processed"]
                stats["embedded"] += result["embedded"]
                stats["skipped"] += result["skipped"]
                stats["errors"] += result["errors"]
                batch = []

        # Process remaining
        if batch:
            result = await self._process_content_batch(batch)
            stats["processed"] += result["processed"]
            stats["embedded"] += result["embedded"]
            stats["skipped"] += result["skipped"]
            stats["errors"] += result["errors"]

        logger.info(f"Content metadata embedding complete: {stats}")
        return stats

    async def _process_content_batch(self, batch: List[Content]) -> dict:
        """Process a batch of content for embedding."""
        stats = {"processed": 0, "embedded": 0, "skipped": 0, "errors": 0}

        vectors_to_upsert = []

        for content in batch:
            stats["processed"] += 1
            content_id = str(content.id)

            # Check if already embedded
            if not self.force:
                existing = await ContentEmbedding.find_one(
                    ContentEmbedding.content_id == content_id,
                    ContentEmbedding.embedding_type == "title",
                )
                if existing:
                    stats["skipped"] += 1
                    continue

            # Build text to embed
            title = content.title or ""
            title_en = content.title_en or ""
            title_es = content.title_es or ""
            description = content.description or ""
            description_en = content.description_en or ""

            combined_text = f"{title} {title_en} {title_es} {description} {description_en}".strip()

            if not combined_text:
                stats["skipped"] += 1
                continue

            # Generate embedding
            embedding = await self.generate_embedding(combined_text)
            if not embedding:
                stats["errors"] += 1
                continue

            # Create vector ID
            vector_id = f"content_{content_id}_title"

            # Prepare metadata
            metadata = {
                "content_id": content_id,
                "type": "title",
                "title": title[:500],
                "content_type": content.content_type or "unknown",
                "language": "he",
            }

            if content.genre_ids:
                metadata["genre_ids"] = content.genre_ids[:10]

            vectors_to_upsert.append({
                "id": vector_id,
                "values": embedding,
                "metadata": metadata,
            })

            # Store embedding document
            if not self.dry_run:
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

        # Upsert to Pinecone
        if vectors_to_upsert and not self.dry_run and self._pinecone_index:
            try:
                self._pinecone_index.upsert(vectors=vectors_to_upsert)
                logger.info(f"Upserted {len(vectors_to_upsert)} vectors to Pinecone")
            except Exception as e:
                logger.error(f"Failed to upsert to Pinecone: {e}")
                stats["errors"] += len(vectors_to_upsert)
                stats["embedded"] -= len(vectors_to_upsert)

        return stats

    async def embed_subtitles(self) -> dict:
        """Embed subtitle segments for dialogue search."""
        logger.info("Embedding subtitle segments...")

        stats = {"processed": 0, "embedded": 0, "skipped": 0, "errors": 0}

        # Find all subtitle tracks
        cursor = SubtitleTrackDoc.find_all()

        async for track in cursor:
            stats["processed"] += 1

            if not track.cues:
                stats["skipped"] += 1
                continue

            content_id = track.content_id

            # Check if already embedded
            if not self.force:
                existing = await ContentEmbedding.find_one(
                    ContentEmbedding.content_id == content_id,
                    ContentEmbedding.embedding_type == "subtitle_segment",
                )
                if existing:
                    stats["skipped"] += 1
                    continue

            # Group cues into ~30 second segments
            result = await self._embed_subtitle_segments(
                content_id=content_id,
                cues=track.cues,
                language=track.language or "he",
            )

            stats["embedded"] += result["embedded"]
            stats["errors"] += result["errors"]

        logger.info(f"Subtitle embedding complete: {stats}")
        return stats

    async def _embed_subtitle_segments(
        self,
        content_id: str,
        cues: List[dict],
        language: str,
    ) -> dict:
        """Embed subtitle cues in 30-second segments."""
        stats = {"embedded": 0, "errors": 0}

        segment_duration = 30.0  # seconds
        vectors_to_upsert = []

        # Sort cues by start time
        sorted_cues = sorted(cues, key=lambda c: c.get("start_time", 0))

        current_segment_start = 0.0
        current_segment_text = []
        segment_index = 0

        for cue in sorted_cues:
            start_time = cue.get("start_time", 0)
            text = cue.get("text", "")

            if not text:
                continue

            # Check if we need to start a new segment
            if start_time >= current_segment_start + segment_duration:
                # Process current segment
                if current_segment_text:
                    result = await self._embed_single_segment(
                        content_id=content_id,
                        segment_index=segment_index,
                        segment_start=current_segment_start,
                        segment_end=current_segment_start + segment_duration,
                        text=" ".join(current_segment_text),
                        language=language,
                    )

                    if result:
                        vectors_to_upsert.append(result)
                        stats["embedded"] += 1
                    else:
                        stats["errors"] += 1

                # Start new segment
                current_segment_start = (start_time // segment_duration) * segment_duration
                current_segment_text = [text]
                segment_index += 1
            else:
                current_segment_text.append(text)

        # Process final segment
        if current_segment_text:
            result = await self._embed_single_segment(
                content_id=content_id,
                segment_index=segment_index,
                segment_start=current_segment_start,
                segment_end=current_segment_start + segment_duration,
                text=" ".join(current_segment_text),
                language=language,
            )

            if result:
                vectors_to_upsert.append(result)
                stats["embedded"] += 1
            else:
                stats["errors"] += 1

        # Upsert to Pinecone in batches
        if vectors_to_upsert and not self.dry_run and self._pinecone_index:
            batch_size = 100
            for i in range(0, len(vectors_to_upsert), batch_size):
                batch = vectors_to_upsert[i : i + batch_size]
                try:
                    self._pinecone_index.upsert(vectors=batch)
                    logger.debug(f"Upserted {len(batch)} subtitle vectors")
                except Exception as e:
                    logger.error(f"Failed to upsert subtitle batch: {e}")
                    stats["errors"] += len(batch)

        return stats

    async def _embed_single_segment(
        self,
        content_id: str,
        segment_index: int,
        segment_start: float,
        segment_end: float,
        text: str,
        language: str,
    ) -> Optional[dict]:
        """Embed a single subtitle segment."""
        if not text.strip():
            return None

        # Generate embedding
        embedding = await self.generate_embedding(text)
        if not embedding:
            return None

        vector_id = f"content_{content_id}_subtitle_{segment_index}"

        # Store embedding document
        if not self.dry_run:
            embedding_doc = ContentEmbedding(
                content_id=content_id,
                embedding_type="subtitle_segment",
                segment_index=segment_index,
                segment_start_time=segment_start,
                segment_end_time=segment_end,
                segment_text=text[:1000],  # Truncate for storage
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

    async def run(self, content_type: str = "all") -> dict:
        """Run embedding for specified content type."""
        await self.initialize()

        results = {}

        if content_type in ("all", "movies", "series", "metadata"):
            results["metadata"] = await self.embed_content_metadata()

        if content_type in ("all", "subtitles"):
            results["subtitles"] = await self.embed_subtitles()

        return results


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Embed content for Olorin.ai semantic search")
    parser.add_argument(
        "--content-type",
        choices=["all", "movies", "series", "subtitles", "metadata"],
        default="all",
        help="Type of content to embed",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of items per batch",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-embed existing content",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview without making changes",
    )

    args = parser.parse_args()

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, ContentEmbedding, SubtitleTrackDoc],
    )

    logger.info(f"Starting content embedding (type={args.content_type}, dry_run={args.dry_run})")

    embedder = ContentEmbedder(
        batch_size=args.batch_size,
        force=args.force,
        dry_run=args.dry_run,
    )

    try:
        results = await embedder.run(content_type=args.content_type)
        logger.info(f"Embedding complete: {results}")
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
