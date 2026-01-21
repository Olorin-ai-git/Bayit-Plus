#!/usr/bin/env python3
"""
Enable Hybrid Graph - Quick Fix

This script enables the hybrid graph feature flag so domain agents can execute.
"""

import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def enable_hybrid_graph():
    """Enable hybrid graph feature flag"""
    print("🚀 Enabling Hybrid Graph Feature Flag")
    print("=" * 50)

    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import (
            enable_hybrid_graph,
        )

        print("🔧 Enabling hybrid graph with 100% rollout...")
        enable_hybrid_graph(rollout_percentage=100)

        print("✅ Hybrid graph enabled!")

        # Verify it's enabled
        from app.service.agent.orchestration.hybrid.migration_utilities import (
            get_feature_flags,
        )

        feature_flags = get_feature_flags()
        hybrid_enabled = feature_flags.is_enabled(
            "hybrid_graph_v1", "test-investigation"
        )

        print(
            f"🧠 Verification: Hybrid graph is {'✅ ENABLED' if hybrid_enabled else '❌ STILL DISABLED'}"
        )

        # Show all feature flags
        print("\n📋 All Feature Flags:")
        for flag_name, flag_data in feature_flags.flags.items():
            enabled = flag_data.get("enabled", False)
            rollout = flag_data.get("rollout_percentage", 0)
            status_icon = "✅" if enabled else "❌"
            print(f"   {status_icon} {flag_name}: {enabled} ({rollout}%)")

        return hybrid_enabled

    except Exception as e:
        print(f"❌ Error enabling hybrid graph: {e}")
        import traceback

        traceback.print_exc()
        return False


async def test_graph_creation():
    """Test creating the hybrid graph"""
    print("\n🧪 Testing Hybrid Graph Creation")
    print("=" * 50)

    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import (
            GraphType,
            get_investigation_graph,
        )

        investigation_id = "test-investigation-123"
        entity_type = "ip"

        print(f"📋 Creating hybrid graph for investigation: {investigation_id}")

        graph = await get_investigation_graph(
            investigation_id=investigation_id,
            entity_type=entity_type,
            force_graph_type=GraphType.HYBRID,
        )

        if graph:
            print("✅ Hybrid graph created successfully!")

            # Check graph structure
            if hasattr(graph, "nodes"):
                nodes = list(graph.nodes.keys())
                print(f"📊 Graph has {len(nodes)} nodes:")

                # Look for domain agents
                domain_agents = []
                for node in nodes:
                    if any(
                        domain in node.lower()
                        for domain in [
                            "network",
                            "device",
                            "location",
                            "logs",
                            "authentication",
                            "risk",
                        ]
                    ):
                        domain_agents.append(node)

                if domain_agents:
                    print(f"🤖 Found {len(domain_agents)} domain agent nodes:")
                    for agent in domain_agents:
                        print(f"   - {agent}")
                else:
                    print("❌ No domain agent nodes found in graph!")

                # Show all nodes
                print(f"\n📋 All nodes:")
                for node in nodes:
                    print(f"   - {node}")

            return True
        else:
            print("❌ Failed to create hybrid graph!")
            return False

    except Exception as e:
        print(f"❌ Error testing graph creation: {e}")
        import traceback

        traceback.print_exc()
        return False


async def main():
    """Main function"""
    print("🔍 Hybrid Graph Enabler")
    print("=" * 50)

    # Step 1: Enable hybrid graph
    enabled = await enable_hybrid_graph()

    if enabled:
        # Step 2: Test graph creation
        graph_created = await test_graph_creation()

        if graph_created:
            print("\n🎉 SUCCESS!")
            print("✅ Hybrid graph is enabled and working")
            print("🧪 Now run a test investigation to see if domain agents execute")
        else:
            print("\n⚠️ PARTIAL SUCCESS")
            print("✅ Hybrid graph is enabled")
            print("❌ But graph creation failed - check implementation")
    else:
        print("\n❌ FAILED")
        print("❌ Could not enable hybrid graph feature flag")

    print("\n💡 Next step: Run a test investigation and check if domain agents execute")


if __name__ == "__main__":
    asyncio.run(main())
