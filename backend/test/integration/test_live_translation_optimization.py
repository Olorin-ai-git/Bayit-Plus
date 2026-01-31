"""
Integration tests for live translation optimization features.
Tests the complete pipeline with real service initialization.
"""

import pytest
from app.services.live_translation import LiveTranslationService
from app.services.translation_cache_service import TranslationCacheService


class TestLiveTranslationOptimization:
    """Integration tests for latency optimization features."""

    @pytest.mark.asyncio
    async def test_google_translate_provider_configured(self):
        """Test that Google Translate is the default provider."""
        service = LiveTranslationService()
        assert service.translation_provider == "google", \
            "Google Translate should be default for optimal latency"

    @pytest.mark.asyncio
    async def test_reduced_timeout_default(self):
        """Test that default timeout is reduced to 100ms for live features."""
        # The default timeout is now 0.100 seconds (100ms)
        # This is verified by the method signature
        service = LiveTranslationService()

        # Verify the translate_text method has the correct default timeout
        import inspect
        sig = inspect.signature(service.translate_text)
        timeout_param = sig.parameters['timeout_seconds']

        assert timeout_param.default == 0.100, \
            "Default timeout should be 100ms for live dubbing (reduced from 250ms)"

    @pytest.mark.asyncio
    async def test_cache_supports_custom_ttl(self):
        """Test that translation cache supports custom TTL for live features."""
        cache = TranslationCacheService()

        # Verify store_translation method accepts ttl_seconds
        import inspect
        sig = inspect.signature(cache.store_translation)

        assert 'ttl_seconds' in sig.parameters, \
            "Translation cache should support custom TTL for live features"

        assert 'channel_id' in sig.parameters, \
            "Translation cache should support channel-specific caching"

    @pytest.mark.asyncio
    async def test_predictive_subtitles_parameter(self):
        """Test that subtitle pipeline supports predictive subtitles."""
        service = LiveTranslationService()

        import inspect
        sig = inspect.signature(service.process_live_audio_to_subtitles)

        assert 'enable_predictive_subtitles' in sig.parameters, \
            "Subtitle pipeline should support predictive subtitles feature"

        # Default should be enabled
        param = sig.parameters['enable_predictive_subtitles']
        assert param.default is True, \
            "Predictive subtitles should be enabled by default"

    def test_percentile_calculation_method_exists(self):
        """Test that live dubbing service has percentile calculation."""
        from app.services.live_dubbing_service import LiveDubbingService

        # Verify the service has the percentile calculation method
        assert hasattr(LiveDubbingService, '_calculate_percentile'), \
            "LiveDubbingService should have _calculate_percentile method"

    def test_latency_report_enhanced_fields(self):
        """Test that LatencyReport model has enhanced fields."""
        from app.models.live_dubbing import LatencyReport

        # Check enhanced fields exist (optional for backward compatibility)
        import inspect
        sig = inspect.signature(LatencyReport)
        params = sig.parameters

        # Percentile fields
        assert 'p50_stt_ms' in params, "LatencyReport should have p50_stt_ms"
        assert 'p95_stt_ms' in params, "LatencyReport should have p95_stt_ms"
        assert 'p99_stt_ms' in params, "LatencyReport should have p99_stt_ms"

        # Network metrics
        assert 'avg_network_upload_ms' in params, "LatencyReport should track upload latency"
        assert 'avg_network_roundtrip_ms' in params, "LatencyReport should track roundtrip latency"

        # Provider info
        assert 'translation_provider' in params, "LatencyReport should track provider"
        assert 'translation_cache_hit_rate' in params, "LatencyReport should track cache performance"

    def test_dubbing_metrics_percentile_fields(self):
        """Test that DubbingMetrics has percentile tracking."""
        from app.models.live_dubbing import DubbingMetrics

        metrics = DubbingMetrics()

        # Verify percentile fields exist
        assert hasattr(metrics, 'p50_stt_latency_ms'), "Should track p50 STT latency"
        assert hasattr(metrics, 'p95_stt_latency_ms'), "Should track p95 STT latency"
        assert hasattr(metrics, 'p99_stt_latency_ms'), "Should track p99 STT latency"

        assert hasattr(metrics, 'p50_translation_latency_ms'), "Should track p50 translation latency"
        assert hasattr(metrics, 'p95_translation_latency_ms'), "Should track p95 translation latency"

        # Network metrics
        assert hasattr(metrics, 'avg_network_upload_latency_ms'), "Should track network upload"
        assert hasattr(metrics, 'avg_network_roundtrip_latency_ms'), "Should track network roundtrip"

        # Cache metrics
        assert hasattr(metrics, 'translation_cache_hits'), "Should track cache hits"
        assert hasattr(metrics, 'translation_cache_misses'), "Should track cache misses"


class TestBackwardCompatibility:
    """Test backward compatibility of enhanced features."""

    def test_latency_report_required_fields_only(self):
        """Test LatencyReport can be created with just required fields."""
        from app.models.live_dubbing import LatencyReport

        # Should work with original fields only
        report = LatencyReport(
            avg_stt_ms=150,
            avg_translation_ms=30,
            avg_tts_ms=300,
            avg_total_ms=480,
            segments_processed=10
        )

        assert report.avg_stt_ms == 150
        assert report.avg_total_ms == 480

        # Enhanced fields should be None (optional)
        assert report.p50_stt_ms is None
        assert report.translation_provider is None

    def test_latency_report_with_enhanced_fields(self):
        """Test LatencyReport with enhanced fields."""
        from app.models.live_dubbing import LatencyReport

        report = LatencyReport(
            avg_stt_ms=150,
            avg_translation_ms=30,
            avg_tts_ms=300,
            avg_total_ms=480,
            segments_processed=10,
            # Enhanced fields
            p50_stt_ms=140,
            p95_stt_ms=180,
            p99_stt_ms=200,
            avg_network_roundtrip_ms=40,
            translation_provider="google",
            translation_cache_hit_rate=0.85
        )

        assert report.p50_stt_ms == 140
        assert report.p95_stt_ms == 180
        assert report.translation_provider == "google"
        assert report.translation_cache_hit_rate == 0.85


class TestCacheOptimization:
    """Test translation cache optimizations."""

    @pytest.mark.asyncio
    async def test_cache_key_generation_with_channel(self):
        """Test cache keys are unique per channel."""
        cache = TranslationCacheService()

        key1 = cache._generate_cache_key("Hello", "en", "es")
        key2 = cache._generate_cache_key("Hello", "en", "es", channel_id="channel-1")
        key3 = cache._generate_cache_key("Hello", "en", "es", channel_id="channel-2")

        # Same text, different channels = different keys
        assert key2 != key3, "Different channels should have different cache keys"

        # Without channel vs with channel = different keys
        assert key1 != key2, "Global vs channel-specific should have different keys"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
