#!/usr/bin/env python3
"""
Direct test script for DeviceFingerprintTool, MaxMindMinFraudTool, ComposioTool, GraphFeatureTool,
and threat intelligence tools.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load .env
from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"✅ Loaded .env file: {env_path}")

from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_tools():
    """Test all the tools directly."""
    print("\n" + "=" * 80)
    print("DIRECT TOOL TESTING")
    print("=" * 80 + "\n")

    # Initialize tools
    print("🔧 Initializing tool registry...")
    try:
        initialize_tools()
        print("✅ Tool registry initialized\n")
    except Exception as e:
        print(f"❌ Failed to initialize tools: {e}")
        import traceback

        traceback.print_exc()
        return

    # Get tools
    tools = get_tools_for_agent(categories=["olorin", "threat_intelligence"])
    print(f"📊 Retrieved {len(tools)} tools\n")

    # Test DeviceFingerprintTool
    print("=" * 80)
    print("TEST 1: DeviceFingerprintTool")
    print("=" * 80)
    device_tool = next(
        (t for t in tools if t.name == "device_fingerprint_analysis"), None
    )
    if device_tool:
        try:
            print(f"🔍 Testing {device_tool.name}...")
            result = device_tool.invoke(
                {
                    "device_id": "test_device_123",
                    "transaction_id": "test_tx_456",
                    "user_id": "test_user_789",
                }
            )
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ DeviceFingerprintTool not found")

    # Test MaxMindMinFraudTool
    print("\n" + "=" * 80)
    print("TEST 2: MaxMindMinFraudTool")
    print("=" * 80)
    maxmind_tool = next((t for t in tools if t.name == "maxmind_minfraud"), None)
    if maxmind_tool:
        try:
            print(f"🔍 Testing {maxmind_tool.name}...")
            result = await maxmind_tool.ainvoke(
                {
                    "ip_address": "8.8.8.8",
                    "transaction_id": "test_tx_456",
                    "email": "test@example.com",
                    "billing_country": "US",
                    "transaction_amount": 100.0,
                    "currency": "USD",
                }
            )
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ MaxMindMinFraudTool not found")

    # Test ComposioTool
    print("\n" + "=" * 80)
    print("TEST 3: ComposioTool")
    print("=" * 80)
    composio_tool = next((t for t in tools if t.name == "composio_action"), None)
    if composio_tool:
        try:
            print(f"🔍 Testing {composio_tool.name}...")
            # This will fail without proper tenant_id, but we can test the error handling
            result = composio_tool.invoke(
                {
                    "toolkit": "stripe",
                    "action": "void_payment",
                    "connection_id": "test_connection",
                    "parameters": {},
                    "execution_id": "test_exec_123",
                    "tenant_id": "test_tenant",
                }
            )
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ ComposioTool not found")

    # Test GraphFeatureTool
    print("\n" + "=" * 80)
    print("TEST 4: GraphFeatureTool")
    print("=" * 80)
    graph_tool = next((t for t in tools if t.name == "graph_feature_analysis"), None)
    if graph_tool:
        try:
            print(f"🔍 Testing {graph_tool.name}...")
            result = graph_tool.invoke(
                {
                    "entity_id": "test_entity_123",
                    "entity_type": "User",
                    "feature_type": "cluster_risk",
                    "transaction_id": "test_tx_456",
                    "tenant_id": "test_tenant",
                }
            )
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ GraphFeatureTool not found")

    # Test Threat Intelligence Tools
    print("\n" + "=" * 80)
    print("TEST 5: Threat Intelligence Tools")
    print("=" * 80)

    # AbuseIPDB
    abuseipdb_tool = next(
        (
            t
            for t in tools
            if "abuseipdb" in t.name.lower() and "ip_reputation" in t.name.lower()
        ),
        None,
    )
    if abuseipdb_tool:
        try:
            print(f"🔍 Testing {abuseipdb_tool.name}...")
            result = await abuseipdb_tool.ainvoke(
                {"ip": "8.8.8.8"}  # Fixed: use 'ip' not 'ip_address'
            )
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ AbuseIPDB IP Reputation tool not found")

    # VirusTotal IP Analysis
    vt_ip_tool = next(
        (
            t
            for t in tools
            if "virustotal" in t.name.lower()
            and "ip" in t.name.lower()
            and "domain" not in t.name.lower()
        ),
        None,
    )
    if vt_ip_tool:
        try:
            print(f"🔍 Testing {vt_ip_tool.name}...")
            result = await vt_ip_tool.ainvoke(
                {"ip": "8.8.8.8"}  # Fixed: use 'ip' not 'ip_address'
            )
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ VirusTotal IP Analysis tool not found")

    # VirusTotal Domain Analysis
    vt_domain_tool = next(
        (
            t
            for t in tools
            if "virustotal" in t.name.lower() and "domain" in t.name.lower()
        ),
        None,
    )
    if vt_domain_tool:
        try:
            print(f"🔍 Testing {vt_domain_tool.name}...")
            result = await vt_domain_tool.ainvoke({"domain": "example.com"})
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ VirusTotal Domain Analysis tool not found")

    # Shodan Infrastructure
    shodan_tool = next(
        (
            t
            for t in tools
            if "shodan" in t.name.lower() and "infrastructure" in t.name.lower()
        ),
        None,
    )
    if shodan_tool:
        try:
            print(f"🔍 Testing {shodan_tool.name}...")
            result = await shodan_tool.ainvoke(
                {"ip": "8.8.8.8"}  # Fixed: use 'ip' not 'ip_address'
            )
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ Shodan Infrastructure tool not found")

    print("\n" + "=" * 80)
    print("TESTING COMPLETE")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_tools())
