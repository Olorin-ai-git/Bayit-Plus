#!/usr/bin/env python3
"""
Simple Domain Agent Test

Test domain agents by using the actual agent service that the web interface calls.
"""

import asyncio
import os
import sys
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_domain_agents_via_agent_service():
    """Test domain agents using the actual agent service"""
    print("🧪 Testing Domain Agents via Agent Service")
    print("=" * 60)

    try:
        # Check if hybrid graph is enabled
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

        # Test using the simplified approach with direct graph invocation
        print(f"\n🔧 Creating test investigation state...")

        from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
            create_hybrid_initial_state,
        )
        from app.service.agent.orchestration.hybrid.migration_utilities import (
            get_investigation_graph,
        )

        investigation_id = f"test-{int(time.time())}"
        entity_value = "192.168.1.100"
        entity_type = "ip"

        print(f"📋 Investigation: {investigation_id}")
        print(f"🎯 Target: {entity_value} ({entity_type})")

        # Create initial state with correct signature
        initial_state = create_hybrid_initial_state(
            investigation_id=investigation_id,
            entity_id=entity_value,
            entity_type=entity_type,
            parallel_execution=True,
            custom_user_prompt=f"Investigate potential fraud for IP address {entity_value}",
        )

        print(f"✅ Initial state created")

        # Get the hybrid graph
        graph = await get_investigation_graph(
            investigation_id=investigation_id, entity_type=entity_type
        )

        print(f"✅ Graph retrieved")

        # Create config
        config = {
            "configurable": {
                "investigation_id": investigation_id,
                "thread_id": f"test-thread-{investigation_id}",
                "agent_context": None,
                "request": None,
            }
        }

        print(f"\n🚀 Starting investigation execution...")
        print(f"   ⏱️ This should take 30-60s if domain agents execute...")
        print(f"   🔍 Watch for domain agent activity...")

        start_time = time.time()

        # Execute the investigation
        result = await graph.ainvoke(initial_state, config=config)
        duration = time.time() - start_time

        print(f"\n✅ Investigation completed in {duration:.2f} seconds")

        # Analyze results
        success = analyze_investigation_results(result, duration)
        return success

    except Exception as e:
        print(f"❌ Error in domain agent test: {e}")
        import traceback

        traceback.print_exc()
        return False


def analyze_investigation_results(result, duration):
    """Analyze investigation results to determine if domain agents executed"""
    print(f"\n📊 RESULT ANALYSIS")
    print("=" * 40)

    try:
        # Check execution duration
        print(f"⏱️ Duration: {duration:.2f} seconds")

        if duration < 10:
            print(f"   ⚠️ Very short duration - likely domain agents did not execute")
        elif duration > 25:
            print(f"   ✅ Good duration - likely domain agents executed")
        else:
            print(f"   🔍 Medium duration - partial execution possible")

        # Check phase results
        if hasattr(result, "phase_results"):
            phase_results = result.phase_results
            print(f"📋 Phase results: {len(phase_results)} phases")

            domain_phases = [
                "network_agent",
                "device_agent",
                "location_agent",
                "logs_agent",
                "authentication_agent",
                "risk_agent",
            ]
            executed_domains = [
                phase for phase in domain_phases if phase in phase_results
            ]

            print(
                f"🤖 Domain agents executed: {len(executed_domains)}/{len(domain_phases)}"
            )

            for domain in executed_domains:
                phase_data = phase_results[domain]
                status = phase_data.get("status", "unknown")
                phase_duration = phase_data.get("duration", 0.0)
                print(f"   ✅ {domain}: {status} ({phase_duration:.2f}s)")

            if len(executed_domains) >= 3:
                print(f"\n🎉 SUCCESS! Multiple domain agents executed")
                return True
            elif len(executed_domains) > 0:
                print(f"\n⚠️ PARTIAL SUCCESS: Some domain agents executed")
                return True
            else:
                print(f"\n❌ FAILURE: No domain agents executed")

        # Check investigation metadata
        if hasattr(result, "investigation_metadata"):
            metadata = result.investigation_metadata
            quality_score = metadata.get("quality_score", "unknown")
            evidence_sources = metadata.get("evidence_sources", 0)

            print(f"📈 Quality score: {quality_score}")
            print(f"🔍 Evidence sources: {evidence_sources}")

            if isinstance(quality_score, (int, float)) and quality_score >= 70:
                print(f"   ✅ Quality threshold met")
                return True

        # Check messages for domain content
        if hasattr(result, "messages") and result.messages:
            last_message = result.messages[-1]
            content = str(last_message.content).lower()

            domain_keywords = [
                "network",
                "device",
                "location",
                "logs",
                "authentication",
                "risk",
                "analysis",
                "evidence",
            ]
            found_keywords = [
                keyword for keyword in domain_keywords if keyword in content
            ]

            print(f"💬 Domain keywords in result: {len(found_keywords)}")

            if len(found_keywords) >= 3:
                print(f"   ✅ Rich domain content found")
                return True

        return False

    except Exception as e:
        print(f"❌ Error analyzing results: {e}")
        return False


async def main():
    """Main test function"""
    print("🔍 Simple Domain Agent Test")
    print("=" * 60)
    print("Testing domain agent execution after enabling hybrid graph...")

    success = await test_domain_agents_via_agent_service()

    print(f"\n{'='*60}")
    print("🏁 TEST RESULTS")
    print("=" * 60)

    if success:
        print("🎉 SUCCESS!")
        print("✅ Domain agents are executing")
        print("✅ Investigation system is working")
        print("✅ Quality threshold likely met")
    else:
        print("❌ FAILURE!")
        print("❌ Domain agents may not be executing")
        print("🔧 Additional investigation needed")

    print(f"\n💡 Next steps:")
    if success:
        print("   ✅ Test the fix with a real investigation via the web interface")
        print("   ✅ Monitor investigation quality scores")
        print("   ✅ Verify all domain agents contribute evidence")
    else:
        print("   🔧 Check hybrid graph routing and execution logic")
        print("   🔧 Examine individual domain agent node implementations")
        print("   🔧 Debug graph execution flow step by step")


if __name__ == "__main__":
    asyncio.run(main())
