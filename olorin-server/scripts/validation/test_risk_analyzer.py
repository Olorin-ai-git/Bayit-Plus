#!/usr/bin/env python3
"""
Test script for Risk Analyzer with new TXS table.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_risk_analyzer():
    """Test the risk analyzer with TXS table."""
    print("\n" + "=" * 80)
    print("TESTING RISK ANALYZER WITH TXS TABLE")
    print("=" * 80)

    # Check configuration
    print("\n📋 Configuration:")
    print(f"   DATABASE_PROVIDER: {os.getenv('DATABASE_PROVIDER', 'NOT SET')}")
    print(f"   USE_SNOWFLAKE: {os.getenv('USE_SNOWFLAKE', 'NOT SET')}")
    print(f"   SNOWFLAKE_DATABASE: {os.getenv('SNOWFLAKE_DATABASE', 'NOT SET')}")
    print(f"   SNOWFLAKE_SCHEMA: {os.getenv('SNOWFLAKE_SCHEMA', 'NOT SET')}")
    print(
        f"   SNOWFLAKE_TRANSACTIONS_TABLE: {os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'NOT SET')}"
    )

    try:
        analyzer = get_risk_analyzer()

        # Test 1: Get top risk entities (14d window, grouped by email)
        print("\n🔍 Test 1: Get top risk entities (14d, grouped by EMAIL)")
        print("-" * 80)
        result1 = await analyzer.get_top_risk_entities(
            time_window="14d", group_by="EMAIL", top_percentage=10.0, force_refresh=True
        )

        if result1.get("status") == "success":
            entities = result1.get("entities", [])
            summary = result1.get("summary", {})
            print(f"   ✅ Success! Found {len(entities)} entities")
            print(f"   📊 Summary:")
            print(f"      - Total entities: {summary.get('total_entities', 0)}")
            print(f"      - Total transactions: {summary.get('total_transactions', 0)}")
            print(f"      - Total amount: ${summary.get('total_amount', 0):,.2f}")
            print(f"      - Total fraud: {summary.get('total_fraud', 0)}")
            print(f"      - Fraud rate: {summary.get('fraud_rate', 0):.2f}%")

            if entities:
                print(f"\n   🏆 Top 5 entities:")
                for i, entity in enumerate(entities[:5], 1):
                    print(f"      {i}. {entity.get('entity', 'N/A')[:50]}")
                    print(
                        f"         Risk Score: {entity.get('risk_score', 0):.3f}, "
                        f"Transactions: {entity.get('transaction_count', 0)}, "
                        f"Amount: ${entity.get('total_amount', 0):,.2f}"
                    )
        else:
            print(f"   ❌ Failed: {result1.get('error', 'Unknown error')}")
            print(f"   Exception type: {result1.get('exception_type', 'N/A')}")
            return 1

        # Test 2: Analyze specific entity
        if entities:
            test_entity = entities[0].get("entity")
            print(f"\n🔍 Test 2: Analyze specific entity ({test_entity})")
            print("-" * 80)
            result2 = await analyzer.analyze_entity(
                entity_value=test_entity, entity_type="EMAIL", time_window="7d"
            )

            if result2.get("status") == "success":
                profile = result2.get("profile", {})
                risk = result2.get("risk_assessment", {})
                print(f"   ✅ Success!")
                print(f"   📊 Profile:")
                print(f"      - Transactions: {profile.get('transaction_count', 0)}")
                print(f"      - Total amount: ${profile.get('total_amount', 0):,.2f}")
                print(f"      - Avg risk score: {profile.get('avg_risk_score', 0):.3f}")
                print(f"      - Fraud count: {profile.get('fraud_count', 0)}")
                print(f"      - Unique merchants: {profile.get('unique_merchants', 0)}")
                print(f"      - Unique cards: {profile.get('unique_cards', 0)}")
                print(f"      - Unique IPs: {profile.get('unique_ips', 0)}")
                print(f"      - Unique devices: {profile.get('unique_devices', 0)}")
                print(f"   ⚠️  Risk Assessment:")
                print(f"      - Risk level: {risk.get('risk_level', 'N/A')}")
                print(f"      - Risk score: {risk.get('risk_score', 0):.3f}")
                print(f"      - Fraud rate: {risk.get('fraud_rate', 0):.2f}%")
            else:
                print(f"   ❌ Failed: {result2.get('error', 'Unknown error')}")

        print("\n" + "=" * 80)
        print("✅ RISK ANALYZER TEST COMPLETED")
        print("=" * 80 + "\n")
        return 0

    except Exception as e:
        print(f"\n❌ TEST FAILED!")
        print(f"   Error: {e}")
        print(f"   Type: {type(e).__name__}")
        import traceback

        print(f"\nTraceback:")
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(test_risk_analyzer())
    sys.exit(exit_code)
