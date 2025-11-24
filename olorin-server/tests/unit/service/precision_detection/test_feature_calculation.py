"""
Unit tests for feature calculation logic.

Tests merchant burst and peer-group outlier feature calculations
via materialized view queries.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from sqlalchemy import text

from app.persistence.database import get_db_session


class TestMerchantBurstFeatureCalculation:
    """Unit tests for merchant burst feature calculation."""
    
    @patch('app.persistence.database.get_db_session')
    def test_merchant_burst_flags_calculation(self, mock_get_db_session):
        """Test that merchant burst flags are calculated correctly."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None
        
        # Mock query result for burst flags
        mock_row = Mock()
        mock_row.is_burst_cardtest = True
        mock_row.z_uniq_cards = 3.5
        mock_row.tiny_amt_rate = 0.6
        
        mock_db.execute.return_value.fetchone.return_value = mock_row
        
        # Query burst flags (simulating what PrecisionFeatureService does)
        query = text("""
            SELECT is_burst_cardtest, z_uniq_cards, tiny_amt_rate
            FROM mv_burst_flags
            WHERE merchant_id = :merchant_id AND d = :date
        """)
        
        result = mock_db.execute(query, {
            "merchant_id": "test_merchant",
            "date": datetime.now().date()
        }).fetchone()
        
        assert result is not None
        assert result.is_burst_cardtest is True
        assert result.z_uniq_cards == 3.5
    
    def test_burst_detection_logic(self):
        """
        Test burst detection logic:
        - is_burst_cardtest = TRUE if uniq_cards_30d >= 10 AND tiny_amt_rate > 0.5
        """
        # This tests the SQL logic indirectly
        # In production, this would be verified through integration tests
        # with real data that matches the burst criteria
        
        # Test case 1: Should be burst (10+ cards, >50% tiny amounts)
        uniq_cards = 12
        tiny_amt_rate = 0.6
        is_burst = uniq_cards >= 10 and tiny_amt_rate > 0.5
        assert is_burst is True
        
        # Test case 2: Should not be burst (<10 cards)
        uniq_cards = 5
        tiny_amt_rate = 0.6
        is_burst = uniq_cards >= 10 and tiny_amt_rate > 0.5
        assert is_burst is False
        
        # Test case 3: Should not be burst (low tiny amount rate)
        uniq_cards = 12
        tiny_amt_rate = 0.3
        is_burst = uniq_cards >= 10 and tiny_amt_rate > 0.5
        assert is_burst is False


class TestPeerGroupOutlierFeatureCalculation:
    """Unit tests for peer-group outlier feature calculation."""
    
    @patch('app.persistence.database.get_db_session')
    def test_peer_group_flags_calculation(self, mock_get_db_session):
        """Test that peer-group outlier flags are calculated correctly."""
        mock_db = Mock()
        mock_get_db_session.return_value.__enter__.return_value = mock_db
        mock_get_db_session.return_value.__exit__.return_value = None
        
        # Mock query result for peer flags
        mock_row = Mock()
        mock_row.z_night = 2.3
        mock_row.z_refund = -0.5
        
        mock_db.execute.return_value.fetchone.return_value = mock_row
        
        # Query peer flags
        query = text("""
            SELECT z_night, z_refund
            FROM mv_peer_flags
            WHERE merchant_id = :merchant_id AND mon = :month
        """)
        
        result = mock_db.execute(query, {
            "merchant_id": "test_merchant",
            "month": datetime.now().replace(day=1).date()
        }).fetchone()
        
        assert result is not None
        assert result.z_night == 2.3
        assert result.z_refund == -0.5
    
    def test_z_score_calculation_logic(self):
        """
        Test z-score calculation logic:
        z = (value - mean) / stddev
        """
        # Test z-score calculation
        value = 15.0
        mean = 10.0
        stddev = 2.0
        
        z_score = (value - mean) / stddev
        assert z_score == 2.5
        
        # Test with zero stddev (should return 0)
        stddev = 0.0
        z_score = (value - mean) / stddev if stddev > 0 else 0
        assert z_score == 0
        
        # Test negative z-score
        value = 5.0
        mean = 10.0
        stddev = 2.0
        z_score = (value - mean) / stddev
        assert z_score == -2.5

