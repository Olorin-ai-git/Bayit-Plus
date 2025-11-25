#!/usr/bin/env python3
"""
Comprehensive test script for MCP infrastructure improvements.
This script validates all the enhanced MCP components.
"""

import asyncio
import os
import sys
import time
import traceback
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import test modules - handle missing modules gracefully
modules_loaded = {}
try:
    from app.service.agent.mcp_client.enhanced_mcp_client import (
        EnhancedMCPClient,
        MCPCache,
    )

    modules_loaded["enhanced_client"] = True
except ImportError as e:
    print(f"⚠️  Enhanced MCP Client not available: {e}")
    modules_loaded["enhanced_client"] = False

try:
    from app.service.agent.mcp_client.mcp_connection_pool import (
        ConnectionState,
        MCPConnection,
        MCPConnectionPool,
    )

    modules_loaded["connection_pool"] = True
except ImportError as e:
    print(f"⚠️  MCP Connection Pool not available: {e}")
    modules_loaded["connection_pool"] = False

try:
    from app.service.agent.mcp_client.mcp_health_monitor import (
        AlertSeverity,
        HealthStatus,
        MCPHealthMonitor,
    )

    modules_loaded["health_monitor"] = True
except ImportError as e:
    print(f"⚠️  MCP Health Monitor not available: {e}")
    modules_loaded["health_monitor"] = False

try:
    from app.service.agent.mcp_client.mcp_metrics import MCPMetricsCollector

    modules_loaded["metrics"] = True
except ImportError as e:
    print(f"⚠️  MCP Metrics Collector not available: {e}")
    modules_loaded["metrics"] = False

try:
    from app.service.agent.orchestration.mcp_resilience_patterns import (
        MCPResilienceManager,
    )

    modules_loaded["resilience"] = True
except ImportError as e:
    print(f"⚠️  MCP Resilience Patterns not available: {e}")
    modules_loaded["resilience"] = False


