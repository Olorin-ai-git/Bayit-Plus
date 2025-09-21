"""
LLM Invoker

Handles LLM invocation and error handling for tool execution.
"""

import time
from typing import List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LLMInvoker:
    """Handles LLM invocation with comprehensive error handling."""

    def __init__(self, llm_with_tools):
        """Initialize with LLM instance."""
        self.llm_with_tools = llm_with_tools

    async def invoke_llm_with_error_handling(self, messages: List, tool_execution_attempts: int):
        """Invoke LLM with comprehensive error handling."""
        start_time = time.time()

        try:
            response = await self.llm_with_tools.ainvoke(messages)
            return response
        except Exception as e:
            llm_duration = time.time() - start_time
            model_info = self._get_model_info()

            self._handle_llm_error(e, model_info, messages, tool_execution_attempts)
            raise e

    def _get_model_info(self) -> str:
        """Get model information for error reporting."""
        try:
            from app.service.llm_manager import get_llm_manager
            llm_manager = get_llm_manager()
            return llm_manager.selected_model_id if hasattr(llm_manager, 'selected_model_id') else "unknown"
        except:
            return "unknown"

    def _handle_llm_error(self, error: Exception, model_info: str, messages: List, tool_execution_attempts: int):
        """Handle different types of LLM errors."""
        error_str = str(error).lower()

        if any(keyword in error_str for keyword in ["context_length_exceeded", "maximum context length", "token limit"]):
            logger.error(f"❌ LLM context length exceeded in tool execution")
            logger.error(f"   Model: {model_info}")
            logger.error(f"   Tool execution attempts: {tool_execution_attempts}/4")

        elif any(keyword in error_str for keyword in ["not_found_error", "notfounderror", "model:"]):
            logger.error(f"❌ LLM model not found in tool execution")
            logger.error(f"   Model: {model_info}")

        elif any(provider in error_str for provider in ["openai", "anthropic", "google"]):
            logger.error(f"❌ LLM API error in tool execution")
            logger.error(f"   Model: {model_info}")

        else:
            logger.error(f"❌ Unexpected error in tool execution LLM call")
            logger.error(f"   Model: {model_info}")