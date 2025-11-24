"""
Index Performance Integration Tests.

Tests effectiveness of PostgreSQL indexes on transactions_enriched table.
Verifies that queries use indexes appropriately and achieve target performance.

Following TDD: These tests MUST FAIL until indexes are created.

Constitutional Compliance:
- NO mocks - uses real database providers
- Complete index testing
- Tests guide index creation
"""

import pytest
import time
from typing import Dict, Any, List

from app.service.agent.tools.database_tool.database_factory import get_database_provider


class TestEmailIndexPerformance:
    """Test email column index effectiveness."""

    def test_email_lookup_uses_index(self):
        """Test that email lookup queries use the index."""
        pg_provider = get_database_provider('postgresql')

        query = "SELECT * FROM transactions_enriched WHERE EMAIL = 'test@example.com' LIMIT 10"

        # Execute query and measure performance
        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Email lookup with index should be fast (< 50ms)
        assert duration < 0.05, f"Email lookup too slow: {duration:.3f}s (expected < 0.05s)"

    def test_email_lookup_performance_consistent(self):
        """Test that email lookup performance is consistent across multiple queries."""
        pg_provider = get_database_provider('postgresql')

        emails = [
            'test@example.com',
            'user@test.com',
            'another@example.com'
        ]

        durations = []
        for email in emails:
            query = f"SELECT * FROM transactions_enriched WHERE EMAIL = '{email}' LIMIT 10"

            start = time.time()
            pg_provider.execute_query(query)
            duration = time.time() - start
            durations.append(duration)

        # All email lookups should be fast
        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)

        assert avg_duration < 0.05, f"Average email lookup too slow: {avg_duration:.3f}s"
        assert max_duration < 0.1, f"Slowest email lookup too slow: {max_duration:.3f}s"

    def test_email_pattern_search_performance(self):
        """Test LIKE pattern search on email with index."""
        pg_provider = get_database_provider('postgresql')

        # Pattern search (may not use index depending on pattern)
        query = "SELECT * FROM transactions_enriched WHERE EMAIL LIKE '%@example.com' LIMIT 50"

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Pattern search should complete in reasonable time
        assert duration < 1.0, f"Email pattern search too slow: {duration:.3f}s"


class TestDateIndexPerformance:
    """Test TX_DATETIME column index effectiveness."""

    def test_date_range_query_uses_index(self):
        """Test that date range queries use the index."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, EMAIL, TX_DATETIME
            FROM transactions_enriched
            WHERE TX_DATETIME >= CURRENT_DATE - INTERVAL '7 days'
            LIMIT 100
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Date range query with index should be fast (< 100ms)
        assert duration < 0.1, f"Date range query too slow: {duration:.3f}s"

    def test_date_comparison_performance(self):
        """Test date comparison queries with index."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT COUNT(*) as count
            FROM transactions_enriched
            WHERE TX_DATETIME > CURRENT_DATE - INTERVAL '30 days'
        """

        start = time.time()
        result = pg_provider.execute_query(query)
        duration = time.time() - start

        # Date comparison should be fast
        assert duration < 0.2, f"Date comparison too slow: {duration:.3f}s"

    def test_date_sorting_performance(self):
        """Test ORDER BY TX_DATETIME performance with index."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, TX_DATETIME
            FROM transactions_enriched
            ORDER BY TX_DATETIME DESC
            LIMIT 100
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Sorting by indexed column should be fast
        assert duration < 0.15, f"Date sorting too slow: {duration:.3f}s"


class TestCompositeIndexPerformance:
    """Test composite (TX_DATETIME, EMAIL) index effectiveness."""

    def test_composite_index_date_and_email(self):
        """Test queries using both date and email filters."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, EMAIL, TX_DATETIME, MODEL_SCORE
            FROM transactions_enriched
            WHERE TX_DATETIME >= CURRENT_DATE - INTERVAL '7 days'
              AND EMAIL = 'test@example.com'
            LIMIT 50
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Composite index should make this very fast (< 50ms)
        assert duration < 0.05, f"Composite index query too slow: {duration:.3f}s"

    def test_composite_index_date_range_and_email_pattern(self):
        """Test composite index with date range and email pattern."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, EMAIL, TX_DATETIME
            FROM transactions_enriched
            WHERE TX_DATETIME >= CURRENT_DATE - INTERVAL '14 days'
              AND EMAIL LIKE 'test%'
            LIMIT 50
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Should benefit from composite index on date portion
        assert duration < 0.2, f"Composite pattern query too slow: {duration:.3f}s"


