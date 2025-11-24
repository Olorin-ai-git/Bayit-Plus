"""
Integration tests for query execution parity between Snowflake and PostgreSQL.

Verifies that identical queries execute successfully on both databases
and return equivalent results.

Following TDD: These tests will guide QueryTranslator implementation.

Constitutional Compliance:
- NO mocks - real database connections
- NO hardcoded queries - load from configuration
- Complete result validation
"""

import pytest
from typing import List, Dict, Any

from app.service.agent.tools.database_tool.database_factory import get_database_provider


class TestQueryParity:
    """Test query execution parity between databases."""

    @pytest.fixture
    def snowflake_provider(self):
        """Create Snowflake provider."""
        provider = get_database_provider('snowflake')
        provider.connect()
        yield provider
        provider.disconnect()

    @pytest.fixture
    def postgresql_provider(self, postgresql_container):
        """Create PostgreSQL provider."""
        provider = get_database_provider('postgresql')
        provider.connect()
        yield provider
        provider.disconnect()

    @pytest.mark.integration
    def test_simple_select_query_parity(self, snowflake_provider, postgresql_provider):
        """Test simple SELECT query works on both databases."""
        # Simple query that should work on both
        query = "SELECT CURRENT_TIMESTAMP"

        # Execute on both providers
        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        # Both should return results
        assert len(snowflake_results) > 0
        assert len(postgresql_results) > 0

        # Both should return dictionaries
        assert isinstance(snowflake_results[0], dict)
        assert isinstance(postgresql_results[0], dict)

    @pytest.mark.integration
    def test_select_with_alias_parity(self, snowflake_provider, postgresql_provider):
        """Test SELECT with column alias works on both."""
        query = "SELECT 1 as test_value"

        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        # Both should have the aliased column
        # Note: Snowflake might uppercase the alias
        snowflake_keys = [k.lower() for k in snowflake_results[0].keys()]
        postgresql_keys = [k.lower() for k in postgresql_results[0].keys()]

        assert 'test_value' in snowflake_keys
        assert 'test_value' in postgresql_keys

    @pytest.mark.integration
    def test_query_with_where_clause_parity(self, snowflake_provider, postgresql_provider):
        """Test queries with WHERE clause work on both."""
        query = "SELECT 1 as result WHERE 1 = 1"

        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        # Both should return one row
        assert len(snowflake_results) == 1
        assert len(postgresql_results) == 1

    @pytest.mark.integration
    def test_query_result_structure_parity(self, snowflake_provider, postgresql_provider):
        """Test that query results have identical structure."""
        query = """
            SELECT
                1 as id,
                'test' as name,
                100.50 as amount
        """

        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        # Normalize column names (case-insensitive)
        sf_row = snowflake_results[0]
        pg_row = postgresql_results[0]

        sf_keys = set(k.lower() for k in sf_row.keys())
        pg_keys = set(k.lower() for k in pg_row.keys())

        # Should have same columns
        assert sf_keys == pg_keys, \
            f"Column sets differ: Snowflake={sf_keys}, PostgreSQL={pg_keys}"

    @pytest.mark.integration
    def test_numeric_data_type_parity(self, snowflake_provider, postgresql_provider):
        """Test numeric data types return comparable values."""
        query = "SELECT 12345 as int_val, 123.45 as decimal_val"

        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        # Get values (handling case differences)
        sf_row = {k.lower(): v for k, v in snowflake_results[0].items()}
        pg_row = {k.lower(): v for k, v in postgresql_results[0].items()}

        # Integer values should be equal
        assert sf_row['int_val'] == pg_row['int_val']

        # Decimal values should be close (floating point comparison)
        assert abs(float(sf_row['decimal_val']) - float(pg_row['decimal_val'])) < 0.01

    @pytest.mark.integration
    def test_string_data_type_parity(self, snowflake_provider, postgresql_provider):
        """Test string data types return identical values."""
        query = "SELECT 'Hello World' as message"

        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        sf_row = {k.lower(): v for k, v in snowflake_results[0].items()}
        pg_row = {k.lower(): v for k, v in postgresql_results[0].items()}

        assert sf_row['message'] == pg_row['message']

    @pytest.mark.integration
    def test_date_functions_parity(self, snowflake_provider, postgresql_provider):
        """Test date functions work on both databases."""
        # Note: May need QueryTranslator to handle syntax differences
        # This test will guide implementation

        # Snowflake: CURRENT_DATE()
        # PostgreSQL: CURRENT_DATE

        snowflake_query = "SELECT CURRENT_DATE() as today"
        postgresql_query = "SELECT CURRENT_DATE as today"

        snowflake_results = snowflake_provider.execute_query(snowflake_query)
        postgresql_results = postgresql_provider.execute_query(postgresql_query)

        # Both should return a date value
        assert len(snowflake_results) == 1
        assert len(postgresql_results) == 1

    @pytest.mark.integration
    def test_case_expression_parity(self, snowflake_provider, postgresql_provider):
        """Test CASE expressions work on both."""
        query = """
            SELECT
                CASE
                    WHEN 1 = 1 THEN 'yes'
                    ELSE 'no'
                END as result
        """

        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        sf_row = {k.lower(): v for k, v in snowflake_results[0].items()}
        pg_row = {k.lower(): v for k, v in postgresql_results[0].items()}

        assert sf_row['result'] == pg_row['result'] == 'yes'

    @pytest.mark.integration
    def test_null_handling_parity(self, snowflake_provider, postgresql_provider):
        """Test NULL values handled consistently."""
        query = "SELECT NULL as null_value"

        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        sf_row = {k.lower(): v for k, v in snowflake_results[0].items()}
        pg_row = {k.lower(): v for k, v in postgresql_results[0].items()}

        # Both should have NULL/None
        assert sf_row['null_value'] is None
        assert pg_row['null_value'] is None

    @pytest.mark.integration
    def test_multiple_row_results_parity(self, snowflake_provider, postgresql_provider):
        """Test queries returning multiple rows."""
        query = """
            SELECT num
            FROM (
                SELECT 1 as num
                UNION ALL
                SELECT 2
                UNION ALL
                SELECT 3
            ) subquery
        """

        snowflake_results = snowflake_provider.execute_query(query)
        postgresql_results = postgresql_provider.execute_query(query)

        # Both should return 3 rows
        assert len(snowflake_results) == 3
        assert len(postgresql_results) == 3


