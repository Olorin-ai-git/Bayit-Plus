"""
Unit tests for per-transaction score usage in investigation_transaction_mapper.py

Tests that map_investigation_to_transactions correctly uses per-transaction scores
when available and excludes transactions without scores.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch
import json

from app.service.investigation.investigation_transaction_mapper import (
    map_investigation_to_transactions,
    classify_transaction_fraud,
)


class TestPerTransactionScoreUsage:
    """Test per-transaction score usage in mapping."""
    
    @patch('app.service.investigation.investigation_transaction_mapper.get_database_provider')
    @patch('app.service.investigation.investigation_transaction_mapper.build_transaction_query')
    @patch('app.service.investigation.investigation_transaction_mapper.build_entity_where_clause')
    @patch('app.service.investigation.investigation_transaction_mapper.query_isfraud_tx_for_transactions')
    def test_use_per_transaction_scores(self, mock_query_isfraud, mock_build_entity, mock_build_query, mock_get_provider):
        """Test that per-transaction scores are used when available."""
        # Setup mocks
        mock_provider = Mock()
        mock_provider.execute_query.return_value = [
            {"TX_ID_KEY": "tx_1", "TX_DATETIME": datetime.now(timezone.utc)},
            {"TX_ID_KEY": "tx_2", "TX_DATETIME": datetime.now(timezone.utc)}
        ]
        mock_get_provider.return_value = mock_provider
        mock_build_entity.return_value = ("", [])
        mock_build_query.return_value = "SELECT * FROM txs"
        mock_query_isfraud.return_value = {}
        
        # Setup investigation with per-transaction scores
        progress_json = json.dumps({
            "transaction_scores": {
                "tx_1": 0.75,
                "tx_2": 0.35
            }
        })
        
        investigation = {
            "id": "inv_123",
            "entity_type": "email",
            "entity_id": "test@example.com",
            "overall_risk_score": 0.5,
            "progress_json": progress_json
        }
        
        window_start = datetime.now(timezone.utc)
        window_end = datetime.now(timezone.utc)
        
        mapped_txs, source, risk_score = map_investigation_to_transactions(
            investigation,
            window_start,
            window_end
        )
        
        # Should use per-transaction scores
        assert len(mapped_txs) == 2
        assert mapped_txs[0]["predicted_risk"] == 0.75
        assert mapped_txs[1]["predicted_risk"] == 0.35
    
    @patch('app.service.investigation.investigation_transaction_mapper.get_database_provider')
    @patch('app.service.investigation.investigation_transaction_mapper.build_transaction_query')
    @patch('app.service.investigation.investigation_transaction_mapper.build_entity_where_clause')
    @patch('app.service.investigation.investigation_transaction_mapper.query_isfraud_tx_for_transactions')
    def test_exclude_transactions_without_scores(self, mock_query_isfraud, mock_build_entity, mock_build_query, mock_get_provider):
        """Test that transactions without per-transaction scores are excluded."""
        # Setup mocks
        mock_provider = Mock()
        mock_provider.execute_query.return_value = [
            {"TX_ID_KEY": "tx_1", "TX_DATETIME": datetime.now(timezone.utc)},
            {"TX_ID_KEY": "tx_2", "TX_DATETIME": datetime.now(timezone.utc)},
            {"TX_ID_KEY": "tx_3", "TX_DATETIME": datetime.now(timezone.utc)}
        ]
        mock_get_provider.return_value = mock_provider
        mock_build_entity.return_value = ("", [])
        mock_build_query.return_value = "SELECT * FROM txs"
        mock_query_isfraud.return_value = {}
        
        # Setup investigation with partial per-transaction scores
        progress_json = json.dumps({
            "transaction_scores": {
                "tx_1": 0.75,
                "tx_2": 0.35
                # tx_3 missing
            }
        })
        
        investigation = {
            "id": "inv_123",
            "entity_type": "email",
            "entity_id": "test@example.com",
            "overall_risk_score": 0.5,
            "progress_json": progress_json
        }
        
        window_start = datetime.now(timezone.utc)
        window_end = datetime.now(timezone.utc)
        
        mapped_txs, source, risk_score = map_investigation_to_transactions(
            investigation,
            window_start,
            window_end
        )
        
        # Should only include transactions with scores
        assert len(mapped_txs) == 2
        assert all(tx["predicted_risk"] is not None for tx in mapped_txs)
    
    @patch('app.service.investigation.investigation_transaction_mapper.get_database_provider')
    @patch('app.service.investigation.investigation_transaction_mapper.build_transaction_query')
    @patch('app.service.investigation.investigation_transaction_mapper.build_entity_where_clause')
    @patch('app.service.investigation.investigation_transaction_mapper.query_isfraud_tx_for_transactions')
    def test_exclude_all_when_no_transaction_scores(self, mock_query_isfraud, mock_build_entity, mock_build_query, mock_get_provider):
        """Test that all transactions are excluded when transaction_scores dict is missing."""
        # Setup mocks
        mock_provider = Mock()
        mock_provider.execute_query.return_value = [
            {"TX_ID_KEY": "tx_1", "TX_DATETIME": datetime.now(timezone.utc)},
            {"TX_ID_KEY": "tx_2", "TX_DATETIME": datetime.now(timezone.utc)}
        ]
        mock_get_provider.return_value = mock_provider
        mock_build_entity.return_value = ("", [])
        mock_build_query.return_value = "SELECT * FROM txs"
        mock_query_isfraud.return_value = {}
        
        # Setup investigation without transaction_scores
        progress_json = json.dumps({
            "risk_score": 0.5,
            "overall_risk_score": 0.5
            # No transaction_scores
        })
        
        investigation = {
            "id": "inv_123",
            "entity_type": "email",
            "entity_id": "test@example.com",
            "overall_risk_score": 0.5,
            "progress_json": progress_json
        }
        
        window_start = datetime.now(timezone.utc)
        window_end = datetime.now(timezone.utc)
        
        mapped_txs, source, risk_score = map_investigation_to_transactions(
            investigation,
            window_start,
            window_end
        )
        
        # Should exclude all transactions (no fallback to entity-level score)
        assert len(mapped_txs) == 0


class TestClassifyTransactionFraud:
    """Test transaction fraud classification."""
    
    def test_classify_fraud_above_threshold(self):
        """Test that transactions with score >= threshold are classified as Fraud."""
        assert classify_transaction_fraud(0.5, 0.3) == "Fraud"
        assert classify_transaction_fraud(0.3, 0.3) == "Fraud"
        assert classify_transaction_fraud(1.0, 0.3) == "Fraud"
    
    def test_classify_not_fraud_below_threshold(self):
        """Test that transactions with score < threshold are classified as Not Fraud."""
        assert classify_transaction_fraud(0.2, 0.3) == "Not Fraud"
        assert classify_transaction_fraud(0.0, 0.3) == "Not Fraud"
    
    def test_classify_none_score(self):
        """Test that None score defaults to Not Fraud."""
        assert classify_transaction_fraud(None, 0.3) == "Not Fraud"

