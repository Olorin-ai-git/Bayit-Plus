"""
LLM Resilience - Robust error handling, retries, and timeouts for LLM calls.

This module wraps LLM invocations with resilience patterns:
- Configurable timeouts to prevent hanging calls
- Retry logic with exponential backoff for transient errors
- Comprehensive error logging with context
- Graceful fallback for specific error types
"""

import asyncio
import os
import time
from typing import Any, Dict, List, Optional
from datetime import datetime

from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.runnables.config import RunnableConfig

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LLMInvocationConfig:
    """Configuration for LLM invocation resilience."""

    def __init__(self):
        """Load configuration from environment."""
        # Timeout configuration (in seconds)
        self.llm_timeout = int(os.getenv(
            'LLM_TIMEOUT_SECONDS',
            '60'  # 60 second default timeout
        ))

        # Retry configuration
        self.max_retries = int(os.getenv(
            'LLM_MAX_RETRIES',
            '3'  # 3 retry attempts by default
        ))

        self.initial_retry_delay = float(os.getenv(
            'LLM_RETRY_DELAY_SECONDS',
            '1.0'  # 1 second initial delay
        ))

        self.retry_backoff_multiplier = float(os.getenv(
            'LLM_RETRY_BACKOFF_MULTIPLIER',
            '2.0'  # Exponential backoff: 1s, 2s, 4s, 8s, ...
        ))

        self.max_retry_delay = float(os.getenv(
            'LLM_MAX_RETRY_DELAY_SECONDS',
            '30.0'  # Max 30 seconds between retries
        ))

        # Log configuration
        logger.info(f"🛡️ LLM Resilience Configuration:")
        logger.info(f"   Timeout: {self.llm_timeout}s")
        logger.info(f"   Max Retries: {self.max_retries}")
        logger.info(f"   Initial Retry Delay: {self.initial_retry_delay}s")
        logger.info(f"   Backoff Multiplier: {self.retry_backoff_multiplier}x")
        logger.info(f"   Max Retry Delay: {self.max_retry_delay}s")


class LLMInvocationError(Exception):
    """Base exception for LLM invocation errors."""
    pass


class LLMTimeoutError(LLMInvocationError):
    """LLM invocation exceeded timeout."""
    pass


class LLMRetryExhaustedError(LLMInvocationError):
    """All retry attempts exhausted."""
    pass


def _extract_llm_metadata(response: AIMessage) -> Dict[str, Any]:
    """
    Extract metadata from LLM response (model, tokens, etc.).

    Args:
        response: AIMessage from LLM invocation

    Returns:
        Dictionary with extracted metadata
    """
    metadata = {
        "model": "unknown",
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0
    }

    # Safety check: ensure response is not None
    if response is None:
        logger.warning("LLM response is None, returning default metadata")
        return metadata

    try:
        # Extract model from response
        # Different providers store model in different places
        if hasattr(response, 'response_metadata'):
            response_meta = response.response_metadata
            
            # Safety check: ensure response_meta is a dict
            if response_meta is None or not isinstance(response_meta, dict):
                return metadata

            # OpenAI format
            if 'model' in response_meta:
                metadata['model'] = response_meta['model']
            elif 'model_name' in response_meta:
                metadata['model'] = response_meta['model_name']

            # Extract token counts - OpenAI format
            if 'token_usage' in response_meta:
                token_usage = response_meta['token_usage']
                if token_usage is not None and isinstance(token_usage, dict):
                    metadata['input_tokens'] = token_usage.get('prompt_tokens', 0)
                    metadata['output_tokens'] = token_usage.get('completion_tokens', 0)
                    metadata['total_tokens'] = token_usage.get('total_tokens', 0)

            # Extract token counts - Anthropic format
            elif 'usage' in response_meta:
                usage = response_meta['usage']
                if usage is not None and isinstance(usage, dict):
                    metadata['input_tokens'] = usage.get('input_tokens', 0)
                    metadata['output_tokens'] = usage.get('output_tokens', 0)
                    metadata['total_tokens'] = (
                        usage.get('input_tokens', 0) + usage.get('output_tokens', 0)
                    )

        # Fallback: try additional_kwargs (some providers use this)
        elif hasattr(response, 'additional_kwargs'):
            additional = response.additional_kwargs
            
            # Safety check: ensure additional_kwargs is a dict
            if additional is None or not isinstance(additional, dict):
                return metadata

            if 'model' in additional:
                metadata['model'] = additional['model']

            if 'usage' in additional:
                usage = additional['usage']
                if usage is not None and isinstance(usage, dict):
                    metadata['input_tokens'] = usage.get('input_tokens', 0) or usage.get('prompt_tokens', 0)
                    metadata['output_tokens'] = usage.get('output_tokens', 0) or usage.get('completion_tokens', 0)
                    metadata['total_tokens'] = usage.get('total_tokens', 0) or (
                        metadata['input_tokens'] + metadata['output_tokens']
                    )

        # Calculate total if not provided
        if metadata['total_tokens'] == 0 and (metadata['input_tokens'] or metadata['output_tokens']):
            metadata['total_tokens'] = metadata['input_tokens'] + metadata['output_tokens']

    except Exception as e:
        # Silently fail metadata extraction - don't break on metadata issues
        logger.debug(f"Failed to extract LLM metadata: {str(e)}")

    return metadata


