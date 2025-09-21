#!/usr/bin/env python3
"""
Test Script for Autonomous Investigation System Fixes
Tests the critical fixes applied to resolve tool execution pipeline issues.
"""

import asyncio
import os
import sys
from typing import Dict, Any

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_tool_registry_fixes():
    """Test that tool registry fixes work properly"""
    logger.info("🔧 Testing Tool Registry Fixes...")
    
    try:
        from app.service.agent.tools.tool_registry import ToolRegistry
        
        # Test that tool registry initializes without AsyncIO errors
        registry = ToolRegistry()
        tools = registry.get_all_tools()
        
        logger.info(f"✅ Tool Registry: Loaded {len(tools)} tools successfully")
        
        # Check for key investigation tools
        key_tools = ['snowflake_query_tool', 'abuseipdb_ip_reputation', 'virustotal_ip_analysis', 'shodan_infrastructure_analysis']
        found_tools = [name for name in key_tools if name in tools]
        
        logger.info(f"✅ Key Investigation Tools: Found {len(found_tools)}/{len(key_tools)}")
        for tool in found_tools:
            logger.info(f"   ✅ {tool}")
        
        missing_tools = [name for name in key_tools if name not in tools]
        if missing_tools:
            logger.warning(f"⚠️ Missing Tools: {missing_tools}")
        
        return len(found_tools) >= 3  # At least 3 key tools should be available
        
    except Exception as e:
        logger.error(f"❌ Tool Registry Test Failed: {e}")
        return False


async def test_enhanced_tool_executor():
    """Test that enhanced tool executor initializes properly"""
    logger.info("🔧 Testing Enhanced Tool Executor...")
    
    try:
        from app.service.agent.orchestration.enhanced_tool_executor import EnhancedToolNode, ToolHealthManager
        from langchain_core.tools import BaseTool
        
        # Create mock tool for testing
        class MockTool(BaseTool):
            name: str = "mock_test_tool"
            description: str = "A mock tool for testing"
            
            def _run(self, query: str) -> str:
                return f"Mock result for: {query}"
            
            async def _arun(self, query: str) -> str:
                return self._run(query)
        
        mock_tool = MockTool()
        
        # Test EnhancedToolNode initialization
        enhanced_node = EnhancedToolNode([mock_tool], investigation_id="test_123")
        
        # Check that health manager is initialized
        assert hasattr(enhanced_node, 'health_manager'), "Health manager not initialized"
        assert isinstance(enhanced_node.health_manager, ToolHealthManager), "Health manager wrong type"
        
        # Check that tool metrics are initialized
        assert hasattr(enhanced_node, 'tool_metrics'), "Tool metrics not initialized"
        assert mock_tool.name in enhanced_node.health_manager.health_checks, "Tool not added to health manager"
        
        logger.info("✅ Enhanced Tool Executor: Initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Enhanced Tool Executor Test Failed: {e}")
        logger.exception("Full traceback:")
        return False


async def test_hybrid_graph_creation():
    """Test that hybrid graph can be created with fixes"""
    logger.info("🔧 Testing Hybrid Graph Creation...")
    
    try:
        from app.service.agent.orchestration.hybrid.hybrid_graph_builder import HybridGraphBuilder
        
        # Create hybrid graph builder
        builder = HybridGraphBuilder()
        
        # Try to build the graph (this tests tool loading, node creation, etc.)
        graph = await builder.build_hybrid_investigation_graph()
        
        # Check that graph was created
        assert graph is not None, "Graph creation returned None"
        
        logger.info("✅ Hybrid Graph: Created successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Hybrid Graph Creation Test Failed: {e}")
        logger.exception("Full traceback:")
        return False


async def test_state_management():
    """Test that investigation state management works"""
    logger.info("🔧 Testing State Management...")
    
    try:
        from app.service.agent.orchestration.hybrid.hybrid_state_schema import create_hybrid_initial_state
        
        # Create initial state
        initial_state = create_hybrid_initial_state(
            investigation_id="test_investigation_123",
            entity_id="67.76.8.209",
            entity_type="ip",
            parallel_execution=True
        )
        
        # Check critical fields exist
        required_fields = ['investigation_id', 'entity_id', 'entity_type', 'tools_used', 'tool_results', 'current_phase']
        for field in required_fields:
            assert field in initial_state, f"Required field '{field}' missing from state"
        
        # Check initial values
        assert initial_state['tools_used'] == [], "tools_used should start empty"
        assert initial_state['tool_results'] == {}, "tool_results should start empty"
        assert initial_state['current_phase'] == 'initialization', "should start in initialization phase"
        
        logger.info("✅ State Management: Initial state created correctly")
        return True
        
    except Exception as e:
        logger.error(f"❌ State Management Test Failed: {e}")
        logger.exception("Full traceback:")
        return False


async def main():
    """Run all tests"""
    logger.info("🚀 Starting Autonomous Investigation System Fix Tests...")
    logger.info("=" * 60)
    
    test_results = {}
    
    # Test 1: Tool Registry Fixes
    test_results['tool_registry'] = await test_tool_registry_fixes()
    
    # Test 2: Enhanced Tool Executor
    test_results['enhanced_tool_executor'] = await test_enhanced_tool_executor()
    
    # Test 3: Hybrid Graph Creation
    test_results['hybrid_graph'] = await test_hybrid_graph_creation()
    
    # Test 4: State Management
    test_results['state_management'] = await test_state_management()
    
    # Summary
    logger.info("=" * 60)
    logger.info("🏁 Test Results Summary:")
    
    passed_tests = sum(1 for result in test_results.values() if result)
    total_tests = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"   {test_name}: {status}")
    
    logger.info(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        logger.info("🎉 ALL TESTS PASSED! Investigation system fixes are working.")
        return 0
    else:
        logger.error(f"💥 {total_tests - passed_tests} tests failed. Some issues remain.")
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("Tests interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        logger.exception("Full traceback:")
        sys.exit(1)