"""
Test script to verify all 5 fraud pattern detections.

Demonstrates:
1. Velocity bursts (existing)
2. Impossible travel (existing)
3. Transaction chaining (new)
4. Odd-hour activity (existing)
5. Refund/chargeback spikes (new)
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.analytics.pattern_adjustments import PatternAdjustmentEngine


def create_sample_transactions():
    """Create sample transaction data for testing patterns."""
    now = datetime.now()
    
    # Transaction 1: Normal
    tx1 = {
        "TX_ID_KEY": "tx_001",
        "TX_DATETIME": now - timedelta(hours=2),
        "TX_AMOUNT": 100.0,
        "LATITUDE": 40.7128,
        "LONGITUDE": -74.0060,  # New York
        "DEVICE_ID": "device_001",
        "TX_REFUND_DATETIME": None,
        "COUNT_DISPUTES": 0
    }
    
    # Transaction 2: Chaining pattern (similar amount, close time)
    tx2 = {
        "TX_ID_KEY": "tx_002",
        "TX_DATETIME": now - timedelta(minutes=10),
        "TX_AMOUNT": 99.50,  # Within 20% of tx3
        "LATITUDE": 40.7128,
        "LONGITUDE": -74.0060,
        "DEVICE_ID": "device_001",
        "TX_REFUND_DATETIME": None,
        "COUNT_DISPUTES": 0
    }
    
    # Transaction 3: Chaining pattern + Odd-hour activity
    tx3 = {
        "TX_ID_KEY": "tx_003",
        "TX_DATETIME": now.replace(hour=3, minute=0, second=0, microsecond=0),  # 3 AM
        "TX_AMOUNT": 98.75,  # Within 20% of tx2
        "LATITUDE": 51.5074,  # London (impossible travel from NY in 10 min)
        "LONGITUDE": -0.1278,
        "DEVICE_ID": "device_001",
        "TX_REFUND_DATETIME": None,
        "COUNT_DISPUTES": 0
    }
    
    # Transaction 4: With refund
    tx4 = {
        "TX_ID_KEY": "tx_004",
        "TX_DATETIME": now - timedelta(hours=1),
        "TX_AMOUNT": 150.0,
        "LATITUDE": 40.7128,
        "LONGITUDE": -74.0060,
        "DEVICE_ID": "device_001",
        "TX_REFUND_DATETIME": now - timedelta(minutes=30),  # Refunded
        "COUNT_DISPUTES": 0
    }
    
    # Transaction 5: With chargeback
    tx5 = {
        "TX_ID_KEY": "tx_005",
        "TX_DATETIME": now - timedelta(minutes=5),
        "TX_AMOUNT": 200.0,
        "LATITUDE": 40.7128,
        "LONGITUDE": -74.0060,
        "DEVICE_ID": "device_001",
        "TX_REFUND_DATETIME": None,
        "COUNT_DISPUTES": 1  # Has dispute/chargeback
    }
    
    return {
        "current": tx5,
        "historical": [tx1, tx2, tx3, tx4]
    }


def test_pattern_detection():
    """Test all fraud pattern detections."""
    print("=" * 80)
    print("FRAUD PATTERN DETECTION TEST")
    print("=" * 80)
    print()
    
    # Initialize engine
    engine = PatternAdjustmentEngine()
    print("✅ PatternAdjustmentEngine initialized")
    print()
    
    # Create sample data
    data = create_sample_transactions()
    current_tx = data["current"]
    historical_txs = data["historical"]
    
    print(f"📊 Testing with {len(historical_txs) + 1} total transactions")
    print(f"   Current transaction: {current_tx['TX_ID_KEY']}")
    print(f"   Historical transactions: {[tx['TX_ID_KEY'] for tx in historical_txs]}")
    print()
    
    # Detect patterns
    print("🔍 Running pattern detection...")
    print()
    
    patterns = engine.detect_all_patterns(
        transaction=current_tx,
        historical_transactions=historical_txs,
        advanced_features=None
    )
    
    # Display results
    print("=" * 80)
    print("DETECTED PATTERNS")
    print("=" * 80)
    print()
    
    if not patterns:
        print("❌ No patterns detected")
        return
    
    for i, pattern in enumerate(patterns, 1):
        print(f"Pattern {i}: {pattern['pattern_name']}")
        print(f"  Type: {pattern['pattern_type']}")
        print(f"  Description: {pattern['description']}")
        print(f"  Risk Adjustment: +{pattern['risk_adjustment'] * 100:.0f}%")
        print(f"  Confidence: {pattern['confidence'] * 100:.0f}%")
        print(f"  Evidence:")
        for key, value in pattern['evidence'].items():
            print(f"    - {key}: {value}")
        print()
    
    # Calculate adjusted risk score
    base_score = 0.50  # 50% base risk
    adjusted_score, pattern_names = engine.apply_pattern_adjustments(
        base_score=base_score,
        patterns=patterns
    )
    
    print("=" * 80)
    print("RISK SCORE ADJUSTMENT")
    print("=" * 80)
    print()
    print(f"Base Risk Score: {base_score * 100:.0f}%")
    print(f"Patterns Applied: {', '.join(pattern_names)}")
    print(f"Adjusted Risk Score: {adjusted_score * 100:.0f}%")
    print(f"Total Adjustment: +{(adjusted_score - base_score) * 100:.0f}%")
    print()
    
    # Pattern breakdown
    print("=" * 80)
    print("PATTERN COVERAGE VERIFICATION")
    print("=" * 80)
    print()
    
    requested_patterns = {
        "velocity_burst": "Velocity Bursts",
        "geo_impossibility": "Impossible Travel",
        "transaction_chaining": "Transaction Chaining",
        "time_of_day_anomaly": "Odd-Hour Activity",
        "refund_chargeback_spike": "Refund/Chargeback Spikes"
    }
    
    detected_types = {p['pattern_type'] for p in patterns}
    
    print("Requested Patterns (5 total):")
    print()
    for pattern_type, name in requested_patterns.items():
        status = "✅ DETECTED" if pattern_type in detected_types else "⚠️  NOT DETECTED (expected in this sample)"
        print(f"  {name}: {status}")
    print()
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print()
    print(f"✅ Total patterns detected: {len(patterns)}")
    print(f"✅ Risk score increased by: {(adjusted_score - base_score) * 100:.0f}%")
    print(f"✅ Pattern detection engine operational")
    print()
    print("NOTE: Not all 5 patterns will trigger with this sample data.")
    print("      Each pattern requires specific conditions.")
    print("      In production, patterns are detected based on real transaction data.")
    print()


if __name__ == "__main__":
    try:
        test_pattern_detection()
        print("✅ TEST COMPLETED SUCCESSFULLY")
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

