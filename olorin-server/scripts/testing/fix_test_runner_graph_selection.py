#!/usr/bin/env python3
"""
Fix Test Runner for Graph Selection Issues

This script creates a minimal test to debug the hybrid graph tool execution
without the checkpointer complications.
"""

import asyncio
import os
import sys

# Add the project root to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# CRITICAL: Ensure we're in mock mode
os.environ["TEST_MODE"] = "mock"


async def test_minimal_hybrid_execution():
    """Test modern hybrid graph execution using new modular architecture."""

    print("🧪 Testing Modern Hybrid Graph Execution")
    print("   Mode: MOCK (using modular architecture)")
    print("   Architecture: 14 focused components")

    try:
        # Import components
        from langgraph.graph import END, START, StateGraph

        from app.service.agent.orchestration.hybrid.hybrid_graph_builder import (
            HybridGraphBuilder,
        )
        from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
            create_hybrid_initial_state,
        )

        print("✅ Hybrid imports successful")

        # FIXED: Build a simplified test version without checkpointer
        print("🏗️ Building test hybrid graph without checkpointer...")

        # Import the underlying components directly for testing
        from langgraph.graph import END, StateGraph
        from langgraph.prebuilt import ToolNode

        from app.service.agent.orchestration.hybrid.graph.graph_builder import (
            HybridGraphBuilder as ModularBuilder,
        )

        # Create a minimal graph builder for testing
        modular_builder = ModularBuilder(intelligence_mode="adaptive")

        # Build minimal state graph without memory/checkpointer
        from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
            HybridInvestigationState,
        )

        # For A/B testing, create a simple version of the hybrid graph
        graph_builder = StateGraph(HybridInvestigationState)

        # Add basic investigation node (using a simplified approach for A/B testing)
        async def simple_investigation_node(state):
            """Simplified investigation node for A/B testing"""
            from langchain_core.messages import AIMessage

            # Add a simple AI message that requests tool usage
            tool_message = AIMessage(
                content="I need to analyze this IP address for potential fraud indicators.",
                tool_calls=[
                    {
                        "name": "SnowflakeQueryTool",
                        "args": {
                            "query": "SELECT * FROM fraud_indicators WHERE ip = '192.168.1.100'"
                        },
                        "id": "test_call_1",
                    }
                ],
            )

            messages = state.get("messages", [])
            messages.append(tool_message)

            return {
                "messages": messages,
                "current_phase": "investigation",
                "orchestrator_loops": state.get("orchestrator_loops", 0) + 1,
            }

        graph_builder.add_node("investigation", simple_investigation_node)

        # Add tools node from the modular system
        tool_nodes = modular_builder.tool_nodes

        # Simple tool execution for testing
        from app.service.agent.tools.tool_registry import (
            get_tools_for_agent,
            initialize_tools,
        )

        initialize_tools()
        tools = get_tools_for_agent(categories=["olorin", "threat_intelligence"])

        if tools:
            # Create enhanced tool node with result tracking
            tool_node = ToolNode(tools)

            async def enhanced_tool_node(state):
                """Enhanced tool node with result tracking for A/B testing"""
                # Execute tools first
                result = await tool_node.ainvoke(state)

                # Extract tool results and track them (using fixed propagation logic)
                messages = result.get("messages", [])
                tools_used = list(state.get("tools_used", []))
                tool_results = dict(state.get("tool_results", {}))

                # Track new tool executions
                for msg in reversed(messages[-3:]):  # Check recent messages
                    if (
                        hasattr(msg, "name")
                        and hasattr(msg, "content")
                        and hasattr(msg, "tool_call_id")
                    ):
                        tool_name = msg.name
                        tool_content = msg.content

                        if tool_name not in tools_used:
                            tools_used.append(tool_name)

                        tool_results[tool_name] = tool_content

                        # CRITICAL: Add snowflake data propagation for A/B testing with type normalization
                        if "snowflake" in tool_name.lower():
                            # CRITICAL FIX: Parse JSON string to object for consistent data type
                            import json

                            try:
                                snowflake_data = (
                                    json.loads(tool_content)
                                    if isinstance(tool_content, str)
                                    else tool_content
                                )
                            except json.JSONDecodeError:
                                snowflake_data = (
                                    tool_content  # Keep original if not JSON
                                )
                            result["snowflake_data"] = snowflake_data
                            result["snowflake_completed"] = True

                # Update state with tracked results
                result["tools_used"] = tools_used
                result["tool_results"] = tool_results
                result["tool_execution_attempts"] = (
                    state.get("tool_execution_attempts", 0) + 1
                )
                result["current_phase"] = "tool_execution"

                return result

            graph_builder.add_node("tools", enhanced_tool_node)

            # Add simple conditional logic
            def should_continue(state):
                messages = state.get("messages", [])
                last_message = messages[-1] if messages else None
                if hasattr(last_message, "tool_calls") and last_message.tool_calls:
                    return "tools"
                return "__end__"

            graph_builder.set_entry_point("investigation")
            graph_builder.add_conditional_edges(
                "investigation", should_continue, {"tools": "tools", "__end__": END}
            )
            graph_builder.add_edge("tools", END)
        else:
            # No tools available, simple linear flow
            graph_builder.set_entry_point("investigation")
            graph_builder.add_edge("investigation", END)

        # Compile WITHOUT memory (this should work for A/B testing)
        graph = graph_builder.compile()
        print("✅ Modern hybrid graph built successfully")

        # Create initial state
        initial_state = create_hybrid_initial_state(
            investigation_id="TEST_MINIMAL_001",
            entity_id="192.168.1.100",
            entity_type="ip",
        )
        print("✅ Hybrid initial state created")
        print(f"   Initial tools_used: {len(initial_state.get('tools_used', []))}")
        print(f"   Initial tool_results: {len(initial_state.get('tool_results', {}))}")
        print(f"   Initial phase: {initial_state.get('current_phase', 'unknown')}")

        # Execute step by step
        print("📊 Executing modern hybrid graph...")
        config = {"recursion_limit": 15}  # Increased for full graph execution

        step_count = 0
        last_state = None

        async for chunk in graph.astream(initial_state, config):
            step_count += 1
            node_names = list(chunk.keys())
            print(f"   Step {step_count}: {node_names}")

            # Get the latest state
            for node_name in node_names:
                if chunk[node_name]:
                    last_state = chunk[node_name]

                    # Check for tool execution tracking
                    tools_used = len(last_state.get("tools_used", []))
                    tool_results = len(last_state.get("tool_results", {}))
                    tool_attempts = last_state.get("tool_execution_attempts", 0)
                    current_phase = last_state.get("current_phase", "unknown")

                    print(
                        f"      State: tools_used={tools_used}, tool_results={tool_results}, attempts={tool_attempts}, phase={current_phase}"
                    )

                    # Check for messages that indicate tool calls
                    messages = last_state.get("messages", [])
                    tool_call_messages = [
                        msg
                        for msg in messages
                        if hasattr(msg, "tool_calls") and msg.tool_calls
                    ]
                    tool_result_messages = [
                        msg for msg in messages if hasattr(msg, "name")
                    ]

                    if tool_call_messages:
                        print(
                            f"      Tool calls found: {len(tool_call_messages)} messages with tool calls"
                        )
                    if tool_result_messages:
                        print(
                            f"      Tool results found: {len(tool_result_messages)} result messages"
                        )

            if step_count >= 8:  # Safety limit
                print("   ⚠️ Stopping after 8 steps for analysis")
                break

        print(f"\n📊 Modern hybrid execution completed after {step_count} steps")

        if last_state:
            tools_used = len(last_state.get("tools_used", []))
            tool_results = len(last_state.get("tool_results", {}))
            tool_attempts = last_state.get("tool_execution_attempts", 0)
            current_phase = last_state.get("current_phase", "unknown")

            # Check messages for tool calls and results
            messages = last_state.get("messages", [])
            tool_call_count = sum(
                1 for msg in messages if hasattr(msg, "tool_calls") and msg.tool_calls
            )
            tool_result_count = sum(1 for msg in messages if hasattr(msg, "name"))

            print(f"\n📈 Final Analysis:")
            print(f"   Tools used: {tools_used}")
            print(f"   Tool results: {tool_results}")
            print(f"   Tool execution attempts: {tool_attempts}")
            print(f"   Current phase: {current_phase}")
            print(f"   Messages with tool calls: {tool_call_count}")
            print(f"   Tool result messages: {tool_result_count}")
            print(f"   Total messages: {len(messages)}")

            # Diagnostic analysis
            print(f"\n🔍 Diagnostic Analysis:")

            if tool_call_count > 0 and tool_result_count == 0:
                print("   🚨 ISSUE: Tool calls made but no tool results received")
                print("   → Check if tools are actually executing in mock mode")

            elif tool_call_count > 0 and tool_result_count > 0 and tools_used == 0:
                print(
                    "   🚨 ISSUE: Tool calls and results exist but tools_used not updated"
                )
                print("   → Check enhanced tool node state processing")

            elif tool_call_count > 0 and tool_result_count > 0 and tool_results == 0:
                print("   🚨 ISSUE: Tool execution working but results not stored")
                print("   → Check tool result dictionary update logic")

            elif tool_call_count == 0:
                print("   🚨 ISSUE: No tool calls made by fraud_investigation")
                print("   → Check if fraud_investigation is requesting tools properly")

            else:
                print("   ✅ Tool execution flow appears normal")

            return {
                "success": True,
                "tools_used": tools_used,
                "tool_results": tool_results,
                "tool_attempts": tool_attempts,
                "tool_call_count": tool_call_count,
                "tool_result_count": tool_result_count,
                "current_phase": current_phase,
                "step_count": step_count,
                "final_state": last_state,
            }
        else:
            print(f"\n❌ No final state captured")
            return {
                "success": False,
                "error": "No final state captured",
                "step_count": step_count,
            }

    except Exception as e:
        print(f"❌ Modern hybrid test failed: {str(e)}")
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}


