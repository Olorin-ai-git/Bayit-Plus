"""
Async Helper Utilities for LangChain Tools

Provides utilities to safely run async functions from sync contexts,
handling both running event loops and creating new ones as needed.
"""

import asyncio
import functools
import threading
from typing import Any, Coroutine, TypeVar

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

T = TypeVar("T")


def safe_run_async(coro: Coroutine[Any, Any, T]) -> T:
    """
    Safely run an async coroutine from a sync context.

    Handles the case where we're already in an event loop by using
    run_until_complete, or creates a new event loop if needed.

    Args:
        coro: The coroutine to run

    Returns:
        The result of the coroutine

    Raises:
        Exception: Any exception raised by the coroutine
    """
    try:
        # Try to get the current event loop
        loop = asyncio.get_running_loop()

        # We're in an event loop - we can't use asyncio.run()
        # Instead, we need to run in a separate thread to avoid blocking
        logger.debug("Running async function in thread (event loop already running)")

        def run_in_thread():
            # Create a new event loop for this thread
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(coro)
            finally:
                new_loop.close()

        # Run in a separate thread to avoid blocking the main event loop
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_in_thread)
            return future.result(timeout=30)  # 30 second timeout

    except RuntimeError:
        # No event loop running - we can use asyncio.run()
        logger.debug("Running async function with asyncio.run (no event loop running)")
        return asyncio.run(coro)


def async_to_sync(async_func):
    """
    Decorator to convert an async function to sync with safe event loop handling.

    Args:
        async_func: The async function to wrap

    Returns:
        A sync function that safely calls the async function
    """

    @functools.wraps(async_func)
    def wrapper(*args, **kwargs):
        coro = async_func(*args, **kwargs)
        return safe_run_async(coro)

    return wrapper


def get_or_create_event_loop() -> asyncio.AbstractEventLoop:
    """
    Get the current event loop or create a new one if none exists.

    Returns:
        The current or newly created event loop
    """
    try:
        # Try to get the running loop
        return asyncio.get_running_loop()
    except RuntimeError:
        # No running loop - try to get the thread's loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Event loop is closed")
            return loop
        except RuntimeError:
            # Create a new event loop
            logger.debug("Creating new event loop")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop


def is_running_in_event_loop() -> bool:
    """
    Check if we're currently running in an async event loop.

    Returns:
        True if running in an event loop, False otherwise
    """
    try:
        asyncio.get_running_loop()
        return True
    except RuntimeError:
        return False
