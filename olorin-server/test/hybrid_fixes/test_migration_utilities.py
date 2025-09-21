#!/usr/bin/env python3
"""
Test Migration Utilities and Hybrid Graph Selection

This script tests the hybrid graph selection and basic execution
to isolate where the tool execution is failing.
"""

import asyncio
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# CRITICAL: Ensure we're in mock mode
os.environ["TEST_MODE"] = "mock"

async def test_hybrid_graph_selection():
    """Test hybrid graph selection and basic execution."""
    
    print("🧪 Testing Hybrid Graph Selection and Basic Execution")
    print("   Mode: MOCK")
    
    try:
        # Import after setting test mode
        from app.service.agent.orchestration.hybrid.migration_utilities import (
            get_investigation_graph, GraphType, enable_hybrid_graph
        )
        
        print("✅ Hybrid graph imports successful")
        
        # Enable hybrid graph for testing
        enable_hybrid_graph(rollout_percentage=100)
        print("✅ Hybrid graph enabled for testing")
        
        # Get hybrid graph
        print("🎯 Getting hybrid investigation graph...")
        graph = await get_investigation_graph(
            investigation_id="TEST_HYBRID_001",
            entity_type="ip"
        )
        print("✅ Hybrid graph obtained successfully")
        
        # Import hybrid state creation
        from app.service.agent.orchestration.hybrid.hybrid_state_schema import create_hybrid_initial_state
        
        # Create hybrid initial state
        initial_state = create_hybrid_initial_state(
            investigation_id="TEST_HYBRID_001",
            entity_id="192.168.1.100",
            entity_type="ip"
        )
        print("✅ Hybrid initial state created")
        print(f"   Initial tools_used: {len(initial_state.get('tools_used', []))}")
        print(f"   Initial tool_results: {len(initial_state.get('tool_results', {}))}")
        print(f"   Initial phase: {initial_state.get('current_phase', 'unknown')}")
        
        # Try step-by-step execution
        print("📊 Attempting hybrid graph step-by-step execution...")
        config = {"recursion_limit": 15}
        
        step_count = 0
        last_state = None
        
        try:
            async for chunk in graph.astream(initial_state, config):
                step_count += 1
                node_names = list(chunk.keys())
                print(f"   Step {step_count}: {node_names}")
                
                # Get the latest state
                for node_name in node_names:
                    if chunk[node_name]:
                        last_state = chunk[node_name]
                        
                        # Check for tool execution tracking
                        tools_used = len(last_state.get('tools_used', []))
                        tool_results = len(last_state.get('tool_results', {}))
                        tool_attempts = last_state.get('tool_execution_attempts', 0)
                        current_phase = last_state.get('current_phase', 'unknown')
                        
                        print(f"      State: tools_used={tools_used}, tool_results={tool_results}, attempts={tool_attempts}, phase={current_phase}")
                
                if step_count >= 10:  # Safety limit for debugging
                    print("   ⚠️ Stopping after 10 steps for analysis")
                    break
        
        except Exception as stream_e:
            print(f"❌ Streaming failed: {stream_e}")
            return {
                "success": False,
                "error": f"Streaming failed: {stream_e}",
                "step_count": step_count
            }
        
        print(f"📊 Hybrid graph streaming completed after {step_count} steps")
        
        if last_state:
            tools_used = len(last_state.get('tools_used', []))
            tool_results = len(last_state.get('tool_results', {}))
            tool_attempts = last_state.get('tool_execution_attempts', 0)
            current_phase = last_state.get('current_phase', 'unknown')
            snowflake_completed = last_state.get('snowflake_completed', False)
            
            print(f"\n📈 Final Hybrid State Analysis:")
            print(f"   Tools used: {tools_used}")
            print(f"   Tool results: {tool_results}")
            print(f"   Tool execution attempts: {tool_attempts}")
            print(f"   Current phase: {current_phase}")
            print(f"   Snowflake completed: {snowflake_completed}")
            
            # Identify specific issues
            issues = []
            
            if tool_attempts == 0:
                issues.append("No tool execution attempts (tools never called)")
            
            if tools_used == 0 and tool_attempts > 0:
                issues.append("Tool execution attempted but no tools marked as used")
            
            if tools_used > 0 and tool_results == 0:
                issues.append("Tools used but no results captured")
            
            if not snowflake_completed:
                issues.append("Snowflake query never completed")
            
            if current_phase == "initialization":
                issues.append("Phase never progressed beyond initialization")
            
            if issues:
                print(f"\n🚨 Issues Found:")
                for i, issue in enumerate(issues, 1):
                    print(f"   {i}. {issue}")
            else:
                print(f"\n✅ No obvious issues found in hybrid execution")
            
            return {
                "success": True,
                "tools_used": tools_used,
                "tool_results": tool_results,
                "tool_attempts": tool_attempts,
                "current_phase": current_phase,
                "snowflake_completed": snowflake_completed,
                "step_count": step_count,
                "issues": issues,
                "final_state": last_state
            }
        else:
            print(f"\n❌ No final state captured from hybrid execution")
            return {
                "success": False,
                "error": "No final state captured",
                "step_count": step_count
            }
        
    except Exception as e:
        print(f"❌ Hybrid graph test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


async def main():
    print("🔍 Starting Hybrid Graph Migration Utilities Test")
    
    result = await test_hybrid_graph_selection()
    
    if result["success"]:
        print("\n✅ Hybrid graph test completed")
        
        if result["tool_attempts"] == 0:
            print("🎯 PRIMARY ISSUE: No tool execution attempts in hybrid graph")
            print("   Tools are never being called despite graph execution")
            print("   Focus debugging on: fraud_investigation → tools routing")
        elif result["tools_used"] == 0:
            print("🎯 SECONDARY ISSUE: Tool execution attempted but not recorded")
            print("   Tools are called but results not processed properly")
            print("   Focus debugging on: enhanced tool node result processing")
        elif result["tool_results"] == 0:
            print("🎯 TERTIARY ISSUE: Tools used but results not captured")
            print("   Tool calls complete but state not updated")
            print("   Focus debugging on: tool result message processing")
        else:
            print("🎯 Tool execution appears to be working")
            print("   Issue may be in domain analysis or completion logic")
        
        if result.get("issues"):
            print(f"\n📋 Specific Issues to Address:")
            for i, issue in enumerate(result["issues"], 1):
                print(f"   {i}. {issue}")
    else:
        print(f"\n❌ Hybrid graph test failed: {result['error']}")
    
    return 0 if result["success"] else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)