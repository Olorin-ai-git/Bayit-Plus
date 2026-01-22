"""
Bulkhead Pattern
Resource isolation to prevent resource exhaustion
"""

import asyncio
from typing import Callable

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class Bulkhead:
    """
    Bulkhead pattern for resource isolation
    Limits concurrent operations to prevent resource exhaustion
    """

    def __init__(self, name: str, max_concurrent: int = 10):
        self.name = name
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active_count = 0

    async def execute(self, func: Callable, *args, **kwargs):
        """Execute function with bulkhead protection"""

        async with self.semaphore:
            self.active_count += 1
            logger.debug(
                f"Bulkhead {self.name}: Executing",
                extra={"active_count": self.active_count, "max": self.max_concurrent},
            )

            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                self.active_count -= 1