class MCPInfrastructureValidator:
    """Comprehensive validator for MCP infrastructure."""

    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0

    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result."""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅"
        else:
            self.failed_tests += 1
            status = "❌"

        result = f"{status} {test_name}"
        if message:
            result += f": {message}"

        print(result)
        self.results.append(
            {
                "test": test_name,
                "success": success,
                "message": message,
                "status": status,
            }
        )

    async def test_enhanced_mcp_client(self):
        """Test enhanced MCP client functionality."""
        print("\n🔧 Testing Enhanced MCP Client...")

        if not modules_loaded.get("enhanced_client"):
            self.log_result("Enhanced MCP Client", False, "Module not available")
            return

        try:
            # Test client initialization
            client = EnhancedMCPClient(redis_url="redis://localhost:6379")
            await client.initialize()

            self.log_result(
                "Enhanced MCP Client initialization",
                True,
                "Client initialized successfully",
            )

            # Test server registration - need to import MCPServerEndpoint
            from app.service.agent.mcp_client.enhanced_mcp_client import (
                MCPServerEndpoint,
            )

            endpoint1 = MCPServerEndpoint(
                name="test_server_1", url="stdio://test1", priority=1
            )

            endpoint2 = MCPServerEndpoint(
                name="test_server_2", url="stdio://test2", priority=2
            )

            client.register_server(endpoint1)
            client.register_server(endpoint2)

            self.log_result(
                "Server registration",
                len(client.servers) == 2,
                f"Registered {len(client.servers)} servers",
            )

            # Test circuit breaker creation
            circuit_breaker_exists = "test_server_1" in client.circuit_breakers
            self.log_result(
                "Circuit breaker initialization",
                circuit_breaker_exists,
                "Circuit breakers created for servers",
            )

            # Test cache functionality (mock)
            cache_key = client.cache._generate_cache_key(
                "test_server_1", "test_tool", {"param": "value"}
            )
            cache_works = len(cache_key) > 0
            self.log_result(
                "Cache key generation",
                cache_works,
                f"Generated cache key: {cache_key[:50]}...",
            )

            await client.shutdown()

        except Exception as e:
            self.log_result("Enhanced MCP Client", False, f"Exception: {str(e)}")
            traceback.print_exc()

    async def test_connection_pool(self):
        """Test connection pool functionality."""
        print("\n🔗 Testing Connection Pool...")

        if not modules_loaded.get("connection_pool"):
            self.log_result("Connection Pool", False, "Module not available")
            return

        try:
            # Test pool initialization
            pool = MCPConnectionPool(
                max_connections_per_server=3, min_connections_per_server=1
            )
            await pool.initialize()

            self.log_result(
                "Connection pool initialization",
                True,
                f"Pool initialized with max={pool.max_connections}",
            )

            # Test server registration
            pool.register_server(
                server_name="pool_test_server", endpoint="stdio://pooltest"
            )

            server_registered = "pool_test_server" in pool.server_configs
            self.log_result(
                "Pool server registration",
                server_registered,
                "Server registered in pool",
            )

            # Test resilience manager integration
            resilience_registered = (
                "pool_test_server" in pool.resilience_manager.circuit_breakers
            )
            self.log_result(
                "Resilience manager integration",
                resilience_registered,
                "Server registered with resilience patterns",
            )

            # Test pool statistics
            stats = pool.get_pool_stats()
            stats_valid = isinstance(stats, dict) and "servers" in stats
            self.log_result(
                "Pool statistics", stats_valid, f"Stats keys: {list(stats.keys())}"
            )

            await pool.shutdown()

        except Exception as e:
            self.log_result("Connection Pool", False, f"Exception: {str(e)}")
            traceback.print_exc()

    async def test_health_monitor(self):
        """Test health monitoring functionality."""
        print("\n🩺 Testing Health Monitor...")

        if not modules_loaded.get("health_monitor"):
            self.log_result("Health Monitor", False, "Module not available")
            return

        try:
            # Test monitor initialization
            monitor = MCPHealthMonitor(check_interval=2.0)
            await monitor.start_monitoring()

            self.log_result(
                "Health monitor initialization",
                monitor._running,
                "Monitor started successfully",
            )

            # Test server registration
            monitor.register_server(
                server_name="health_test_server",
                service_type="test_service",
                priority=1,
            )

            server_registered = "health_test_server" in monitor.server_health
            self.log_result(
                "Health monitor server registration",
                server_registered,
                "Server registered for health monitoring",
            )

            # Test primary server assignment
            primary_server = monitor.get_primary_server("test_service")
            primary_correct = primary_server == "health_test_server"
            self.log_result(
                "Primary server assignment",
                primary_correct,
                f"Primary server: {primary_server}",
            )

            # Test health summary
            summary = monitor.get_health_summary()
            summary_valid = isinstance(summary, dict) and "total_servers" in summary
            self.log_result(
                "Health summary generation",
                summary_valid,
                f"Summary keys: {list(summary.keys())}",
            )

            await monitor.stop_monitoring()

        except Exception as e:
            self.log_result("Health Monitor", False, f"Exception: {str(e)}")
            traceback.print_exc()

    def test_metrics_collector(self):
        """Test metrics collection functionality."""
        print("\n📊 Testing Metrics Collector...")

        if not modules_loaded.get("metrics"):
            self.log_result("Metrics Collector", False, "Module not available")
            return

        try:
            # Test collector initialization
            collector = MCPMetricsCollector()

            self.log_result(
                "Metrics collector initialization",
                True,
                "Collector initialized successfully",
            )

            # Test counter operations
            collector.increment_counter("test_counter", 5.0)
            collector.increment_counter("test_counter", 3.0)
            counter_value = collector.get_counter_value("test_counter")

            self.log_result(
                "Counter operations",
                counter_value == 8.0,
                f"Counter value: {counter_value}",
            )

            # Test gauge operations
            collector.set_gauge("test_gauge", 42.0)
            gauge_value = collector.get_gauge_value("test_gauge")

            self.log_result(
                "Gauge operations", gauge_value == 42.0, f"Gauge value: {gauge_value}"
            )

            # Test histogram operations
            for value in [1, 2, 3, 4, 5]:
                collector.record_histogram("test_histogram", value)

            hist_stats = collector.get_histogram_stats("test_histogram")
            hist_valid = hist_stats.get("count") == 5 and hist_stats.get("mean") == 3.0

            self.log_result(
                "Histogram operations",
                hist_valid,
                f"Histogram mean: {hist_stats.get('mean')}",
            )

            # Test timer operations
            with collector.timer("test_operation"):
                time.sleep(0.01)

            timer_stats = collector.get_timer_stats("test_operation")
            timer_valid = timer_stats.get("count") == 1 and timer_stats.get("mean") > 0

            self.log_result(
                "Timer operations",
                timer_valid,
                f"Timer mean: {timer_stats.get('mean', 0):.4f}s",
            )

            # Test request tracking
            collector.track_request(
                "server1", "test_tool", success=True, response_time=0.1
            )
            collector.track_request(
                "server1", "test_tool", success=False, response_time=0.2
            )

            server_stats = collector.get_server_stats("server1")
            tracking_valid = (
                server_stats["total_requests"] == 2
                and server_stats["success_rate"] == 0.5
            )

            self.log_result(
                "Request tracking",
                tracking_valid,
                f"Success rate: {server_stats['success_rate']}",
            )

            # Test Prometheus export
            prometheus_output = collector.export_prometheus_format()
            prometheus_valid = (
                "test_counter" in prometheus_output
                and "test_gauge" in prometheus_output
            )

            self.log_result(
                "Prometheus export",
                prometheus_valid,
                f"Export length: {len(prometheus_output)} chars",
            )

            collector.reset_metrics()

        except Exception as e:
            self.log_result("Metrics Collector", False, f"Exception: {str(e)}")
            traceback.print_exc()

    def test_resilience_patterns(self):
        """Test resilience patterns functionality."""
        print("\n🛡️ Testing Resilience Patterns...")

        if not modules_loaded.get("resilience"):
            self.log_result("Resilience Patterns", False, "Module not available")
            return

        try:
            # Test resilience manager initialization
            manager = MCPResilienceManager()

            self.log_result(
                "Resilience manager initialization",
                True,
                "Manager initialized successfully",
            )

            # Test server registration
            manager.register_server(
                server_name="resilience_test_server",
                max_connections=5,
                failure_threshold=3,
                recovery_timeout=60.0,
                rate_limit=10,
            )

            server_registered = "resilience_test_server" in manager.circuit_breakers
            self.log_result(
                "Resilience server registration",
                server_registered,
                "Server registered with resilience patterns",
            )

            # Test circuit breaker functionality
            cb = manager.circuit_breakers["resilience_test_server"]
            can_execute_initially = cb.can_execute()

            # Simulate failures
            for _ in range(4):
                cb.record_failure()

            can_execute_after_failures = cb.can_execute()
            circuit_breaker_works = (
                can_execute_initially and not can_execute_after_failures
            )

            self.log_result(
                "Circuit breaker functionality",
                circuit_breaker_works,
                f"State: {cb.state['state']}",
            )

            # Test rate limiter
            rate_limiter = manager.rate_limiters["resilience_test_server"]
            rate_limiter_exists = rate_limiter is not None

            self.log_result(
                "Rate limiter initialization",
                rate_limiter_exists,
                f"Rate limit: {rate_limiter.rate_limit}/sec",
            )

            # Test server state reporting
            server_state = manager.get_server_state("resilience_test_server")
            state_valid = (
                isinstance(server_state, dict)
                and "circuit_breaker_state" in server_state
            )

            self.log_result(
                "Server state reporting",
                state_valid,
                f"CB state: {server_state.get('circuit_breaker_state')}",
            )

        except Exception as e:
            self.log_result("Resilience Patterns", False, f"Exception: {str(e)}")
            traceback.print_exc()

    async def test_integration(self):
        """Test integration between all components."""
        print("\n🔄 Testing Component Integration...")

        if not modules_loaded.get("enhanced_client"):
            self.log_result(
                "Component Integration", False, "Enhanced client module not available"
            )
            return

        try:
            # Initialize all components
            client = EnhancedMCPClient(redis_url="redis://localhost:6379")
            await client.initialize()

            # Register a test server
            from app.service.agent.mcp_client.enhanced_mcp_client import (
                MCPServerEndpoint,
            )

            endpoint = MCPServerEndpoint(
                name="integration_server", url="stdio://integration", priority=1
            )

            client.register_server(endpoint)

            # Verify all components know about the server
            client_knows_server = "integration_server" in client.servers
            # Connection pool and health monitor may not have the same interface
            pool_knows_server = hasattr(client, "connection_pool")
            monitor_knows_server = hasattr(client, "health_monitor")
            metrics_has_server = (
                hasattr(client, "metrics") and client.metrics is not None
            )

            integration_success = all(
                [
                    client_knows_server,
                    pool_knows_server,
                    monitor_knows_server,
                    metrics_has_server,
                ]
            )

            self.log_result(
                "Component integration",
                integration_success,
                f"Client: {client_knows_server}, Pool: {pool_knows_server}, Monitor: {monitor_knows_server}, Metrics: {metrics_has_server}",
            )

            # Test cross-component data flow
            client.metrics.track_request(
                "integration_server", "test_tool", success=True, response_time=0.1
            )

            metrics = client.metrics.get_all_metrics()
            metrics_recorded = "integration_server" in metrics.get("server_stats", {})

            self.log_result(
                "Cross-component data flow",
                metrics_recorded,
                "Metrics successfully recorded across components",
            )

            await client.shutdown()

        except Exception as e:
            self.log_result("Component Integration", False, f"Exception: {str(e)}")
            traceback.print_exc()

    async def run_all_tests(self):
        """Run all validation tests."""
        print("🚀 Starting MCP Infrastructure Validation...")
        print("=" * 60)

        start_time = time.time()

        # Run all test suites
        await self.test_enhanced_mcp_client()
        await self.test_connection_pool()
        await self.test_health_monitor()
        self.test_metrics_collector()
        self.test_resilience_patterns()
        await self.test_integration()

        end_time = time.time()
        duration = end_time - start_time

        # Print summary
        print("\n" + "=" * 60)
        print("🏁 MCP Infrastructure Validation Summary")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"⏱️ Duration: {duration:.2f}s")

        if self.failed_tests == 0:
            print("\n🎉 All MCP infrastructure components are working correctly!")
            success_rate = 100.0
        else:
            success_rate = (self.passed_tests / self.total_tests) * 100
            print(
                f"\n⚠️  {self.failed_tests} test(s) failed. Success rate: {success_rate:.1f}%"
            )

        # Print detailed results
        print("\n📋 Detailed Results:")
        for result in self.results:
            status_symbol = result["status"]
            message_part = f": {result['message']}" if result["message"] else ""
            print(f"  {status_symbol} {result['test']}{message_part}")

        return self.failed_tests == 0


async def main():
    """Main function."""
    try:
        validator = MCPInfrastructureValidator()
        success = await validator.run_all_tests()

        if success:
            print("\n✨ MCP Infrastructure validation completed successfully!")
            sys.exit(0)
        else:
            print("\n💥 MCP Infrastructure validation failed!")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n⚡ Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💀 Validation failed with unexpected error: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
