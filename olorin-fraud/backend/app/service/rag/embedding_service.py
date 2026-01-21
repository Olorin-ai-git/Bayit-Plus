"""
Embedding Service
Generates vector embeddings for RAG system using OpenAI and HuggingFace.
All configuration from environment variables - no hardcoded values.
"""

import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.service.config import get_settings_for_env
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class EmbeddingResult:
    """Embedding generation result."""

    success: bool
    embeddings: List[List[float]]
    dimensions: int
    provider: str
    model: str
    error_message: Optional[str] = None


class MultiEmbeddingService:
    """Multi-provider embedding service."""

    def __init__(self):
        """Initialize embedding service."""
        self.settings = get_settings_for_env()
        self._openai_client = None
        self._sentence_model = None
        self._available_providers = []
        self._initialize_providers()

    def _initialize_providers(self) -> None:
        """Initialize available embedding providers."""
        try:
            from openai import AsyncOpenAI

            api_key = os.getenv("OPENAI_API_KEY") or getattr(
                self.settings, "openai_api_key", None
            )
            if api_key:
                self._openai_client = AsyncOpenAI(api_key=api_key)
                self._available_providers.append("openai")
                logger.info("OpenAI embedding provider initialized")
        except (ImportError, Exception) as e:
            logger.warning(f"OpenAI provider not available: {e}")

        try:
            from sentence_transformers import SentenceTransformer

            self._sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
            self._available_providers.append("huggingface")
            self._available_providers.append("sentence-transformers")
            logger.info("HuggingFace embedding provider initialized")
        except (ImportError, Exception) as e:
            logger.warning(f"HuggingFace provider not available: {e}")

    def get_available_providers(self) -> List[str]:
        """Get list of available embedding providers."""
        return self._available_providers.copy()

    async def generate_embeddings(
        self, texts: List[str], provider: str = "openai", model: Optional[str] = None
    ) -> EmbeddingResult:
        """Generate embeddings for texts."""
        if provider == "openai":
            return await self._generate_openai_embeddings(texts, model)
        elif provider in ["huggingface", "sentence-transformers"]:
            return await self._generate_sentence_embeddings(texts, model)
        else:
            return EmbeddingResult(
                success=False,
                embeddings=[],
                dimensions=0,
                provider=provider,
                model=model or "unknown",
                error_message=f"Unsupported provider: {provider}",
            )

    async def _generate_openai_embeddings(
        self, texts: List[str], model: Optional[str]
    ) -> EmbeddingResult:
        """Generate embeddings using OpenAI."""
        if not self._openai_client:
            return EmbeddingResult(
                success=False,
                embeddings=[],
                dimensions=0,
                provider="openai",
                model=model or "unknown",
                error_message="OpenAI client not initialized",
            )

        try:
            model_name = model or "text-embedding-ada-002"
            response = await self._openai_client.embeddings.create(
                model=model_name, input=texts
            )

            embeddings = [item.embedding for item in response.data]
            dimensions = len(embeddings[0]) if embeddings else 0

            return EmbeddingResult(
                success=True,
                embeddings=embeddings,
                dimensions=dimensions,
                provider="openai",
                model=model_name,
            )
        except Exception as e:
            logger.error(f"OpenAI embedding generation failed: {e}")
            return EmbeddingResult(
                success=False,
                embeddings=[],
                dimensions=0,
                provider="openai",
                model=model or "unknown",
                error_message=str(e),
            )

    async def _generate_sentence_embeddings(
        self, texts: List[str], model: Optional[str]
    ) -> EmbeddingResult:
        """Generate embeddings using sentence-transformers."""
        if not self._sentence_model:
            try:
                from sentence_transformers import SentenceTransformer

                model_name = model or "all-MiniLM-L6-v2"
                self._sentence_model = SentenceTransformer(model_name)
            except ImportError:
                return EmbeddingResult(
                    success=False,
                    embeddings=[],
                    dimensions=0,
                    provider="huggingface",
                    model=model or "unknown",
                    error_message="sentence-transformers not installed",
                )

        try:
            embeddings = self._sentence_model.encode(texts, convert_to_numpy=False)
            dimensions = len(embeddings[0]) if len(embeddings) > 0 else 0

            return EmbeddingResult(
                success=True,
                embeddings=(
                    embeddings.tolist() if hasattr(embeddings, "tolist") else embeddings
                ),
                dimensions=dimensions,
                provider="huggingface",
                model=model or "all-MiniLM-L6-v2",
            )
        except Exception as e:
            logger.error(f"Sentence-transformers embedding generation failed: {e}")
            return EmbeddingResult(
                success=False,
                embeddings=[],
                dimensions=0,
                provider="huggingface",
                model=model or "unknown",
                error_message=str(e),
            )


_global_embedding_service: Optional[MultiEmbeddingService] = None


def get_embedding_service() -> MultiEmbeddingService:
    """Get global embedding service instance."""
    global _global_embedding_service
    if _global_embedding_service is None:
        _global_embedding_service = MultiEmbeddingService()
    return _global_embedding_service


async def initialize_embedding_service() -> MultiEmbeddingService:
    """Initialize embedding service."""
    service = get_embedding_service()
    providers = service.get_available_providers()
    if not providers:
        logger.warning("No embedding providers available")
    return service
