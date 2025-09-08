#!/usr/bin/env python3
"""
Test real investigation execution to identify why tools aren't being used.
"""
import asyncio
import logging
import sys
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_real_device_agent():
    """Test real device agent execution."""
    print("🧪 Testing real device agent execution...")
    
    try:
        # Import the actual device agent function
        from app.service.agent.device_agent import autonomous_device_agent
        from app.service.agent.autonomous_context import AutonomousInvestigationContext, EntityType
        from langchain_core.runnables.config import RunnableConfig
        
        # Create a real investigation context - this simulates what happens in a real call
        context = AutonomousInvestigationContext(
            investigation_id="real-test-001",
            entity_id="test-user-123",
            entity_type=EntityType.USER_ID
        )
        
        # Store the context in the global context manager (simulating real flow)
        from app.service.agent.agent_communication import _get_or_create_autonomous_context
        # The context will be created automatically in the real flow
        
        # Create config like the real system does
        config = RunnableConfig(
            configurable={
                "investigation_id": "real-test-001",
                "entity_id": "test-user-123",
                "agent_context": {
                    "investigation_id": "real-test-001",
                    "entity_id": "test-user-123"
                }
            }
        )
        
        # Create minimal state (like in real LangGraph execution)
        state = {
            "messages": [],
            "investigation_id": "real-test-001",
            "entity_id": "test-user-123"
        }
        
        print("   🚀 Executing real device agent...")
        
        # This is the actual agent call that would happen in production
        result = await autonomous_device_agent(state, config)
        
        print(f"   📊 Agent result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        if isinstance(result, dict):
            # Check for agent output
            agent_output = result.get("agent_output", {})
            if isinstance(agent_output, dict):
                findings = agent_output.get("findings", [])
                print(f"   📊 Findings count: {len(findings) if isinstance(findings, list) else 'Not a list'}")
                
                if findings:
                    print("   ✅ Agent produced findings:")
                    for i, finding in enumerate(findings[:3]):  # Show first 3
                        print(f"      {i+1}. {finding}")
                else:
                    print("   ⚠️  Agent produced no findings")
                    
                # Check raw data for sequential execution info
                raw_data = agent_output.get("raw_data", {})
                sequential_metadata = raw_data.get("sequential_metadata", {})
                
                if sequential_metadata:
                    print(f"   📊 Sequential execution metadata:")
                    print(f"      Total phases: {sequential_metadata.get('total_phases', 0)}")
                    print(f"      Successful phases: {sequential_metadata.get('successful_phases', 0)}")
                    print(f"      Tools used: {sequential_metadata.get('total_tools_used', 0)}")
                    print(f"      Tool coverage: {sequential_metadata.get('tool_coverage_percentage', 0)}%")
                    
                    phase_results = sequential_metadata.get('phase_results', [])
                    for phase in phase_results:
                        phase_name = phase.get('phase_name', 'Unknown')
                        success = phase.get('success', False)
                        tools_used = len(phase.get('tools_used', []))
                        print(f"      Phase {phase_name}: {'✅' if success else '❌'} ({tools_used} tools)")
                
                else:
                    print("   ⚠️  No sequential execution metadata found")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Real device agent test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run real investigation test."""
    print("🔍 Starting Real Investigation Test\n")
    
    success = await test_real_device_agent()
    
    print("\n" + "=" * 60)
    if success:
        print("📊 Real investigation test completed - check output above for tool usage")
    else:
        print("❌ Real investigation test failed")
    
    return success


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)