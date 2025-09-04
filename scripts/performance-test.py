#!/usr/bin/env python3
"""
Performance Testing Script for Olorin Optimization System

This script performs comprehensive performance testing to validate
the implemented optimizations across backend and system components.
"""

import asyncio
import time
import statistics
import json
import sys
from typing import Dict, List, Any
from pathlib import Path
import aiohttp
import argparse
from datetime import datetime

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent / "olorin-server"))

try:
    from app.service.performance_integration import (
        PerformanceOptimizationConfig,
        PerformanceOptimizationManager
    )
    from app.service.agent.tools.enhanced_cache import EnhancedCache, EvictionPolicy
except ImportError as e:
    print(f"Warning: Could not import Olorin modules: {e}")
    print("Running in standalone mode with basic HTTP tests only")

class PerformanceTestSuite:
    """Comprehensive performance testing suite."""
    
    def __init__(self, base_url: str = "http://localhost:8090"):
        self.base_url = base_url
        self.results: Dict[str, Any] = {}
        
    async def test_api_performance(self) -> Dict[str, Any]:
        """Test API endpoint performance."""
        print("\n🚀 Testing API Performance...")
        
        endpoints = [
            "/performance/health",
            "/performance/metrics",
            "/performance/agents",
            "/performance/cache/stats"
        ]
        
        results = {}
        
        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints:
                print(f"  Testing {endpoint}...")
                response_times = []
                errors = 0
                
                # Warm up
                try:
                    async with session.get(f"{self.base_url}{endpoint}") as response:
                        await response.text()
                except Exception:
                    pass
                
                # Performance test
                for i in range(20):
                    start_time = time.time()
                    try:
                        async with session.get(f"{self.base_url}{endpoint}") as response:
                            await response.text()
                            if response.status >= 400:
                                errors += 1
                    except Exception as e:
                        errors += 1
                        print(f"    Error on attempt {i+1}: {e}")
                    
                    response_times.append((time.time() - start_time) * 1000)
                
                if response_times:
                    results[endpoint] = {
                        "avg_response_time_ms": statistics.mean(response_times),
                        "min_response_time_ms": min(response_times),
                        "max_response_time_ms": max(response_times),
                        "median_response_time_ms": statistics.median(response_times),
                        "std_dev_ms": statistics.stdev(response_times) if len(response_times) > 1 else 0,
                        "error_rate": (errors / len(response_times)) * 100,
                        "total_requests": len(response_times)
                    }
                    
                    print(f"    ✅ Avg: {results[endpoint]['avg_response_time_ms']:.1f}ms, "
                          f"Errors: {results[endpoint]['error_rate']:.1f}%")
                else:
                    results[endpoint] = {"error": "No successful requests"}
                    print(f"    ❌ All requests failed")
        
        return results
    
    async def test_concurrent_load(self, concurrent_users: int = 10) -> Dict[str, Any]:
        """Test concurrent load handling."""
        print(f"\n⚡ Testing Concurrent Load ({concurrent_users} users)...")
        
        async def simulate_user_session(session, user_id):
            """Simulate a user session with multiple API calls."""
            endpoints = [
                "/performance/health",
                "/performance/metrics",
                "/performance/agents"
            ]
            
            user_times = []
            user_errors = 0
            
            for endpoint in endpoints:
                start_time = time.time()
                try:
                    async with session.get(f"{self.base_url}{endpoint}") as response:
                        await response.text()
                        if response.status >= 400:
                            user_errors += 1
                except Exception:
                    user_errors += 1
                
                user_times.append((time.time() - start_time) * 1000)
            
            return {
                "user_id": user_id,
                "total_time_ms": sum(user_times),
                "avg_time_ms": statistics.mean(user_times) if user_times else 0,
                "errors": user_errors
            }
        
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            # Run concurrent user sessions
            tasks = [
                simulate_user_session(session, i) 
                for i in range(concurrent_users)
            ]
            
            user_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        total_time = time.time() - start_time
        
        # Process results
        successful_users = [r for r in user_results if isinstance(r, dict)]
        failed_users = len(user_results) - len(successful_users)
        
        if successful_users:
            total_requests = len(successful_users) * 3  # 3 endpoints per user
            total_errors = sum(u['errors'] for u in successful_users)
            avg_user_time = statistics.mean([u['total_time_ms'] for u in successful_users])
            
            result = {
                "concurrent_users": concurrent_users,
                "total_execution_time_s": total_time,
                "successful_users": len(successful_users),
                "failed_users": failed_users,
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate": (total_errors / total_requests) * 100 if total_requests > 0 else 100,
                "avg_user_session_time_ms": avg_user_time,
                "requests_per_second": total_requests / total_time if total_time > 0 else 0,
                "user_success_rate": (len(successful_users) / concurrent_users) * 100
            }
            
            print(f"    ✅ {result['successful_users']}/{concurrent_users} users successful")
            print(f"    📊 {result['requests_per_second']:.1f} req/sec, "
                  f"{result['error_rate']:.1f}% error rate")
        else:
            result = {
                "concurrent_users": concurrent_users,
                "total_execution_time_s": total_time,
                "error": "All concurrent users failed"
            }
            print(f"    ❌ All {concurrent_users} users failed")
        
        return result
    
    def test_cache_performance(self) -> Dict[str, Any]:
        """Test cache system performance."""
        print("\n💾 Testing Cache Performance...")
        
        try:
            # Initialize cache system
            cache = EnhancedCache(
                max_size=1000,
                max_memory_mb=50,
                default_ttl_seconds=60,
                eviction_policy=EvictionPolicy.LRU,
                enable_content_deduplication=True
            )
            
            # Cache write performance
            print("  Testing cache writes...")
            write_times = []
            
            for i in range(100):
                start_time = time.time()
                asyncio.run(cache.set(f"test_key_{i}", f"test_value_{i}" * 100))
                write_times.append((time.time() - start_time) * 1000)
            
            # Cache read performance  
            print("  Testing cache reads...")
            read_times = []
            
            for i in range(100):
                start_time = time.time()
                asyncio.run(cache.get(f"test_key_{i}"))
                read_times.append((time.time() - start_time) * 1000)
            
            # Get cache statistics
            stats = cache.get_statistics()
            
            result = {
                "write_performance": {
                    "avg_write_time_ms": statistics.mean(write_times),
                    "min_write_time_ms": min(write_times),
                    "max_write_time_ms": max(write_times)
                },
                "read_performance": {
                    "avg_read_time_ms": statistics.mean(read_times),
                    "min_read_time_ms": min(read_times),
                    "max_read_time_ms": max(read_times)
                },
                "cache_statistics": stats
            }
            
            print(f"    ✅ Write avg: {result['write_performance']['avg_write_time_ms']:.2f}ms")
            print(f"    ✅ Read avg: {result['read_performance']['avg_read_time_ms']:.2f}ms")
            print(f"    📊 Hit rate: {stats['performance']['hit_rate']:.1%}")
            
            return result
            
        except Exception as e:
            print(f"    ❌ Cache test failed: {e}")
            return {"error": str(e)}
    
    def test_memory_performance(self) -> Dict[str, Any]:
        """Test memory usage and performance."""
        print("\n🧠 Testing Memory Performance...")
        
        try:
            import psutil
            import gc
            
            process = psutil.Process()
            
            # Baseline memory
            gc.collect()
            baseline_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            # Memory stress test
            large_objects = []
            memory_usage = [baseline_memory]
            
            print("  Creating large objects...")
            for i in range(10):
                # Create 1MB object
                large_obj = bytearray(1024 * 1024)  # 1MB
                large_objects.append(large_obj)
                
                current_memory = process.memory_info().rss / 1024 / 1024  # MB
                memory_usage.append(current_memory)
            
            peak_memory = max(memory_usage)
            
            # Clean up
            print("  Cleaning up...")
            large_objects.clear()
            gc.collect()
            
            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            result = {
                "baseline_memory_mb": baseline_memory,
                "peak_memory_mb": peak_memory,
                "final_memory_mb": final_memory,
                "memory_increase_mb": peak_memory - baseline_memory,
                "memory_recovered_mb": peak_memory - final_memory,
                "recovery_rate": ((peak_memory - final_memory) / (peak_memory - baseline_memory)) * 100 if peak_memory > baseline_memory else 100
            }
            
            print(f"    ✅ Baseline: {baseline_memory:.1f}MB")
            print(f"    📈 Peak: {peak_memory:.1f}MB (+{result['memory_increase_mb']:.1f}MB)")
            print(f"    🔄 Recovery: {result['recovery_rate']:.1f}%")
            
            return result
            
        except Exception as e:
            print(f"    ❌ Memory test failed: {e}")
            return {"error": str(e)}
    
    async def run_full_test_suite(self, concurrent_users: int = 5) -> Dict[str, Any]:
        """Run complete performance test suite."""
        print("🔬 Starting Olorin Performance Test Suite")
        print("=" * 50)
        
        start_time = time.time()
        
        # Run all tests
        test_results = {
            "test_timestamp": datetime.now().isoformat(),
            "test_configuration": {
                "base_url": self.base_url,
                "concurrent_users": concurrent_users
            }
        }
        
        # API Performance Tests
        try:
            test_results["api_performance"] = await self.test_api_performance()
        except Exception as e:
            test_results["api_performance"] = {"error": str(e)}
        
        # Concurrent Load Tests
        try:
            test_results["concurrent_load"] = await self.test_concurrent_load(concurrent_users)
        except Exception as e:
            test_results["concurrent_load"] = {"error": str(e)}
        
        # Cache Performance Tests
        try:
            test_results["cache_performance"] = self.test_cache_performance()
        except Exception as e:
            test_results["cache_performance"] = {"error": str(e)}
        
        # Memory Performance Tests
        try:
            test_results["memory_performance"] = self.test_memory_performance()
        except Exception as e:
            test_results["memory_performance"] = {"error": str(e)}
        
        total_time = time.time() - start_time
        test_results["total_execution_time_s"] = total_time
        
        print("\n" + "=" * 50)
        print(f"🏁 Performance Test Suite Completed in {total_time:.1f}s")
        
        return test_results
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generate performance test report."""
        report = []
        report.append("# Olorin Performance Test Report")
        report.append(f"Generated: {results['test_timestamp']}")
        report.append("")
        
        # API Performance Summary
        if "api_performance" in results and "error" not in results["api_performance"]:
            api_results = results["api_performance"]
            report.append("## API Performance")
            
            for endpoint, metrics in api_results.items():
                if "error" not in metrics:
                    report.append(f"**{endpoint}**")
                    report.append(f"- Average Response Time: {metrics['avg_response_time_ms']:.1f}ms")
                    report.append(f"- Error Rate: {metrics['error_rate']:.1f}%")
                    report.append("")
        
        # Concurrent Load Summary
        if "concurrent_load" in results and "error" not in results["concurrent_load"]:
            load_results = results["concurrent_load"]
            report.append("## Concurrent Load Performance")
            report.append(f"- Concurrent Users: {load_results['concurrent_users']}")
            report.append(f"- Requests per Second: {load_results.get('requests_per_second', 0):.1f}")
            report.append(f"- User Success Rate: {load_results.get('user_success_rate', 0):.1f}%")
            report.append(f"- Error Rate: {load_results.get('error_rate', 0):.1f}%")
            report.append("")
        
        # Cache Performance Summary
        if "cache_performance" in results and "error" not in results["cache_performance"]:
            cache_results = results["cache_performance"]
            report.append("## Cache Performance")
            
            if "write_performance" in cache_results:
                wp = cache_results["write_performance"]
                report.append(f"- Average Write Time: {wp['avg_write_time_ms']:.2f}ms")
            
            if "read_performance" in cache_results:
                rp = cache_results["read_performance"]
                report.append(f"- Average Read Time: {rp['avg_read_time_ms']:.2f}ms")
            
            if "cache_statistics" in cache_results:
                cs = cache_results["cache_statistics"]
                if "performance" in cs:
                    hit_rate = cs["performance"].get("hit_rate", 0)
                    report.append(f"- Cache Hit Rate: {hit_rate:.1%}")
            report.append("")
        
        # Memory Performance Summary
        if "memory_performance" in results and "error" not in results["memory_performance"]:
            mem_results = results["memory_performance"]
            report.append("## Memory Performance")
            report.append(f"- Baseline Memory: {mem_results['baseline_memory_mb']:.1f}MB")
            report.append(f"- Peak Memory: {mem_results['peak_memory_mb']:.1f}MB")
            report.append(f"- Memory Recovery Rate: {mem_results['recovery_rate']:.1f}%")
            report.append("")
        
        # Recommendations
        report.append("## Performance Recommendations")
        
        # Analyze results and provide recommendations
        recommendations = self._analyze_results(results)
        for rec in recommendations:
            report.append(f"- {rec}")
        
        return "\n".join(report)
    
    def _analyze_results(self, results: Dict[str, Any]) -> List[str]:
        """Analyze results and provide recommendations."""
        recommendations = []
        
        # API Performance Analysis
        if "api_performance" in results and "error" not in results["api_performance"]:
            api_results = results["api_performance"]
            
            slow_endpoints = []
            high_error_endpoints = []
            
            for endpoint, metrics in api_results.items():
                if "error" not in metrics:
                    if metrics["avg_response_time_ms"] > 200:
                        slow_endpoints.append((endpoint, metrics["avg_response_time_ms"]))
                    
                    if metrics["error_rate"] > 5:
                        high_error_endpoints.append((endpoint, metrics["error_rate"]))
            
            if slow_endpoints:
                recommendations.append("Consider optimizing slow endpoints: " + 
                                     ", ".join([f"{ep} ({time:.1f}ms)" for ep, time in slow_endpoints]))
            
            if high_error_endpoints:
                recommendations.append("Investigate high error rate endpoints: " + 
                                     ", ".join([f"{ep} ({rate:.1f}%)" for ep, rate in high_error_endpoints]))
        
        # Concurrent Load Analysis
        if "concurrent_load" in results and "error" not in results["concurrent_load"]:
            load_results = results["concurrent_load"]
            
            if load_results.get("error_rate", 0) > 10:
                recommendations.append("High error rate under load - consider scaling or optimization")
            
            if load_results.get("requests_per_second", 0) < 10:
                recommendations.append("Low throughput - consider performance optimizations")
        
        # Cache Performance Analysis  
        if "cache_performance" in results and "error" not in results["cache_performance"]:
            cache_results = results["cache_performance"]
            
            if "cache_statistics" in cache_results:
                cs = cache_results["cache_statistics"]
                hit_rate = cs.get("performance", {}).get("hit_rate", 0)
                
                if hit_rate < 0.7:
                    recommendations.append("Low cache hit rate - review caching strategy")
        
        if not recommendations:
            recommendations.append("All performance metrics are within acceptable ranges")
        
        return recommendations


async def main():
    """Main function to run performance tests."""
    parser = argparse.ArgumentParser(description="Olorin Performance Test Suite")
    parser.add_argument("--url", default="http://localhost:8090", help="Base URL for API tests")
    parser.add_argument("--users", type=int, default=5, help="Number of concurrent users for load test")
    parser.add_argument("--output", help="Output file for results (JSON)")
    parser.add_argument("--report", help="Output file for markdown report")
    
    args = parser.parse_args()
    
    # Run tests
    test_suite = PerformanceTestSuite(args.url)
    results = await test_suite.run_full_test_suite(args.users)
    
    # Save results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Results saved to: {args.output}")
    
    # Generate report
    if args.report:
        report = test_suite.generate_report(results)
        with open(args.report, 'w') as f:
            f.write(report)
        print(f"📄 Report saved to: {args.report}")
    
    # Print summary
    print("\n📊 Test Summary:")
    if "concurrent_load" in results and "error" not in results["concurrent_load"]:
        load_results = results["concurrent_load"]
        print(f"   Throughput: {load_results.get('requests_per_second', 0):.1f} req/sec")
        print(f"   Error Rate: {load_results.get('error_rate', 0):.1f}%")
    
    print(f"   Total Test Time: {results['total_execution_time_s']:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())