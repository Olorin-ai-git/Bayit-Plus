"""
Vector Search Client Initialization

Manages Pinecone and OpenAI client connections.
"""

import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Try to import Pinecone
try:
    from pinecone import Pinecone, ServerlessSpec
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False
    Pinecone = None
    ServerlessSpec = None
    logger.warning("Pinecone not available - vector search disabled")

# Try to import OpenAI for embeddings
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    AsyncOpenAI = None
    logger.warning("OpenAI not available - embeddings disabled")


class SearchClientManager:
    """Manages search client connections."""

    def __init__(self):
        """Initialize client manager."""
        self._pinecone_client: Optional[Pinecone] = None
        self._pinecone_index = None
        self._openai_client: Optional[AsyncOpenAI] = None
        self._initialized = False

    @property
    def is_initialized(self) -> bool:
        """Check if clients are initialized."""
        return self._initialized

    @property
    def pinecone_index(self):
        """Get Pinecone index."""
        return self._pinecone_index

    @property
    def openai_client(self) -> Optional[AsyncOpenAI]:
        """Get OpenAI client."""
        return self._openai_client

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


# Singleton client manager
client_manager = SearchClientManager()
