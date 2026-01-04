#!/usr/bin/env python3
"""
Performance Benchmark Tests
Tests performance characteristics of dual-framework architecture
"""
import asyncio
import sys
import time
from pathlib import Path
from typing import Any, Dict

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.service.agent.structured_agents import structured_device_agent
from app.service.agent.structured_context import (
    EntityType,
    StructuredInvestigationContext,
)


class PerformanceBenchmarker:
    """Benchmarks performance of agent execution."""

    def __init__(self):
        self.results = {}

    async def benchmark_single_agent(self, iterations: int = 5) -> Dict[str, Any]:
        """Benchmark single agent execution."""
        print(f"🚀 Benchmarking Single Agent ({iterations} iterations)")

        execution_times = []

        for i in range(iterations):
            print(f"   Iteration {i+1}/{iterations}")

            # Create test context
            context = StructuredInvestigationContext(
                entity_type=EntityType.DEVICE,
                entity_id=f"benchmark_device_{i}",
                investigation_id=f"benchmark_investigation_{i}",
                risk_indicators=["performance_test"],
            )

            # Measure execution time
            start_time = time.time()
            try:
                result = await structured_device_agent.ainvoke({"context": context})
                end_time = time.time()
                execution_time = end_time - start_time
                execution_times.append(execution_time)

                print(f"     Execution time: {execution_time:.2f}s")

            except Exception as e:
                print(f"     ❌ Error: {e}")
                continue

        if execution_times:
            avg_time = sum(execution_times) / len(execution_times)
            min_time = min(execution_times)
            max_time = max(execution_times)

            benchmark_result = {
                "test_type": "single_agent",
                "iterations": iterations,
                "successful_runs": len(execution_times),
                "average_time": avg_time,
                "min_time": min_time,
                "max_time": max_time,
                "all_times": execution_times,
            }

            print(f"   ✅ Average execution time: {avg_time:.2f}s")
            print(f"   📊 Min: {min_time:.2f}s, Max: {max_time:.2f}s")

            return benchmark_result
        else:
            return {"test_type": "single_agent", "error": "No successful runs"}

    async def benchmark_concurrent_agents(
        self, concurrent_count: int = 3
    ) -> Dict[str, Any]:
        """Benchmark concurrent agent execution."""
        print(f"\n🚀 Benchmarking Concurrent Agents ({concurrent_count} concurrent)")

        # Create test contexts
        contexts = []
        for i in range(concurrent_count):
            context = StructuredInvestigationContext(
                entity_type=EntityType.DEVICE,
                entity_id=f"concurrent_device_{i}",
                investigation_id=f"concurrent_investigation_{i}",
                risk_indicators=["concurrent_test"],
            )
            contexts.append(context)

        # Measure concurrent execution
        start_time = time.time()
        try:
            # Run agents concurrently
            tasks = [
                structured_device_agent.ainvoke({"context": ctx}) for ctx in contexts
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            end_time = time.time()

            total_time = end_time - start_time
            successful_runs = len([r for r in results if not isinstance(r, Exception)])

            benchmark_result = {
                "test_type": "concurrent_agents",
                "concurrent_count": concurrent_count,
                "successful_runs": successful_runs,
                "total_execution_time": total_time,
                "average_time_per_agent": (
                    total_time / concurrent_count if concurrent_count > 0 else 0
                ),
            }

            print(f"   ✅ Total execution time: {total_time:.2f}s")
            print(f"   📊 Successful runs: {successful_runs}/{concurrent_count}")
            print(f"   📊 Average time per agent: {total_time/concurrent_count:.2f}s")

            return benchmark_result

        except Exception as e:
            print(f"   ❌ Concurrent benchmark failed: {e}")
            return {"test_type": "concurrent_agents", "error": str(e)}

    async def benchmark_memory_usage(self) -> Dict[str, Any]:
        """Benchmark memory usage patterns."""
        print(f"\n🚀 Benchmarking Memory Usage")

        try:
            import psutil

            # Get initial memory usage
            process = psutil.Process()
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB

            print(f"   Initial memory: {initial_memory:.1f} MB")

            # Run multiple agents to stress test memory
            contexts = []
            for i in range(10):
                context = StructuredInvestigationContext(
                    entity_type=EntityType.DEVICE,
                    entity_id=f"memory_test_device_{i}",
                    investigation_id=f"memory_test_investigation_{i}",
                    risk_indicators=["memory_test"],
                )
                contexts.append(context)

            # Execute agents and monitor memory
            memory_measurements = []

            for i, context in enumerate(contexts):
                try:
                    await structured_device_agent.ainvoke({"context": context})
                    current_memory = process.memory_info().rss / 1024 / 1024  # MB
                    memory_measurements.append(current_memory)
                    print(f"   After agent {i+1}: {current_memory:.1f} MB")
                except Exception as e:
                    print(f"   Agent {i+1} failed: {e}")

            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            peak_memory = (
                max(memory_measurements) if memory_measurements else final_memory
            )
            memory_increase = final_memory - initial_memory

            benchmark_result = {
                "test_type": "memory_usage",
                "initial_memory_mb": initial_memory,
                "final_memory_mb": final_memory,
                "peak_memory_mb": peak_memory,
                "memory_increase_mb": memory_increase,
                "memory_measurements": memory_measurements,
            }

            print(f"   ✅ Final memory: {final_memory:.1f} MB")
            print(f"   📊 Peak memory: {peak_memory:.1f} MB")
            print(f"   📊 Memory increase: {memory_increase:.1f} MB")

            return benchmark_result

        except ImportError:
            print(f"   ❌ psutil not available for memory benchmarking")
            return {"test_type": "memory_usage", "error": "psutil not available"}
        except Exception as e:
            print(f"   ❌ Memory benchmark failed: {e}")
            return {"test_type": "memory_usage", "error": str(e)}


async def main():
    """Main benchmark execution."""
    print("=" * 60)
    print("⚡ PERFORMANCE BENCHMARK SUITE")
    print("=" * 60)

    benchmarker = PerformanceBenchmarker()
    results = []

    # Run benchmarks
    results.append(await benchmarker.benchmark_single_agent(iterations=3))
    results.append(await benchmarker.benchmark_concurrent_agents(concurrent_count=3))
    results.append(await benchmarker.benchmark_memory_usage())

    # Summary
    print(f"\n📊 Benchmark Summary:")
    for result in results:
        if "error" not in result:
            test_type = result["test_type"]
            print(f"   ✅ {test_type}: Success")
        else:
            test_type = result["test_type"]
            print(f"   ❌ {test_type}: {result['error']}")

    successful_benchmarks = len([r for r in results if "error" not in r])
    total_benchmarks = len(results)

    print(f"\n   Total Benchmarks: {successful_benchmarks}/{total_benchmarks}")
    print(f"   Success Rate: {(successful_benchmarks/total_benchmarks)*100:.1f}%")

    return 0 if successful_benchmarks > 0 else 1


if __name__ == "__main__":
    exit(asyncio.run(main()))
