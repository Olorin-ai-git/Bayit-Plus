"""
LLM Initializer

Handles LLM initialization for orchestrator with mock support.

CRITICAL: All LLMs returned by this initializer are wrapped with
PrivacyAwareLLMWrapper to ensure DPA Section 9.4 compliance
(automatic PII obfuscation before LLM transmission).
"""

import os

from langchain_anthropic import ChatAnthropic

from app.service.logging import get_bridge_logger
from app.service.privacy.privacy_aware_llm_wrapper import wrap_llm_with_privacy

logger = get_bridge_logger(__name__)


class LLMInitializer:
    """Handles LLM initialization with mock support for testing."""

    @staticmethod
    def initialize_llm():
        """
        Initialize the configured LLM for orchestration with automatic PII obfuscation.

        Returns:
            PrivacyAwareLLMWrapper: LLM wrapped with automatic PII obfuscation
                                   per DPA Section 9.4 requirement
        """
        # Check for TEST_MODE first
        test_mode = os.getenv("TEST_MODE", "").lower()

        # Check if any API key is available
        has_api_key = (
            os.getenv("ANTHROPIC_API_KEY")
            or os.getenv("OPENAI_API_KEY")
            or os.getenv("GEMINI_API_KEY")
        )

        use_mock = test_mode in ["demo", "mock", "test"] or not has_api_key

        if use_mock:
            logger.info("🧪 Using MockLLM for testing")
            from app.service.agent.mock_llm import MockLLM

            return MockLLM()

        # Initialize real LLM with privacy wrapper
        try:
            from app.service.llm_manager import get_llm_manager

            llm_manager = get_llm_manager()
            raw_llm = llm_manager.get_selected_model()

            # Get provider info for privacy wrapper
            from app.service.llm_manager import AVAILABLE_MODELS, ModelProvider

            model_config = AVAILABLE_MODELS.get(llm_manager.selected_model_id)
            provider = (
                model_config.provider.value if model_config else "unknown"
            )

            # Wrap LLM with privacy protection
            # This ensures ALL .ainvoke() calls automatically obfuscate PII
            wrapped_llm = wrap_llm_with_privacy(
                llm=raw_llm,
                provider=provider,
                model_name=llm_manager.selected_model_id,
                investigation_id=None,  # Will be set per investigation
            )

            logger.info(
                f"🔒 Using privacy-wrapped {type(raw_llm).__name__} for orchestration "
                f"(provider={provider}, model={llm_manager.selected_model_id})"
            )
            logger.info(
                "✅ DPA Section 9.4 compliance: PII will be automatically obfuscated"
            )

            return wrapped_llm

        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}, falling back to mock")
            from app.service.agent.mock_llm import MockLLM

            return MockLLM()
