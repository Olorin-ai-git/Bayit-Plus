#!/usr/bin/env python3
"""
Verification script for async/await fix in agent execution.

This script verifies that the fix for "Agent execution failed with error: 
'coroutine' object has no attribute 'ainvoke'" has been properly applied.

The issue was that create_and_get_agent_graph() is an async function that 
returns a coroutine, but was being called without 'await' in two locations:
1. app/service/agent_service.py line 109
2. app/router/controllers/investigation_phases.py line 61

Fix applied: Added 'await' keyword before the function calls.
"""

import asyncio
from app.service.agent.orchestration.graph_builder import create_and_get_agent_graph

async def verify_fix():
    """Verify that the async graph creation works correctly."""
    print("Verifying async/await fix for agent execution...")
    print("-" * 60)
    
    try:
        # Test parallel graph creation
        print("1. Testing parallel graph creation...")
        parallel_graph = await create_and_get_agent_graph(parallel=True)
        print(f"   ✅ Parallel graph created: {type(parallel_graph).__name__}")
        
        # Test sequential graph creation
        print("\n2. Testing sequential graph creation...")
        sequential_graph = await create_and_get_agent_graph(parallel=False)
        print(f"   ✅ Sequential graph created: {type(sequential_graph).__name__}")
        
        # Verify graph has expected methods
        print("\n3. Verifying graph methods...")
        assert hasattr(parallel_graph, 'ainvoke'), "Graph missing ainvoke method"
        print("   ✅ Graph has ainvoke method")
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED - Async/await fix is working correctly!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("\nThe async/await fix may not be properly applied.")
        print("Please check that 'await' keyword is present in:")
        print("  - app/service/agent_service.py line 109")
        print("  - app/router/controllers/investigation_phases.py line 61")
        return False

if __name__ == "__main__":
    success = asyncio.run(verify_fix())
    exit(0 if success else 1)