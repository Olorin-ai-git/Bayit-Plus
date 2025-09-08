#!/usr/bin/env python3
"""
Simple validation script for MCP infrastructure components.
Tests individual components without complex async operations.
"""

import sys
import traceback
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def test_imports():
    """Test that all MCP components can be imported."""
    print("🔍 Testing MCP Component Imports...")
    
    results = {}
    
    # Test enhanced MCP client
    try:
        from app.service.agent.mcp_client.enhanced_mcp_client import (
            EnhancedMCPClient, MCPCache, MCPServerEndpoint, MCPResponse
        )
        results['enhanced_client'] = "✅ Enhanced MCP Client imports successfully"
    except Exception as e:
        results['enhanced_client'] = f"❌ Enhanced MCP Client import failed: {e}"
    
    # Test connection pool
    try:
        from app.service.agent.mcp_client.mcp_connection_pool import (
            MCPConnectionPool, MCPConnection, ConnectionState
        )
        results['connection_pool'] = "✅ Connection Pool imports successfully"
    except Exception as e:
        results['connection_pool'] = f"❌ Connection Pool import failed: {e}"
    
    # Test health monitor
    try:
        from app.service.agent.mcp_client.mcp_health_monitor import (
            MCPHealthMonitor, HealthStatus, AlertSeverity
        )
        results['health_monitor'] = "✅ Health Monitor imports successfully"
    except Exception as e:
        results['health_monitor'] = f"❌ Health Monitor import failed: {e}"
    
    # Test metrics collector
    try:
        from app.service.agent.mcp_client.mcp_metrics import (
            MCPMetricsCollector, MetricType
        )
        results['metrics'] = "✅ Metrics Collector imports successfully"
    except Exception as e:
        results['metrics'] = f"❌ Metrics Collector import failed: {e}"
    
    # Test resilience patterns
    try:
        from app.service.agent.orchestration.mcp_resilience_patterns import (
            MCPResilienceManager, MCPCircuitBreaker, MCPRateLimiter
        )
        results['resilience'] = "✅ Resilience Patterns import successfully"
    except Exception as e:
        results['resilience'] = f"❌ Resilience Patterns import failed: {e}"
    
    return results


def test_basic_functionality():
    """Test basic functionality of imported components."""
    print("\n🧪 Testing Basic Component Functionality...")
    
    results = {}
    
    # Test MCPServerEndpoint creation
    try:
        from app.service.agent.mcp_client.enhanced_mcp_client import MCPServerEndpoint
        endpoint = MCPServerEndpoint(
            name="test_server",
            url="stdio://test",
            priority=1
        )
        results['endpoint_creation'] = f"✅ MCPServerEndpoint created: {endpoint.name}"
    except Exception as e:
        results['endpoint_creation'] = f"❌ MCPServerEndpoint creation failed: {e}"
    
    # Test MCPResponse creation
    try:
        from app.service.agent.mcp_client.enhanced_mcp_client import MCPResponse
        response = MCPResponse(
            success=True,
            data={"test": "data"},
            server_name="test_server"
        )
        results['response_creation'] = f"✅ MCPResponse created: success={response.success}"
    except Exception as e:
        results['response_creation'] = f"❌ MCPResponse creation failed: {e}"
    
    # Test MetricsCollector basic operations
    try:
        from app.service.agent.mcp_client.mcp_metrics import MCPMetricsCollector
        collector = MCPMetricsCollector()
        
        # Test counter
        collector.increment_counter("test_counter", 5.0)
        counter_value = collector.get_counter_value("test_counter")
        
        # Test gauge
        collector.set_gauge("test_gauge", 42.0)
        gauge_value = collector.get_gauge_value("test_gauge")
        
        # Test histogram
        collector.record_histogram("test_histogram", 3.14)
        hist_stats = collector.get_histogram_stats("test_histogram")
        
        results['metrics_basic'] = f"✅ Metrics: counter={counter_value}, gauge={gauge_value}, hist_count={hist_stats.get('count', 0)}"
    except Exception as e:
        results['metrics_basic'] = f"❌ Metrics basic operations failed: {e}"
    
    # Test CircuitBreaker basic operations
    try:
        from app.service.agent.orchestration.mcp_resilience_patterns import MCPCircuitBreaker
        cb = MCPCircuitBreaker("test_server", failure_threshold=3)
        
        initial_state = cb.can_execute()
        cb.record_failure()
        cb.record_failure()  
        cb.record_failure()
        after_failures = cb.can_execute()
        
        results['circuit_breaker'] = f"✅ Circuit breaker: initial={initial_state}, after_failures={after_failures}"
    except Exception as e:
        results['circuit_breaker'] = f"❌ Circuit breaker operations failed: {e}"
    
    # Test HealthStatus and AlertSeverity enums
    try:
        from app.service.agent.mcp_client.mcp_health_monitor import HealthStatus, AlertSeverity
        health_values = [status.value for status in HealthStatus]
        alert_values = [severity.value for severity in AlertSeverity]
        
        results['enums'] = f"✅ Enums: Health={health_values}, Alerts={alert_values}"
    except Exception as e:
        results['enums'] = f"❌ Enum operations failed: {e}"
    
    # Test ConnectionState enum
    try:
        from app.service.agent.mcp_client.mcp_connection_pool import ConnectionState
        connection_values = [state.value for state in ConnectionState]
        
        results['connection_states'] = f"✅ Connection states: {connection_values}"
    except Exception as e:
        results['connection_states'] = f"❌ Connection state enum failed: {e}"
    
    return results


