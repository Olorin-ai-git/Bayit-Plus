"""
LLM Instrumentation Layer

Wraps LLM calls to capture prompts, responses, latency, and settings.
"""

import time
from typing import Any
from langchain_core.language_model import LanguageModel
from app.service.logging.llm_callback_handler import InstrumentationCallbackHandler


class InstrumentedLanguageModel:
    """Wraps a language model to instrument all calls."""

    def __init__(self, llm: LanguageModel, instrumentation_logger, agent_name: str):
        self.llm = llm
        self.logger = instrumentation_logger
        self.agent_name = agent_name
        self.call_count = 0
        self.callback_handler = InstrumentationCallbackHandler(
            instrumentation_logger, agent_name
        )

    def invoke(
        self,
        input_str: str,
        temperature: float = 0.1,  # Low temperature for consistent results
        max_tokens: int = 2048,
        **kwargs
    ) -> str:
        """Invoke LLM with instrumentation."""
        start_time = time.time()
        self.call_count += 1

        try:
            response = self.llm.invoke(
                input_str,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )

            latency_ms = (time.time() - start_time) * 1000
            response_text = response.content if hasattr(response, "content") else str(response)

            self.logger.log_llm_interaction(
                agent_name=self.agent_name,
                llm_model=self.llm.__class__.__name__,
                prompt=input_str,
                response=response_text,
                tokens_used=0,
                latency_ms=latency_ms,
                temperature=temperature,
                max_tokens=max_tokens
            )

            self.logger.log_event(
                event_type="llm_call",
                agent_name=self.agent_name,
                description=f"LLM call #{self.call_count}",
                details={
                    "latency_ms": latency_ms,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_length": len(response_text)
                }
            )

            return response_text
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            self.logger.log_error(
                agent_name=self.agent_name,
                error_type="llm_invocation_error",
                error_message=str(e),
                context={
                    "call_number": self.call_count,
                    "latency_ms": latency_ms,
                    "input_length": len(input_str)
                }
            )
            raise

    async def ainvoke(
        self,
        input_str: str,
        temperature: float = 0.1,  # Low temperature for consistent results
        max_tokens: int = 2048,
        **kwargs
    ) -> str:
        """Async invoke LLM with instrumentation."""
        start_time = time.time()
        self.call_count += 1

        try:
            response = await self.llm.ainvoke(
                input_str,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )

            latency_ms = (time.time() - start_time) * 1000
            response_text = response.content if hasattr(response, "content") else str(response)

            self.logger.log_llm_interaction(
                agent_name=self.agent_name,
                llm_model=self.llm.__class__.__name__,
                prompt=input_str,
                response=response_text,
                tokens_used=0,
                latency_ms=latency_ms,
                temperature=temperature,
                max_tokens=max_tokens
            )

            self.logger.log_event(
                event_type="llm_call",
                agent_name=self.agent_name,
                description=f"Async LLM call #{self.call_count}",
                details={
                    "latency_ms": latency_ms,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_length": len(response_text)
                }
            )

            return response_text
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            self.logger.log_error(
                agent_name=self.agent_name,
                error_type="llm_async_invocation_error",
                error_message=str(e),
                context={
                    "call_number": self.call_count,
                    "latency_ms": latency_ms,
                    "input_length": len(input_str)
                }
            )
            raise

    def __getattr__(self, name: str) -> Any:
        """Delegate unknown attributes to underlying LLM"""
        return getattr(self.llm, name)
