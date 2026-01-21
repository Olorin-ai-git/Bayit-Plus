"""Embedding generation service for MongoDB Atlas Vector Search.

This service generates vector embeddings from text using sentence-transformers.
Embeddings are used for similarity search in MongoDB Atlas Vector Search.

Configuration is driven by environment variables:
- EMBEDDING_MODEL_NAME: Model to use (default: all-MiniLM-L6-v2)
- EMBEDDING_DIMENSION: Expected embedding dimension (default: 384)
- EMBEDDING_BATCH_SIZE: Batch size for generation (default: 32)

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Configuration-driven: Model selection and parameters configurable
"""

import os
from typing import List, Optional

from sentence_transformers import SentenceTransformer

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EmbeddingService:
    """Service for generating text embeddings using sentence-transformers.

    This service provides methods for generating vector embeddings from text
    that can be stored in MongoDB and used with Atlas Vector Search for
    similarity-based queries.

    The service uses the sentence-transformers library which provides
    pre-trained models for semantic similarity tasks.

    Example usage:
        ```python
        service = EmbeddingService()
        embedding = service.generate_embedding("fraud detection alert")
        # Store embedding in MongoDB document
        doc["embedding"] = embedding
        ```

    Attributes:
        model: SentenceTransformer model instance
        model_name: Name of the model being used
        dimension: Dimensionality of embeddings
        batch_size: Batch size for bulk operations
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        dimension: Optional[int] = None,
    ):
        """Initialize embedding service with specified model.

        Args:
            model_name: Model to use (from environment if not provided)
            dimension: Expected embedding dimension (from environment if not provided)
        """
        self.model_name = model_name or os.getenv(
            "EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2"
        )
        self.expected_dimension = dimension or int(
            os.getenv("EMBEDDING_DIMENSION", "384")
        )
        self.batch_size = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))

        logger.info(
            f"Initializing embedding service with model: {self.model_name}",
            extra={
                "model_name": self.model_name,
                "expected_dimension": self.expected_dimension,
                "batch_size": self.batch_size,
            },
        )

        try:
            self.model = SentenceTransformer(self.model_name)
            actual_dimension = self.model.get_sentence_embedding_dimension()

            if actual_dimension != self.expected_dimension:
                logger.warning(
                    f"Model dimension ({actual_dimension}) does not match "
                    f"expected dimension ({self.expected_dimension}). "
                    "Updating expected dimension."
                )
                self.expected_dimension = actual_dimension

            logger.info(
                f"Embedding service initialized successfully",
                extra={
                    "model": self.model_name,
                    "dimension": self.expected_dimension,
                },
            )

        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            raise

    @property
    def dimension(self) -> int:
        """Get embedding dimension for this model.

        Returns:
            int: Dimensionality of embeddings
        """
        return self.expected_dimension

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for a single text.

        Args:
            text: Input text to embed

        Returns:
            List of floats representing the embedding vector

        Raises:
            ValueError: If text is empty
            Exception: If embedding generation fails
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        try:
            embedding = self.model.encode(text, convert_to_numpy=True)
            embedding_list = embedding.tolist()

            logger.debug(
                f"Generated embedding for text (length: {len(text)})",
                extra={
                    "text_length": len(text),
                    "embedding_dimension": len(embedding_list),
                },
            )

            return embedding_list

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise

    def generate_batch(
        self,
        texts: List[str],
        show_progress_bar: bool = False,
    ) -> List[List[float]]:
        """Generate embeddings for batch of texts.

        This method is more efficient than calling generate_embedding
        multiple times as it processes texts in batches.

        Args:
            texts: List of input texts to embed
            show_progress_bar: Whether to show progress bar (default: False)

        Returns:
            List of embedding vectors, one per input text

        Raises:
            ValueError: If texts list is empty
            Exception: If embedding generation fails
        """
        if not texts:
            raise ValueError("Texts list cannot be empty")

        # Filter out empty texts
        valid_texts = [t for t in texts if t and t.strip()]
        if len(valid_texts) < len(texts):
            logger.warning(
                f"Filtered {len(texts) - len(valid_texts)} empty texts from batch"
            )

        if not valid_texts:
            raise ValueError("No valid texts in batch after filtering")

        try:
            embeddings = self.model.encode(
                valid_texts,
                batch_size=self.batch_size,
                show_progress_bar=show_progress_bar,
                convert_to_numpy=True,
            )

            embeddings_list = [emb.tolist() for emb in embeddings]

            logger.info(
                f"Generated embeddings for batch",
                extra={
                    "batch_size": len(valid_texts),
                    "embedding_dimension": len(embeddings_list[0]),
                },
            )

            return embeddings_list

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            raise

    def compute_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float],
    ) -> float:
        """Compute cosine similarity between two embeddings.

        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector

        Returns:
            Cosine similarity score between -1 and 1
            (1 = identical, 0 = orthogonal, -1 = opposite)

        Raises:
            ValueError: If embeddings have different dimensions
        """
        if len(embedding1) != len(embedding2):
            raise ValueError(
                f"Embedding dimensions must match: "
                f"{len(embedding1)} vs {len(embedding2)}"
            )

        # Compute cosine similarity
        import numpy as np

        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = dot_product / (norm1 * norm2)
        return float(similarity)

    def generate_anomaly_embedding(
        self,
        metric: str,
        observed: float,
        expected: float,
        score: float,
        evidence: Optional[dict] = None,
    ) -> List[float]:
        """Generate embedding for an anomaly event.

        This is a specialized method for generating embeddings from
        anomaly detection data by combining multiple fields into a
        semantic representation.

        Args:
            metric: Metric name (e.g., "transaction_amount")
            observed: Observed value
            expected: Expected value
            score: Anomaly score
            evidence: Optional evidence dictionary

        Returns:
            Embedding vector for the anomaly
        """
        # Create semantic text representation
        text_parts = [
            f"metric: {metric}",
            f"observed: {observed:.2f}",
            f"expected: {expected:.2f}",
            f"score: {score:.2f}",
        ]

        if evidence:
            # Add evidence details if available
            for key, value in evidence.items():
                if isinstance(value, (int, float)):
                    text_parts.append(f"{key}: {value:.2f}")
                elif isinstance(value, str):
                    text_parts.append(f"{key}: {value}")

        text = " | ".join(text_parts)

        logger.debug(
            f"Generating anomaly embedding from: {text[:100]}...",
            extra={"metric": metric, "score": score},
        )

        return self.generate_embedding(text)


# Global singleton instance (lazy initialization)
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get global embedding service instance.

    Returns:
        EmbeddingService: Global embedding service singleton

    Note:
        The service is lazily initialized on first access.
    """
    global _embedding_service

    if _embedding_service is None:
        _embedding_service = EmbeddingService()

    return _embedding_service
