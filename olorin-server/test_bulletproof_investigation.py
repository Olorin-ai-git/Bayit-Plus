#!/usr/bin/env python3
"""
Test script to verify the bulletproof investigation system is working.
This tests that tool failures do not break investigations.
"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import json
from typing import Dict, Any
from datetime import datetime

from langchain_core.tools import BaseTool
from langchain_core.messages import HumanMessage, AIMessage
from pydantic import Field

from app.service.agent.orchestration.enhanced_tool_executor import EnhancedToolNode
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AlwaysFailsTool(BaseTool):
    """Tool that always fails to simulate network/service failures."""
    
    name: str = "always_fails_tool"
    description: str = "A tool that always fails to test bulletproof resilience"
    
    def _run(self, query: str = "") -> str:
        raise ConnectionError("Cannot connect to host ipscache-qal.api.olorin.com:443 ssl:default [nodename nor servname provided, or not known]")
    
    async def _arun(self, query: str = "") -> str:
        raise ConnectionError("Cannot connect to host ipscache-qal.api.olorin.com:443 ssl:default [nodename nor servname provided, or not known]")


class WorkingTool(BaseTool):
    """Tool that works properly."""
    
    name: str = "working_tool"
    description: str = "A tool that works properly and returns results"
    
    def _run(self, query: str = "") -> str:
        return f"Successfully analyzed: {query}. Risk score: 85/100. Recommendation: Review transaction."
    
    async def _arun(self, query: str = "") -> str:
        return f"Successfully analyzed: {query}. Risk score: 85/100. Recommendation: Review transaction."


async def test_bulletproof_tool_execution():
    """Test that the bulletproof system handles tool failures gracefully."""
    print("🔧 Testing Bulletproof Investigation System")
    print("="*60)
    
    # Create tools (one that fails, one that works)
    failing_tool = AlwaysFailsTool()
    working_tool = WorkingTool()
    tools = [failing_tool, working_tool]
    
    # Create enhanced tool node with bulletproof execution
    enhanced_node = EnhancedToolNode(tools, investigation_id="TEST_BULLETPROOF_001")
    
    print(f"✅ Created EnhancedToolNode with {len(tools)} tools")
    
    # Create test messages that would call both tools
    test_messages = [
        AIMessage(
            content="I need to analyze this suspicious transaction.",
            tool_calls=[
                {
                    "id": "call_1",
                    "name": "always_fails_tool",
                    "args": {"query": "suspicious transaction from Tokyo"}
                }
            ]
        ),
        AIMessage(
            content="Let me also use the working tool.",
            tool_calls=[
                {
                    "id": "call_2", 
                    "name": "working_tool",
                    "args": {"query": "transaction analysis"}
                }
            ]
        )
    ]
    
    results = []
    total_success = 0
    
    print(f"\n📊 Testing {len(test_messages)} tool executions...")
    
    for i, message in enumerate(test_messages):
        print(f"\n🔍 Test {i+1}: Calling tool '{message.tool_calls[0]['name']}'")
        
        try:
            # This should NOT raise an exception even if the tool fails
            result = await enhanced_node.ainvoke({"messages": [message]})
            
            if isinstance(result, dict) and "messages" in result:
                tool_messages = result["messages"]
                for tool_msg in tool_messages:
                    print(f"  ✅ Tool response: {tool_msg.content[:100]}...")
                    results.append({
                        "tool_name": message.tool_calls[0]['name'],
                        "success": True,
                        "response": tool_msg.content
                    })
                    total_success += 1
            
        except Exception as e:
            print(f"  ❌ FAILURE: Tool execution raised exception: {e}")
            print(f"     This should NOT happen with bulletproof system!")
            results.append({
                "tool_name": message.tool_calls[0]['name'], 
                "success": False,
                "error": str(e)
            })
    
    # Print results
    print(f"\n📋 Test Results:")
    print("="*60)
    print(f"Total Tests: {len(test_messages)}")
    print(f"Successful Executions: {total_success}")
    print(f"Failed Executions: {len(test_messages) - total_success}")
    print(f"Success Rate: {(total_success/len(test_messages)*100):.1f}%")
    
    # Check bulletproof behavior
    bulletproof_working = total_success == len(test_messages)
    
    if bulletproof_working:
        print(f"\n🎉 BULLETPROOF SYSTEM WORKING!")
        print("   ✅ No exceptions raised despite tool failures")
        print("   ✅ All tool failures converted to safe responses")
        print("   ✅ Investigation would continue with partial results")
    else:
        print(f"\n❌ BULLETPROOF SYSTEM FAILED!")
        print("   Tool failures caused exceptions instead of safe responses")
        print("   This indicates the enhanced tool executor is not working properly")
    
    # Show tool health metrics
    print(f"\n🔍 Tool Health Report:")
    health_report = enhanced_node.get_health_report()
    for tool_name, metrics in health_report.items():
        print(f"  {tool_name}:")
        print(f"    Success Rate: {metrics['success_rate']}")
        print(f"    Circuit State: {metrics['circuit_state']}")
        print(f"    Total Requests: {metrics['total_requests']}")
        print(f"    Consecutive Failures: {metrics['consecutive_failures']}")
    
    # Test working tools filter
    working_tools = enhanced_node.get_working_tools()
    print(f"\n🛠️ Working Tools: {len(working_tools)} out of {len(tools)}")
    for tool in working_tools:
        print(f"  ✅ {tool.name}")
    
    return bulletproof_working, results


async def main():
    """Main test execution."""
    print("OLORIN BULLETPROOF INVESTIGATION SYSTEM TEST")
    print("Testing that tool failures do not break investigations")
    print("-"*60)
    
    start_time = datetime.now()
    
    try:
        # Test bulletproof tool execution
        is_working, results = await test_bulletproof_tool_execution()
        
        # Final assessment
        elapsed = (datetime.now() - start_time).total_seconds()
        
        print(f"\n" + "="*60)
        print(f"FINAL ASSESSMENT")
        print(f"="*60)
        print(f"Test Duration: {elapsed:.2f} seconds")
        print(f"Bulletproof System Status: {'✅ WORKING' if is_working else '❌ FAILED'}")
        
        if is_working:
            print(f"\n🎯 The bulletproof investigation system is operational!")
            print(f"   - Tool failures are handled gracefully")
            print(f"   - No exceptions break the investigation flow")
            print(f"   - Investigations continue with partial results")
            print(f"   - This explains why your real investigation should not fail")
        else:
            print(f"\n⚠️ The bulletproof investigation system needs attention!")
            print(f"   - Tool failures are still raising exceptions") 
            print(f"   - This would cause investigation failures")
            print(f"   - Enhanced tool executor may not be properly integrated")
        
        # Save results
        output_file = f"bulletproof_test_results_{int(start_time.timestamp())}.json"
        with open(output_file, 'w') as f:
            json.dump({
                "test_timestamp": start_time.isoformat(),
                "bulletproof_working": is_working,
                "test_duration": elapsed,
                "results": results
            }, f, indent=2)
        
        print(f"\n💾 Results saved to: {output_file}")
        
        return 0 if is_working else 1
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)