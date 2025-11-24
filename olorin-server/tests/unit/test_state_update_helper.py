"""
Unit tests for transaction_scores storage in state_update_helper.py

Tests that transaction_scores are correctly stored and validated in progress_json.
"""

import pytest
import json
from unittest.mock import Mock
from datetime import datetime

from app.models.investigation_state import InvestigationState
from app.schemas.investigation_state import InvestigationStateUpdate, InvestigationProgress
from app.service.state_update_helper import apply_state_updates


class TestTransactionScoresStorage:
    """Test transaction_scores storage and validation."""
    
    def test_store_valid_transaction_scores(self):
        """Test that valid transaction_scores are stored correctly."""
        state = Mock(spec=InvestigationState)
        state.investigation_id = "inv_123"
        state.progress_json = json.dumps({})
        state.version = 1
        
        progress = InvestigationProgress(
            transaction_scores={
                "tx_1": 0.75,
                "tx_2": 0.35,
                "tx_3": 0.90
            }
        )
        
        update = InvestigationStateUpdate(progress=progress)
        changes = apply_state_updates(state, update)
        
        # Verify transaction_scores were stored
        progress_dict = json.loads(state.progress_json)
        assert "transaction_scores" in progress_dict
        assert progress_dict["transaction_scores"]["tx_1"] == 0.75
        assert progress_dict["transaction_scores"]["tx_2"] == 0.35
        assert progress_dict["transaction_scores"]["tx_3"] == 0.90
    
    def test_validate_transaction_scores_range(self):
        """Test that transaction_scores outside [0.0, 1.0] are excluded."""
        state = Mock(spec=InvestigationState)
        state.investigation_id = "inv_123"
        state.progress_json = json.dumps({})
        state.version = 1
        
        progress = InvestigationProgress(
            transaction_scores={
                "tx_1": 0.75,  # Valid
                "tx_2": 1.5,   # Invalid (> 1.0)
                "tx_3": -0.1,  # Invalid (< 0.0)
                "tx_4": 0.5    # Valid
            }
        )
        
        update = InvestigationStateUpdate(progress=progress)
        changes = apply_state_updates(state, update)
        
        # Verify only valid scores were stored
        progress_dict = json.loads(state.progress_json)
        assert "transaction_scores" in progress_dict
        assert "tx_1" in progress_dict["transaction_scores"]
        assert "tx_4" in progress_dict["transaction_scores"]
        assert "tx_2" not in progress_dict["transaction_scores"]
        assert "tx_3" not in progress_dict["transaction_scores"]
    
    def test_remove_transaction_scores_if_all_invalid(self):
        """Test that transaction_scores key is removed if all scores are invalid."""
        state = Mock(spec=InvestigationState)
        state.investigation_id = "inv_123"
        state.progress_json = json.dumps({})
        state.version = 1
        
        progress = InvestigationProgress(
            transaction_scores={
                "tx_1": 1.5,   # Invalid
                "tx_2": -0.1   # Invalid
            }
        )
        
        update = InvestigationStateUpdate(progress=progress)
        changes = apply_state_updates(state, update)
        
        # Verify transaction_scores key was removed
        progress_dict = json.loads(state.progress_json)
        assert "transaction_scores" not in progress_dict
    
    def test_handle_invalid_transaction_scores_type(self):
        """Test handling of invalid transaction_scores type."""
        state = Mock(spec=InvestigationState)
        state.investigation_id = "inv_123"
        state.progress_json = json.dumps({})
        state.version = 1
        
        # Create progress with invalid transaction_scores type (not a dict)
        progress_dict = {
            "transaction_scores": "not_a_dict"  # Invalid type
        }
        progress = InvestigationProgress(**progress_dict)
        
        update = InvestigationStateUpdate(progress=progress)
        changes = apply_state_updates(state, update)
        
        # Verify transaction_scores were not stored (invalid type)
        final_progress = json.loads(state.progress_json)
        assert "transaction_scores" not in final_progress