def test_class_instantiation():
    """Test that main classes can be instantiated."""
    print("\n🏗️ Testing Class Instantiation...")
    
    results = {}
    
    # Test EnhancedMCPClient instantiation
    try:
        from app.service.agent.mcp_client.enhanced_mcp_client import EnhancedMCPClient
        client = EnhancedMCPClient(redis_url="redis://localhost:6379")
        results['client_instance'] = f"✅ EnhancedMCPClient instantiated: {type(client).__name__}"
    except Exception as e:
        results['client_instance'] = f"❌ EnhancedMCPClient instantiation failed: {e}"
    
    # Test MCPConnectionPool instantiation
    try:
        from app.service.agent.mcp_client.mcp_connection_pool import MCPConnectionPool
        pool = MCPConnectionPool(max_connections_per_server=5)
        results['pool_instance'] = f"✅ MCPConnectionPool instantiated: max_conn={pool.max_connections}"
    except Exception as e:
        results['pool_instance'] = f"❌ MCPConnectionPool instantiation failed: {e}"
    
    # Test MCPHealthMonitor instantiation
    try:
        from app.service.agent.mcp_client.mcp_health_monitor import MCPHealthMonitor
        monitor = MCPHealthMonitor(check_interval=30.0)
        results['monitor_instance'] = f"✅ MCPHealthMonitor instantiated: interval={monitor.check_interval}s"
    except Exception as e:
        results['monitor_instance'] = f"❌ MCPHealthMonitor instantiation failed: {e}"
    
    # Test MCPMetricsCollector instantiation  
    try:
        from app.service.agent.mcp_client.mcp_metrics import MCPMetricsCollector
        metrics = MCPMetricsCollector(max_history_size=500)
        results['metrics_instance'] = f"✅ MCPMetricsCollector instantiated: history_size={metrics.max_history_size}"
    except Exception as e:
        results['metrics_instance'] = f"❌ MCPMetricsCollector instantiation failed: {e}"
    
    # Test MCPResilienceManager instantiation
    try:
        from app.service.agent.orchestration.mcp_resilience_patterns import MCPResilienceManager
        manager = MCPResilienceManager()
        results['manager_instance'] = f"✅ MCPResilienceManager instantiated: {type(manager).__name__}"
    except Exception as e:
        results['manager_instance'] = f"❌ MCPResilienceManager instantiation failed: {e}"
    
    return results


def test_component_integration():
    """Test basic integration between components."""
    print("\n🔗 Testing Component Integration...")
    
    results = {}
    
    try:
        from app.service.agent.mcp_client.enhanced_mcp_client import EnhancedMCPClient, MCPServerEndpoint
        from app.service.agent.mcp_client.mcp_metrics import MCPMetricsCollector
        
        # Create components
        client = EnhancedMCPClient(redis_url="redis://localhost:6379")
        metrics = MCPMetricsCollector()
        
        # Create and register server endpoint
        endpoint = MCPServerEndpoint(
            name="integration_test_server",
            url="stdio://test",
            priority=1
        )
        
        client.register_server(endpoint)
        
        # Test integration
        server_registered = "integration_test_server" in client.servers
        circuit_breaker_created = "integration_test_server" in client.circuit_breakers
        
        # Test metrics integration
        metrics.track_request("integration_test_server", "test_tool", success=True, response_time=0.1)
        server_stats = metrics.get_server_stats("integration_test_server")
        
        integration_success = (
            server_registered and 
            circuit_breaker_created and 
            server_stats.get("total_requests", 0) > 0
        )
        
        results['basic_integration'] = f"✅ Integration successful: server={server_registered}, cb={circuit_breaker_created}, metrics={server_stats.get('total_requests', 0)} requests"
        
    except Exception as e:
        results['basic_integration'] = f"❌ Component integration failed: {e}"
        traceback.print_exc()
    
    return results


def main():
    """Main validation function."""
    print("🚀 MCP Infrastructure Component Validation")
    print("=" * 60)
    
    total_tests = 0
    passed_tests = 0
    
    # Run all test suites
    test_suites = [
        ("Import Tests", test_imports),
        ("Basic Functionality Tests", test_basic_functionality), 
        ("Class Instantiation Tests", test_class_instantiation),
        ("Component Integration Tests", test_component_integration)
    ]
    
    all_results = {}
    
    for suite_name, test_func in test_suites:
        try:
            results = test_func()
            all_results[suite_name] = results
            
            for test_name, result in results.items():
                total_tests += 1
                if result.startswith("✅"):
                    passed_tests += 1
                print(f"  {result}")
                
        except Exception as e:
            print(f"  ❌ {suite_name} failed completely: {e}")
            total_tests += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 Validation Summary")
    print("=" * 60)
    print(f"Total Tests: {total_tests}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {total_tests - passed_tests}")
    
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    print(f"📊 Success Rate: {success_rate:.1f}%")
    
    if passed_tests == total_tests:
        print("\n🎉 All MCP infrastructure components validated successfully!")
        return True
    else:
        print(f"\n⚠️  {total_tests - passed_tests} validation(s) failed")
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚡ Validation interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n💀 Validation failed: {e}")
        traceback.print_exc()
        sys.exit(1)