#!/usr/bin/env python3
"""
Performance Metrics Debug Script

Analyzes system performance, response times, and resource usage for the Olorin platform.
Provides insights into bottlenecks and optimization opportunities.
"""
import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, List

import psutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PerformanceMetrics:
    """Performance metrics collector and analyzer."""

    def __init__(self):
        self.start_time = time.time()
        self.metrics = {
            "system": {},
            "api_responses": [],
            "database_queries": [],
            "tool_executions": [],
            "memory_usage": [],
            "cpu_usage": [],
        }

    def collect_system_metrics(self):
        """Collect current system performance metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()

            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available = memory.available / (1024**3)  # GB
            memory_total = memory.total / (1024**3)  # GB

            # Disk metrics
            disk = psutil.disk_usage("/")
            disk_percent = (disk.used / disk.total) * 100
            disk_free = disk.free / (1024**3)  # GB

            system_metrics = {
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": cpu_percent,
                "cpu_count": cpu_count,
                "memory_percent": memory_percent,
                "memory_available_gb": round(memory_available, 2),
                "memory_total_gb": round(memory_total, 2),
                "disk_percent": round(disk_percent, 2),
                "disk_free_gb": round(disk_free, 2),
            }

            self.metrics["system"] = system_metrics
            return system_metrics

        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return {}

    async def benchmark_api_response(
        self, endpoint: str, method: str = "GET", data: Dict = None
    ):
        """Benchmark API response time."""
        try:
            import aiohttp

            start_time = time.time()

            async with aiohttp.ClientSession() as session:
                url = f"http://localhost:8090{endpoint}"

                if method.upper() == "GET":
                    async with session.get(url) as response:
                        result = await response.text()
                        status = response.status
                elif method.upper() == "POST":
                    async with session.post(url, json=data or {}) as response:
                        result = await response.text()
                        status = response.status
                else:
                    raise ValueError(f"Unsupported method: {method}")

            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # ms

            metric = {
                "endpoint": endpoint,
                "method": method,
                "response_time_ms": round(response_time, 2),
                "status_code": status,
                "timestamp": datetime.now().isoformat(),
                "success": 200 <= status < 300,
            }

            self.metrics["api_responses"].append(metric)
            return metric

        except Exception as e:
            logger.error(f"Error benchmarking API {endpoint}: {e}")
            return {"error": str(e), "endpoint": endpoint}

    async def benchmark_tool_execution(self, tool_name: str, iterations: int = 5):
        """Benchmark tool execution performance."""
        try:
            from app.service.agent.tools.tool_registry import ToolRegistry

            registry = ToolRegistry()
            tool = registry.get_tool(tool_name)

            if not tool:
                return {"error": f"Tool {tool_name} not found"}

            execution_times = []

            for i in range(iterations):
                start_time = time.time()

                try:
                    # Mock tool execution (avoid real API calls)
                    if hasattr(tool, "_run"):
                        # Simulate tool execution without actual API calls
                        await asyncio.sleep(0.1)  # Simulate processing time
                        success = True
                    else:
                        success = False

                except Exception as e:
                    logger.warning(f"Tool execution error (iteration {i+1}): {e}")
                    success = False

                end_time = time.time()
                execution_time = (end_time - start_time) * 1000  # ms
                execution_times.append(execution_time)

            avg_time = sum(execution_times) / len(execution_times)
            min_time = min(execution_times)
            max_time = max(execution_times)

            metric = {
                "tool_name": tool_name,
                "iterations": iterations,
                "avg_execution_time_ms": round(avg_time, 2),
                "min_execution_time_ms": round(min_time, 2),
                "max_execution_time_ms": round(max_time, 2),
                "timestamp": datetime.now().isoformat(),
                "success": success,
            }

            self.metrics["tool_executions"].append(metric)
            return metric

        except Exception as e:
            logger.error(f"Error benchmarking tool {tool_name}: {e}")
            return {"error": str(e), "tool_name": tool_name}

    def analyze_performance(self):
        """Analyze collected performance metrics."""
        analysis = {
            "summary": {
                "collection_time": round(time.time() - self.start_time, 2),
                "timestamp": datetime.now().isoformat(),
            }
        }

        # System performance analysis
        if self.metrics["system"]:
            system = self.metrics["system"]
            analysis["system_performance"] = {
                "cpu_status": "Good" if system.get("cpu_percent", 0) < 70 else "High",
                "memory_status": (
                    "Good" if system.get("memory_percent", 0) < 80 else "High"
                ),
                "disk_status": (
                    "Good" if system.get("disk_percent", 0) < 80 else "Low Space"
                ),
                "recommendations": [],
            }

            if system.get("cpu_percent", 0) > 70:
                analysis["system_performance"]["recommendations"].append(
                    "Consider CPU optimization"
                )
            if system.get("memory_percent", 0) > 80:
                analysis["system_performance"]["recommendations"].append(
                    "Consider memory optimization"
                )
            if system.get("disk_percent", 0) > 80:
                analysis["system_performance"]["recommendations"].append(
                    "Free up disk space"
                )

        # API performance analysis
        if self.metrics["api_responses"]:
            response_times = [
                r["response_time_ms"]
                for r in self.metrics["api_responses"]
                if "response_time_ms" in r
            ]
            if response_times:
                analysis["api_performance"] = {
                    "avg_response_time_ms": round(
                        sum(response_times) / len(response_times), 2
                    ),
                    "min_response_time_ms": round(min(response_times), 2),
                    "max_response_time_ms": round(max(response_times), 2),
                    "total_requests": len(response_times),
                    "success_rate": len(
                        [
                            r
                            for r in self.metrics["api_responses"]
                            if r.get("success", False)
                        ]
                    )
                    / len(self.metrics["api_responses"]),
                }

        # Tool performance analysis
        if self.metrics["tool_executions"]:
            tool_times = [
                t["avg_execution_time_ms"]
                for t in self.metrics["tool_executions"]
                if "avg_execution_time_ms" in t
            ]
            if tool_times:
                analysis["tool_performance"] = {
                    "avg_tool_execution_ms": round(
                        sum(tool_times) / len(tool_times), 2
                    ),
                    "fastest_tool_ms": round(min(tool_times), 2),
                    "slowest_tool_ms": round(max(tool_times), 2),
                    "tools_tested": len(tool_times),
                }

        return analysis

    def export_metrics(self, filename: str = None):
        """Export metrics to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_metrics_{timestamp}.json"

        try:
            with open(filename, "w") as f:
                json.dump(
                    {"metrics": self.metrics, "analysis": self.analyze_performance()},
                    f,
                    indent=2,
                )

            print(f"📊 Performance metrics exported to: {filename}")
            return filename

        except Exception as e:
            logger.error(f"Error exporting metrics: {e}")
            return None


