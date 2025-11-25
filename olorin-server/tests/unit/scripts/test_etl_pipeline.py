"""
Unit tests for ETL pipeline (precision detection).

Tests transaction extraction, loading, label building, and view refresh.
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock, patch

import pytest
from sqlalchemy import text

from scripts.etl_precision_detection import (
    build_labels_truth,
    build_merchants_table,
    extract_mature_transactions,
    load_to_postgres,
    refresh_materialized_views,
)


class TestExtractMatureTransactions:
    """Unit tests for extract_mature_transactions function."""

    def test_extract_mature_transactions_with_default_cutoff(self):
        """Test extraction with default cutoff date (6 months ago)."""
        mock_service = Mock()
        mock_service.table_name = "DBT.DBT_PROD.TXS"
        mock_service.execute_query.return_value = [
            {
                "txn_id": "txn_001",
                "txn_ts": datetime.now() - timedelta(days=200),
                "merchant_id": "merchant_001",
                "card_id": "1234567890",
                "amount": 100.00,
                "currency": "USD",
            }
        ]

        results = extract_mature_transactions(mock_service)

        assert len(results) == 1
        assert results[0]["txn_id"] == "txn_001"
        mock_service.execute_query.assert_called_once()

    def test_extract_mature_transactions_with_custom_cutoff(self):
        """Test extraction with custom cutoff date."""
        mock_service = Mock()
        mock_service.table_name = "DBT.DBT_PROD.TXS"
        mock_service.execute_query.return_value = []

        cutoff = datetime.now() - timedelta(days=365)
        results = extract_mature_transactions(mock_service, cutoff)

        assert len(results) == 0
        # Verify query was called with correct dates
        call_args = mock_service.execute_query.call_args
        assert len(call_args[0][1]) == 2  # Two date parameters


class TestLoadToPostgres:
    """Unit tests for load_to_postgres function."""

    @patch("scripts.etl_precision_detection.get_db_session")
    def test_load_to_postgres_with_transactions(self, mock_get_db_session):
        """Test loading transactions into PostgreSQL."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None

        transactions = [
            {
                "txn_id": "txn_001",
                "txn_ts": datetime.now() - timedelta(days=200),
                "merchant_id": "merchant_001",
                "card_id": "1234567890",
                "amount": 100.00,
                "currency": "USD",
                "approval_status": "APPROVED",
                "mcc": 5411,
                "country": "US",
                "region": "CA",
                "is_fraud_final": False,
                "dispute_final_outcome": None,
                "refund_ts": None,
                "chargeback_ts": None,
            }
        ]

        load_to_postgres(transactions)

        # Verify execute was called
        assert mock_db.execute.called
        mock_db.commit.assert_called_once()

    @patch("scripts.etl_precision_detection.get_db_session")
    def test_load_to_postgres_with_empty_list(self, mock_get_db_session):
        """Test loading with empty transaction list."""
        load_to_postgres([])

        # Should not raise error, just log warning
        assert True


class TestBuildLabelsTruth:
    """Unit tests for build_labels_truth function."""

    @patch("scripts.etl_precision_detection.get_db_session")
    def test_build_labels_truth(self, mock_get_db_session):
        """Test building ground-truth labels."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None

        # Mock label count query result
        mock_result = Mock()
        mock_result.fetchall.return_value = [(0, 10), (1, 5)]
        mock_db.execute.return_value = mock_result

        build_labels_truth()

        # Verify delete and insert were called
        assert mock_db.execute.call_count >= 2
        mock_db.commit.assert_called_once()


class TestRefreshMaterializedViews:
    """Unit tests for refresh_materialized_views function."""

    @patch("scripts.etl_precision_detection.get_db_session")
    def test_refresh_materialized_views_success(self, mock_get_db_session):
        """Test refreshing all materialized views successfully."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None

        refresh_materialized_views()

        # Should refresh 8 views
        assert mock_db.execute.call_count == 8
        assert mock_db.commit.call_count == 8

    @patch("scripts.etl_precision_detection.get_db_session")
    def test_refresh_materialized_views_failure(self, mock_get_db_session):
        """Test refreshing views with failure."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None

        # Make first refresh fail
        mock_db.execute.side_effect = [
            Exception("View not found"),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        ]

        with pytest.raises(Exception):
            refresh_materialized_views()

        # Should rollback on failure
        mock_db.rollback.assert_called()
