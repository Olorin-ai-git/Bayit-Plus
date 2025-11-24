"""
End-to-end integration test for per-transaction risk scoring.

Tests the full flow from calculation to confusion matrix:
1. Calculate per-transaction scores during investigation
2. Store scores in progress_json
3. Use scores in confusion matrix calculation
4. Verify transactions without scores are excluded
"""

import pytest
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch, MagicMock

from app.service.agent.orchestration.domain_agents.risk_agent import (
    _calculate_per_transaction_scores,
    risk_agent_node,
)
from app.service.investigation.investigation_transaction_mapper import (
    map_investigation_to_transactions,
)
from app.service.state_update_helper import apply_state_updates
from app.models.investigation_state import InvestigationState
from app.schemas.investigation_state import InvestigationStateUpdate, InvestigationProgress


class TestPerTransactionScoringE2E:
    """End-to-end test for per-transaction scoring flow."""
    
    def test_full_flow_calculation_to_confusion_matrix(self):
        """Test full flow from score calculation to confusion matrix usage."""
        # Step 1: Prepare test data
        facts = {
            "results": [
                {
                    "TX_ID_KEY": "tx_1",
                    "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0,
                    "MERCHANT_NAME": "Merchant1",
                    "DEVICE_ID": "device_1",
                    "IP_COUNTRY_CODE": "US"
                },
                {
                    "TX_ID_KEY": "tx_2",
                    "PAID_AMOUNT_VALUE_IN_CURRENCY": 200.0,
                    "MERCHANT_NAME": "Merchant2",
                    "DEVICE_ID": "device_2",
                    "IP_COUNTRY_CODE": "CA"
                },
                {
                    "TX_ID_KEY": "tx_3",
                    "PAID_AMOUNT_VALUE_IN_CURRENCY": 50.0,
                    "MERCHANT_NAME": "Merchant3",
                    "DEVICE_ID": "device_3",
                    "IP_COUNTRY_CODE": "GB"
                }
            ]
        }
        
        domain_findings = {
            "merchant": {
                "merchant_risks": {
                    "Merchant1": 0.8,
                    "Merchant2": 0.6,
                    "Merchant3": 0.4
                },
                "risk_score": 0.6,
                "confidence": 0.7
            },
            "device": {
                "device_risks": {
                    "device_1": 0.7,
                    "device_2": 0.5,
                    "device_3": 0.3
                },
                "risk_score": 0.5,
                "confidence": 0.8
            },
            "location": {
                "risk_score": 0.4,
                "confidence": 0.6
            }
        }
        
        # Step 2: Calculate per-transaction scores
        transaction_scores = _calculate_per_transaction_scores(facts, domain_findings)
        
        # Verify scores were calculated
        assert len(transaction_scores) == 3
        assert "tx_1" in transaction_scores
        assert "tx_2" in transaction_scores
        assert "tx_3" in transaction_scores
        
        # Verify scores are in valid range
        for tx_id, score in transaction_scores.items():
            assert 0.0 <= score <= 1.0, f"Score {score} for {tx_id} is out of range"
        
        # Step 3: Store scores in progress_json
        state = Mock(spec=InvestigationState)
        state.investigation_id = "inv_123"
        state.progress_json = json.dumps({})
        state.version = 1
        
        progress = InvestigationProgress(
            transaction_scores=transaction_scores
        )
        
        update = InvestigationStateUpdate(progress=progress)
        changes = apply_state_updates(state, update)
        
        # Verify scores were stored
        progress_dict = json.loads(state.progress_json)
        assert "transaction_scores" in progress_dict
        assert len(progress_dict["transaction_scores"]) == 3
        
        # Step 4: Use scores in confusion matrix mapping
        investigation = {
            "id": "inv_123",
            "entity_type": "email",
            "entity_id": "test@example.com",
            "overall_risk_score": 0.5,
            "progress_json": state.progress_json
        }
        
        window_start = datetime.now(timezone.utc) - timedelta(days=7)
        window_end = datetime.now(timezone.utc)
        
        with patch('app.service.investigation.investigation_transaction_mapper.get_database_provider') as mock_get_provider, \
             patch('app.service.investigation.investigation_transaction_mapper.build_transaction_query') as mock_build_query, \
             patch('app.service.investigation.investigation_transaction_mapper.build_entity_where_clause') as mock_build_entity, \
             patch('app.service.investigation.investigation_transaction_mapper.query_isfraud_tx_for_transactions') as mock_query_isfraud:
            
            # Setup mocks
            mock_provider = Mock()
            mock_provider.execute_query.return_value = [
                {"TX_ID_KEY": "tx_1", "TX_DATETIME": window_start + timedelta(hours=1)},
                {"TX_ID_KEY": "tx_2", "TX_DATETIME": window_start + timedelta(hours=2)},
                {"TX_ID_KEY": "tx_3", "TX_DATETIME": window_start + timedelta(hours=3)}
            ]
            mock_get_provider.return_value = mock_provider
            mock_build_entity.return_value = ("", [])
            mock_build_query.return_value = "SELECT * FROM txs"
            mock_query_isfraud.return_value = {}
            
            mapped_txs, source, risk_score = map_investigation_to_transactions(
                investigation,
                window_start,
                window_end
            )
            
            # Verify per-transaction scores were used
            assert len(mapped_txs) == 3
            assert mapped_txs[0]["predicted_risk"] == transaction_scores["tx_1"]
            assert mapped_txs[1]["predicted_risk"] == transaction_scores["tx_2"]
            assert mapped_txs[2]["predicted_risk"] == transaction_scores["tx_3"]
            
            # Verify each transaction has unique score (not entity-level score)
            scores = [tx["predicted_risk"] for tx in mapped_txs]
            assert len(set(scores)) > 1, "All transactions should not have the same score"
    
    def test_exclusion_of_transactions_without_scores(self):
        """Test that transactions without per-transaction scores are excluded."""
        # Setup investigation with partial transaction_scores
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
        
        window_start = datetime.now(timezone.utc) - timedelta(days=7)
        window_end = datetime.now(timezone.utc)
        
        with patch('app.service.investigation.investigation_transaction_mapper.get_database_provider') as mock_get_provider, \
             patch('app.service.investigation.investigation_transaction_mapper.build_transaction_query') as mock_build_query, \
             patch('app.service.investigation.investigation_transaction_mapper.build_entity_where_clause') as mock_build_entity, \
             patch('app.service.investigation.investigation_transaction_mapper.query_isfraud_tx_for_transactions') as mock_query_isfraud:
            
            # Setup mocks
            mock_provider = Mock()
            mock_provider.execute_query.return_value = [
                {"TX_ID_KEY": "tx_1", "TX_DATETIME": window_start + timedelta(hours=1)},
                {"TX_ID_KEY": "tx_2", "TX_DATETIME": window_start + timedelta(hours=2)},
                {"TX_ID_KEY": "tx_3", "TX_DATETIME": window_start + timedelta(hours=3)}
            ]
            mock_get_provider.return_value = mock_provider
            mock_build_entity.return_value = ("", [])
            mock_build_query.return_value = "SELECT * FROM txs"
            mock_query_isfraud.return_value = {}
            
            mapped_txs, source, risk_score = map_investigation_to_transactions(
                investigation,
                window_start,
                window_end
            )
            
            # Verify only transactions with scores are included
            assert len(mapped_txs) == 2
            tx_ids = [tx["transaction_id"] for tx in mapped_txs]
            assert "tx_1" in tx_ids
            assert "tx_2" in tx_ids
            assert "tx_3" not in tx_ids  # Excluded (no score)
    
    def test_no_fallback_to_entity_level_score(self):
        """Test that entity-level score is not used as fallback."""
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
        
        window_start = datetime.now(timezone.utc) - timedelta(days=7)
        window_end = datetime.now(timezone.utc)
        
        with patch('app.service.investigation.investigation_transaction_mapper.get_database_provider') as mock_get_provider, \
             patch('app.service.investigation.investigation_transaction_mapper.build_transaction_query') as mock_build_query, \
             patch('app.service.investigation.investigation_transaction_mapper.build_entity_where_clause') as mock_build_entity, \
             patch('app.service.investigation.investigation_transaction_mapper.query_isfraud_tx_for_transactions') as mock_query_isfraud:
            
            # Setup mocks
            mock_provider = Mock()
            mock_provider.execute_query.return_value = [
                {"TX_ID_KEY": "tx_1", "TX_DATETIME": window_start + timedelta(hours=1)},
                {"TX_ID_KEY": "tx_2", "TX_DATETIME": window_start + timedelta(hours=2)}
            ]
            mock_get_provider.return_value = mock_provider
            mock_build_entity.return_value = ("", [])
            mock_build_query.return_value = "SELECT * FROM txs"
            mock_query_isfraud.return_value = {}
            
            mapped_txs, source, risk_score = map_investigation_to_transactions(
                investigation,
                window_start,
                window_end
            )
            
            # Verify all transactions are excluded (no fallback to entity-level score)
            assert len(mapped_txs) == 0