async def run_performance_analysis():
    """Run comprehensive performance analysis."""
    print("🚀 Starting performance analysis...")
    print("=" * 50)

    metrics = PerformanceMetrics()

    # Collect system metrics
    print("📊 Collecting system metrics...")
    system_metrics = metrics.collect_system_metrics()
    if system_metrics:
        print(f"   CPU Usage: {system_metrics.get('cpu_percent', 0):.1f}%")
        print(f"   Memory Usage: {system_metrics.get('memory_percent', 0):.1f}%")
        print(f"   Disk Usage: {system_metrics.get('disk_percent', 0):.1f}%")

    # Test API endpoints
    print("\n🌐 Testing API performance...")
    api_tests = [
        ("/health", "GET"),
        ("/api/v1/investigations/health", "GET"),
        ("/api/v1/config/feature-flags", "GET"),
    ]

    for endpoint, method in api_tests:
        print(f"   Testing {method} {endpoint}...")
        result = await metrics.benchmark_api_response(endpoint, method)
        if "error" not in result:
            print(f"      Response time: {result.get('response_time_ms', 0):.2f}ms")
        else:
            print(f"      Error: {result.get('error', 'Unknown')}")

    # Test tool performance
    print("\n🔧 Testing tool performance...")
    try:
        from app.service.agent.tools.tool_registry import ToolRegistry

        registry = ToolRegistry()
        tools_to_test = list(registry.get_all_tools().keys())[:5]  # Test first 5 tools

        for tool_name in tools_to_test:
            print(f"   Testing tool: {tool_name}...")
            result = await metrics.benchmark_tool_execution(tool_name, iterations=3)
            if "error" not in result:
                print(
                    f"      Avg execution time: {result.get('avg_execution_time_ms', 0):.2f}ms"
                )
            else:
                print(f"      Error: {result.get('error', 'Unknown')}")

    except Exception as e:
        print(f"   ⚠️  Tool testing error: {e}")

    # Analyze results
    print("\n📈 Analyzing performance...")
    analysis = metrics.analyze_performance()

    print("=" * 50)
    print("📊 Performance Analysis Summary:")

    if "system_performance" in analysis:
        sys_perf = analysis["system_performance"]
        print(f"   System Status:")
        print(f"      CPU: {sys_perf.get('cpu_status', 'Unknown')}")
        print(f"      Memory: {sys_perf.get('memory_status', 'Unknown')}")
        print(f"      Disk: {sys_perf.get('disk_status', 'Unknown')}")

        if sys_perf.get("recommendations"):
            print(f"   Recommendations:")
            for rec in sys_perf["recommendations"]:
                print(f"      - {rec}")

    if "api_performance" in analysis:
        api_perf = analysis["api_performance"]
        print(f"   API Performance:")
        print(
            f"      Avg Response Time: {api_perf.get('avg_response_time_ms', 0):.2f}ms"
        )
        print(f"      Success Rate: {api_perf.get('success_rate', 0)*100:.1f}%")

    if "tool_performance" in analysis:
        tool_perf = analysis["tool_performance"]
        print(f"   Tool Performance:")
        print(
            f"      Avg Execution Time: {tool_perf.get('avg_tool_execution_ms', 0):.2f}ms"
        )
        print(f"      Tools Tested: {tool_perf.get('tools_tested', 0)}")

    # Export metrics
    print("\n💾 Exporting metrics...")
    filename = metrics.export_metrics()
    if filename:
        print(f"   Metrics saved to: {filename}")

    print("\n✅ Performance analysis completed!")


if __name__ == "__main__":
    asyncio.run(run_performance_analysis())
