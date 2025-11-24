#!/usr/bin/env python3
"""
Check Composio MCP configurations and verify they're properly set up.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import httpx
import json

# Load .env
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"✅ Loaded .env file: {env_path}\n")

# MCP URLs from .env
MCP_CONFIGS = {
    "COMPOSIO_SLACK_URL": os.getenv("COMPOSIO_SLACK_URL"),
    "COMPOSIO_GOOGLE_CALENDAR_URL": os.getenv("COMPOSIO_GOOGLE_CALENDAR_URL"),
    "COMPOSIO_GITHUB_URL": os.getenv("COMPOSIO_GITHUB_URL"),
    "COMPOSIO_GOOGLE_DRIVE_URL": os.getenv("COMPOSIO_GOOGLE_DRIVE_URL"),
    "COMPOSIO_FIGMA_URL": os.getenv("COMPOSIO_FIGMA_URL"),
    "COMPOSIO_FIRECRAWL_CRAWL_URL": os.getenv("COMPOSIO_FIRECRAWL_CRAWL_URL"),
    "COMPOSIO_SEARCH_API_URL": os.getenv("COMPOSIO_SEARCH_API_URL"),
}

# SDK-based config
COMPOSIO_API_KEY = os.getenv("COMPOSIO_API_KEY")
COMPOSIO_ENCRYPTION_KEY = os.getenv("COMPOSIO_ENCRYPTION_KEY")

print("="*80)
print("COMPOSIO MCP CONFIGURATION CHECK")
print("="*80 + "\n")

print("📋 MCP URL Configurations:")
print("-" * 80)
for key, value in MCP_CONFIGS.items():
    status = "✅ Configured" if value else "❌ Not configured"
    if value:
        # Truncate URL for display
        display_url = value[:60] + "..." if len(value) > 60 else value
        print(f"{key:35} {status:20} {display_url}")
    else:
        print(f"{key:35} {status:20}")

print("\n📋 SDK Configuration:")
print("-" * 80)
print(f"{'COMPOSIO_API_KEY':35} {'✅ Configured' if COMPOSIO_API_KEY else '❌ Not configured':20}")
print(f"{'COMPOSIO_ENCRYPTION_KEY':35} {'✅ Configured' if COMPOSIO_ENCRYPTION_KEY else '❌ Not configured':20}")

print("\n" + "="*80)
print("TOOL AVAILABILITY CHECK")
print("="*80 + "\n")

# Check which tools exist
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.service.agent.tools.tool_registry import initialize_tools, get_tools_for_agent
    
    initialize_tools()
    tools = get_tools_for_agent(categories=["olorin"])
    
    composio_tools = [t for t in tools if 'composio' in t.name.lower()]
    
    print(f"Found {len(composio_tools)} Composio-related tools:\n")
    for tool in composio_tools:
        print(f"  ✅ {tool.name}")
        if hasattr(tool, '_mcp_url'):
            mcp_url = getattr(tool, '_mcp_url', None)
            if mcp_url:
                print(f"      MCP URL: {mcp_url[:60]}...")
            else:
                print(f"      ⚠️  MCP URL not configured")
        print()
        
except Exception as e:
    print(f"❌ Error checking tools: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("MCP ENDPOINT CONNECTIVITY TEST")
print("="*80 + "\n")

def test_mcp_endpoint(name: str, url: str):
    """Test MCP endpoint connectivity."""
    if not url:
        return {"status": "skipped", "reason": "URL not configured"}
    
    try:
        # Test with a simple MCP request (list tools)
        request_data = {
            "jsonrpc": "2.0",
            "id": "test-1",
            "method": "tools/list",
            "params": {}
        }
        
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                url,
                json=request_data,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream"
                }
            )
            response.raise_for_status()
            
            # Check if response is SSE stream
            content_type = response.headers.get("content-type", "")
            if "text/event-stream" in content_type:
                # Parse SSE stream
                lines = response.text.split('\n')
                for line in lines:
                    if line.startswith('data: '):
                        data_str = line[6:]  # Remove 'data: ' prefix
                        try:
                            result = json.loads(data_str)
                            if "error" in result:
                                return {
                                    "status": "error",
                                    "error": result["error"].get("message", "Unknown error"),
                                    "code": result["error"].get("code")
                                }
                            if "result" in result:
                                tools_list = result.get("result", {})
                                if isinstance(tools_list, dict) and "tools" in tools_list:
                                    tools_count = len(tools_list["tools"])
                                elif isinstance(tools_list, list):
                                    tools_count = len(tools_list)
                                else:
                                    tools_count = "unknown"
                                return {
                                    "status": "success",
                                    "tools_count": tools_count,
                                    "format": "SSE stream"
                                }
                        except json.JSONDecodeError:
                            continue
                return {
                    "status": "success",
                    "format": "SSE stream",
                    "note": "Stream received but couldn't parse JSON"
                }
            else:
                # Regular JSON response
                result = response.json()
                if "error" in result:
                    return {
                        "status": "error",
                        "error": result["error"].get("message", "Unknown error"),
                        "code": result["error"].get("code")
                    }
                
                # Check if we got a valid response
                if "result" in result:
                    tools_list = result.get("result", {})
                    if isinstance(tools_list, dict) and "tools" in tools_list:
                        tools_count = len(tools_list["tools"])
                    elif isinstance(tools_list, list):
                        tools_count = len(tools_list)
                    else:
                        tools_count = "unknown"
                    return {
                        "status": "success",
                        "tools_count": tools_count,
                        "format": "JSON"
                    }
                else:
                    return {
                        "status": "unexpected_format",
                        "response_keys": list(result.keys())
                    }
                
    except httpx.TimeoutException:
        return {"status": "timeout", "error": "Request timeout"}
    except httpx.RequestError as e:
        return {"status": "request_error", "error": str(e)}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# Test each MCP endpoint
for key, url in MCP_CONFIGS.items():
    if url:
        print(f"Testing {key}...")
        result = test_mcp_endpoint(key, url)
        if result["status"] == "success":
            print(f"  ✅ Connected - Tools available: {result.get('tools_count', 'unknown')}")
        elif result["status"] == "skipped":
            print(f"  ⏭️  Skipped - {result['reason']}")
        else:
            print(f"  ❌ Failed - {result.get('error', 'Unknown error')}")
        print()

print("\n" + "="*80)
print("COMPOSIO SDK CONNECTION TEST")
print("="*80 + "\n")

if COMPOSIO_API_KEY:
    try:
        from composio_client import Composio as ComposioSDKClient
        
        client = ComposioSDKClient(api_key=COMPOSIO_API_KEY)
        print("✅ Composio SDK client initialized successfully")
        
        # Try to list toolkits
        try:
            toolkits = client.toolkits.list()
            print(f"✅ SDK connection working - Can list toolkits")
        except Exception as e:
            print(f"⚠️  SDK initialized but toolkit listing failed: {e}")
            
    except Exception as e:
        print(f"❌ Composio SDK initialization failed: {e}")
else:
    print("⏭️  Skipped - COMPOSIO_API_KEY not configured")

print("\n" + "="*80)
print("SUMMARY")
print("="*80 + "\n")

configured_mcp = sum(1 for url in MCP_CONFIGS.values() if url)
total_mcp = len(MCP_CONFIGS)

print(f"MCP URLs configured: {configured_mcp}/{total_mcp}")
print(f"SDK API Key configured: {'Yes' if COMPOSIO_API_KEY else 'No'}")
print(f"Encryption Key configured: {'Yes' if COMPOSIO_ENCRYPTION_KEY else 'No'}")

print("\n" + "="*80)

