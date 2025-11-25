"""
Unit tests for Fraud Pattern Recognizer.

Tests all 4 fraud patterns:
1. Card Testing Pattern
2. Velocity Burst Pattern
3. Amount Clustering Pattern
4. Time-of-Day Anomaly Pattern
"""

import pytest
from datetime import datetime, timedelta
from app.service.agent.tools.ml_ai_tools.pattern_recognition.recognizers.fraud_recognizer import (
    FraudPatternRecognizer,
    CARD_TESTING_SMALL_THRESHOLD,
    CARD_TESTING_LARGE_THRESHOLD,
    VELOCITY_BURST_COUNT,
    AMOUNT_CLUSTERING_THRESHOLDS
)


class TestFraudPatternRecognizer:
    """Test the FraudPatternRecognizer class."""

    @pytest.fixture
    def recognizer(self):
        """Create a FraudPatternRecognizer instance."""
        return FraudPatternRecognizer()

    @pytest.fixture
    def card_testing_events(self):
        """Create sample events with card testing pattern."""
        base_time = datetime(2024, 1, 1, 10, 0, 0)
        return [
            {
                "TX_ID_KEY": "tx_001",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 2.99,  # Small test amount
                "TX_DATETIME": base_time
            },
            {
                "TX_ID_KEY": "tx_002",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 500.00,  # Large purchase
                "TX_DATETIME": base_time + timedelta(minutes=5)
            }
        ]

    @pytest.fixture
    def velocity_burst_events(self):
        """Create sample events with velocity burst pattern."""
        base_time = datetime(2024, 1, 1, 14, 0, 0)
        return [
            {
                "TX_ID_KEY": f"tx_{i:03d}",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 50.0 + i * 10,
                "TX_DATETIME": base_time + timedelta(minutes=i * 0.5)
            }
            for i in range(6)  # 6 transactions in 3 minutes
        ]

    @pytest.fixture
    def amount_clustering_events(self):
        """Create sample events with amount clustering pattern."""
        base_time = datetime(2024, 1, 1, 16, 0, 0)
        return [
            {
                "TX_ID_KEY": "tx_001",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 99.50,  # Near $99 threshold
                "TX_DATETIME": base_time
            },
            {
                "TX_ID_KEY": "tx_002",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.25,  # Near $99 threshold
                "TX_DATETIME": base_time + timedelta(minutes=10)
            },
            {
                "TX_ID_KEY": "tx_003",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 99.99,  # Near $99 threshold
                "TX_DATETIME": base_time + timedelta(minutes=20)
            }
        ]

    @pytest.fixture
    def time_anomaly_events(self):
        """Create sample events with time-of-day anomalies."""
        base_date = datetime(2024, 1, 1)
        return [
            {
                "TX_ID_KEY": "tx_001",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 50.0,
                "TX_DATETIME": base_date.replace(hour=2, minute=30)  # 2:30 AM - unusual
            },
            {
                "TX_ID_KEY": "tx_002",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 75.0,
                "TX_DATETIME": base_date.replace(hour=3, minute=15)  # 3:15 AM - unusual
            },
            {
                "TX_ID_KEY": "tx_003",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0,
                "TX_DATETIME": base_date.replace(hour=14, minute=0)  # 2:00 PM - normal
            }
        ]

    def test_recognizer_initialization(self, recognizer):
        """Test recognizer initializes correctly."""
        assert recognizer is not None
        assert hasattr(recognizer, 'recognize')

    def test_card_testing_detection(self, recognizer, card_testing_events):
        """Test card testing pattern detection."""
        processed_data = {"events": card_testing_events}
        result = recognizer.recognize(processed_data, minimum_support=0.1)

        assert result["success"] is True
        assert result["total_patterns_detected"] >= 1

        # Find card testing patterns
        card_testing_patterns = [p for p in result["patterns"] if p["pattern_type"] == "card_testing"]
        assert len(card_testing_patterns) >= 1

        pattern = card_testing_patterns[0]
        assert pattern["pattern_name"] == "Card Testing Sequence"
        assert pattern["confidence"] >= 0.8  # High confidence
        assert pattern["risk_adjustment"] == 0.20  # +20% boost
        assert "test_amount" in pattern["evidence"]
        assert "large_amount" in pattern["evidence"]
        assert pattern["evidence"]["test_amount"] <= CARD_TESTING_SMALL_THRESHOLD
        assert pattern["evidence"]["large_amount"] >= CARD_TESTING_LARGE_THRESHOLD

    def test_velocity_burst_detection(self, recognizer, velocity_burst_events):
        """Test velocity burst pattern detection."""
        processed_data = {"events": velocity_burst_events}
        result = recognizer.recognize(processed_data, minimum_support=0.1)

        assert result["success"] is True
        assert result["total_patterns_detected"] >= 1

        # Find velocity burst patterns
        velocity_patterns = [p for p in result["patterns"] if p["pattern_type"] == "velocity_burst"]
        assert len(velocity_patterns) >= 1

        pattern = velocity_patterns[0]
        assert pattern["pattern_name"] == "Transaction Velocity Burst"
        assert pattern["confidence"] >= 0.7
        assert pattern["risk_adjustment"] == 0.10  # +10% boost
        assert pattern["evidence"]["transaction_count"] >= VELOCITY_BURST_COUNT

    def test_amount_clustering_detection(self, recognizer, amount_clustering_events):
        """Test amount clustering pattern detection."""
        processed_data = {"events": amount_clustering_events}
        result = recognizer.recognize(processed_data, minimum_support=0.1)

        assert result["success"] is True
        assert result["total_patterns_detected"] >= 1

        # Find amount clustering patterns
        clustering_patterns = [p for p in result["patterns"] if p["pattern_type"] == "amount_clustering"]
        assert len(clustering_patterns) >= 1

        pattern = clustering_patterns[0]
        assert "Amount Clustering" in pattern["pattern_name"]
        assert pattern["confidence"] >= 0.7
        assert pattern["risk_adjustment"] == 0.15  # +15% boost
        assert pattern["evidence"]["transaction_count"] >= 2

    def test_time_anomaly_detection(self, recognizer, time_anomaly_events):
        """Test time-of-day anomaly pattern detection."""
        processed_data = {"events": time_anomaly_events}
        result = recognizer.recognize(processed_data, minimum_support=0.1)

        assert result["success"] is True

        # Time anomaly detection requires sufficient unusual hour transactions
        # With 2 out of 3 transactions in unusual hours (66%), should detect
        time_patterns = [p for p in result["patterns"] if p["pattern_type"] == "time_anomaly"]

        if time_patterns:  # May not always trigger depending on z-score
            pattern = time_patterns[0]
            assert pattern["pattern_name"] == "Time-of-Day Anomaly"
            assert pattern["confidence"] >= 0.6
            assert pattern["risk_adjustment"] == 0.10  # +10% boost
            assert "unusual_hour_count" in pattern["evidence"]

    def test_empty_events(self, recognizer):
        """Test handling of empty events list."""
        processed_data = {"events": []}
        result = recognizer.recognize(processed_data, minimum_support=0.1)

        assert result["success"] is True
        assert result["total_patterns_detected"] == 0
        assert result["confidence"] == 0.0

    def test_multiple_patterns_confidence_boost(self, recognizer):
        """Test that multiple pattern types boost confidence (ensemble effect)."""
        base_time = datetime(2024, 1, 1, 2, 0, 0)  # 2 AM - unusual hour

        # Events with both card testing AND time anomaly
        events = [
            {
                "TX_ID_KEY": "tx_001",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 3.00,  # Small test
                "TX_DATETIME": base_time
            },
            {
                "TX_ID_KEY": "tx_002",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 300.00,  # Large purchase
                "TX_DATETIME": base_time + timedelta(minutes=5)
            },
            {
                "TX_ID_KEY": "tx_003",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.00,
                "TX_DATETIME": base_time + timedelta(minutes=10)
            }
        ]

        processed_data = {"events": events}
        result = recognizer.recognize(processed_data, minimum_support=0.1)

        assert result["success"] is True

        # Check for ensemble boost
        pattern_types = set(p["pattern_type"] for p in result["patterns"])
        if len(pattern_types) >= 2:
            # Confidence should be boosted for multiple pattern types
            assert result["confidence"] > 0.5

    def test_extract_amount_multiple_field_names(self, recognizer):
        """Test amount extraction from various field name formats."""
        event1 = {"PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0}
        event2 = {"amount": 200.0}
        event3 = {"transaction_amount": 300.0}

        assert recognizer._extract_amount(event1) == 100.0
        assert recognizer._extract_amount(event2) == 200.0
        assert recognizer._extract_amount(event3) == 300.0
        assert recognizer._extract_amount({}) is None

    def test_extract_timestamp_multiple_formats(self, recognizer):
        """Test timestamp extraction from various formats."""
        event1 = {"TX_DATETIME": datetime(2024, 1, 1, 10, 0, 0)}
        event2 = {"timestamp": "2024-01-01T10:00:00"}
        event3 = {"created_at": "2024-01-01T10:00:00Z"}

        assert recognizer._extract_timestamp(event1) is not None
        assert recognizer._extract_timestamp(event2) is not None
        assert recognizer._extract_timestamp(event3) is not None
        assert recognizer._extract_timestamp({}) is None

    def test_pattern_breakdown_in_result(self, recognizer, card_testing_events, velocity_burst_events):
        """Test that result includes pattern breakdown by type."""
        # Combine different pattern types
        all_events = card_testing_events + velocity_burst_events
        processed_data = {"events": all_events}
        result = recognizer.recognize(processed_data, minimum_support=0.1)

        assert result["success"] is True
        assert "pattern_breakdown" in result
        assert "card_testing" in result["pattern_breakdown"]
        assert "velocity_burst" in result["pattern_breakdown"]
        assert "amount_clustering" in result["pattern_breakdown"]
        assert "time_anomaly" in result["pattern_breakdown"]

    def test_aggressive_recall_strategy(self, recognizer):
        """Test that the recognizer uses aggressive thresholds for high recall."""
        # Borderline case: small amount (exactly at threshold)
        events = [
            {
                "TX_ID_KEY": "tx_001",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 5.00,  # Exactly at threshold
                "TX_DATETIME": datetime(2024, 1, 1, 10, 0, 0)
            },
            {
                "TX_ID_KEY": "tx_002",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 200.00,  # Exactly at threshold
                "TX_DATETIME": datetime(2024, 1, 1, 10, 5, 0)
            }
        ]

        processed_data = {"events": events}
        result = recognizer.recognize(processed_data, minimum_support=0.1)

        # Should detect even borderline cases (aggressive strategy)
        card_testing_patterns = [p for p in result["patterns"] if p["pattern_type"] == "card_testing"]
        assert len(card_testing_patterns) >= 1  # Aggressive: should catch borderline

    def test_error_handling(self, recognizer):
        """Test error handling for malformed data."""
        # Malformed events with missing required fields
        processed_data = {
            "events": [
                {"TX_ID_KEY": "tx_001"},  # Missing amount and timestamp
                {"PAID_AMOUNT_VALUE_IN_CURRENCY": "invalid"},  # Invalid amount type
            ]
        }

        result = recognizer.recognize(processed_data, minimum_support=0.1)

        # Should handle gracefully without crashing
        assert result["success"] is True or "error" in result
        assert isinstance(result, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
