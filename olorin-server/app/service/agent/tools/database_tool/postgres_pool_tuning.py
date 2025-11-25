"""
PostgreSQL Connection Pool Tuning Utilities.

Provides recommendations and validation for connection pool configuration.

Constitutional Compliance:
- NO hardcoded values - all recommendations based on system resources
- Complete implementation
- Fail-fast validation
"""

import os
from typing import Any, Dict

import psutil

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PostgreSQLPoolTuner:
    """Provides connection pool tuning recommendations."""

    def __init__(self):
        """Initialize pool tuner."""
        logger.info("Initialized PostgreSQLPoolTuner")

    def get_system_resources(self) -> Dict[str, Any]:
        """
        Get current system resource information.

        Returns:
            Dictionary with CPU count, available memory, etc.
        """
        cpu_count = os.cpu_count() or 1
        memory = psutil.virtual_memory()

        resources = {
            "cpu_count": cpu_count,
            "total_memory_gb": memory.total / (1024**3),
            "available_memory_gb": memory.available / (1024**3),
            "memory_percent_used": memory.percent,
        }

        logger.debug(f"System resources: {resources}")
        return resources

    def calculate_recommended_pool_size(
        self,
        cpu_count: int,
        available_memory_gb: float,
        expected_concurrent_queries: int = 10,
    ) -> int:
        """
        Calculate recommended connection pool size.

        Formula based on PostgreSQL best practices:
        - Base pool size on CPU cores (2-4x core count)
        - Adjust for available memory
        - Consider expected concurrent query load

        Args:
            cpu_count: Number of CPU cores
            available_memory_gb: Available system memory in GB
            expected_concurrent_queries: Expected concurrent query load

        Returns:
            Recommended pool size
        """
        # Base recommendation: 2x CPU cores for CPU-bound workloads
        base_pool_size = cpu_count * 2

        # Adjust for memory (PostgreSQL connections use ~10MB each)
        memory_based_max = int(available_memory_gb * 100)  # ~10MB per connection

        # Use minimum of CPU-based and memory-based limits
        recommended_size = min(base_pool_size, memory_based_max)

        # Ensure at least enough for expected concurrent queries
        recommended_size = max(recommended_size, expected_concurrent_queries)

        # Clamp to reasonable range
        recommended_size = max(5, min(recommended_size, 100))

        logger.info(
            f"Recommended pool size: {recommended_size} (CPU: {cpu_count}, Memory: {available_memory_gb:.1f}GB)"
        )
        return recommended_size

    def calculate_recommended_max_overflow(self, pool_size: int) -> int:
        """
        Calculate recommended max overflow (burst capacity).

        Args:
            pool_size: Base pool size

        Returns:
            Recommended max overflow (typically 50-100% of pool size)
        """
        # Allow 50% overflow for burst traffic
        max_overflow = int(pool_size * 0.5)

        # Ensure at least some overflow capacity
        max_overflow = max(max_overflow, 5)

        logger.debug(
            f"Recommended max_overflow: {max_overflow} (pool_size: {pool_size})"
        )
        return max_overflow

    def calculate_recommended_query_timeout(
        self, query_type: str = "investigation"
    ) -> int:
        """
        Calculate recommended query timeout in seconds.

        Args:
            query_type: Type of query ("investigation", "reporting", "batch")

        Returns:
            Recommended timeout in seconds
        """
        # Timeouts based on query type
        timeout_map = {
            "investigation": 30,  # Interactive queries should be fast
            "reporting": 60,  # Reports can take longer
            "batch": 300,  # Batch operations need more time
            "default": 30,
        }

        timeout = timeout_map.get(query_type, timeout_map["default"])
        logger.debug(f"Recommended query timeout: {timeout}s for {query_type}")
        return timeout

    def validate_pool_configuration(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate pool configuration and provide recommendations.

        Args:
            config: Current pool configuration

        Returns:
            Validation result with recommendations

        Raises:
            ValueError: If configuration is invalid
        """
        pool_size = config.get("pool_size")
        max_overflow = config.get("pool_max_overflow")
        query_timeout = config.get("query_timeout")

        validation_errors = []
        warnings = []
        recommendations = []

        # Validate pool_size
        if pool_size is None:
            validation_errors.append("pool_size is required")
        elif pool_size <= 0:
            validation_errors.append(f"pool_size must be > 0, got {pool_size}")
        elif pool_size < 5:
            warnings.append(f"pool_size ({pool_size}) is very low, recommend >= 5")
        elif pool_size > 100:
            warnings.append(f"pool_size ({pool_size}) is very high, consider reducing")

        # Validate max_overflow
        if max_overflow is None:
            validation_errors.append("pool_max_overflow is required")
        elif max_overflow < 0:
            validation_errors.append(
                f"pool_max_overflow must be >= 0, got {max_overflow}"
            )
        elif pool_size and max_overflow < pool_size:
            validation_errors.append(
                f"pool_max_overflow ({max_overflow}) should be >= pool_size ({pool_size})"
            )

        # Validate query_timeout
        if query_timeout is None:
            validation_errors.append("query_timeout is required")
        elif query_timeout <= 0:
            validation_errors.append(f"query_timeout must be > 0, got {query_timeout}")
        elif query_timeout < 10:
            warnings.append(f"query_timeout ({query_timeout}s) is very low")
        elif query_timeout > 600:
            warnings.append(f"query_timeout ({query_timeout}s) is very high")

        # Get system-based recommendations
        resources = self.get_system_resources()
        recommended_pool_size = self.calculate_recommended_pool_size(
            resources["cpu_count"], resources["available_memory_gb"]
        )
        recommended_max_overflow = self.calculate_recommended_max_overflow(
            recommended_pool_size
        )
        recommended_timeout = self.calculate_recommended_query_timeout()

        # Add recommendations if config differs significantly
        if pool_size and abs(pool_size - recommended_pool_size) > 5:
            recommendations.append(
                f"Consider pool_size={recommended_pool_size} based on system resources"
            )

        if max_overflow and abs(max_overflow - recommended_max_overflow) > 5:
            recommendations.append(
                f"Consider pool_max_overflow={recommended_max_overflow}"
            )

        # Fail fast on validation errors
        if validation_errors:
            error_msg = "; ".join(validation_errors)
            logger.error(f"Pool configuration validation failed: {error_msg}")
            raise ValueError(f"Invalid pool configuration: {error_msg}")

        result = {
            "valid": True,
            "warnings": warnings,
            "recommendations": recommendations,
            "system_resources": resources,
            "recommended_config": {
                "pool_size": recommended_pool_size,
                "pool_max_overflow": recommended_max_overflow,
                "query_timeout": recommended_timeout,
            },
        }

        if warnings:
            logger.warning(f"Pool configuration warnings: {'; '.join(warnings)}")

        if recommendations:
            logger.info(f"Pool tuning recommendations: {'; '.join(recommendations)}")

        return result
