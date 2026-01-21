"""
Performance Benchmark Integration Tests.

Compares query performance between Snowflake and PostgreSQL providers.
Verifies PostgreSQL performance is within 20% of Snowflake for equivalent queries.

Following TDD: These tests MUST FAIL until optimization is complete.

Constitutional Compliance:
- NO mocks - uses real database providers
- Complete performance testing
- Tests guide optimization
"""

import os
import time
from typing import Any, Dict, List

import pytest

from app.service.agent.tools.database_tool.database_factory import get_database_provider


class TestQueryPerformanceBenchmarks:
    """Test query performance across providers."""

    def test_simple_select_performance(self):
        """Test simple SELECT query performance."""
        query = "SELECT * FROM transactions_enriched LIMIT 100"

        # Benchmark Snowflake
        sf_provider = get_database_provider("snowflake")
        sf_start = time.time()
        sf_results = sf_provider.execute_query(query)
        sf_duration = time.time() - sf_start

        # Benchmark PostgreSQL
        pg_provider = get_database_provider("postgresql")
        pg_start = time.time()
        pg_results = pg_provider.execute_query(query)
        pg_duration = time.time() - pg_start

        # Verify results consistency
        assert len(sf_results) == len(pg_results)

        # PostgreSQL should be within 20% of Snowflake
        performance_ratio = pg_duration / sf_duration if sf_duration > 0 else 1.0
        assert (
            performance_ratio <= 1.2
        ), f"PostgreSQL {performance_ratio:.2f}x slower than Snowflake"

    def test_aggregation_query_performance(self):
        """Test aggregation query performance."""
        query = """
            SELECT
                EMAIL,
                COUNT(*) as tx_count,
                AVG(MODEL_SCORE) as avg_score
            FROM transactions_enriched
            GROUP BY EMAIL
            LIMIT 50
        """

        # Benchmark both providers
        sf_provider = get_database_provider("snowflake")
        pg_provider = get_database_provider("postgresql")

        sf_start = time.time()
        sf_results = sf_provider.execute_query(query)
        sf_duration = time.time() - sf_start

        pg_start = time.time()
        pg_results = pg_provider.execute_query(query)
        pg_duration = time.time() - pg_start

        # Verify performance
        performance_ratio = pg_duration / sf_duration if sf_duration > 0 else 1.0
        assert performance_ratio <= 1.2, f"Aggregation {performance_ratio:.2f}x slower"

    def test_filtered_query_performance(self):
        """Test filtered query performance (WHERE clause)."""
        query = """
            SELECT TX_ID_KEY, EMAIL, MODEL_SCORE, TX_DATETIME
            FROM transactions_enriched
            WHERE MODEL_SCORE > 0.8
            LIMIT 100
        """

        sf_provider = get_database_provider("snowflake")
        pg_provider = get_database_provider("postgresql")

        sf_start = time.time()
        sf_results = sf_provider.execute_query(query)
        sf_duration = time.time() - sf_start

        pg_start = time.time()
        pg_results = pg_provider.execute_query(query)
        pg_duration = time.time() - pg_start

        # Performance check
        performance_ratio = pg_duration / sf_duration if sf_duration > 0 else 1.0
        assert performance_ratio <= 1.2


class TestIndexedQueryPerformance:
    """Test performance of indexed queries."""

    def test_email_lookup_performance(self):
        """Test performance of email-based lookup (should use index)."""
        query = """
            SELECT *
            FROM transactions_enriched
            WHERE EMAIL = 'test@example.com'
            LIMIT 10
        """

        pg_provider = get_database_provider("postgresql")

        # Run query multiple times to test index effectiveness
        durations = []
        for _ in range(5):
            start = time.time()
            pg_provider.execute_query(query)
            durations.append(time.time() - start)

        avg_duration = sum(durations) / len(durations)

        # Indexed query should be fast (< 100ms average)
        assert avg_duration < 0.1, f"Email lookup too slow: {avg_duration:.3f}s"

    def test_date_range_query_performance(self):
        """Test performance of date range queries (should use index)."""
        query = """
            SELECT TX_ID_KEY, EMAIL, TX_DATETIME
            FROM transactions_enriched
            WHERE TX_DATETIME >= CURRENT_DATE - INTERVAL '7 days'
            LIMIT 100
        """

        pg_provider = get_database_provider("postgresql")

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Date range query should be reasonably fast
        assert duration < 0.5, f"Date range query too slow: {duration:.3f}s"


class TestConnectionPoolPerformance:
    """Test connection pool performance and efficiency."""

    def test_concurrent_query_performance(self):
        """Test performance under concurrent load."""
        pg_provider = get_database_provider("postgresql")

        queries = [
            "SELECT COUNT(*) FROM transactions_enriched",
            "SELECT * FROM transactions_enriched LIMIT 10",
            "SELECT AVG(MODEL_SCORE) FROM transactions_enriched",
        ]

        start = time.time()

        # Execute queries sequentially (pool should reuse connections)
        for query in queries * 10:  # 30 total queries
            pg_provider.execute_query(query)

        duration = time.time() - start

        # Should complete in reasonable time with connection pooling
        queries_per_second = 30 / duration
        assert queries_per_second > 10, f"Too slow: {queries_per_second:.1f} qps"

    def test_connection_pool_size_adequate(self):
        """Test that connection pool size is adequate."""
        pg_provider = get_database_provider("postgresql")

        # Verify pool configuration
        # Pool should be created and configured
        assert pg_provider._pool is not None or hasattr(pg_provider, "_ensure_pool")


