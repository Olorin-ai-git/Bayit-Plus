"""
LLM Initializer

Handles LLM initialization for orchestrator with mock support.
"""

import os

from langchain_anthropic import ChatAnthropic

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LLMInitializer:
    """Handles LLM initialization with mock support for testing."""

    @staticmethod
    def initialize_llm():
        """Initialize the configured LLM for orchestration (uses environment-selected model)."""
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

        # Initialize real LLM
        try:
            from app.service.llm_manager import get_llm_manager

            llm_manager = get_llm_manager()
            llm = llm_manager.get_selected_model()
            logger.info(f"🤖 Using {type(llm)} for orchestration")
            return llm
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}, falling back to mock")
            from app.service.agent.mock_llm import MockLLM

            return MockLLM()