def _is_retryable_error(error: Exception) -> bool:
    """
    Determine if an error is transient and retryable.

    Args:
        error: Exception to check

    Returns:
        True if error is retryable, False otherwise
    """
    error_str = str(error).lower()
    error_type = type(error).__name__.lower()

    # Retryable error patterns (transient errors)
    retryable_patterns = [
        # Network/connection errors
        "connection", "timeout", "timed out", "connectionerror",
        "connectionreseterror", "connectionrefusederror",

        # Rate limiting
        "rate limit", "ratelimit", "too many requests", "429",

        # Service unavailable
        "service unavailable", "503", "502", "504",
        "temporarily unavailable", "server error",

        # API errors (transient)
        "internal server error", "500", "overloaded",

        # Temporary failures
        "try again", "retry", "temporary"
    ]

    # Check if error matches any retryable pattern
    for pattern in retryable_patterns:
        if pattern in error_str or pattern in error_type:
            return True

    # Non-retryable error patterns (permanent errors)
    non_retryable_patterns = [
        # Context/token limit errors (cannot be fixed by retrying)
        "context_length_exceeded", "maximum context length",
        "token limit", "tokens exceeded",

        # Authentication/authorization errors
        "unauthorized", "forbidden", "authentication", "invalid api key",
        "api key", "permission denied",

        # Model not found errors
        "not_found_error", "model not found", "notfounderror",
        "invalid model",

        # Bad request errors (malformed input)
        "bad request", "invalid request", "validation error",
        "malformed", "invalid input"
    ]

    for pattern in non_retryable_patterns:
        if pattern in error_str or pattern in error_type:
            return False

    # Default to retryable for unknown errors (conservative approach)
    return True


