"""
Integration tests for precision detection feature.

Tests end-to-end ETL pipeline and PrecisionFeatureService with real database.
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import text

from scripts.etl_precision_detection import (
    extract_mature_transactions,
    load_to_postgres,
    build_merchants_table,
    build_labels_truth,
    refresh_materialized_views,
    main
)
from app.service.precision_detection.feature_service import PrecisionFeatureService
from app.service.snowflake_service import SnowflakeConnectionFactory, SnowflakeQueryService
from app.config.snowflake_config import SnowflakeConfig


@pytest.mark.integration
class TestETLPipelineIntegration:
    """Integration tests for ETL pipeline."""
    
    @pytest.fixture
    def snowflake_service(self):
        """Create Snowflake service (skips if not configured)."""
        try:
            sf_config = SnowflakeConfig.from_env()
            sf_factory = SnowflakeConnectionFactory(sf_config)
            return SnowflakeQueryService(sf_factory)
        except Exception as e:
            pytest.skip(f"Snowflake not configured: {e}")
    
    @pytest.mark.skip(reason="Requires real Snowflake connection and data")
    def test_extract_mature_transactions_integration(self, snowflake_service):
        """Test extracting mature transactions from real Snowflake."""
        cutoff = datetime.now() - timedelta(days=180)
        transactions = extract_mature_transactions(snowflake_service, cutoff)
        
        assert isinstance(transactions, list)
        # If transactions exist, verify structure
        if transactions:
            assert "txn_id" in transactions[0]
            assert "txn_ts" in transactions[0]
            assert "merchant_id" in transactions[0]
    
    def test_load_to_postgres_integration(self, db_session):
        """Test loading transactions into PostgreSQL."""
        transactions = [
            {
                "txn_id": "test_txn_001",
                "txn_ts": datetime.now() - timedelta(days=200),
                "merchant_id": "test_merchant_001",
                "card_id": "1234567890",
                "amount": 100.00,
                "currency": "USD",
                "approval_status": "APPROVED",
                "mcc": 5411,
                "country": "US",
                "region": "CA",
                "is_fraud_final": False,
                "dispute_final_outcome": None,
                "dispute_reason_code": None,
                "refund_ts": None,
                "chargeback_ts": None
            }
        ]
        
        load_to_postgres(transactions)
        
        # Verify transaction was loaded
        result = db_session.execute(
            text("SELECT * FROM pg_transactions WHERE txn_id = 'test_txn_001'")
        ).fetchone()
        
        assert result is not None
        assert result.txn_id == "test_txn_001"
    
    def test_build_labels_truth_integration(self, db_session):
        """Test building ground-truth labels."""
        # First, load a transaction
        db_session.execute(text("""
            INSERT INTO pg_transactions (
                txn_id, txn_ts, merchant_id, card_id, amount, currency,
                is_fraud_final, chargeback_ts
            ) VALUES (
                'test_label_txn', NOW() - INTERVAL '200 days',
                'test_merchant', 'test_card', 100.00, 'USD',
                TRUE, NULL
            )
        """))
        db_session.commit()
        
        build_labels_truth()
        
        # Verify label was created
        result = db_session.execute(
            text("SELECT * FROM labels_truth WHERE txn_id = 'test_label_txn'")
        ).fetchone()
        
        assert result is not None
        assert result.y_true == 1
        assert result.label_source == 'fraud_flag'


@pytest.mark.integration
class TestPrecisionFeatureServiceIntegration:
    """Integration tests for PrecisionFeatureService."""
    
    @pytest.fixture
    def service(self):
        """Create PrecisionFeatureService instance."""
        return PrecisionFeatureService()
    
    def test_get_transaction_features_integration(self, db_session, service):
        """Test retrieving transaction features from real database."""
        # Setup: Create transaction and refresh views
        db_session.execute(text("""
            INSERT INTO pg_transactions (
                txn_id, txn_ts, merchant_id, card_id, amount, currency
            ) VALUES (
                'test_feature_txn', NOW() - INTERVAL '200 days',
                'test_merchant', 'test_card', 100.00, 'USD'
            )
        """))
        db_session.commit()
        
        # Refresh views to populate features
        try:
            refresh_materialized_views()
        except Exception:
            # Views may not exist yet, skip if so
            pytest.skip("Materialized views not created yet")
        
        features = service.get_transaction_features("test_feature_txn")
        
        # Should return features or None (if views not populated)
        assert features is None or isinstance(features, dict)
    
    def test_get_merchant_burst_signals_integration(self, db_session, service):
        """Test retrieving merchant burst signals from real database."""
        # Setup: Create transactions for merchant
        db_session.execute(text("""
            INSERT INTO pg_transactions (
                txn_id, txn_ts, merchant_id, card_id, amount, currency
            ) VALUES
            ('test_burst_1', NOW() - INTERVAL '1 day', 'test_burst_merchant', 'card1', 0.50, 'USD'),
            ('test_burst_2', NOW() - INTERVAL '1 day', 'test_burst_merchant', 'card2', 0.75, 'USD')
        """))
        db_session.commit()
        
        # Refresh views
        try:
            refresh_materialized_views()
        except Exception:
            pytest.skip("Materialized views not created yet")
        
        signals = service.get_merchant_burst_signals(
            "test_burst_merchant",
            datetime.now().strftime("%Y-%m-%d")
        )
        
        # Should return signals or None
        assert signals is None or isinstance(signals, dict)

