"""Domain config: backward-compatible property aliases for olorin.* migration."""
import warnings


class BackwardCompatPropertiesMixin:
    """Deprecated @property methods delegating to settings.olorin.* during migration."""

    @property
    def webauthn_origins(self) -> list[str]:
        """Parse WebAuthn origins from comma-separated string."""
        return [
            origin.strip()
            for origin in self.WEBAUTHN_ORIGIN.split(",")
            if origin.strip()
        ]

    @property
    def MONGODB_URL(self) -> str:
        """DEPRECATED: Use MONGODB_URI instead."""
        warnings.warn(
            "MONGODB_URL is deprecated. Use MONGODB_URI instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.MONGODB_URI

    @property
    def PINECONE_API_KEY(self) -> str:
        """DEPRECATED: Use settings.olorin.pinecone.api_key"""
        warnings.warn(
            "PINECONE_API_KEY is deprecated. Use settings.olorin.pinecone.api_key instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.pinecone.api_key

    @property
    def PINECONE_ENVIRONMENT(self) -> str:
        """DEPRECATED: Use settings.olorin.pinecone.environment"""
        warnings.warn(
            "PINECONE_ENVIRONMENT is deprecated. Use settings.olorin.pinecone.environment instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.pinecone.environment

    @property
    def PINECONE_INDEX_NAME(self) -> str:
        """DEPRECATED: Use settings.olorin.pinecone.index_name"""
        warnings.warn(
            "PINECONE_INDEX_NAME is deprecated. Use settings.olorin.pinecone.index_name instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.pinecone.index_name

    @property
    def EMBEDDING_MODEL(self) -> str:
        """DEPRECATED: Use settings.olorin.embedding.model"""
        warnings.warn(
            "EMBEDDING_MODEL is deprecated. Use settings.olorin.embedding.model instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.embedding.model

    @property
    def EMBEDDING_DIMENSIONS(self) -> int:
        """DEPRECATED: Use settings.olorin.embedding.dimensions"""
        warnings.warn(
            "EMBEDDING_DIMENSIONS is deprecated. Use settings.olorin.embedding.dimensions instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.embedding.dimensions

    @property
    def DUBBING_MAX_CONCURRENT_SESSIONS(self) -> int:
        """DEPRECATED: Use settings.olorin.dubbing.max_concurrent_sessions"""
        warnings.warn(
            "DUBBING_MAX_CONCURRENT_SESSIONS is deprecated. Use settings.olorin.dubbing.max_concurrent_sessions instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.dubbing.max_concurrent_sessions

    @property
    def DUBBING_SESSION_TIMEOUT_MINUTES(self) -> int:
        """DEPRECATED: Use settings.olorin.dubbing.session_timeout_minutes"""
        warnings.warn(
            "DUBBING_SESSION_TIMEOUT_MINUTES is deprecated. Use settings.olorin.dubbing.session_timeout_minutes instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.dubbing.session_timeout_minutes

    @property
    def DUBBING_TARGET_LATENCY_MS(self) -> int:
        """DEPRECATED: Use settings.olorin.dubbing.target_latency_ms"""
        warnings.warn(
            "DUBBING_TARGET_LATENCY_MS is deprecated. Use settings.olorin.dubbing.target_latency_ms instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.dubbing.target_latency_ms

    @property
    def RECAP_MAX_CONTEXT_TOKENS(self) -> int:
        """DEPRECATED: Use settings.olorin.recap.max_context_tokens"""
        warnings.warn(
            "RECAP_MAX_CONTEXT_TOKENS is deprecated. Use settings.olorin.recap.max_context_tokens instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.recap.max_context_tokens

    @property
    def RECAP_WINDOW_DEFAULT_MINUTES(self) -> int:
        """DEPRECATED: Use settings.olorin.recap.window_default_minutes"""
        warnings.warn(
            "RECAP_WINDOW_DEFAULT_MINUTES is deprecated. Use settings.olorin.recap.window_default_minutes instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.recap.window_default_minutes

    @property
    def RECAP_SUMMARY_MAX_TOKENS(self) -> int:
        """DEPRECATED: Use settings.olorin.recap.summary_max_tokens"""
        warnings.warn(
            "RECAP_SUMMARY_MAX_TOKENS is deprecated. Use settings.olorin.recap.summary_max_tokens instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.recap.summary_max_tokens

    @property
    def CULTURAL_REFERENCE_CACHE_TTL_HOURS(self) -> int:
        """DEPRECATED: Use settings.olorin.cultural.reference_cache_ttl_hours"""
        warnings.warn(
            "CULTURAL_REFERENCE_CACHE_TTL_HOURS is deprecated. Use settings.olorin.cultural.reference_cache_ttl_hours instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.cultural.reference_cache_ttl_hours

    @property
    def CULTURAL_DETECTION_MIN_CONFIDENCE(self) -> float:
        """DEPRECATED: Use settings.olorin.cultural.detection_min_confidence"""
        warnings.warn(
            "CULTURAL_DETECTION_MIN_CONFIDENCE is deprecated. Use settings.olorin.cultural.detection_min_confidence instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.cultural.detection_min_confidence

    @property
    def PARTNER_API_KEY_SALT(self) -> str:
        """DEPRECATED: Use settings.olorin.partner.api_key_salt"""
        warnings.warn(
            "PARTNER_API_KEY_SALT is deprecated. Use settings.olorin.partner.api_key_salt instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.partner.api_key_salt

    @property
    def PARTNER_DEFAULT_RATE_LIMIT_RPM(self) -> int:
        """DEPRECATED: Use settings.olorin.partner.default_rate_limit_rpm"""
        warnings.warn(
            "PARTNER_DEFAULT_RATE_LIMIT_RPM is deprecated. Use settings.olorin.partner.default_rate_limit_rpm instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.partner.default_rate_limit_rpm

    @property
    def PARTNER_WEBHOOK_TIMEOUT_SECONDS(self) -> float:
        """DEPRECATED: Use settings.olorin.partner.webhook_timeout_seconds"""
        warnings.warn(
            "PARTNER_WEBHOOK_TIMEOUT_SECONDS is deprecated. Use settings.olorin.partner.webhook_timeout_seconds instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.partner.webhook_timeout_seconds

    @property
    def OLORIN_DUBBING_ENABLED(self) -> bool:
        """DEPRECATED: Use settings.olorin.dubbing_enabled"""
        warnings.warn(
            "OLORIN_DUBBING_ENABLED is deprecated. Use settings.olorin.dubbing_enabled instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.dubbing_enabled

    @property
    def OLORIN_SEMANTIC_SEARCH_ENABLED(self) -> bool:
        """DEPRECATED: Use settings.olorin.semantic_search_enabled"""
        warnings.warn(
            "OLORIN_SEMANTIC_SEARCH_ENABLED is deprecated. Use settings.olorin.semantic_search_enabled instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.semantic_search_enabled

    @property
    def OLORIN_CULTURAL_CONTEXT_ENABLED(self) -> bool:
        """DEPRECATED: Use settings.olorin.cultural_context_enabled"""
        warnings.warn(
            "OLORIN_CULTURAL_CONTEXT_ENABLED is deprecated. Use settings.olorin.cultural_context_enabled instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.cultural_context_enabled

    @property
    def OLORIN_RECAP_ENABLED(self) -> bool:
        """DEPRECATED: Use settings.olorin.recap_enabled"""
        warnings.warn(
            "OLORIN_RECAP_ENABLED is deprecated. Use settings.olorin.recap_enabled instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.recap_enabled
