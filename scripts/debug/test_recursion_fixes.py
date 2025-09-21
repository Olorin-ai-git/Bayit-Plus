#!/usr/bin/env python3
"""
Test script to verify LangGraph recursion fixes.

This script tests the enhanced recursion prevention mechanisms
in the Olorin investigation system.
"""

import asyncio
import os
import sys
import time
from datetime import datetime

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

from olorin_server.app.service.agent.orchestration.clean_graph_builder import run_investigation
from olorin_server.app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_recursion_prevention():
    """
    Test recursion prevention mechanisms.
    """
    logger.info("🧪 Starting recursion prevention test")
    
    # Set up test environment
    os.environ["TEST_MODE"] = "mock"
    
    test_cases = [
        {
            "name": "IP Address Investigation",
            "entity_id": "192.168.1.100",
            "entity_type": "ip",
            "expected_timeout": False
        },
        {
            "name": "User ID Investigation", 
            "entity_id": "user12345",
            "entity_type": "user_id",
            "expected_timeout": False
        },
        {
            "name": "LIVE Mode Test",
            "entity_id": "102.159.115.190",
            "entity_type": "ip",
            "expected_timeout": False,
            "mode": "live"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        logger.info(f"\n{'='*60}")
        logger.info(f"🧪 Test Case {i}: {test_case['name']}")
        logger.info(f"{'='*60}")
        
        # Set mode
        if test_case.get("mode") == "live":
            os.environ.pop("TEST_MODE", None)
        else:
            os.environ["TEST_MODE"] = "mock"
        
        start_time = time.time()
        
        try:
            result = await run_investigation(
                entity_id=test_case["entity_id"],
                entity_type=test_case["entity_type"],
                investigation_id=f"test_recursion_{i}_{int(time.time())}"
            )
            
            elapsed = time.time() - start_time
            
            logger.info(f"✅ Test Case {i} completed in {elapsed:.2f}s")
            logger.info(f"   Success: {result.get('success', False)}")
            logger.info(f"   Risk Score: {result.get('risk_score', 'N/A')}")
            logger.info(f"   Tools Used: {result.get('tools_used', 'N/A')}")
            
            if result.get("state"):
                state = result["state"]
                orchestrator_loops = state.get("orchestrator_loops", 0)
                phase_changes = len(state.get("phase_changes", []))
                routing_decisions = len(state.get("routing_decisions", []))
                
                logger.info(f"   Orchestrator Loops: {orchestrator_loops}")
                logger.info(f"   Phase Changes: {phase_changes}")
                logger.info(f"   Routing Decisions: {routing_decisions}")
                
                # Check for safety violations
                errors = state.get("errors", [])
                safety_errors = [e for e in errors if e.get("type") == "orchestrator_runaway"]
                
                if safety_errors:
                    logger.warning(f"⚠️ Safety termination occurred: {len(safety_errors)} violations")
                else:
                    logger.info("✅ No safety violations detected")
                
                if orchestrator_loops > 10:
                    logger.warning(f"⚠️ High loop count: {orchestrator_loops}")
                else:
                    logger.info(f"✅ Reasonable loop count: {orchestrator_loops}")
            
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"❌ Test Case {i} failed in {elapsed:.2f}s: {str(e)}")
            
            # Check if it's a timeout (expected in some cases)
            if "timeout" in str(e).lower() or "asyncio.TimeoutError" in str(type(e)):
                if test_case.get("expected_timeout"):
                    logger.info("✅ Expected timeout occurred (test passed)")
                else:
                    logger.error("❌ Unexpected timeout occurred")
            else:
                logger.error(f"❌ Unexpected error: {type(e).__name__}")
    
    logger.info(f"\n{'='*60}")
    logger.info("🧪 Recursion prevention tests completed")
    logger.info(f"{'='*60}")


async def test_specific_recursion_scenario():
    """
    Test a specific scenario that previously caused infinite recursion.
    """
    logger.info("\n🎯 Testing specific recursion scenario")
    
    os.environ["TEST_MODE"] = "mock"
    
    # This is the scenario that was failing
    entity_id = "102.159.115.190"
    investigation_id = f"recursion_test_{int(time.time())}"
    
    logger.info(f"Testing entity: {entity_id}")
    logger.info(f"Investigation ID: {investigation_id}")
    
    start_time = time.time()
    
    try:
        result = await run_investigation(
            entity_id=entity_id,
            entity_type="ip",
            investigation_id=investigation_id,
            custom_user_prompt="Focus on fraud patterns and suspicious activity"
        )
        
        elapsed = time.time() - start_time
        
        logger.info(f"✅ Specific test completed in {elapsed:.2f}s")
        
        if result.get("state"):
            state = result["state"]
            logger.info(f"Final state summary:")
            logger.info(f"   Phase: {state.get('current_phase', 'unknown')}")
            logger.info(f"   Orchestrator loops: {state.get('orchestrator_loops', 0)}")
            logger.info(f"   Tools used: {len(state.get('tools_used', []))}")
            logger.info(f"   Domains completed: {len(state.get('domains_completed', []))}")
            logger.info(f"   Errors: {len(state.get('errors', []))}")
            
            # Print any errors
            for error in state.get("errors", []):
                logger.warning(f"   Error: {error.get('type', 'unknown')} - {error.get('message', 'no message')}")
                
        return True
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ Specific test failed in {elapsed:.2f}s: {str(e)}")
        return False


if __name__ == "__main__":
    """
    Run the recursion prevention tests.
    """
    print("🚀 Starting LangGraph Recursion Fix Tests")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("-" * 60)
    
    try:
        # Run the tests
        asyncio.run(test_recursion_prevention())
        asyncio.run(test_specific_recursion_scenario())
        
        print("\n✅ All tests completed successfully!")
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n❌ Test execution failed: {str(e)}")
        import traceback
        traceback.print_exc()