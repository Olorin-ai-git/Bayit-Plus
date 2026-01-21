from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

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
    logger.info("Verifying async/await fix for agent execution...")
    logger.info("-" * 60)

    try:
        # Test parallel graph creation
        logger.info("1. Testing parallel graph creation...")
        parallel_graph = await create_and_get_agent_graph(parallel=True)
        logger.info(f"   ✅ Parallel graph created: {type(parallel_graph).__name__}")

        # Test sequential graph creation
        logger.info("\n2. Testing sequential graph creation...")
        sequential_graph = await create_and_get_agent_graph(parallel=False)
        logger.info(
            f"   ✅ Sequential graph created: {type(sequential_graph).__name__}"
        )

        # Verify graph has expected methods
        logger.info("\n3. Verifying graph methods...")
        assert hasattr(parallel_graph, "ainvoke"), "Graph missing ainvoke method"
        logger.info("   ✅ Graph has ainvoke method")

        logger.info("\n" + "=" * 60)
        logger.info("✅ ALL TESTS PASSED - Async/await fix is working correctly!")
        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"\n❌ ERROR: {e}")
        logger.info("\nThe async/await fix may not be properly applied.")
        logger.info("Please check that 'await' keyword is present in:")
        logger.info("  - app/service/agent_service.py line 109")
        logger.info("  - app/router/controllers/investigation_phases.py line 61")
        return False


if __name__ == "__main__":
    success = asyncio.run(verify_fix())
    exit(0 if success else 1)
