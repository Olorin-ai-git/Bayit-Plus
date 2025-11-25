#!/usr/bin/env python3
"""
Check which tools are registered and why they might not be running.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"✅ Loaded .env file: {env_path}")
else:
    print(f"⚠️ .env file not found at {env_path}")

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.agent.tools.tool_registry import (
    get_tools_for_agent,
    initialize_tools,
    tool_registry,
)

print("\n" + "=" * 85)
print("TOOL REGISTRATION DIAGNOSTIC")
print("=" * 85 + "\n")

# Check USE_* environment variables
print("📋 Environment Variables (USE_*):")
use_vars = {k: v for k, v in os.environ.items() if k.startswith("USE_")}
for key, value in sorted(use_vars.items()):
    status = "✅ ENABLED" if value.lower() == "true" else "❌ DISABLED"
    print(f"   {key:<40} = {value:<10} {status}")

print(f"\n📊 Total USE_* variables: {len(use_vars)}")
print(f"   Enabled: {sum(1 for v in use_vars.values() if v.lower() == 'true')}")
print(f"   Disabled: {sum(1 for v in use_vars.values() if v.lower() != 'true')}")

# Initialize tools
print("\n🔧 Initializing tool registry...")
try:
    initialize_tools()
    print("✅ Tool registry initialized")
except Exception as e:
    print(f"❌ Failed to initialize tool registry: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

# Check registry state
print(f"\n📊 Registry State:")
print(f"   Initialized: {tool_registry.is_initialized()}")
print(f"   Total tools registered: {len(tool_registry._tools)}")

if len(tool_registry._tools) > 0:
    print(f"\n🔧 Registered Tools ({len(tool_registry._tools)}):")
    for i, (tool_name, tool) in enumerate(list(tool_registry._tools.items())[:20], 1):
        tool_type = type(tool).__name__
        print(f"   {i:2d}. {tool_name:<40} ({tool_type})")
    if len(tool_registry._tools) > 20:
        print(f"   ... and {len(tool_registry._tools) - 20} more tools")

    # Group by category
    print(f"\n📂 Tools by Category:")
    categories = {}
    for tool_name, tool in tool_registry._tools.items():
        # Find category
        category = "unknown"
        for cat, tool_list in tool_registry._tool_categories.items():
            if tool_name in tool_list:
                category = cat
                break
        if category not in categories:
            categories[category] = []
        categories[category].append(tool_name)

    for category, tools in sorted(categories.items()):
        print(f"   {category:<25} {len(tools):>3} tools")
else:
    print("⚠️ No tools registered!")

# Get tools for agent
print(f"\n🎯 Getting tools for agent (all categories)...")
try:
    tools = get_tools_for_agent(
        categories=[
            "olorin",
            "threat_intelligence",
            "database",
            "search",
            "blockchain",
            "intelligence",
            "ml_ai",
            "web",
            "file_system",
            "api",
            "mcp_clients",
            "mcp_servers",
            "utility",
        ]
    )
    print(f"✅ Retrieved {len(tools)} tools for agent")

    if len(tools) > 0:
        print(f"\n🔧 Agent Tools ({len(tools)}):")
        for i, tool in enumerate(tools[:20], 1):
            tool_name = getattr(tool, "name", "unknown")
            tool_type = type(tool).__name__
            print(f"   {i:2d}. {tool_name:<40} ({tool_type})")
        if len(tools) > 20:
            print(f"   ... and {len(tools) - 20} more tools")
    else:
        print("⚠️ No tools returned for agent!")

except Exception as e:
    print(f"❌ Failed to get tools for agent: {e}")
    import traceback

    traceback.print_exc()

print("\n" + "=" * 85)
print("DIAGNOSTIC COMPLETE")
print("=" * 85)
