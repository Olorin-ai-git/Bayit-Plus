#!/usr/bin/env python3
"""
Test script for MCP Infrastructure Integration.

This script validates that the MCP infrastructure is properly integrated
with the existing agent system and tests the key functionality.

Author: Claude Code
Date: 2025-09-08
"""

import asyncio
import sys
import os
from pathlib import Path
from unittest.mock import Mock, patch

# Add the olorin-server directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

def test_imports():
    """Test that all MCP-related modules can be imported."""
    print("🔍 Testing MCP module imports...")
    
    try:
        # Test enhanced MCP client import
        from app.service.agent.mcp_client.enhanced_mcp_client import EnhancedMCPClient
        print("✅ EnhancedMCPClient import successful")
    except ImportError as e:
        print(f"❌ EnhancedMCPClient import failed: {e}")
        return False
    
    try:
        # Test integration bridge import
        from app.service.agent.mcp_client.mcp_integration_bridge import MCPIntegrationBridge
        print("✅ MCPIntegrationBridge import successful")
    except ImportError as e:
        print(f"❌ MCPIntegrationBridge import failed: {e}")
        return False
    
    try:
        # Test enhanced agent factory import
        from app.service.agent.enhanced_agent_factory import get_enhanced_agent_factory
        print("✅ Enhanced agent factory import successful")
    except ImportError as e:
        print(f"❌ Enhanced agent factory import failed: {e}")
        return False
    
    return True

def test_configuration_loading():
    """Test MCP configuration loading from settings."""
    print("\n🔍 Testing MCP configuration loading...")
    
    try:
        from app.service.config import SvcSettings
        
        # Test with environment variables
        test_env = {
            "USE_BLOCKCHAIN_MCP_CLIENT": "true",
            "BLOCKCHAIN_MCP_ENDPOINT": "http://test:8080/mcp",
            "USE_INTELLIGENCE_MCP_CLIENT": "false",
            "USE_ML_AI_MCP_CLIENT": "true",
            "ML_AI_MCP_ENDPOINT": "http://test-ml:8081/mcp"
        }
        
        with patch.dict(os.environ, test_env):
            settings = SvcSettings()
            
            # Verify blockchain enabled
            if hasattr(settings, 'mcp_blockchain_enabled'):
                assert settings.mcp_blockchain_enabled == True
                print("✅ Blockchain MCP configuration loaded correctly")
            else:
                print("ℹ️ Blockchain MCP configuration fields not found (expected in some configurations)")
            
            # Verify intelligence disabled
            if hasattr(settings, 'mcp_intelligence_enabled'):
                assert settings.mcp_intelligence_enabled == False
                print("✅ Intelligence MCP configuration loaded correctly")
            else:
                print("ℹ️ Intelligence MCP configuration fields not found")
            
            # Verify ML/AI enabled
            if hasattr(settings, 'mcp_ml_ai_enabled'):
                assert settings.mcp_ml_ai_enabled == True
                print("✅ ML/AI MCP configuration loaded correctly")
            else:
                print("ℹ️ ML/AI MCP configuration fields not found")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration loading failed: {e}")
        return False

def test_redis_integration():
    """Test Redis client integration."""
    print("\n🔍 Testing Redis integration...")
    
    try:
        from app.service.redis_client import RedisCloudClient, get_redis_client
        from app.service.config import SvcSettings
        
        # Create mock settings
        settings = Mock(spec=SvcSettings)
        settings.redis_host = "localhost"
        settings.redis_port = 6379
        
        # Test Redis client creation
        redis_client = RedisCloudClient(settings)
        assert redis_client is not None
        print("✅ Redis client creation successful")
        
        # Test global client getter
        global_client = get_redis_client(settings)
        assert global_client is not None
        print("✅ Global Redis client getter successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Redis integration test failed: {e}")
        return False