async def invoke_llm_with_resilience(
    llm_with_tools: Any,
    messages: List[BaseMessage],
    config: Optional[RunnableConfig] = None,
    extra_headers: Optional[Dict] = None,
    investigation_id: Optional[str] = None,
    resilience_config: Optional[LLMInvocationConfig] = None
) -> AIMessage:
    """
    Invoke LLM with robust error handling, retries, and timeout.

    This function wraps LLM invocation with resilience patterns:
    - Configurable timeout to prevent hanging calls
    - Exponential backoff retry for transient errors
    - Comprehensive error logging with context
    - Graceful error recovery

    Args:
        llm_with_tools: LLM instance with bound tools
        messages: Messages to send to LLM
        config: Runnable configuration
        extra_headers: Additional headers for LLM call
        investigation_id: Investigation ID for logging context
        resilience_config: Resilience configuration (uses defaults if None)

    Returns:
        AIMessage from LLM

    Raises:
        LLMTimeoutError: If invocation exceeds timeout
        LLMRetryExhaustedError: If all retry attempts exhausted
        LLMInvocationError: For other unrecoverable errors
    """
    # Use default config if not provided
    if resilience_config is None:
        resilience_config = LLMInvocationConfig()

    # Prepare logging context
    log_prefix = f"[Investigation={investigation_id}]" if investigation_id else ""

    # Track overall timing
    overall_start_time = time.time()

    # Attempt invocation with retries
    last_error = None
    for attempt in range(resilience_config.max_retries + 1):  # +1 for initial attempt
        try:
            # Calculate retry delay for this attempt (skip delay on first attempt)
            if attempt > 0:
                # Exponential backoff: delay = initial_delay * (multiplier ^ (attempt - 1))
                delay = min(
                    resilience_config.initial_retry_delay * (
                        resilience_config.retry_backoff_multiplier ** (attempt - 1)
                    ),
                    resilience_config.max_retry_delay
                )

                logger.info(
                    f"🔄 {log_prefix} LLM Retry {attempt}/{resilience_config.max_retries}: "
                    f"Waiting {delay:.1f}s before retry"
                )
                await asyncio.sleep(delay)

            # Log attempt
            attempt_start_time = time.time()
            logger.info(
                f"🤖 {log_prefix} LLM Invocation Attempt {attempt + 1}/{resilience_config.max_retries + 1}"
            )
            logger.debug(
                f"   Timeout: {resilience_config.llm_timeout}s, "
                f"Messages: {len(messages)}, "
                f"Estimated chars: {sum(len(str(m.content)) for m in messages if hasattr(m, 'content'))}"
            )

            # Invoke LLM with timeout
            try:
                response = await asyncio.wait_for(
                    llm_with_tools.ainvoke(
                        messages,
                        config=config,
                        extra_headers=extra_headers or {}
                    ),
                    timeout=resilience_config.llm_timeout
                )

                # Success - log metrics and return
                attempt_duration = time.time() - attempt_start_time
                overall_duration = time.time() - overall_start_time

                # Extract metadata from response (model, tokens, etc.)
                metadata = _extract_llm_metadata(response)

                # Log comprehensive success metrics (B2: Always log even when show_llm=false)
                logger.info(
                    f"✅ {log_prefix} LLM Invocation Successful: "
                    f"Attempt={attempt + 1}, "
                    f"Duration={attempt_duration:.2f}s, "
                    f"Total={overall_duration:.2f}s"
                )

                # Log detailed metadata (model, tokens, latency)
                logger.info(
                    f"📊 {log_prefix} LLM Metadata: "
                    f"Model={metadata['model']}, "
                    f"InputTokens={metadata['input_tokens']}, "
                    f"OutputTokens={metadata['output_tokens']}, "
                    f"TotalTokens={metadata['total_tokens']}, "
                    f"Latency={attempt_duration * 1000:.0f}ms"
                )

                return response

            except asyncio.TimeoutError:
                # Timeout occurred
                attempt_duration = time.time() - attempt_start_time
                error_msg = (
                    f"LLM invocation exceeded timeout of {resilience_config.llm_timeout}s "
                    f"(attempt {attempt + 1}, duration {attempt_duration:.2f}s)"
                )

                logger.error(f"⏱️ {log_prefix} {error_msg}")

                # Treat timeout as retryable error
                last_error = LLMTimeoutError(error_msg)

                # If not last attempt, continue to retry
                if attempt < resilience_config.max_retries:
                    logger.info(f"🔄 {log_prefix} Timeout is retryable, will retry...")
                    continue
                else:
                    # Last attempt - raise timeout error
                    raise last_error

        except LLMTimeoutError:
            # Re-raise timeout errors (already handled above)
            raise

        except Exception as e:
            # Handle other LLM errors
            attempt_duration = time.time() - attempt_start_time
            error_type = type(e).__name__
            error_details = str(e)

            # Check if error is retryable
            is_retryable = _is_retryable_error(e)

            logger.error(
                f"❌ {log_prefix} LLM Invocation Error: "
                f"Type={error_type}, "
                f"Retryable={is_retryable}, "
                f"Attempt={attempt + 1}, "
                f"Duration={attempt_duration:.2f}s"
            )
            logger.error(f"   Error details: {error_details}")

            # Store error for potential re-raise
            last_error = e

            # If not retryable or last attempt, raise error
            if not is_retryable or attempt >= resilience_config.max_retries:
                if attempt >= resilience_config.max_retries:
                    # All retries exhausted
                    overall_duration = time.time() - overall_start_time
                    error_msg = (
                        f"LLM invocation failed after {attempt + 1} attempts "
                        f"(total duration {overall_duration:.2f}s). "
                        f"Last error: {error_type}: {error_details}"
                    )
                    logger.error(f"🚫 {log_prefix} {error_msg}")
                    raise LLMRetryExhaustedError(error_msg) from e
                else:
                    # Non-retryable error
                    logger.error(f"🚫 {log_prefix} Error is not retryable, aborting")
                    raise LLMInvocationError(f"{error_type}: {error_details}") from e

            # Error is retryable and we have retries left
            logger.info(f"🔄 {log_prefix} Error is retryable, will retry...")
            continue

    # Should never reach here, but handle edge case
    overall_duration = time.time() - overall_start_time
    error_msg = (
        f"LLM invocation failed after {resilience_config.max_retries + 1} attempts "
        f"(total duration {overall_duration:.2f}s)"
    )
    logger.error(f"🚫 {log_prefix} {error_msg}")

    if last_error:
        raise LLMRetryExhaustedError(error_msg) from last_error
    else:
        raise LLMRetryExhaustedError(error_msg)


def get_llm_resilience_config() -> LLMInvocationConfig:
    """
    Get the global LLM resilience configuration.

    Returns:
        LLMInvocationConfig instance
    """
    return LLMInvocationConfig()
