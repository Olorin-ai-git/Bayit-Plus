#!/usr/bin/env python3
"""
Test Composio MCP tools (Search and WebCrawl) to verify they work correctly.
"""

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
    print(f"✅ Loaded .env file: {env_path}\n")

from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_mcp_tools():
    """Test Composio MCP tools."""
    print("\n" + "=" * 80)
    print("COMPOSIO MCP TOOLS TESTING")
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

    # Get Composio MCP tools
    tools = get_tools_for_agent(categories=["web", "olorin"])
    composio_tools = [t for t in tools if "composio" in t.name.lower()]

    print(f"📊 Found {len(composio_tools)} Composio tools:\n")
    for tool in composio_tools:
        print(f"  - {tool.name}")
    print()

    # Test ComposioSearchTool
    print("=" * 80)
    print("TEST 1: ComposioSearchTool")
    print("=" * 80)
    search_tool = next((t for t in composio_tools if t.name == "composio_search"), None)
    if search_tool:
        try:
            print(f"🔍 Testing {search_tool.name}...")
            result = search_tool.invoke(
                {
                    "query": "fraud detection techniques",
                    "max_results": 5,
                    "entity_id": "test_entity_123",
                }
            )
            result_dict = eval(result) if isinstance(result, str) else result
            if isinstance(result_dict, dict):
                if result_dict.get("success"):
                    print(
                        f"✅ Search successful - {result_dict.get('num_results', 0)} results"
                    )
                    print(
                        f"   First result: {str(result_dict.get('results', [])[0])[:100] if result_dict.get('results') else 'N/A'}..."
                    )
                else:
                    print(
                        f"❌ Search failed: {result_dict.get('error', 'Unknown error')}"
                    )
            else:
                print(f"✅ Result: {str(result)[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ ComposioSearchTool not found")

    # Test ComposioWebCrawlTool
    print("\n" + "=" * 80)
    print("TEST 2: ComposioWebCrawlTool")
    print("=" * 80)
    crawl_tool = next(
        (t for t in composio_tools if t.name == "composio_webcrawl"), None
    )
    if crawl_tool:
        try:
            print(f"🔍 Testing {crawl_tool.name}...")
            result = crawl_tool.invoke(
                {
                    "url": "https://example.com",
                    "max_depth": 1,
                    "include_links": False,
                    "entity_id": "test_entity_123",
                }
            )
            result_dict = eval(result) if isinstance(result, str) else result
            if isinstance(result_dict, dict):
                if result_dict.get("success"):
                    print(f"✅ WebCrawl successful")
                    content = result_dict.get("content", "")
                    print(f"   Content length: {len(str(content))} characters")
                    print(f"   Content preview: {str(content)[:200]}...")
                else:
                    print(
                        f"❌ WebCrawl failed: {result_dict.get('error', 'Unknown error')}"
                    )
            else:
                print(f"✅ Result: {str(result)[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback

            traceback.print_exc()
    else:
        print("⚠️ ComposioWebCrawlTool not found")

    print("\n" + "=" * 80)
    print("TESTING COMPLETE")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    import asyncio

    asyncio.run(test_mcp_tools())