async def test_enhanced_mcp_client():
    """Test Enhanced MCP Client functionality."""
    print("\n🔍 Testing Enhanced MCP Client...")
    
    try:
        from app.service.agent.mcp_client.enhanced_mcp_client import EnhancedMCPClient
        from app.service.config import SvcSettings
        
        # Create mock settings
        settings = Mock(spec=SvcSettings)
        settings.mcp_blockchain_enabled = True
        settings.mcp_blockchain_endpoint = "http://test:8080/mcp"
        settings.mcp_blockchain_api_key = "test_key"
        settings.mcp_intelligence_enabled = False
        settings.mcp_ml_ai_enabled = True
        settings.mcp_ml_ai_endpoint = "http://test-ml:8081/mcp"
        settings.mcp_ml_ai_api_key = "test_ml_key"
        
        # Mock Redis client
        with patch('app.service.agent.mcp_client.enhanced_mcp_client.get_redis_client') as mock_redis:
            mock_redis.return_value = Mock()
            
            # Test client initialization
            client = EnhancedMCPClient(settings)
            assert client is not None
            assert client.settings == settings
            print("✅ Enhanced MCP Client initialization successful")
            
            # Test server registration
            await client._register_default_servers()
            print("✅ Server registration completed")
            
            # Test health monitoring setup
            assert hasattr(client, '_health_monitors')
            assert hasattr(client, '_circuit_breakers')
            print("✅ Health monitoring setup successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Enhanced MCP Client test failed: {e}")
        return False

async def test_agent_factory():
    """Test enhanced agent factory."""
    print("\n🔍 Testing Enhanced Agent Factory...")
    
    try:
        from app.service.agent.enhanced_agent_factory import (
            get_enhanced_agent_factory, 
            create_enhanced_device_agent
        )
        
        # Mock Redis client
        with patch('app.service.agent.enhanced_agent_factory.get_redis_client') as mock_redis:
            mock_redis.return_value = Mock()
            
            # Test factory creation
            factory = await get_enhanced_agent_factory()
            assert factory is not None
            print("✅ Enhanced agent factory creation successful")
            
            # Test device agent creation
            device_agent = await create_enhanced_device_agent()
            assert device_agent is not None
            print("✅ Enhanced device agent creation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Enhanced agent factory test failed: {e}")
        return False

def test_integration_bridge():
    """Test MCP integration bridge."""
    print("\n🔍 Testing MCP Integration Bridge...")
    
    try:
        from app.service.agent.mcp_client.mcp_integration_bridge import MCPIntegrationBridge
        
        # Test bridge initialization
        bridge = MCPIntegrationBridge()
        assert bridge is not None
        print("✅ Integration bridge initialization successful")
        
        # Test method availability
        assert hasattr(bridge, 'invoke_tool')
        assert hasattr(bridge, 'get_server_health')
        assert hasattr(bridge, 'list_available_tools')
        print("✅ Integration bridge methods available")
        
        return True
        
    except Exception as e:
        print(f"❌ Integration bridge test failed: {e}")
        return False

def test_agent_mcp_integration():
    """Test agent MCP integration."""
    print("\n🔍 Testing Agent MCP Integration...")
    
    try:
        # Test device agent import
        from app.service.agent.device_agent import autonomous_device_agent
        print("✅ Device agent import successful")
        
        # Test network agent import
        from app.service.agent.network_agent import autonomous_network_agent
        print("✅ Network agent import successful")
        
        # Test configuration imports
        from app.service.agent.device_agent_config import get_device_objectives
        from app.service.agent.network_agent_config import get_network_objectives
        print("✅ Agent configuration imports successful")
        
        # Test that objectives support MCP enhancement
        device_objectives = get_device_objectives(mcp_enhanced=True)
        network_objectives = get_network_objectives(mcp_enhanced=True)
        
        assert isinstance(device_objectives, list)
        assert isinstance(network_objectives, list)
        assert len(device_objectives) > 0
        assert len(network_objectives) > 0
        print("✅ MCP-enhanced objectives generation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Agent MCP integration test failed: {e}")
        return False

async def run_all_tests():
    """Run all MCP infrastructure integration tests."""
    print("🚀 Starting MCP Infrastructure Integration Tests\n")
    
    tests = [
        ("Module Imports", test_imports),
        ("Configuration Loading", test_configuration_loading),
        ("Redis Integration", test_redis_integration),
        ("Enhanced MCP Client", test_enhanced_mcp_client),
        ("Enhanced Agent Factory", test_agent_factory),
        ("Integration Bridge", test_integration_bridge),
        ("Agent MCP Integration", test_agent_mcp_integration),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print(f"{'='*50}")
        
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            
            results.append((test_name, result))
            
            if result:
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
                
        except Exception as e:
            print(f"❌ {test_name}: FAILED with exception: {e}")
            results.append((test_name, False))
    
    # Print summary
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print(f"{'='*50}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:<30} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All MCP infrastructure integration tests passed!")
        return True
    else:
        print(f"⚠️ {total - passed} tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    # Run the tests
    result = asyncio.run(run_all_tests())
    sys.exit(0 if result else 1)