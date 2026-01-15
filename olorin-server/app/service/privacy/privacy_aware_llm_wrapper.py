"""
Privacy-Aware LLM Wrapper

Wraps any LangChain LLM to automatically obfuscate PII in all messages.
Ensures DPA Section 9.4 compliance for ALL LLM invocations.

This wrapper intercepts .invoke() and .ainvoke() calls to apply PII obfuscation
regardless of which code path invokes the LLM.
"""

import os
from typing import Any, Dict, List, Optional

from langchain_core.language_models.base import BaseLanguageModel
from langchain_core.messages import BaseMessage

from app.service.logging import get_bridge_logger
from app.service.privacy.llm_privacy_wrapper import (
    DPAComplianceError,
    get_llm_privacy_wrapper,
)
from app.service.privacy.pii_obfuscator import ObfuscationContext

logger = get_bridge_logger(__name__)


class PrivacyAwareLLMWrapper:
    """
    Wraps any LLM to automatically apply PII obfuscation.

    This wrapper ensures that ALL invocations (direct .ainvoke() or .invoke())
    automatically obfuscate PII before sending to the LLM per DPA Section 9.4.

    Usage:
        raw_llm = ChatAnthropic(...)
        safe_llm = PrivacyAwareLLMWrapper(
            llm=raw_llm,
            provider="anthropic",
            model_name="claude-3-5-sonnet-20241022"
        )
        # All calls now automatically obfuscate PII
        response = await safe_llm.ainvoke(messages)
    """

    def __init__(
        self,
        llm: BaseLanguageModel,
        provider: str,
        model_name: str,
        investigation_id: Optional[str] = None,
        strict_mode: Optional[bool] = None,
    ):
        """
        Initialize privacy-aware wrapper.

        Args:
            llm: The underlying LLM to wrap
            provider: Provider name (anthropic, openai, google)
            model_name: Model identifier
            investigation_id: Optional investigation ID for audit correlation
            strict_mode: Override strict mode setting from environment
        """
        self._llm = llm
        self._provider = provider
        self._model_name = model_name
        self._investigation_id = investigation_id
        self._privacy_wrapper = get_llm_privacy_wrapper()

        # Determine strict mode
        if strict_mode is not None:
            self._strict_mode = strict_mode
        else:
            self._strict_mode = (
                os.getenv("LLM_PRIVACY_STRICT_MODE", "true").lower() == "true"
            )

        logger.info(
            f"[PRIVACY_WRAPPER] Initialized for {provider}/{model_name} "
            f"(strict={self._strict_mode})"
        )

    async def ainvoke(
        self,
        input: Any,
        config: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> Any:
        """
        Async invoke with automatic PII obfuscation.

        Args:
            input: Messages or input to send (supports both list and single message)
            config: Optional configuration
            **kwargs: Additional arguments

        Returns:
            LLM response

        Raises:
            DPAComplianceError: If provider is blocked and strict mode enabled
        """
        # Normalize input to list of messages
        messages = self._normalize_input(input)

        # Apply PII obfuscation through privacy wrapper
        try:
            obfuscated_messages, obfuscation_context = (
                self._privacy_wrapper.prepare_messages_for_llm(
                    messages=messages,
                    provider=self._provider,
                    model_name=self._model_name,
                    investigation_id=self._investigation_id,
                    strict_mode=self._strict_mode,
                )
            )

            logger.debug(
                f"[PRIVACY_WRAPPER] Obfuscated {len(messages)} messages "
                f"(context={obfuscation_context.context_id})"
            )

        except DPAComplianceError as e:
            if self._strict_mode:
                logger.error(f"[DPA_VIOLATION] Blocked LLM invocation: {e}")
                raise
            else:
                # Non-strict mode: log warning but allow call
                logger.warning(
                    f"[DPA_WARNING] Provider validation failed but strict mode disabled: {e}"
                )
                obfuscated_messages = messages

        # Invoke underlying LLM with obfuscated messages
        return await self._llm.ainvoke(obfuscated_messages, config=config, **kwargs)

    def invoke(
        self,
        input: Any,
        config: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> Any:
        """
        Sync invoke with automatic PII obfuscation.

        Args:
            input: Messages or input to send
            config: Optional configuration
            **kwargs: Additional arguments

        Returns:
            LLM response

        Raises:
            DPAComplianceError: If provider is blocked and strict mode enabled
        """
        # Normalize input to list of messages
        messages = self._normalize_input(input)

        # Apply PII obfuscation through privacy wrapper
        try:
            obfuscated_messages, obfuscation_context = (
                self._privacy_wrapper.prepare_messages_for_llm(
                    messages=messages,
                    provider=self._provider,
                    model_name=self._model_name,
                    investigation_id=self._investigation_id,
                    strict_mode=self._strict_mode,
                )
            )

            logger.debug(
                f"[PRIVACY_WRAPPER] Obfuscated {len(messages)} messages "
                f"(context={obfuscation_context.context_id})"
            )

        except DPAComplianceError as e:
            if self._strict_mode:
                logger.error(f"[DPA_VIOLATION] Blocked LLM invocation: {e}")
                raise
            else:
                # Non-strict mode: log warning but allow call
                logger.warning(
                    f"[DPA_WARNING] Provider validation failed but strict mode disabled: {e}"
                )
                obfuscated_messages = messages

        # Invoke underlying LLM with obfuscated messages
        return self._llm.invoke(obfuscated_messages, config=config, **kwargs)

    def bind_tools(self, tools, **kwargs):
        """
        Bind tools to underlying LLM and return wrapped instance.

        This ensures that even after binding tools, the privacy wrapper
        continues to apply obfuscation.
        """
        bound_llm = self._llm.bind_tools(tools, **kwargs)

        # Return new wrapper around bound LLM
        return PrivacyAwareLLMWrapper(
            llm=bound_llm,
            provider=self._provider,
            model_name=self._model_name,
            investigation_id=self._investigation_id,
            strict_mode=self._strict_mode,
        )

    def with_structured_output(self, schema, **kwargs):
        """
        Configure structured output and return wrapped instance.
        """
        structured_llm = self._llm.with_structured_output(schema, **kwargs)

        # Return new wrapper around structured LLM
        return PrivacyAwareLLMWrapper(
            llm=structured_llm,
            provider=self._provider,
            model_name=self._model_name,
            investigation_id=self._investigation_id,
            strict_mode=self._strict_mode,
        )

    async def astream(self, input: Any, config: Optional[Dict[str, Any]] = None, **kwargs):
        """
        Async streaming with automatic PII obfuscation.
        """
        messages = self._normalize_input(input)

        try:
            obfuscated_messages, _ = (
                self._privacy_wrapper.prepare_messages_for_llm(
                    messages=messages,
                    provider=self._provider,
                    model_name=self._model_name,
                    investigation_id=self._investigation_id,
                    strict_mode=self._strict_mode,
                )
            )
        except DPAComplianceError as e:
            if self._strict_mode:
                raise
            obfuscated_messages = messages

        async for chunk in self._llm.astream(obfuscated_messages, config=config, **kwargs):
            yield chunk

    def _normalize_input(self, input: Any) -> List[BaseMessage]:
        """
        Normalize various input formats to list of BaseMessage.

        Args:
            input: Input in various formats (list, dict, str, BaseMessage)

        Returns:
            List of BaseMessage objects
        """
        if isinstance(input, list):
            return input
        elif isinstance(input, BaseMessage):
            return [input]
        elif isinstance(input, dict):
            # Handle dict format (e.g., from LangGraph)
            if "messages" in input:
                return input["messages"]
            else:
                # Try to convert dict to message
                from langchain_core.messages import HumanMessage
                return [HumanMessage(content=str(input))]
        elif isinstance(input, str):
            from langchain_core.messages import HumanMessage
            return [HumanMessage(content=input)]
        else:
            # Last resort: convert to string
            from langchain_core.messages import HumanMessage
            return [HumanMessage(content=str(input))]

    def __getattr__(self, name: str) -> Any:
        """
        Delegate all other attributes to underlying LLM.

        This allows the wrapper to be transparent for most operations.
        """
        return getattr(self._llm, name)


def wrap_llm_with_privacy(
    llm: BaseLanguageModel,
    provider: str,
    model_name: str,
    investigation_id: Optional[str] = None,
) -> PrivacyAwareLLMWrapper:
    """
    Convenience function to wrap an LLM with privacy protection.

    Args:
        llm: LLM to wrap
        provider: Provider name (anthropic, openai, google)
        model_name: Model identifier
        investigation_id: Optional investigation ID

    Returns:
        Privacy-wrapped LLM
    """
    return PrivacyAwareLLMWrapper(
        llm=llm,
        provider=provider,
        model_name=model_name,
        investigation_id=investigation_id,
    )
