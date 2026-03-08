"""Tests for the embedding-based voice intent classifier."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.voice.embedding_cache import (
    EmbeddingIntentClassifier,
    _cosine_similarity,
)
from app.services.voice.intent_canonical_phrases import TOTAL_PHRASE_COUNT
from app.services.voice.models import VoiceIntent


def _make_embedding_response(vectors: list[list[float]]) -> MagicMock:
    """Build a mock OpenAI embeddings response."""
    data = []
    for i, vec in enumerate(vectors):
        item = MagicMock()
        item.embedding = vec
        item.index = i
        data.append(item)
    response = MagicMock()
    response.data = data
    return response


class TestCosineSimMath:
    """Pure math tests for cosine similarity."""

    def test_identical_vectors_return_one(self) -> None:
        vec = [1.0, 2.0, 3.0]
        assert abs(_cosine_similarity(vec, vec) - 1.0) < 1e-9

    def test_orthogonal_vectors_return_zero(self) -> None:
        assert abs(_cosine_similarity([1.0, 0.0], [0.0, 1.0])) < 1e-9

    def test_opposite_vectors_return_negative_one(self) -> None:
        assert abs(_cosine_similarity([1.0, 0.0], [-1.0, 0.0]) + 1.0) < 1e-9

    def test_zero_vector_returns_zero(self) -> None:
        assert _cosine_similarity([0.0, 0.0], [1.0, 2.0]) == 0.0


class TestInitialize:
    """Tests for EmbeddingIntentClassifier.initialize()."""

    @pytest.mark.asyncio
    async def test_initialize_loads_all_phrases(self) -> None:
        classifier = EmbeddingIntentClassifier()
        dim = 4
        mock_vectors = [[float(i)] * dim for i in range(TOTAL_PHRASE_COUNT)]
        mock_response = _make_embedding_response(mock_vectors)

        with patch("app.services.voice.embedding_cache.AsyncOpenAI") as mock_cls, \
             patch("app.services.voice.embedding_cache.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.INTENT_EMBEDDING_MODEL = "text-embedding-3-small"
            mock_settings.INTENT_EMBEDDING_DIMENSIONS = dim
            mock_settings.INTENT_EMBEDDING_THRESHOLD = 0.78

            mock_client = MagicMock()
            mock_client.embeddings.create = AsyncMock(return_value=mock_response)
            mock_cls.return_value = mock_client

            await classifier.initialize()

        assert classifier.is_initialized is True
        assert len(classifier._embeddings) == TOTAL_PHRASE_COUNT

        intents_found = {e.intent for e in classifier._embeddings}
        assert VoiceIntent.NAVIGATION in intents_found
        assert VoiceIntent.PLAYBACK in intents_found
        assert VoiceIntent.CHAT in intents_found


class TestClassify:
    """Tests for classification logic."""

    def _build_classifier_with_embeddings(
        self, threshold: float = 0.78
    ) -> EmbeddingIntentClassifier:
        """Build a classifier with hand-crafted embeddings."""
        from app.services.voice.embedding_cache import IntentEmbedding

        classifier = EmbeddingIntentClassifier()
        classifier._initialized = True
        classifier._embeddings = [
            IntentEmbedding(
                intent=VoiceIntent.NAVIGATION,
                phrase="go home",
                language="en",
                embedding=[1.0, 0.0, 0.0],
            ),
            IntentEmbedding(
                intent=VoiceIntent.PLAYBACK,
                phrase="pause video",
                language="en",
                embedding=[0.0, 1.0, 0.0],
            ),
            IntentEmbedding(
                intent=VoiceIntent.SEARCH,
                phrase="find movies",
                language="en",
                embedding=[0.0, 0.0, 1.0],
            ),
        ]
        return classifier

    def test_classify_returns_correct_intent(self) -> None:
        classifier = self._build_classifier_with_embeddings()

        with patch("app.services.voice.embedding_cache.settings") as mock_settings:
            mock_settings.INTENT_EMBEDDING_THRESHOLD = 0.78
            result = classifier.classify([0.95, 0.05, 0.0])

        assert result is not None
        intent, score = result
        assert intent == VoiceIntent.NAVIGATION
        assert score > 0.78

    def test_classify_returns_none_below_threshold(self) -> None:
        classifier = self._build_classifier_with_embeddings()

        with patch("app.services.voice.embedding_cache.settings") as mock_settings:
            mock_settings.INTENT_EMBEDDING_THRESHOLD = 0.99
            result = classifier.classify([0.5, 0.5, 0.5])

        assert result is None

    def test_classify_not_initialized_raises(self) -> None:
        classifier = EmbeddingIntentClassifier()
        with pytest.raises(RuntimeError, match="not initialized"):
            classifier.classify([1.0, 0.0])


class TestEmbedTranscript:
    """Tests for transcript embedding."""

    @pytest.mark.asyncio
    async def test_embed_transcript_returns_vector(self) -> None:
        classifier = EmbeddingIntentClassifier()
        classifier._initialized = True

        expected_vec = [0.1, 0.2, 0.3]
        mock_response = _make_embedding_response([expected_vec])

        mock_client = MagicMock()
        mock_client.embeddings.create = AsyncMock(return_value=mock_response)
        classifier._client = mock_client

        result = await classifier.embed_transcript("play something fun")

        assert result == expected_vec
        mock_client.embeddings.create.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_embed_transcript_not_initialized_raises(self) -> None:
        classifier = EmbeddingIntentClassifier()
        with pytest.raises(RuntimeError, match="not initialized"):
            await classifier.embed_transcript("hello")
