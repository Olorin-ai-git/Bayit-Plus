#!/usr/bin/env python3
"""
Test Domain Agent Execution

This script runs a test investigation to verify domain agents now execute properly.
"""

import asyncio
import json
import os
import sys
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_investigation_with_domain_agents():
    """Run a test investigation and monitor domain agent execution"""
    print("🧪 Testing Investigation with Domain Agents")
    print("=" * 60)

    try:
        # First verify hybrid graph is still enabled
        from app.service.agent.orchestration.hybrid.migration_utilities import (
            get_feature_flags,
        )

        feature_flags = get_feature_flags()
        hybrid_enabled = feature_flags.is_enabled(
            "hybrid_graph_v1", "test-investigation"
        )

        print(
            f"🔍 Hybrid graph status: {'✅ ENABLED' if hybrid_enabled else '❌ DISABLED'}"
        )

        if not hybrid_enabled:
            print("❌ Hybrid graph is disabled - cannot test domain agents")
            return False

        # Import required modules for creating a test investigation
        from langchain_core.messages import HumanMessage

        from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
            create_hybrid_initial_state,
        )
        from app.service.agent.orchestration.hybrid.migration_utilities import (
            get_investigation_graph,
        )

        # Create test investigation
        investigation_id = f"test-investigation-{int(time.time())}"
        entity_type = "ip"
        entity_value = "192.168.1.100"

        print(f"📋 Test Investigation Details:")
        print(f"   ID: {investigation_id}")
        print(f"   Entity Type: {entity_type}")
        print(f"   Entity Value: {entity_value}")

        # Get the hybrid graph
        print(f"\n🔧 Creating hybrid graph...")
        graph = await get_investigation_graph(
            investigation_id=investigation_id, entity_type=entity_type
        )

        if not graph:
            print("❌ Failed to create graph")
            return False

        print("✅ Graph created successfully")

        # Create initial state
        messages = [
            HumanMessage(
                content=f"Investigate potential fraud for IP address {entity_value}"
            )
        ]

        # Create proper investigation context
        investigation_context = {
            "investigation_id": investigation_id,
            "entity_type": entity_type,
            "entity_value": entity_value,
            "request_source": "debug_test",
            "timestamp": time.time(),
        }

        initial_state = create_hybrid_initial_state(
            messages=messages,
            investigation_id=investigation_id,
            entity_type=entity_type,
            investigation_context=investigation_context,
        )

        print(f"✅ Initial state created")

        # Create minimal config for execution
        class TestConfig:
            configurable = {
                "investigation_id": investigation_id,
                "thread_id": f"test-thread-{investigation_id}",
                "agent_context": None,
                "request": None,
            }

        config = TestConfig()

        print(f"\n🚀 Starting investigation execution...")
        print(f"   This should take 30-60 seconds if domain agents execute...")

        start_time = time.time()

        try:
            result = await graph.ainvoke(initial_state, config=config)
            duration = time.time() - start_time

            print(f"\n✅ Investigation completed in {duration:.2f} seconds")

            # Analyze the result
            if result:
                # Check for phase results indicating domain agent execution
                phase_results = getattr(result, "phase_results", {})

                print(f"\n📊 Execution Analysis:")
                print(f"   Total duration: {duration:.2f}s")
                print(f"   Phase results found: {len(phase_results)}")

                # Check for domain agent results
                domain_phases = [
                    "network_agent",
                    "device_agent",
                    "location_agent",
                    "logs_agent",
                    "authentication_agent",
                    "risk_agent",
                ]
                executed_domains = []

                for domain in domain_phases:
                    if domain in phase_results:
                        executed_domains.append(domain)
                        phase_result = phase_results[domain]

                        # Extract execution details
                        status = phase_result.get("status", "unknown")
                        duration_phase = phase_result.get("duration", 0)

                        print(f"   🤖 {domain}: {status} ({duration_phase:.2f}s)")

                if executed_domains:
                    print(
                        f"\n🎉 SUCCESS! {len(executed_domains)} domain agents executed:"
                    )
                    for domain in executed_domains:
                        print(f"   ✅ {domain}")

                    # Check investigation quality
                    investigation_metadata = getattr(
                        result, "investigation_metadata", {}
                    )
                    quality_score = investigation_metadata.get(
                        "quality_score", "unknown"
                    )
                    evidence_sources = investigation_metadata.get("evidence_sources", 0)

                    print(f"\n📈 Investigation Quality:")
                    print(f"   Quality score: {quality_score}")
                    print(f"   Evidence sources: {evidence_sources}")

                    if isinstance(quality_score, (int, float)) and quality_score >= 70:
                        print(f"   ✅ Quality threshold met (≥70)")
                    else:
                        print(f"   ⚠️ Quality below threshold (<70)")

                    return True
                else:
                    print(f"\n❌ ISSUE: No domain agents executed!")
                    print(f"   Duration too short: {duration:.2f}s (expected 30-60s)")
                    print(f"   Available phases: {list(phase_results.keys())}")
                    return False
            else:
                print(f"❌ No result returned from investigation")
                return False

        except Exception as e:
            duration = time.time() - start_time
            print(f"\n❌ Investigation failed after {duration:.2f}s: {e}")
            import traceback

            traceback.print_exc()
            return False

    except Exception as e:
        print(f"❌ Error in test setup: {e}")
        import traceback

        traceback.print_exc()
        return False


async def main():
    """Main test function"""
    print("🔍 Domain Agent Execution Test")
    print("=" * 60)
    print("Testing if domain agents now execute after enabling hybrid graph...")

    success = await test_investigation_with_domain_agents()

    print(f"\n{'='*60}")
    if success:
        print("🎉 TEST PASSED!")
        print("✅ Domain agents are executing properly")
        print("✅ Investigation system is working correctly")
    else:
        print("❌ TEST FAILED!")
        print("❌ Domain agents are still not executing")
        print("🔧 Further investigation required")

    print(f"\n💡 If test failed, next steps:")
    print(f"   1. Check hybrid graph routing logic")
    print(f"   2. Examine domain agent node connections")
    print(f"   3. Debug graph execution flow")


if __name__ == "__main__":
    asyncio.run(main())
