#!/usr/bin/env python3
"""
Test script to verify Anthropic API key and basic LLM functionality.
"""
import asyncio
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_anthropic_api_basic():
    """Test basic Anthropic API functionality."""
    print("🧪 Testing basic Anthropic API access...")
    
    try:
        from app.service.agent.autonomous_base import get_autonomous_llm
        from langchain_core.messages import HumanMessage
        
        # Get the LLM
        llm = get_autonomous_llm()
        print(f"   ✅ LLM initialized: {type(llm)}")
        print(f"   📊 Model: {llm.model}")
        
        # Simple test message
        messages = [HumanMessage(content="Hello! Please respond with 'API test successful' and nothing else.")]
        
        print("   🚀 Making API call...")
        response = await llm.ainvoke(messages)
        
        print(f"   ✅ Response received: {response.content}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Anthropic API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_anthropic_with_simple_tools():
    """Test Anthropic API with simple tool binding."""
    print("🧪 Testing Anthropic API with simple tools...")
    
    try:
        from app.service.agent.autonomous_base import get_autonomous_llm
        from langchain_core.messages import HumanMessage
        from langchain_core.tools import tool
        
        @tool
        def simple_calculator(a: int, b: int) -> int:
            """Add two numbers together."""
            return a + b
        
        @tool
        def get_weather(city: str) -> str:
            """Get weather for a city."""
            return f"Weather in {city}: 72°F and sunny"
        
        # Get the LLM and bind tools
        llm = get_autonomous_llm()
        tools = [simple_calculator, get_weather]
        llm_with_tools = llm.bind_tools(tools)
        
        print(f"   ✅ LLM with tools initialized: {len(tools)} tools bound")
        
        # Test message asking to use tools
        messages = [HumanMessage(content="Please add 5 + 3 using the calculator tool, and also get the weather for San Francisco. You MUST use both tools.")]
        
        print("   🚀 Making API call with tool usage request...")
        response = await llm_with_tools.ainvoke(messages)
        
        print(f"   📊 Response type: {type(response)}")
        print(f"   📊 Response content: {response.content}")
        
        # Check for tool calls
        if hasattr(response, 'tool_calls') and response.tool_calls:
            print(f"   ✅ Tool calls found: {len(response.tool_calls)}")
            for i, tool_call in enumerate(response.tool_calls):
                print(f"      {i+1}. Tool: {tool_call.get('name', 'Unknown')}")
                print(f"         Args: {tool_call.get('args', {})}")
        else:
            print(f"   ⚠️  No tool calls in response")
            print(f"       This suggests the LLM is not calling tools even when requested")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Tool binding test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_tool_registry_tools():
    """Test with actual tools from the registry."""
    print("🧪 Testing with actual tool registry tools...")
    
    try:
        from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
        from app.service.agent.autonomous_base import get_autonomous_llm
        from langchain_core.messages import HumanMessage
        
        # Initialize tools
        initialize_tools()
        
        # Get a small subset of tools
        tools = get_tools_for_agent(["threat_intelligence"])[:3]  # Just first 3 tools
        
        if not tools:
            print("   ❌ No tools found in registry")
            return False
        
        print(f"   📊 Testing with {len(tools)} tools:")
        for tool in tools:
            print(f"      - {tool.name}")
        
        # Get LLM and bind tools
        llm = get_autonomous_llm()
        llm_with_tools = llm.bind_tools(tools)
        
        # Test message asking to analyze an IP
        messages = [HumanMessage(content="Please analyze the IP address 1.1.1.1 using ALL available threat intelligence tools. You MUST use all tools to get comprehensive data.")]
        
        print("   🚀 Making API call with real tools...")
        response = await llm_with_tools.ainvoke(messages)
        
        print(f"   📊 Response content length: {len(response.content) if response.content else 0}")
        
        # Check for tool calls
        if hasattr(response, 'tool_calls') and response.tool_calls:
            print(f"   ✅ Tool calls found: {len(response.tool_calls)}")
            for i, tool_call in enumerate(response.tool_calls):
                print(f"      {i+1}. Tool: {tool_call.get('name', 'Unknown')}")
        else:
            print(f"   ⚠️  No tool calls in response - this is the root issue!")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Tool registry test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all API tests."""
    print("🚀 Starting Anthropic API Debugging\n")
    
    tests = [
        test_anthropic_api_basic,
        test_anthropic_with_simple_tools,
        test_tool_registry_tools,
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
            print()
        except Exception as e:
            print(f"   ❌ Test {test.__name__} failed with exception: {e}\n")
            results.append(False)
    
    passed = sum(results)
    total = len(results)
    
    print("=" * 60)
    print(f"📊 API Test Results: {passed}/{total} tests passed")
    
    if passed != total:
        print("\n🔍 ANALYSIS:")
        print("If basic API works but tool calls don't, this indicates:")
        print("1. Anthropic API key is valid and working")
        print("2. LLM model is responding to prompts") 
        print("3. BUT: LLM is not making tool calls when tools are bound")
        print("4. This could be due to:")
        print("   - Tool binding issue")
        print("   - Claude model not recognizing tool schema")
        print("   - Prompt not compelling enough for tool usage")
        print("   - Tool schema format incompatible with Claude")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    import sys
    sys.exit(0 if success else 1)