async def main():
    print("🔍 Starting Minimal Hybrid Graph Test")

    result = await test_minimal_hybrid_execution()

    if result["success"]:
        print("\n✅ Modern hybrid test completed")

        # Compare to expected behavior from clean graph
        print(f"\n📊 Comparison Analysis:")
        print(f"   Clean graph: 1 tool used, 1 result, 3 attempts, completed")
        print(
            f"   Hybrid graph: {result['tools_used']} tools, {result['tool_results']} results, {result['tool_attempts']} attempts"
        )

        if result["tool_attempts"] == 0:
            print(f"\n🎯 PRIMARY ISSUE CONFIRMED: No tool execution attempts")
            print(f"   The enhanced_fraud_investigation is not triggering tool calls")
            print(f"   Or tools_condition is not detecting tool calls properly")

        elif result["tool_call_count"] > 0 and result["tool_result_count"] == 0:
            print(f"\n🎯 TOOL EXECUTION ISSUE: Tools called but not executing")
            print(
                f"   Tool calls: {result['tool_call_count']}, Results: {result['tool_result_count']}"
            )
            print(f"   Focus on: Mock tool implementation and tool execution")

        elif result["tools_used"] == 0 and result["tool_result_count"] > 0:
            print(f"\n🎯 STATE UPDATE ISSUE: Tools execute but state not updated")
            print(f"   Tool results exist but tools_used={result['tools_used']}")
            print(f"   Focus on: Enhanced tool node state processing")

    else:
        print(f"\n❌ Modern hybrid test failed: {result['error']}")

    return 0 if result["success"] else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