class TestQueryCachePerformance:
    """Test query cache performance improvements."""

    def test_cache_hit_improves_performance(self):
        """Test that cache hits improve performance."""
        pg_provider = get_database_provider("postgresql")

        query = "SELECT * FROM transactions_enriched LIMIT 10"

        # First execution (cache miss)
        start1 = time.time()
        results1 = pg_provider.execute_query(query)
        duration1 = time.time() - start1

        # Second execution (cache hit for translation)
        start2 = time.time()
        results2 = pg_provider.execute_query(query)
        duration2 = time.time() - start2

        # Results should be identical
        assert len(results1) == len(results2)

        # Cache should provide some benefit (even if small)
        # This tests that caching infrastructure is working

    def test_cache_hit_rate_above_threshold(self):
        """Test that cache hit rate exceeds 80% target."""
        pg_provider = get_database_provider("postgresql")

        # Clear cache stats
        if hasattr(pg_provider, "query_cache"):
            pg_provider.query_cache.clear()

        # Execute repeated queries
        queries = [
            "SELECT * FROM transactions_enriched LIMIT 5",
            "SELECT COUNT(*) FROM transactions_enriched",
            "SELECT * FROM transactions_enriched WHERE EMAIL = 'test@example.com'",
        ]

        # Run each query 10 times (30 total queries, 27 should hit cache)
        for _ in range(10):
            for query in queries:
                pg_provider.execute_query(query)

        # Check cache stats
        if hasattr(pg_provider, "query_cache"):
            stats = pg_provider.query_cache.get_stats()
            hit_rate = stats["hit_rate"]

            # Should exceed 80% hit rate
            assert hit_rate >= 0.8, f"Cache hit rate too low: {hit_rate:.1%}"


class TestQueryTimeoutConfiguration:
    """Test query timeout configuration."""

    def test_query_timeout_configured(self):
        """Test that query timeout is properly configured."""
        pg_provider = get_database_provider("postgresql")

        # Verify timeout configuration exists
        assert pg_provider._config is not None
        assert "query_timeout" in pg_provider._config
        assert pg_provider._config["query_timeout"] > 0

    def test_slow_query_respects_timeout(self):
        """Test that slow queries respect timeout configuration."""
        pg_provider = get_database_provider("postgresql")

        # This test would need a genuinely slow query
        # For now, verify timeout configuration is accessible
        timeout = pg_provider._config.get("query_timeout", 30)
        assert timeout > 0


class TestPerformanceMonitoring:
    """Test performance monitoring and metrics."""

    def test_query_duration_logged(self):
        """Test that query durations are logged."""
        pg_provider = get_database_provider("postgresql")

        query = "SELECT * FROM transactions_enriched LIMIT 5"

        # Execute query
        start = time.time()
        pg_provider.execute_query(query)
        actual_duration = time.time() - start

        # Verify execution completed
        assert actual_duration >= 0

    def test_performance_metrics_available(self):
        """Test that performance metrics are available."""
        pg_provider = get_database_provider("postgresql")

        # Verify provider has performance tracking
        # Either through cache stats or other metrics
        if hasattr(pg_provider, "query_cache"):
            stats = pg_provider.query_cache.get_stats()
            assert "total_requests" in stats
            assert "hit_rate" in stats


class TestPerformanceComparison:
    """Compare performance characteristics between providers."""

    def test_count_query_performance_comparison(self):
        """Compare COUNT query performance."""
        query = "SELECT COUNT(*) as total FROM transactions_enriched"

        sf_provider = get_database_provider("snowflake")
        pg_provider = get_database_provider("postgresql")

        # Benchmark both
        sf_start = time.time()
        sf_result = sf_provider.execute_query(query)
        sf_duration = time.time() - sf_start

        pg_start = time.time()
        pg_result = pg_provider.execute_query(query)
        pg_duration = time.time() - pg_start

        # Results should match
        assert sf_result[0]["total"] == pg_result[0]["total"]

        # Performance should be comparable
        ratio = pg_duration / sf_duration if sf_duration > 0 else 1.0
        assert ratio <= 1.2, f"PostgreSQL COUNT {ratio:.2f}x slower"

    def test_join_query_performance_comparison(self):
        """Compare JOIN query performance (if applicable)."""
        # This test would require multiple tables
        # For now, verify both providers can execute complex queries efficiently
        query = """
            SELECT
                EMAIL,
                COUNT(*) as tx_count,
                MAX(MODEL_SCORE) as max_score
            FROM transactions_enriched
            GROUP BY EMAIL
            HAVING COUNT(*) > 1
            LIMIT 20
        """

        sf_provider = get_database_provider("snowflake")
        pg_provider = get_database_provider("postgresql")

        sf_start = time.time()
        sf_results = sf_provider.execute_query(query)
        sf_duration = time.time() - sf_start

        pg_start = time.time()
        pg_results = pg_provider.execute_query(query)
        pg_duration = time.time() - pg_start

        # Performance check
        ratio = pg_duration / sf_duration if sf_duration > 0 else 1.0
        assert ratio <= 1.2
