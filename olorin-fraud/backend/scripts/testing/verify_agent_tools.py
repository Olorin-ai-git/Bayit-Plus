#!/usr/bin/env python3
"""
Verify that all tools are available to the agents.
"""

import os
import sys

# Add parent directories to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

# Now import and check tools
from app.service.agent.agent import tools
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def main():
    print("=" * 80)
    print("AGENT TOOL VERIFICATION")
    print("=" * 80)

    print(f"\nTotal tools available to agents: {len(tools)}")

    # Categorize tools
    categories = {
        "Threat Intelligence": [],
        "Blockchain": [],
        "ML/AI": [],
        "Database": [],
        "Web": [],
        "File System": [],
        "OSINT/Intelligence": [],
        "Olorin Core": [],
        "Other": [],
    }

    for tool in tools:
        tool_name = tool.name if hasattr(tool, "name") else str(tool)

        if any(x in tool_name.lower() for x in ["abuse", "virus", "shodan", "threat"]):
            categories["Threat Intelligence"].append(tool_name)
        elif any(
            x in tool_name.lower() for x in ["blockchain", "crypto", "nft", "defi"]
        ):
            categories["Blockchain"].append(tool_name)
        elif any(
            x in tool_name.lower()
            for x in ["ml", "anomaly", "pattern", "behavioral", "risk_scoring"]
        ):
            categories["ML/AI"].append(tool_name)
        elif any(x in tool_name.lower() for x in ["database", "query", "schema"]):
            categories["Database"].append(tool_name)
        elif any(x in tool_name.lower() for x in ["web_", "http", "scrape"]):
            categories["Web"].append(tool_name)
        elif any(x in tool_name.lower() for x in ["file_", "directory"]):
            categories["File System"].append(tool_name)
        elif any(
            x in tool_name.lower()
            for x in ["osint", "social", "people", "dark", "deep", "business_intel"]
        ):
            categories["OSINT/Intelligence"].append(tool_name)
        elif any(x in tool_name.lower() for x in ["snowflake", "splunk", "sumo"]):
            categories["Olorin Core"].append(tool_name)
        else:
            categories["Other"].append(tool_name)

    # Display categorized tools
    print("\nTOOLS BY CATEGORY:")
    print("-" * 40)

    for category, tool_list in categories.items():
        if tool_list:
            print(f"\n{category} ({len(tool_list)} tools):")
            for tool_name in sorted(tool_list):
                print(f"  • {tool_name}")

    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY:")
    print(f"  Total tools: {len(tools)}")
    print(f"  Threat Intelligence: {len(categories['Threat Intelligence'])}")
    print(f"  Blockchain: {len(categories['Blockchain'])}")
    print(f"  ML/AI: {len(categories['ML/AI'])}")
    print(f"  OSINT/Intelligence: {len(categories['OSINT/Intelligence'])}")
    print(f"  Database: {len(categories['Database'])}")
    print(f"  Web: {len(categories['Web'])}")
    print(f"  File System: {len(categories['File System'])}")
    print(f"  Olorin Core: {len(categories['Olorin Core'])}")
    print(f"  Other: {len(categories['Other'])}")

    if len(tools) >= 40:
        print(f"\n✅ SUCCESS: All {len(tools)} tools are available to agents!")
    else:
        print(f"\n⚠️ WARNING: Only {len(tools)} tools available (expected 40+)")

    print("=" * 80)


if __name__ == "__main__":
    main()
