"""
LLM Privacy Wrapper for DPA Compliance.

Intercepts all LLM invocations to:
1. Validate sub-processor is approved (Anthropic, OpenAI only per DPA Section 6)
2. Obfuscate PII before transmission (per DPA Section 9.4)
3. Log all transmissions for audit (per DPA Annex 1 Section 2.7)
4. De-obfuscate responses for internal processing
"""

import os
from typing import Any, Dict, List, Optional, Tuple

from langchain_core.messages import BaseMessage

from app.service.logging import get_bridge_logger
from app.service.privacy.audit_logger import (
    DataAccessType,
    DataCategory,
    get_privacy_audit_logger,
)
from app.service.privacy.pii_obfuscator import ObfuscationContext, get_pii_obfuscator

logger = get_bridge_logger(__name__)


# Approved sub-processors per DPA Section 6
APPROVED_SUBPROCESSORS = {"anthropic", "openai"}

# Unapproved providers that should be blocked
BLOCKED_PROVIDERS = {"google", "gemini"}


class DPAComplianceError(Exception):
    """Raised when DPA compliance requirements are violated."""

    pass


class LLMPrivacyWrapper:
    """
    Wrapper that enforces DPA compliance for all LLM invocations.

    Per DPA Section 9.4: "Contractor shall anonymize or irreversibly
    de-identify Personal Data prior to processing."
    """

    def __init__(self, enable_obfuscation: bool = True):
        """
        Initialize the privacy wrapper.

        Args:
            enable_obfuscation: Whether to enable PII obfuscation (default True)
        """
        self._obfuscator = get_pii_obfuscator()
        self._audit_logger = get_privacy_audit_logger()
        self._enable_obfuscation = enable_obfuscation or os.getenv(
            "ENABLE_PII_OBFUSCATION", "true"
        ).lower() == "true"
        self._strict_mode = os.getenv(
            "DPA_STRICT_MODE", "true"
        ).lower() == "true"

        logger.info(
            f"LLMPrivacyWrapper initialized: obfuscation={self._enable_obfuscation}, "
            f"strict_mode={self._strict_mode}"
        )

    def validate_provider(self, provider: str) -> bool:
        """
        Validate that the LLM provider is approved per DPA Section 6.

        Args:
            provider: Provider name (e.g., "anthropic", "openai", "google")

        Returns:
            True if provider is approved

        Raises:
            DPAComplianceError: If provider is not approved and strict mode is enabled
        """
        provider_lower = provider.lower()

        if provider_lower in BLOCKED_PROVIDERS:
            msg = (
                f"[DPA_VIOLATION] Provider '{provider}' is not approved. "
                f"Approved sub-processors per DPA Section 6: {APPROVED_SUBPROCESSORS}"
            )
            logger.error(msg)

            if self._strict_mode:
                raise DPAComplianceError(msg)
            return False

        if provider_lower not in APPROVED_SUBPROCESSORS:
            logger.warning(
                f"[DPA_WARNING] Provider '{provider}' not in approved list: "
                f"{APPROVED_SUBPROCESSORS}"
            )
            if self._strict_mode:
                raise DPAComplianceError(
                    f"Provider '{provider}' not in approved sub-processors list"
                )
            return False

        return True

    def prepare_messages_for_llm(
        self,
        messages: List[BaseMessage],
        provider: str,
        model_name: str,
        investigation_id: Optional[str] = None,
    ) -> Tuple[List[BaseMessage], ObfuscationContext]:
        """
        Prepare messages for LLM transmission with DPA compliance.

        Args:
            messages: Original messages to send
            provider: LLM provider name
            model_name: Specific model name
            investigation_id: Optional investigation ID for correlation

        Returns:
            Tuple of (obfuscated_messages, context)
        """
        # Validate provider
        self.validate_provider(provider)

        # Create obfuscation context
        context = ObfuscationContext()

        if not self._enable_obfuscation:
            logger.debug("[PII] Obfuscation disabled, passing messages through")
            return messages, context

        # Obfuscate all messages
        obfuscated_messages, context = self._obfuscator.obfuscate_messages(
            messages, context
        )

        # Get PII types that were obfuscated
        pii_types = list(context.counters.keys())

        # Log the transmission for audit
        self._audit_logger.log_llm_transmission(
            model_provider=provider,
            model_name=model_name,
            investigation_id=investigation_id,
            pii_types_obfuscated=pii_types,
            message_count=len(messages),
            context_id=context.context_id,
        )

        logger.info(
            f"[DPA_COMPLIANT] Prepared {len(messages)} messages for {provider}/{model_name}, "
            f"obfuscated PII types: {pii_types}, context: {context.context_id}"
        )

        return obfuscated_messages, context

    def process_llm_response(
        self,
        response_content: str,
        context: ObfuscationContext,
        deobfuscate: bool = False,
    ) -> str:
        """
        Process LLM response, optionally de-obfuscating for internal use.

        Args:
            response_content: Raw response from LLM
            context: Obfuscation context from the request
            deobfuscate: Whether to restore original PII values

        Returns:
            Processed response content
        """
        if not deobfuscate or not self._enable_obfuscation:
            return response_content

        # De-obfuscate for internal processing only
        deobfuscated = self._obfuscator.deobfuscate_text(response_content, context)

        logger.debug(
            f"[PII] De-obfuscated response in context {context.context_id}"
        )

        return deobfuscated

    def create_entity_hash(self, entity_value: str) -> str:
        """Create audit-safe hash of entity value."""
        return self._obfuscator.create_audit_hash(entity_value)


# Global singleton
_privacy_wrapper: Optional[LLMPrivacyWrapper] = None


def get_llm_privacy_wrapper() -> LLMPrivacyWrapper:
    """Get the global LLM privacy wrapper instance."""
    global _privacy_wrapper
    if _privacy_wrapper is None:
        _privacy_wrapper = LLMPrivacyWrapper()
    return _privacy_wrapper
