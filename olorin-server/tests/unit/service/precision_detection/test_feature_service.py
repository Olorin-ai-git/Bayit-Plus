"""
Unit tests for PrecisionFeatureService.

Tests feature retrieval, merchant burst signals, and model scores.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from app.service.precision_detection.feature_service import PrecisionFeatureService


class TestPrecisionFeatureService:
    """Unit tests for PrecisionFeatureService."""
    
    @pytest.fixture
    def service(self):
        """Create PrecisionFeatureService instance."""
        return PrecisionFeatureService()
    
    @patch('app.service.precision_detection.feature_service.get_db_session')
    def test_get_transaction_features_success(self, mock_get_db_session, service):
        """Test retrieving transaction features successfully."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None
        
        # Mock feature row
        mock_row = Mock()
        mock_row._mapping = {
            "txn_id": "txn_001",
            "merchant_id": "merchant_001",
            "is_burst_cardtest": True,
            "z_unique_cards_30d": 2.5,
            "z_amt_card": 1.2
        }
        mock_db.execute.return_value.fetchone.return_value = mock_row
        
        # Mock model score
        with patch.object(service, 'get_model_score', return_value=0.75):
            features = service.get_transaction_features("txn_001")
        
        assert features is not None
        assert features["txn_id"] == "txn_001"
        assert features["is_burst_cardtest"] is True
        assert features["model_score"] == 0.75
    
    @patch('app.service.precision_detection.feature_service.get_db_session')
    def test_get_transaction_features_not_found(self, mock_get_db_session, service):
        """Test retrieving features for non-existent transaction."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None
        
        mock_db.execute.return_value.fetchone.return_value = None
        
        features = service.get_transaction_features("txn_nonexistent")
        
        assert features is None
    
    def test_get_transaction_features_empty_txn_id(self, service):
        """Test retrieving features with empty txn_id raises ValueError."""
        with pytest.raises(ValueError, match="txn_id cannot be empty"):
            service.get_transaction_features("")
    
    @patch('app.service.precision_detection.feature_service.get_db_session')
    def test_get_merchant_burst_signals_success(self, mock_get_db_session, service):
        """Test retrieving merchant burst signals successfully."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None
        
        # Mock burst signals row
        mock_row = Mock()
        mock_row.merchant_id = "merchant_001"
        mock_row.d = datetime(2024, 1, 15)
        mock_row.is_burst_cardtest = True
        mock_row.tiny_amt_rate = 0.6
        mock_row.z_uniq_cards = 3.2
        
        mock_db.execute.return_value.fetchone.return_value = mock_row
        
        signals = service.get_merchant_burst_signals("merchant_001", "2024-01-15")
        
        assert signals is not None
        assert signals["merchant_id"] == "merchant_001"
        assert signals["is_burst_cardtest"] is True
        assert signals["z_unique_cards_30d"] == 3.2
    
    def test_get_merchant_burst_signals_invalid_date(self, service):
        """Test retrieving burst signals with invalid date format."""
        with pytest.raises(ValueError, match="Invalid date format"):
            service.get_merchant_burst_signals("merchant_001", "invalid-date")
    
    def test_get_merchant_burst_signals_empty_merchant_id(self, service):
        """Test retrieving burst signals with empty merchant_id."""
        with pytest.raises(ValueError, match="merchant_id cannot be empty"):
            service.get_merchant_burst_signals("", "2024-01-15")
    
    @patch('app.service.precision_detection.feature_service.get_db_session')
    def test_get_model_score_success(self, mock_get_db_session, service):
        """Test retrieving model score successfully."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None
        
        # Mock model score row
        mock_row = Mock()
        mock_row.score = 0.85
        
        mock_db.execute.return_value.fetchone.return_value = mock_row
        
        score = service.get_model_score("txn_001")
        
        assert score == 0.85
    
    @patch('app.service.precision_detection.feature_service.get_db_session')
    def test_get_model_score_not_found(self, mock_get_db_session, service):
        """Test retrieving model score for transaction without score."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None
        
        mock_db.execute.return_value.fetchone.return_value = None
        
        score = service.get_model_score("txn_001")
        
        assert score is None
    
    def test_get_model_score_empty_txn_id(self, service):
        """Test retrieving model score with empty txn_id."""
        with pytest.raises(ValueError, match="txn_id cannot be empty"):
            service.get_model_score("")

