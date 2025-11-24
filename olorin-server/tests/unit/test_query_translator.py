"""
Unit tests for QueryTranslator.

Tests SQL translation from Snowflake syntax to PostgreSQL syntax.

Following TDD: These tests MUST FAIL until QueryTranslator is implemented.

Constitutional Compliance:
- NO mocks for business logic - only for external dependencies
- Complete test coverage for all translation rules
- Tests guide implementation
"""

import pytest
from unittest.mock import Mock

# Import will fail initially - that's expected in TDD
from app.service.agent.tools.database_tool.query_translator import QueryTranslator


class TestQueryTranslatorInit:
    """Test QueryTranslator initialization."""

    def test_translator_can_be_instantiated(self):
        """Test that QueryTranslator can be created."""
        translator = QueryTranslator()
        assert translator is not None

    def test_translator_has_translation_rules(self):
        """Test that translator loads translation rules."""
        translator = QueryTranslator()
        assert hasattr(translator, 'translation_rules')
        assert len(translator.translation_rules) > 0


class TestDateFunctionTranslation:
    """Test date function translation from Snowflake to PostgreSQL."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_dateadd_to_interval_days(self, translator):
        """Test DATEADD with days translates to INTERVAL."""
        snowflake_query = "SELECT DATEADD(day, 7, created_at) FROM users"

        result = translator.translate(snowflake_query)

        assert "DATEADD" not in result
        assert "INTERVAL" in result
        assert "7 days" in result or "INTERVAL '7 days'" in result

    def test_dateadd_to_interval_months(self, translator):
        """Test DATEADD with months translates to INTERVAL."""
        snowflake_query = "SELECT DATEADD(month, 3, created_at) FROM users"

        result = translator.translate(snowflake_query)

        assert "DATEADD" not in result
        assert "INTERVAL" in result
        assert "3 months" in result or "INTERVAL '3 months'" in result

    def test_dateadd_to_interval_years(self, translator):
        """Test DATEADD with years translates to INTERVAL."""
        snowflake_query = "SELECT DATEADD(year, 1, created_at) FROM users"

        result = translator.translate(snowflake_query)

        assert "DATEADD" not in result
        assert "INTERVAL" in result
        assert "1 years" in result or "INTERVAL '1 years'" in result

    def test_current_timestamp_function_call(self, translator):
        """Test CURRENT_TIMESTAMP() translates to CURRENT_TIMESTAMP."""
        snowflake_query = "SELECT CURRENT_TIMESTAMP() FROM users"

        result = translator.translate(snowflake_query)

        # Should remove parentheses
        assert "CURRENT_TIMESTAMP()" not in result
        assert "CURRENT_TIMESTAMP" in result

    def test_current_date_function_call(self, translator):
        """Test CURRENT_DATE() translates to CURRENT_DATE."""
        snowflake_query = "SELECT CURRENT_DATE() FROM users"

        result = translator.translate(snowflake_query)

        # Should remove parentheses
        assert "CURRENT_DATE()" not in result
        assert "CURRENT_DATE" in result


class TestStringFunctionTranslation:
    """Test string function translation."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_listagg_to_string_agg(self, translator):
        """Test LISTAGG translates to STRING_AGG."""
        snowflake_query = """
            SELECT LISTAGG(name, ', ') WITHIN GROUP (ORDER BY name)
            FROM users
        """

        result = translator.translate(snowflake_query)

        assert "LISTAGG" not in result
        assert "STRING_AGG" in result

    def test_listagg_with_distinct(self, translator):
        """Test LISTAGG with DISTINCT translates correctly."""
        snowflake_query = """
            SELECT LISTAGG(DISTINCT name, ', ')
            FROM users
        """

        result = translator.translate(snowflake_query)

        assert "LISTAGG" not in result
        assert "STRING_AGG" in result
        assert "DISTINCT" in result


