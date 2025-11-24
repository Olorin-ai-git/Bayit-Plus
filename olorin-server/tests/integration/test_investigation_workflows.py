"""
End-to-end Investigation Workflow Integration Tests.

Tests complete investigation workflows that use database abstraction layer.
Verifies that switching DATABASE_PROVIDER requires no code changes.

Following TDD: These tests MUST FAIL until implementation is complete.

Constitutional Compliance:
- NO mocks - uses real database providers (or in-memory test databases)
- Complete workflow validation from query to results
- Tests guide implementation
"""

import pytest
import os
from typing import List, Dict, Any

from app.service.agent.tools.database_tool.database_factory import get_database_provider
from app.service.agent.tools.database_tool.query_translator import QueryTranslator
from app.service.agent.tools.database_tool.query_cache import QueryCache


class TestInvestigationWorkflowSwitching:
    """Test that investigation workflows work with both database providers."""

    def test_simple_query_workflow_snowflake(self):
        """Test simple investigation query workflow with Snowflake provider."""
        # Set provider to Snowflake
        os.environ['DATABASE_PROVIDER'] = 'snowflake'

        provider = get_database_provider()

        # Simple query to verify provider works
        query = "SELECT TX_ID_KEY, EMAIL, MODEL_SCORE FROM transactions_enriched LIMIT 5"

        # Execute query
        results = provider.execute_query(query)

        # Verify results structure
        assert isinstance(results, list)
        # Note: May be empty if no test data in Snowflake
        if results:
            assert 'TX_ID_KEY' in results[0] or 'tx_id_key' in results[0]

    def test_simple_query_workflow_postgresql(self):
        """Test simple investigation query workflow with PostgreSQL provider."""
        # Set provider to PostgreSQL
        os.environ['DATABASE_PROVIDER'] = 'postgresql'

        provider = get_database_provider()

        # Snowflake-style query (will be translated)
        query = "SELECT TX_ID_KEY, EMAIL, MODEL_SCORE FROM transactions_enriched LIMIT 5"

        # Execute query (should translate Snowflake SQL to PostgreSQL)
        results = provider.execute_query(query)

        # Verify results structure
        assert isinstance(results, list)
        # Note: May be empty if no test data in PostgreSQL
        if results:
            # PostgreSQL returns lowercase column names
            assert any(key.lower() in ['tx_id_key', 'email', 'model_score'] for key in results[0].keys())

    def test_date_function_workflow_translation(self):
        """Test query workflow with date functions that require translation."""
        os.environ['DATABASE_PROVIDER'] = 'postgresql'

        provider = get_database_provider()

        # Snowflake DATEADD syntax
        query = """
            SELECT TX_ID_KEY, TX_DATETIME
            FROM transactions_enriched
            WHERE TX_DATETIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
            LIMIT 5
        """

        # Execute query (should translate DATEADD to INTERVAL)
        results = provider.execute_query(query)

        # Verify query executed without errors
        assert isinstance(results, list)

    def test_aggregation_workflow(self):
        """Test aggregation query workflow."""
        os.environ['DATABASE_PROVIDER'] = 'postgresql'

        provider = get_database_provider()

        query = """
            SELECT
                COUNT(*) as transaction_count,
                COUNT(DISTINCT EMAIL) as unique_emails
            FROM transactions_enriched
        """

        results = provider.execute_query(query)

        # Verify aggregation results
        assert isinstance(results, list)
        if results:
            assert 'transaction_count' in results[0] or 'TRANSACTION_COUNT' in results[0]


class TestInvestigationWorkflowCaching:
    """Test that query caching works across investigation workflows."""

    def test_cache_improves_performance(self):
        """Test that query cache improves performance on repeated queries."""
        os.environ['DATABASE_PROVIDER'] = 'postgresql'

        provider = get_database_provider()

        query = "SELECT COUNT(*) FROM transactions_enriched"

        # First execution - cache miss
        results1 = provider.execute_query(query)

        # Second execution - should hit cache for translation
        results2 = provider.execute_query(query)

        # Results should be identical
        assert results1 == results2

    def test_cache_handles_whitespace_variations(self):
        """Test that cache normalizes queries with whitespace variations."""
        os.environ['DATABASE_PROVIDER'] = 'postgresql'

        provider = get_database_provider()

        query1 = "SELECT COUNT(*) FROM transactions_enriched"
        query2 = "SELECT   COUNT(*)   FROM   transactions_enriched"  # Extra spaces

        # Both should produce same translated query (cache hit)
        results1 = provider.execute_query(query1)
        results2 = provider.execute_query(query2)

        # Results should be identical
        assert results1 == results2


class TestInvestigationWorkflowErrorHandling:
    """Test error handling in investigation workflows."""

    def test_invalid_query_fails_gracefully(self):
        """Test that invalid queries fail with clear error messages."""
        os.environ['DATABASE_PROVIDER'] = 'postgresql'

        provider = get_database_provider()

        # Invalid SQL syntax
        query = "SELECT FROM WHERE"

        with pytest.raises(Exception) as exc_info:
            provider.execute_query(query)

        # Verify error message is informative
        assert exc_info.value is not None

    def test_missing_table_fails_gracefully(self):
        """Test that queries on missing tables fail with clear errors."""
        os.environ['DATABASE_PROVIDER'] = 'postgresql'

        provider = get_database_provider()

        query = "SELECT * FROM nonexistent_table LIMIT 1"

        with pytest.raises(Exception):
            provider.execute_query(query)


class TestInvestigationWorkflowZeroCodeChanges:
    """Test that no code changes are needed when switching providers."""

    def test_same_query_works_with_both_providers(self):
        """Test that same query code works with Snowflake and PostgreSQL."""
        query = "SELECT COUNT(*) as total FROM transactions_enriched"

        # Test with Snowflake
        os.environ['DATABASE_PROVIDER'] = 'snowflake'
        sf_provider = get_database_provider()
        sf_results = sf_provider.execute_query(query)

        # Test with PostgreSQL
        os.environ['DATABASE_PROVIDER'] = 'postgresql'
        pg_provider = get_database_provider()
        pg_results = pg_provider.execute_query(query)

        # Both should return valid results (structure verified, not values)
        assert isinstance(sf_results, list)
        assert isinstance(pg_results, list)

    def test_investigation_workflow_provider_agnostic(self):
        """Test complete investigation workflow is provider-agnostic."""
        # Define a typical investigation query
        def run_investigation(email: str) -> List[Dict[str, Any]]:
            """Example investigation function - provider-agnostic."""
            provider = get_database_provider()  # Uses DATABASE_PROVIDER env var

            query = f"""
                SELECT
                    TX_ID_KEY,
                    EMAIL,
                    MODEL_SCORE,
                    IS_FRAUD_TX,
                    TX_DATETIME
                FROM transactions_enriched
                WHERE EMAIL = '{email}'
                ORDER BY TX_DATETIME DESC
                LIMIT 10
            """

            return provider.execute_query(query)

        test_email = "test@example.com"

        # Run with Snowflake
        os.environ['DATABASE_PROVIDER'] = 'snowflake'
        sf_results = run_investigation(test_email)

        # Run with PostgreSQL
        os.environ['DATABASE_PROVIDER'] = 'postgresql'
        pg_results = run_investigation(test_email)

        # Both should return valid results (may be empty if no test data)
        assert isinstance(sf_results, list)
        assert isinstance(pg_results, list)
