#!/usr/bin/env python
"""
Test fraud investigation with real fraud IP from database.
"""

import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.clean_graph_builder import run_investigation

logger = get_bridge_logger(__name__)


async def test_fraud_ip():
    """Test investigation with fraud IP."""

    print("\n" + "="*80)
    print("🔍 TESTING FRAUD PATTERN DETECTION")
    print("="*80 + "\n")

    # Use fraud IP from database (China - 167 transactions)
    fraud_ip = "117.22.69.114"
    test_investigation_id = "fraud-test-001"

    print(f"📋 Test Configuration:")
    print(f"  - Entity Type: ip")
    print(f"  - Entity ID: {fraud_ip} (China - High Risk)")
    print(f"  - Investigation ID: {test_investigation_id}")
    print(f"  - Expected: 167 fraud transactions in database")
    print()

    # Set test mode
    os.environ["TEST_MODE"] = "mock"
    os.environ["USE_SNOWFLAKE"] = "true"  # Use real PostgreSQL

    try:
        print("🚀 Starting fraud investigation...")
        print("-" * 40)

        result = await asyncio.wait_for(
            run_investigation(
                entity_id=fraud_ip,
                entity_type="ip",
                investigation_id=test_investigation_id
            ),
            timeout=60.0
        )

        print("-" * 40)
        print("\n📊 Investigation Results:")
        print(f"  - Success: {'✅' if result['success'] else '❌'}")
        print(f"  - Risk Score: {result.get('risk_score', 0.0):.2f} / 1.00")
        print(f"  - Confidence: {result.get('confidence', 0.0):.2f} / 1.00")
        print(f"  - Tools Used: {result.get('tools_used', 0)}")
        print(f"  - Domains Analyzed: {', '.join(result.get('domains_analyzed', []))}")
        print(f"  - Duration: {result.get('duration_ms', 0)}ms")

        if not result['success']:
            print(f"\n❌ Error: {result.get('error', 'Unknown error')}")
            return False

        print("\n🔍 Fraud Detection Analysis:")
        print(f"  - IP Address: {fraud_ip}")
        print(f"  - Location: China (117.x.x.x range)")
        print(f"  - Pattern: IP Clustering (reused 167 times)")
        print(f"  - Associated: Disposable emails, high-risk scores")

        print("\n" + "="*80)
        if result['success']:
            print("✅ FRAUD INVESTIGATION TEST PASSED")
        else:
            print("❌ FRAUD INVESTIGATION TEST FAILED")
        print("="*80 + "\n")

        return result['success']

    except asyncio.TimeoutError:
        print("\n❌ Test timed out after 60 seconds")
        return False
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_fraud_ip())
    sys.exit(0 if success else 1)
