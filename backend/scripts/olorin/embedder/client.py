"""
Embedding Client Management

OpenAI and Pinecone client initialization and embedding generation.
"""

import asyncio
import logging
from typing import Optional, List

from app.core.config import settings

logger = logging.getLogger(__name__)

# Check for required dependencies
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    AsyncOpenAI = None
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not available - install with: poetry add openai")

try:
    from pinecone import Pinecone
    PINECONE_AVAILABLE = True
except ImportError:
    Pinecone = None
    PINECONE_AVAILABLE = False
    logger.warning("Pinecone not available - install with: poetry add pinecone-client")


class EmbeddingClient:
    """Manages OpenAI and Pinecone connections for embedding."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self._openai_client: Optional[AsyncOpenAI] = None
        self._pinecone_client: Optional[Pinecone] = None
        self._pinecone_index = None

    async def initialize(self) -> None:
        """Initialize OpenAI and Pinecone clients."""
        if not OPENAI_AVAILABLE:
            raise RuntimeError("OpenAI client not available")

        if not PINECONE_AVAILABLE:
            raise RuntimeError("Pinecone client not available")

        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not configured")

        if not settings.PINECONE_API_KEY:
            raise RuntimeError("PINECONE_API_KEY not configured")

        self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self._pinecone_client = Pinecone(api_key=settings.PINECONE_API_KEY)

        index_name = settings.PINECONE_INDEX_NAME
        existing_indexes = [idx.name for idx in self._pinecone_client.list_indexes()]

        if index_name not in existing_indexes:
            logger.info(f"Creating Pinecone index: {index_name}")
            if not self.dry_run:
                region = settings.PINECONE_ENVIRONMENT.split("-")[0] \
                    if "-" in settings.PINECONE_ENVIRONMENT else "us-east-1"
                self._pinecone_client.create_index(
                    name=index_name,
                    dimension=settings.EMBEDDING_DIMENSIONS,
                    metric="cosine",
                    spec={"serverless": {"cloud": "aws", "region": region}},
                )
                logger.info("Waiting for index to be ready...")
                await asyncio.sleep(30)

        if not self.dry_run:
            self._pinecone_index = self._pinecone_client.Index(index_name)

        logger.info("Embedding client initialized successfully")

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using OpenAI."""
        if not self._openai_client:
            return None

        try:
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

    def upsert_vectors(self, vectors: List[dict]) -> bool:
        """Upsert vectors to Pinecone."""
        if self.dry_run or not self._pinecone_index or not vectors:
            return True

        try:
            self._pinecone_index.upsert(vectors=vectors)
            logger.debug(f"Upserted {len(vectors)} vectors to Pinecone")
            return True
        except Exception as e:
            logger.error(f"Failed to upsert to Pinecone: {e}")
            return False

    @property
    def pinecone_index(self):
        """Get Pinecone index."""
        return self._pinecone_index
