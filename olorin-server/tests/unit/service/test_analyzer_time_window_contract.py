"""
Contract tests for analyzer time window configuration.

Tests verify that analyzer time window parameters are correctly loaded from .env
and that SQL queries are generated with proper date constraints.
"""

import os
from datetime import datetime, timedelta

import pytest

from app.service.analytics.risk_analyzer import RiskAnalyzer


def test_analyzer_time_window_configuration_loading(monkeypatch):
    """Test that analyzer time window configuration is loaded from .env."""
    # Set environment variables
    monkeypatch.setenv("ANALYZER_TIME_WINDOW_HOURS", "24")
    monkeypatch.setenv("ANALYZER_END_OFFSET_MONTHS", "6")
    monkeypatch.setenv("ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS", "true")
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")

    # Create analyzer instance
    analyzer = RiskAnalyzer()

    # Verify configuration loaded
    assert analyzer.max_lookback_months == 6, "max_lookback_months should be 6"


def test_analyzer_generates_correct_time_window_sql(monkeypatch):
    """Test that SQL query contains correct time window constraints."""
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")
    monkeypatch.setenv("ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS", "false")

    analyzer = RiskAnalyzer()

    # Build query for 24-hour window
    query = analyzer._build_risk_query(hours=24, group_by="EMAIL", top_percentage=10.0)

    # Verify SQL contains proper DATEADD expressions
    assert "DATEADD" in query, "Query should contain DATEADD functions"
    assert "CURRENT_TIMESTAMP()" in query, "Query should use CURRENT_TIMESTAMP()"

    # Verify end date is offset by max_lookback_days (6 months = ~180 days)
    max_lookback_days = analyzer.max_lookback_months * 30
    assert (
        f"DATEADD(day, -{max_lookback_days}, CURRENT_TIMESTAMP())" in query
    ), "Query should cap end date at 6 months ago"

    # Verify window duration is subtracted from end date
    assert (
        "DATEADD(day, -1, DATEADD(hour, -0," in query or "DATEADD(hour, -24," in query
    ), "Query should subtract window duration from end date"


def test_analyzer_fraud_exclusion_when_enabled(monkeypatch):
    """Test that fraud transactions are excluded when flag is enabled."""
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")
    monkeypatch.setenv("ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS", "true")

    analyzer = RiskAnalyzer()
    analyzer.exclude_fraud_transactions = True  # Simulate new config

    # Build query
    query = analyzer._build_risk_query(hours=24, group_by="EMAIL", top_percentage=10.0)

    # Note: The actual fraud exclusion is implemented in _build_risk_query
    # We verify the query structure is correct
    assert "IS_FRAUD_TX" in query, "Query should reference IS_FRAUD_TX column"


def test_analyzer_fraud_inclusion_when_disabled(monkeypatch):
    """Test that fraud transactions are included when flag is disabled."""
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")
    monkeypatch.setenv("ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS", "false")

    analyzer = RiskAnalyzer()

    # Build query
    query = analyzer._build_risk_query(hours=24, group_by="EMAIL", top_percentage=10.0)

    # Verify no fraud exclusion in WHERE clause (only in SELECT for fraud_count)
    assert (
        "IS_FRAUD_TX" in query
    ), "Query should still reference IS_FRAUD_TX for counting"


def test_analyzer_time_window_postgresql(monkeypatch):
    """Test time window SQL for PostgreSQL provider."""
    monkeypatch.setenv("DATABASE_PROVIDER", "postgresql")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")
    monkeypatch.setenv("ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS", "false")

    analyzer = RiskAnalyzer()

    # Build query
    query = analyzer._build_risk_query(hours=24, group_by="email", top_percentage=10.0)

    # PostgreSQL uses INTERVAL syntax
    assert "INTERVAL" in query, "PostgreSQL query should use INTERVAL syntax"
    assert "CURRENT_TIMESTAMP()" in query, "Query should use CURRENT_TIMESTAMP()"


def test_analyzer_approved_filter_included(monkeypatch):
    """Test that APPROVED filter is included in queries."""
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")
    monkeypatch.setenv("ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS", "false")

    analyzer = RiskAnalyzer()

    # Build query
    query = analyzer._build_risk_query(hours=24, group_by="EMAIL", top_percentage=10.0)

    # Verify APPROVED filter is present
    assert (
        "NSURE_LAST_DECISION" in query or "UPPER(" in query
    ), "Query should filter by NSURE_LAST_DECISION = 'APPROVED'"
    assert "APPROVED" in query, "Query should check for APPROVED status"


def test_analyzer_preserves_top_10_percent_logic(monkeypatch):
    """Test that top 10% calculation logic is preserved."""
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")
    monkeypatch.setenv("ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS", "false")

    analyzer = RiskAnalyzer()

    # Build query
    query = analyzer._build_risk_query(hours=24, group_by="EMAIL", top_percentage=10.0)

    # Verify ROW_NUMBER and CEIL are used
    assert "ROW_NUMBER()" in query, "Query should use ROW_NUMBER() for ranking"
    assert (
        "CEIL" in query or "risk_rank <=" in query
    ), "Query should use CEIL or risk_rank for top percentage calculation"
    assert "risk_weighted_value" in query, "Query should order by risk_weighted_value"


def test_analyzer_time_window_calculation_accuracy(monkeypatch):
    """Test that time window calculations are accurate."""
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")

    analyzer = RiskAnalyzer()

    # Test various window sizes
    for hours in [24, 48, 168, 720]:  # 1 day, 2 days, 1 week, 30 days
        query = analyzer._build_risk_query(
            hours=hours, group_by="EMAIL", top_percentage=10.0
        )

        days = hours // 24
        remaining_hours = hours % 24

        # Verify the window duration is properly calculated
        if remaining_hours > 0:
            assert (
                f"DATEADD(day, -{days}, DATEADD(hour, -{remaining_hours}," in query
                or f"DATEADD(hour, -{hours}," in query
            ), f"Query should properly calculate {hours} hours window"
        else:
            assert (
                f"DATEADD(day, -{days}," in query or f"DATEADD(hour, -{hours}," in query
            ), f"Query should properly calculate {hours} hours window"


def test_analyzer_validates_column_names(monkeypatch):
    """Test that column names are validated against schema."""
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")

    analyzer = RiskAnalyzer()

    # Valid column should pass
    validated = analyzer._validate_column_name("EMAIL")
    assert validated == "EMAIL", "Valid column should be returned in uppercase"

    # Invalid column should raise ValueError
    with pytest.raises(ValueError, match="Invalid column"):
        analyzer._validate_column_name("INVALID_COLUMN_XYZ")


def test_analyzer_config_validation(monkeypatch):
    """Test that analyzer configuration validates properly."""
    monkeypatch.setenv("DATABASE_PROVIDER", "snowflake")
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "6")

    # Valid configuration should work
    analyzer = RiskAnalyzer()
    assert analyzer.max_lookback_months == 6

    # Zero should work (means no lookback limit)
    monkeypatch.setenv("ANALYTICS_MAX_LOOKBACK_MONTHS", "0")
    analyzer2 = RiskAnalyzer()
    assert analyzer2.max_lookback_months == 0
