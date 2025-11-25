#!/usr/bin/env python3
"""
Direct test script for ComposioSearchTool and ComposioWebCrawlTool.
Tests the tools directly to verify they return valid data.
"""

import json
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

from app.service.agent.tools.composio_search_tool import ComposioSearchTool
from app.service.agent.tools.composio_webcrawl_tool import ComposioWebCrawlTool
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def test_composio_search():
    """Test ComposioSearchTool directly."""
    print("\n" + "=" * 80)
    print("TEST 1: ComposioSearchTool")
    print("=" * 80)

    tool = ComposioSearchTool()

    # Test queries
    test_queries = [
        "fraud detection techniques",
        "email reputation check",
        "1983rozsakovacs@gmail.com fraud",
    ]

    for query in test_queries:
        print(f"\n🔍 Testing search query: '{query}'")
        try:
            result = tool._run(query=query, max_results=5, entity_id="test_entity_123")

            # Parse result
            if isinstance(result, str):
                try:
                    result_dict = json.loads(result)
                except:
                    result_dict = {"raw": result}
            else:
                result_dict = result

            # Check success
            if isinstance(result_dict, dict):
                if result_dict.get("success"):
                    num_results = result_dict.get("num_results", 0)
                    results = result_dict.get("results", [])
                    print(f"  ✅ Search successful - {num_results} results")
                    if results:
                        print(f"  📄 First result preview:")
                        first_result = (
                            results[0] if isinstance(results, list) else results
                        )
                        if isinstance(first_result, dict):
                            print(
                                f"     Title: {first_result.get('title', 'N/A')[:80]}"
                            )
                            print(f"     URL: {first_result.get('url', 'N/A')[:80]}")
                            print(
                                f"     Snippet: {str(first_result.get('snippet', 'N/A'))[:100]}..."
                            )
                        else:
                            print(f"     {str(first_result)[:200]}")
                    return True
                else:
                    error = result_dict.get("error", "Unknown error")
                    print(f"  ❌ Search failed: {error}")
                    return False
            else:
                print(f"  ⚠️ Unexpected result format: {type(result_dict)}")
                print(f"  Result: {str(result_dict)[:200]}...")
                return False

        except Exception as e:
            print(f"  ❌ Error: {e}")
            import traceback

            traceback.print_exc()
            return False

    return False


def test_composio_webcrawl():
    """Test ComposioWebCrawlTool directly."""
    print("\n" + "=" * 80)
    print("TEST 2: ComposioWebCrawlTool")
    print("=" * 80)

    tool = ComposioWebCrawlTool()

    # Test URLs
    test_urls = ["https://example.com", "https://www.google.com"]

    for url in test_urls:
        print(f"\n🔍 Testing web crawl: '{url}'")
        try:
            result = tool._run(
                url=url, max_depth=1, include_links=False, entity_id="test_entity_123"
            )

            # Parse result
            if isinstance(result, str):
                try:
                    result_dict = json.loads(result)
                except:
                    result_dict = {"raw": result}
            else:
                result_dict = result

            # Check success
            if isinstance(result_dict, dict):
                if result_dict.get("success"):
                    content = result_dict.get("content", "")
                    content_len = len(str(content))
                    print(
                        f"  ✅ WebCrawl successful - Content length: {content_len} characters"
                    )
                    if content:
                        print(f"  📄 Content preview:")
                        print(f"     {str(content)[:300]}...")
                    return True
                else:
                    error = result_dict.get("error", "Unknown error")
                    print(f"  ❌ WebCrawl failed: {error}")
                    return False
            else:
                print(f"  ⚠️ Unexpected result format: {type(result_dict)}")
                print(f"  Result: {str(result_dict)[:200]}...")
                return False

        except Exception as e:
            print(f"  ❌ Error: {e}")
            import traceback

            traceback.print_exc()
            return False

    return False


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("COMPOSIO MCP TOOLS DIRECT TEST")
    print("=" * 80)

    search_success = test_composio_search()
    crawl_success = test_composio_webcrawl()

    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"ComposioSearchTool: {'✅ PASSED' if search_success else '❌ FAILED'}")
    print(f"ComposioWebCrawlTool: {'✅ PASSED' if crawl_success else '❌ FAILED'}")

    if search_success and crawl_success:
        print("\n✅ All tests passed! Tools are working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Check errors above.")
        sys.exit(1)
