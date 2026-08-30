"""
Embedding-based Voice Intent Classifier
Caches OpenAI embeddings of canonical phrases for fast cosine similarity classification.
"""

import math
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.core.ai_clients import get_openai_client

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.voice.intent_canonical_phrases import CANONICAL_PHRASES
from app.services.voice.models import VoiceIntent

logger = get_logger(__name__)


@dataclass
class IntentEmbedding:
    """A cached embedding for a single canonical phrase."""

    intent: VoiceIntent
    phrase: str
    language: str
    embedding: list[float]


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors using standard library math."""
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)


class EmbeddingIntentClassifier:
    """Singleton classifier that embeds canonical phrases at startup
    and classifies transcripts via cosine similarity at runtime."""

    def __init__(self) -> None:
        self._embeddings: list[IntentEmbedding] = []
        self._initialized: bool = False
        self._client: AsyncOpenAI | None = None

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    async def initialize(self) -> None:
        """Load and embed all canonical phrases at startup."""
        self._client = get_openai_client(api_key=settings.OPENAI_API_KEY)

        all_phrases: list[str] = []
        phrase_metadata: list[tuple[VoiceIntent, str, str]] = []

        for intent_value, languages in CANONICAL_PHRASES.items():
            intent = VoiceIntent(intent_value) if isinstance(intent_value, str) else intent_value
            for language, phrases in languages.items():
                for phrase in phrases:
                    all_phrases.append(phrase)
                    phrase_metadata.append((intent, phrase, language))

        response = await self._client.embeddings.create(
            input=all_phrases,
            model=settings.INTENT_EMBEDDING_MODEL,
            dimensions=settings.INTENT_EMBEDDING_DIMENSIONS,
        )

        self._embeddings = [
            IntentEmbedding(
                intent=phrase_metadata[i][0],
                phrase=phrase_metadata[i][1],
                language=phrase_metadata[i][2],
                embedding=item.embedding,
            )
            for i, item in enumerate(response.data)
        ]

        self._initialized = True

        embedding_bytes = (
            len(self._embeddings)
            * settings.INTENT_EMBEDDING_DIMENSIONS
            * 4
        )
        logger.info(
            "embedding_classifier_initialized",
            phrase_count=len(self._embeddings),
            dimensions=settings.INTENT_EMBEDDING_DIMENSIONS,
            memory_estimate_kb=round(embedding_bytes / 1024, 1),
        )

    async def embed_transcript(self, transcript: str) -> list[float]:
        """Embed a single transcript for classification."""
        if not self._initialized or self._client is None:
            raise RuntimeError("EmbeddingIntentClassifier not initialized")

        response = await self._client.embeddings.create(
            input=[transcript],
            model=settings.INTENT_EMBEDDING_MODEL,
            dimensions=settings.INTENT_EMBEDDING_DIMENSIONS,
        )
        return response.data[0].embedding

    def classify(
        self, transcript_embedding: list[float]
    ) -> tuple[VoiceIntent, float] | None:
        """Cosine similarity against cached embeddings.
        Returns (intent, score) or None if below threshold."""
        if not self._initialized:
            raise RuntimeError("EmbeddingIntentClassifier not initialized")

        best_score = -1.0
        best_intent: VoiceIntent | None = None

        for cached in self._embeddings:
            score = _cosine_similarity(transcript_embedding, cached.embedding)
            if score > best_score:
                best_score = score
                best_intent = cached.intent

        if best_intent is not None and best_score >= settings.INTENT_EMBEDDING_THRESHOLD:
            return (best_intent, best_score)

        return None


embedding_classifier = EmbeddingIntentClassifier()
