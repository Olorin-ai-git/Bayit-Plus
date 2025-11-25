#!/usr/bin/env python3
"""
Check which tools are actually loaded and available for the agents.
"""

import os
import sys

# Add parent directories to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from app.service.agent.tools.tool_config import ToolConfig
from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def main():
    print("=" * 80)
    print("TOOL LOADING STATUS CHECK")
    print("=" * 80)

    # Check tool configuration status
    print("\n1. CHECKING TOOL CONFIGURATION FROM .env:")
    print("-" * 40)

    status = ToolConfig.get_tool_status_summary()
    print(f"   Total tools defined: {status['total']}")
    print(f"   Enabled tools: {len(status['enabled'])}")
    print(f"   Disabled tools: {len(status['disabled'])}")

    if status["enabled"]:
        print(f"\n   ENABLED TOOLS:")
        for tool in sorted(status["enabled"]):
            print(f"     ✅ {tool}")

    if status["disabled"]:
        print(f"\n   DISABLED TOOLS:")
        for tool in sorted(status["disabled"]):
            print(f"     ❌ {tool}")

    # Initialize tool registry
    print("\n2. INITIALIZING TOOL REGISTRY:")
    print("-" * 40)

    try:
        initialize_tools()
        print("   ✅ Tool registry initialized successfully")
    except Exception as e:
        print(f"   ❌ Failed to initialize tools: {e}")
        return

    # Get tools for different categories
    print("\n3. LOADING TOOLS BY CATEGORY:")
    print("-" * 40)

    categories_to_check = [
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
    ]

    total_tools = []

    for category in categories_to_check:
        try:
            tools = get_tools_for_agent(categories=[category])
            print(f"\n   Category: {category}")
            print(f"   Tools loaded: {len(tools)}")

            if tools:
                for tool in tools:
                    tool_name = tool.name if hasattr(tool, "name") else str(tool)
                    print(f"     • {tool_name}")
                    if tool_name not in [
                        t.name if hasattr(t, "name") else str(t) for t in total_tools
                    ]:
                        total_tools.append(tool)
        except Exception as e:
            print(f"   ❌ Error loading {category} tools: {e}")

    # Get all tools that would be available to agents
    print("\n4. LOADING ALL TOOLS FOR AGENTS (as in agent.py):")
    print("-" * 40)

    try:
        # This mimics what happens in agent.py
        all_tools = get_tools_for_agent(
            categories=["olorin", "search", "database", "threat_intelligence"]
        )

        print(f"   Total tools loaded: {len(all_tools)}")

        # Count by type
        threat_count = len(
            [
                t
                for t in all_tools
                if "threat" in t.name.lower()
                or "virus" in t.name.lower()
                or "abuse" in t.name.lower()
                or "shodan" in t.name.lower()
            ]
        )

        print(f"   Threat intelligence tools: {threat_count}")

        print("\n   ALL LOADED TOOLS:")
        for tool in all_tools:
            tool_name = tool.name if hasattr(tool, "name") else str(tool)
            tool_desc = (
                tool.description[:50] + "..."
                if hasattr(tool, "description") and len(tool.description) > 50
                else (tool.description if hasattr(tool, "description") else "")
            )
            print(f"     • {tool_name}: {tool_desc}")

    except Exception as e:
        print(f"   ❌ Error loading all tools: {e}")

    print("\n" + "=" * 80)
    print(f"SUMMARY: {len(total_tools)} unique tools available across all categories")
    print("=" * 80)


if __name__ == "__main__":
    main()