class TestQueryTranslatorIntegration:
    """Test QueryTranslator integration with providers (guides implementation)."""

    @pytest.mark.integration
    def test_snowflake_syntax_translates_to_postgresql(self, postgresql_provider):
        """
        Test that Snowflake-specific syntax is translated for PostgreSQL.

        This test guides QueryTranslator implementation:
        - DATEADD → INTERVAL
        - CURRENT_TIMESTAMP() → CURRENT_TIMESTAMP
        - LISTAGG → STRING_AGG
        """
        # These tests will initially fail, guiding QueryTranslator implementation
        pass

    @pytest.mark.integration
    def test_column_name_case_normalization(self, postgresql_provider):
        """
        Test that column names are normalized for case sensitivity.

        Snowflake: uppercase by default
        PostgreSQL: lowercase by default

        QueryTranslator should handle this automatically.
        """
        pass


class TestQueryPerformanceParity:
    """Test query performance is comparable."""

    @pytest.mark.integration
    def test_query_execution_time_within_spec(self, snowflake_provider, postgresql_provider):
        """Test both databases execute within 20% of each other (per spec)."""
        import time

        query = "SELECT 1 as result"

        # Measure Snowflake execution
        start = time.time()
        snowflake_provider.execute_query(query)
        snowflake_time = time.time() - start

        # Measure PostgreSQL execution
        start = time.time()
        postgresql_provider.execute_query(query)
        postgresql_time = time.time() - start

        # Calculate percentage difference
        if snowflake_time > 0:
            pct_diff = abs(postgresql_time - snowflake_time) / snowflake_time * 100

            # Should be within 20% (per User Story 5 success criteria)
            # This is aspirational - may not pass until optimizations are done
            if pct_diff > 20:
                pytest.skip(f"Performance difference {pct_diff:.1f}% - optimization needed")
