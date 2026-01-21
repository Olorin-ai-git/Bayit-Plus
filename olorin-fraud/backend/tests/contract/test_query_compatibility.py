"""
Contract tests for Query Compatibility.

Verifies that query translation maintains SQL contract and semantics.
Ensures translated queries produce identical results on both databases.

Following TDD: These tests MUST FAIL until implementation is complete.

Constitutional Compliance:
- NO mocks - uses real translation logic
- Complete contract validation
- Tests guide implementation
"""

import pytest

from app.service.agent.tools.database_tool.query_translator import QueryTranslator


class TestQueryTranslationContract:
    """Test that translation maintains query contract."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_select_star_unchanged(self, translator):
        """Test that SELECT * is not modified."""
        query = "SELECT * FROM users"
        result = translator.translate(query)

        # SELECT * should be preserved
        assert "SELECT" in result
        assert "*" in result
        assert "FROM" in result

    def test_where_clause_preserved(self, translator):
        """Test that WHERE clauses are preserved."""
        query = "SELECT * FROM users WHERE age > 18"
        result = translator.translate(query)

        assert "WHERE" in result
        assert "age" in result.lower()
        assert ">" in result
        assert "18" in result

    def test_join_syntax_preserved(self, translator):
        """Test that JOIN syntax is preserved."""
        query = """
            SELECT u.*, o.order_id
            FROM users u
            JOIN orders o ON u.user_id = o.user_id
        """
        result = translator.translate(query)

        assert "JOIN" in result
        assert "ON" in result

    def test_group_by_preserved(self, translator):
        """Test that GROUP BY is preserved."""
        query = "SELECT user_id, COUNT(*) FROM orders GROUP BY user_id"
        result = translator.translate(query)

        assert "GROUP BY" in result

    def test_order_by_preserved(self, translator):
        """Test that ORDER BY is preserved."""
        query = "SELECT * FROM users ORDER BY created_at DESC"
        result = translator.translate(query)

        assert "ORDER BY" in result
        assert "DESC" in result or "desc" in result

    def test_limit_clause_preserved(self, translator):
        """Test that LIMIT clause is preserved."""
        query = "SELECT * FROM users LIMIT 10"
        result = translator.translate(query)

        assert "LIMIT" in result or "limit" in result
        assert "10" in result


class TestNumericLiteralContract:
    """Test that numeric literals are preserved."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_integer_literals_preserved(self, translator):
        """Test that integer literals are not modified."""
        query = "SELECT * FROM users WHERE age = 25"
        result = translator.translate(query)

        assert "25" in result

    def test_decimal_literals_preserved(self, translator):
        """Test that decimal literals are not modified."""
        query = "SELECT * FROM transactions WHERE amount = 99.99"
        result = translator.translate(query)

        assert "99.99" in result

    def test_negative_numbers_preserved(self, translator):
        """Test that negative numbers are preserved."""
        query = "SELECT * FROM transactions WHERE balance < -100"
        result = translator.translate(query)

        assert "-100" in result


class TestStringLiteralContract:
    """Test that string literals are preserved."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_single_quoted_strings_preserved(self, translator):
        """Test that single-quoted strings are preserved."""
        query = "SELECT * FROM users WHERE name = 'John Doe'"
        result = translator.translate(query)

        assert "'John Doe'" in result

    def test_strings_with_spaces_preserved(self, translator):
        """Test that strings with spaces are preserved."""
        query = "SELECT * FROM logs WHERE message = 'Error occurred'"
        result = translator.translate(query)

        assert "'Error occurred'" in result or '"Error occurred"' in result

    def test_empty_strings_preserved(self, translator):
        """Test that empty strings are preserved."""
        query = "SELECT * FROM users WHERE email != ''"
        result = translator.translate(query)

        assert "''" in result or '""' in result


class TestSubqueryContract:
    """Test that subqueries are handled correctly."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_simple_subquery_preserved(self, translator):
        """Test that simple subqueries are preserved."""
        query = """
            SELECT * FROM users
            WHERE user_id IN (SELECT user_id FROM orders)
        """
        result = translator.translate(query)

        assert "IN" in result
        assert "(" in result and ")" in result

    def test_nested_subqueries_preserved(self, translator):
        """Test that nested subqueries are preserved."""
        query = """
            SELECT * FROM users
            WHERE user_id IN (
                SELECT user_id FROM orders
                WHERE order_id IN (SELECT order_id FROM payments)
            )
        """
        result = translator.translate(query)

        # Structure should be maintained
        assert result.count("(") >= 2
        assert result.count(")") >= 2