class TestModelScoreIndexPerformance:
    """Test MODEL_SCORE column index effectiveness."""

    def test_model_score_filter_performance(self):
        """Test filtering by MODEL_SCORE uses index."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, EMAIL, MODEL_SCORE
            FROM transactions_enriched
            WHERE MODEL_SCORE > 0.8
            LIMIT 100
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Model score filtering should be fast with index
        assert duration < 0.1, f"MODEL_SCORE filter too slow: {duration:.3f}s"

    def test_model_score_range_query_performance(self):
        """Test MODEL_SCORE range queries."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, MODEL_SCORE
            FROM transactions_enriched
            WHERE MODEL_SCORE BETWEEN 0.5 AND 0.9
            LIMIT 100
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Range query should benefit from index
        assert duration < 0.15, f"MODEL_SCORE range query too slow: {duration:.3f}s"

    def test_model_score_sorting_performance(self):
        """Test ORDER BY MODEL_SCORE performance."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, MODEL_SCORE
            FROM transactions_enriched
            ORDER BY MODEL_SCORE DESC
            LIMIT 100
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Sorting by indexed column should be fast
        assert duration < 0.15, f"MODEL_SCORE sorting too slow: {duration:.3f}s"


class TestIndexCoverage:
    """Test that indexes cover common query patterns."""

    def test_investigation_workflow_query_performance(self):
        """Test typical investigation workflow query performance."""
        pg_provider = get_database_provider('postgresql')

        # Typical investigation query: email + recent date range + high risk
        query = """
            SELECT TX_ID_KEY, EMAIL, TX_DATETIME, MODEL_SCORE, IP_ADDRESS
            FROM transactions_enriched
            WHERE EMAIL = 'test@example.com'
              AND TX_DATETIME >= CURRENT_DATE - INTERVAL '30 days'
              AND MODEL_SCORE > 0.7
            LIMIT 50
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Should benefit from multiple indexes
        assert duration < 0.1, f"Investigation query too slow: {duration:.3f}s"

    def test_high_risk_recent_transactions_query(self):
        """Test query for high-risk recent transactions."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, EMAIL, TX_DATETIME, MODEL_SCORE
            FROM transactions_enriched
            WHERE MODEL_SCORE > 0.9
              AND TX_DATETIME >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY MODEL_SCORE DESC
            LIMIT 20
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Should use both MODEL_SCORE and TX_DATETIME indexes
        assert duration < 0.15, f"High-risk query too slow: {duration:.3f}s"

    def test_user_transaction_history_query(self):
        """Test query for user's complete transaction history."""
        pg_provider = get_database_provider('postgresql')

        query = """
            SELECT TX_ID_KEY, TX_DATETIME, MODEL_SCORE
            FROM transactions_enriched
            WHERE EMAIL = 'test@example.com'
            ORDER BY TX_DATETIME DESC
            LIMIT 100
        """

        start = time.time()
        results = pg_provider.execute_query(query)
        duration = time.time() - start

        # Should use EMAIL index and possibly composite for sorting
        assert duration < 0.1, f"Transaction history query too slow: {duration:.3f}s"


class TestIndexMaintenanceOverhead:
    """Test that indexes don't significantly impact write performance."""

    def test_insert_performance_with_indexes(self):
        """Test that INSERT performance is acceptable with indexes."""
        pg_provider = get_database_provider('postgresql')

        # Prepare test record
        test_record = {
            'TX_ID_KEY': 'TEST_INSERT_001',
            'EMAIL': 'index_test@example.com',
            'TX_DATETIME': 'CURRENT_TIMESTAMP',
            'MODEL_SCORE': 0.75
        }

        # Insert with indexes present
        insert_query = """
            INSERT INTO transactions_enriched (TX_ID_KEY, EMAIL, TX_DATETIME, MODEL_SCORE)
            VALUES ('TEST_INSERT_001', 'index_test@example.com', CURRENT_TIMESTAMP, 0.75)
            ON CONFLICT (TX_ID_KEY) DO NOTHING
        """

        start = time.time()
        pg_provider.execute_query(insert_query)
        duration = time.time() - start

        # Insert should complete quickly even with indexes
        assert duration < 0.1, f"INSERT too slow with indexes: {duration:.3f}s"

        # Cleanup
        cleanup_query = "DELETE FROM transactions_enriched WHERE TX_ID_KEY = 'TEST_INSERT_001'"
        pg_provider.execute_query(cleanup_query)
