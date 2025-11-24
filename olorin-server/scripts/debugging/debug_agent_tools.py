#!/usr/bin/env python3
"""
General Agent Tools Debug Script

<<<<<<< HEAD
Debug script to test autonomous agent execution and tool registry functionality.
=======
Debug script to test structured agent execution and tool registry functionality.
>>>>>>> 001-modify-analyzer-method
Helps identify issues with tool registration, initialization, and basic agent operations.
"""
import asyncio
import logging
import sys
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


async def test_tool_registry():
    """Test tool registry initialization and functionality."""
    print("🧪 Testing tool registry initialization...")
    
    try:
        from app.service.agent.tools.tool_registry import ToolRegistry, initialize_tools
        
        # Initialize tools
        initialize_tools()
        registry = ToolRegistry()
        
        print(f"   ✅ Tool registry initialized")
        print(f"   📊 Total tools available: {len(registry.get_all_tools())}")
        
        # Test tool categories
        categories = registry.get_tool_categories()
        for category, tools in categories.items():
            print(f"   📂 {category}: {len(tools)} tools")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Tool registry test failed: {e}")
        logger.exception("Tool registry error")
        return False


async def test_basic_agent_functionality():
<<<<<<< HEAD
    """Test basic autonomous agent functionality."""
    print("🧪 Testing basic agent functionality...")
    
    try:
        from app.service.agent.autonomous_context import AutonomousInvestigationContext, EntityType
        from app.service.agent.autonomous_base import AutonomousInvestigationAgent
        
        # Create test context
        context = AutonomousInvestigationContext(
=======
    """Test basic structured agent functionality."""
    print("🧪 Testing basic agent functionality...")
    
    try:
        from app.service.agent.structured_context import StructuredInvestigationContext, EntityType
        from app.service.agent.structured_base import StructuredInvestigationAgent
        
        # Create test context
        context = StructuredInvestigationContext(
>>>>>>> 001-modify-analyzer-method
            investigation_id="debug-test-001",
            entity_type=EntityType.IP,
            entity_value="192.168.1.1",
            additional_context={"source": "debug_test"}
        )
        
        print(f"   ✅ Created investigation context: {context.investigation_id}")
        
        # Test agent creation
<<<<<<< HEAD
        agent = AutonomousInvestigationAgent(domain="test", tools=[])
=======
        agent = StructuredInvestigationAgent(domain="test", tools=[])
>>>>>>> 001-modify-analyzer-method
        print(f"   ✅ Created agent: {agent.domain}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Basic agent test failed: {e}")
        logger.exception("Agent test error")
        return False


async def test_tool_validation():
    """Test tool validation and availability."""
    print("🧪 Testing tool validation...")
    
    try:
        from app.service.agent.tools.tool_registry import ToolRegistry
        
        registry = ToolRegistry()
        all_tools = registry.get_all_tools()
        
        # Test each tool's basic properties
        valid_tools = 0
        invalid_tools = 0
        
        for tool_name, tool in all_tools.items():
            try:
                # Check if tool has required attributes
                if hasattr(tool, 'name') and hasattr(tool, 'description'):
                    valid_tools += 1
                    print(f"   ✅ {tool_name}: Valid")
                else:
                    invalid_tools += 1
                    print(f"   ❌ {tool_name}: Missing required attributes")
            except Exception as e:
                invalid_tools += 1
                print(f"   ❌ {tool_name}: Error - {e}")
        
        print(f"   📊 Tool validation summary:")
        print(f"      Valid tools: {valid_tools}")
        print(f"      Invalid tools: {invalid_tools}")
        
        return invalid_tools == 0
        
    except Exception as e:
        print(f"   ❌ Tool validation test failed: {e}")
        logger.exception("Tool validation error")
        return False


async def test_environment_configuration():
    """Test environment configuration and secrets."""
    print("🧪 Testing environment configuration...")
    
    try:
        import os
        
        # Check critical environment variables
        critical_vars = [
            'ANTHROPIC_API_KEY',
            'OPENAI_API_KEY',
            'JWT_SECRET_KEY'
        ]
        
        missing_vars = []
        for var in critical_vars:
            if not os.getenv(var):
                missing_vars.append(var)
                print(f"   ⚠️  {var}: Not set")
            else:
                print(f"   ✅ {var}: Available")
        
        # Check optional configuration
        optional_vars = [
            'USE_DATABASE_QUERY',
            'USE_SPLUNK_TOOL',
            'USE_THREAT_INTELLIGENCE',
            'REDIS_URL'
        ]
        
        for var in optional_vars:
            value = os.getenv(var, 'not set')
            print(f"   ℹ️  {var}: {value}")
        
        if missing_vars:
            print(f"   ⚠️  Missing critical environment variables: {missing_vars}")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Environment test failed: {e}")
        logger.exception("Environment test error")
        return False


async def main():
    """Run all debug tests."""
    print("🚀 Starting general agent and tools debug session...")
    print("=" * 60)
    
    tests = [
        ("Environment Configuration", test_environment_configuration),
        ("Tool Registry", test_tool_registry),
        ("Basic Agent Functionality", test_basic_agent_functionality),
        ("Tool Validation", test_tool_validation),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name} test...")
        try:
            result = await test_func()
            results[test_name] = result
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"   {status}")
        except Exception as e:
            results[test_name] = False
            print(f"   ❌ FAILED: {e}")
            logger.exception(f"{test_name} test error")
    
    print("\n" + "=" * 60)
    print("📊 Debug Session Summary:")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Agent tools are working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)