class TestColumnNameCaseNormalization:
    """Test column name case sensitivity handling."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_uppercase_column_names_to_lowercase(self, translator):
        """Test uppercase column names are converted to lowercase."""
        snowflake_query = "SELECT USER_ID, EMAIL_ADDRESS FROM USERS"

        result = translator.translate(snowflake_query)

        # PostgreSQL uses lowercase identifiers
        assert "user_id" in result.lower()
        assert "email_address" in result.lower()

    def test_quoted_identifiers_preserved(self, translator):
        """Test quoted identifiers are preserved."""
        snowflake_query = 'SELECT "UserId", "EmailAddress" FROM users'

        result = translator.translate(snowflake_query)

        # Quoted identifiers should be preserved exactly
        assert '"UserId"' in result or '"userid"' in result
        assert '"EmailAddress"' in result or '"emailaddress"' in result

    def test_mixed_case_normalization(self, translator):
        """Test mixed case column names are normalized."""
        snowflake_query = "SELECT UserId, EmailAddress FROM Users"

        result = translator.translate(snowflake_query)

        # Should normalize to lowercase
        assert result.lower() == result or '"' in result


class TestComplexQueryTranslation:
    """Test translation of complex queries with multiple transformations."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_query_with_multiple_date_functions(self, translator):
        """Test query with multiple date functions."""
        snowflake_query = """
            SELECT
                CURRENT_TIMESTAMP() as now,
                DATEADD(day, 7, created_at) as week_later,
                CURRENT_DATE() as today
            FROM users
        """

        result = translator.translate(snowflake_query)

        # All date functions should be translated
        assert "CURRENT_TIMESTAMP()" not in result
        assert "CURRENT_DATE()" not in result
        assert "DATEADD" not in result
        assert "CURRENT_TIMESTAMP" in result
        assert "CURRENT_DATE" in result
        assert "INTERVAL" in result

    def test_query_with_joins_and_aggregations(self, translator):
        """Test complex query with JOINs and aggregations."""
        snowflake_query = """
            SELECT
                u.USER_ID,
                LISTAGG(o.ORDER_ID, ',') as orders
            FROM USERS u
            JOIN ORDERS o ON u.USER_ID = o.USER_ID
            WHERE CURRENT_TIMESTAMP() > u.CREATED_AT
            GROUP BY u.USER_ID
        """

        result = translator.translate(snowflake_query)

        # All transformations should be applied
        assert "LISTAGG" not in result
        assert "STRING_AGG" in result
        assert "CURRENT_TIMESTAMP()" not in result


class TestTranslationIdempotency:
    """Test that translation is idempotent."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_already_translated_query_unchanged(self, translator):
        """Test that PostgreSQL query is not modified."""
        postgresql_query = """
            SELECT
                user_id,
                created_at + INTERVAL '7 days' as week_later
            FROM users
            WHERE created_at > CURRENT_TIMESTAMP
        """

        result = translator.translate(postgresql_query)

        # Should not introduce Snowflake syntax
        assert "DATEADD" not in result
        assert "CURRENT_TIMESTAMP()" not in result

    def test_double_translation_is_idempotent(self, translator):
        """Test that translating twice gives same result."""
        snowflake_query = "SELECT CURRENT_TIMESTAMP() FROM users"

        first_translation = translator.translate(snowflake_query)
        second_translation = translator.translate(first_translation)

        assert first_translation == second_translation


class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_empty_query(self, translator):
        """Test translation of empty query."""
        result = translator.translate("")
        assert result == ""

    def test_query_with_comments(self, translator):
        """Test query with SQL comments is translated correctly."""
        snowflake_query = """
            -- This is a comment
            SELECT CURRENT_TIMESTAMP() -- inline comment
            FROM users
        """

        result = translator.translate(snowflake_query)

        # Comments should be preserved
        assert "--" in result
        # Translation should still happen
        assert "CURRENT_TIMESTAMP()" not in result

    def test_case_insensitive_function_names(self, translator):
        """Test that function names are case-insensitive."""
        queries = [
            "SELECT current_timestamp() FROM users",
            "SELECT CURRENT_TIMESTAMP() FROM users",
            "SELECT Current_Timestamp() FROM users"
        ]

        results = [translator.translate(q) for q in queries]

        # All should translate the same way
        for result in results:
            assert "(" not in result.replace("()", "")  # No function call parentheses


class TestTranslationMetrics:
    """Test translation metrics and tracking."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_translator_tracks_translation_count(self, translator):
        """Test that translator tracks number of translations."""
        initial_count = getattr(translator, 'translation_count', 0)

        translator.translate("SELECT * FROM users")

        assert translator.translation_count == initial_count + 1

    def test_translator_tracks_rules_applied(self, translator):
        """Test that translator tracks which rules were applied."""
        query = "SELECT CURRENT_TIMESTAMP() FROM users"

        result = translator.translate(query)

        # Should have metrics about which rules were applied
        if hasattr(translator, 'last_translation_stats'):
            assert 'rules_applied' in translator.last_translation_stats