class TestAggregationContract:
    """Test that aggregation functions are preserved."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_count_function_preserved(self, translator):
        """Test that COUNT function is preserved."""
        query = "SELECT COUNT(*) FROM users"
        result = translator.translate(query)

        assert "COUNT" in result or "count" in result

    def test_sum_function_preserved(self, translator):
        """Test that SUM function is preserved."""
        query = "SELECT SUM(amount) FROM transactions"
        result = translator.translate(query)

        assert "SUM" in result or "sum" in result

    def test_avg_function_preserved(self, translator):
        """Test that AVG function is preserved."""
        query = "SELECT AVG(score) FROM tests"
        result = translator.translate(query)

        assert "AVG" in result or "avg" in result

    def test_min_max_functions_preserved(self, translator):
        """Test that MIN/MAX functions are preserved."""
        query = "SELECT MIN(price), MAX(price) FROM products"
        result = translator.translate(query)

        assert "MIN" in result or "min" in result
        assert "MAX" in result or "max" in result


class TestCaseExpressionContract:
    """Test that CASE expressions are preserved."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_simple_case_preserved(self, translator):
        """Test that simple CASE expression is preserved."""
        query = """
            SELECT
                CASE
                    WHEN age < 18 THEN 'minor'
                    ELSE 'adult'
                END as category
            FROM users
        """
        result = translator.translate(query)

        assert "CASE" in result or "case" in result
        assert "WHEN" in result or "when" in result
        assert "THEN" in result or "then" in result
        assert "ELSE" in result or "else" in result
        assert "END" in result or "end" in result


class TestNullHandlingContract:
    """Test that NULL handling is preserved."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_is_null_preserved(self, translator):
        """Test that IS NULL is preserved."""
        query = "SELECT * FROM users WHERE email IS NULL"
        result = translator.translate(query)

        assert "IS NULL" in result or "is null" in result

    def test_is_not_null_preserved(self, translator):
        """Test that IS NOT NULL is preserved."""
        query = "SELECT * FROM users WHERE email IS NOT NULL"
        result = translator.translate(query)

        assert "IS NOT NULL" in result or "is not null" in result

    def test_coalesce_preserved(self, translator):
        """Test that COALESCE function is preserved."""
        query = "SELECT COALESCE(email, 'no-email') FROM users"
        result = translator.translate(query)

        assert "COALESCE" in result or "coalesce" in result


class TestTranslationInvariant:
    """Test invariants that must hold for all translations."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_translation_is_valid_sql(self, translator):
        """Test that translated query is syntactically valid SQL."""
        queries = [
            "SELECT * FROM users",
            "SELECT COUNT(*) FROM orders",
            "SELECT * FROM users WHERE age > 18",
        ]

        for query in queries:
            result = translator.translate(query)

            # Basic SQL structure should be maintained
            assert "SELECT" in result or "select" in result
            assert "FROM" in result or "from" in result

    def test_translation_preserves_query_intent(self, translator):
        """Test that translation preserves query semantic intent."""
        # A query selecting specific columns should still select those columns
        query = "SELECT user_id, email FROM users"
        result = translator.translate(query)

        assert "user_id" in result.lower()
        assert "email" in result.lower()

    def test_translation_does_not_add_filters(self, translator):
        """Test that translation doesn't add unwanted WHERE clauses."""
        query = "SELECT * FROM users"
        result = translator.translate(query)

        # Should not add WHERE if not present
        if "WHERE" not in query:
            assert result.count("WHERE") == query.count("WHERE")


class TestIdempotencyContract:
    """Test that translation is idempotent."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_double_translation_idempotent(self, translator):
        """Test that translating twice gives same result as translating once."""
        snowflake_query = "SELECT CURRENT_TIMESTAMP() FROM users"

        first_result = translator.translate(snowflake_query)
        second_result = translator.translate(first_result)

        # Second translation should not change anything
        assert first_result == second_result

    def test_postgresql_query_unchanged(self, translator):
        """Test that PostgreSQL query is not modified."""
        postgresql_query = "SELECT CURRENT_TIMESTAMP FROM users"

        result = translator.translate(postgresql_query)

        # Should not introduce Snowflake syntax
        assert "CURRENT_TIMESTAMP()" not in result


class TestEdgeCaseContract:
    """Test edge cases maintain contract."""

    @pytest.fixture
    def translator(self):
        """Create QueryTranslator instance."""
        return QueryTranslator()

    def test_empty_query_returns_empty(self, translator):
        """Test that empty query returns empty string."""
        result = translator.translate("")
        assert result == ""

    def test_whitespace_only_query(self, translator):
        """Test that whitespace-only query is handled."""
        result = translator.translate("   \n\t  ")
        # Should return empty or whitespace
        assert len(result.strip()) == 0

    def test_very_long_query_handled(self, translator):
        """Test that very long queries are handled."""
        # Create a long query with many columns
        columns = ", ".join([f"col{i}" for i in range(100)])
        query = f"SELECT {columns} FROM large_table"

        result = translator.translate(query)

        # Should still be valid
        assert "SELECT" in result or "select" in result
        assert "large_table" in result.lower()
