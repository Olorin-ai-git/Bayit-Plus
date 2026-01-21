"""
Performance Benchmark Suite for Unified Logging System

Comprehensive benchmarking to validate performance targets:
- Standard logging: <1ms per log entry
- Structured logging: <5ms per log entry
- Throughput: >10k logs/sec standard, >2k logs/sec structured
- Memory overhead: <10MB base, <1KB per logger

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import gc
import os
import statistics
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List

import psutil

from app.service.logging.unified_logging_core import (
    LogFormat,
    LogOutput,
    configure_unified_logging,
    get_unified_logger,
    get_unified_logging_core,
)


class PerformanceBenchmark:
    """Performance benchmark suite for unified logging system"""

    def __init__(self):
        self.results: Dict[str, Any] = {}
        self.process = psutil.Process(os.getpid())
        self.initial_memory = self.process.memory_info().rss / 1024 / 1024  # MB

    def run_all_benchmarks(self) -> Dict[str, Any]:
        """Run complete benchmark suite"""
        print("🚀 Starting Unified Logging Performance Benchmark Suite")
        print("=" * 60)

        # Setup temporary log directory
        with tempfile.TemporaryDirectory() as temp_dir:
            log_dir = Path(temp_dir) / "logs"
            log_dir.mkdir()

            # Change working directory temporarily
            original_cwd = os.getcwd()
            os.chdir(temp_dir)

            try:
                self.results["latency"] = self._benchmark_latency()
                self.results["throughput"] = self._benchmark_throughput()
                self.results["memory"] = self._benchmark_memory_usage()
                self.results["concurrency"] = self._benchmark_concurrency()
                self.results["format_switching"] = self._benchmark_format_switching()

                # Overall system health check
                self.results["system_health"] = self._system_health_check()

            finally:
                os.chdir(original_cwd)

        self._print_benchmark_summary()
        return self.results

    def _benchmark_latency(self) -> Dict[str, float]:
        """Benchmark logging latency for different formats"""
        print("\n📊 Latency Benchmarking...")

        latency_results = {}

        # Clear any existing instance
        from app.service.logging.unified_logging_core import UnifiedLoggingCore

        UnifiedLoggingCore._instance = None

        # Standard logging latency
        configure_unified_logging(
            log_level="INFO",
            log_format=LogFormat.HUMAN,
            log_outputs=[LogOutput.CONSOLE],
        )

        logger = get_unified_logger("benchmark.standard")

        latencies = []
        for i in range(1000):
            start_time = time.perf_counter()
            logger.info(f"Standard log message {i}")
            end_time = time.perf_counter()
            latencies.append((end_time - start_time) * 1000)  # Convert to ms

        latency_results["standard_avg_ms"] = statistics.mean(latencies)
        latency_results["standard_p95_ms"] = sorted(latencies)[
            int(0.95 * len(latencies))
        ]
        latency_results["standard_max_ms"] = max(latencies)

        # JSON logging latency
        configure_unified_logging(
            log_level="INFO", log_format=LogFormat.JSON, log_outputs=[LogOutput.CONSOLE]
        )

        logger = get_unified_logger("benchmark.json")

        latencies = []
        for i in range(1000):
            start_time = time.perf_counter()
            logger.info(f"JSON log message {i}")
            end_time = time.perf_counter()
            latencies.append((end_time - start_time) * 1000)

        latency_results["json_avg_ms"] = statistics.mean(latencies)
        latency_results["json_p95_ms"] = sorted(latencies)[int(0.95 * len(latencies))]
        latency_results["json_max_ms"] = max(latencies)

        # Structured logging latency
        configure_unified_logging(
            log_level="INFO",
            log_format=LogFormat.STRUCTURED,
            log_outputs=[LogOutput.CONSOLE],
        )

        structured_logger = get_unified_logger("benchmark.structured", structured=True)

        latencies = []
        for i in range(1000):
            start_time = time.perf_counter()
            structured_logger.info(
                f"Structured log message {i}", iteration=i, performance_test=True
            )
            end_time = time.perf_counter()
            latencies.append((end_time - start_time) * 1000)

        latency_results["structured_avg_ms"] = statistics.mean(latencies)
        latency_results["structured_p95_ms"] = sorted(latencies)[
            int(0.95 * len(latencies))
        ]
        latency_results["structured_max_ms"] = max(latencies)

        print(f"  ✅ Standard logging: {latency_results['standard_avg_ms']:.3f}ms avg")
        print(f"  ✅ JSON logging: {latency_results['json_avg_ms']:.3f}ms avg")
        print(
            f"  ✅ Structured logging: {latency_results['structured_avg_ms']:.3f}ms avg"
        )

        return latency_results

    def _benchmark_throughput(self) -> Dict[str, float]:
        """Benchmark logging throughput for different formats"""
        print("\n🚄 Throughput Benchmarking...")

        throughput_results = {}

        # Clear instance
        from app.service.logging.unified_logging_core import UnifiedLoggingCore

        UnifiedLoggingCore._instance = None

        # Standard logging throughput
        configure_unified_logging(
            log_level="INFO",
            log_format=LogFormat.HUMAN,
            log_outputs=[LogOutput.CONSOLE],
            async_logging=False,  # Test synchronous first
        )

        logger = get_unified_logger("benchmark.throughput.standard")

        num_logs = 10000
        start_time = time.perf_counter()

        for i in range(num_logs):
            logger.info(f"Throughput test message {i}")

        end_time = time.perf_counter()
        duration = end_time - start_time

        throughput_results["standard_logs_per_second"] = num_logs / duration

        # Structured logging throughput
        structured_logger = get_unified_logger(
            "benchmark.throughput.structured", structured=True
        )

        start_time = time.perf_counter()

        for i in range(num_logs):
            structured_logger.info(
                f"Structured throughput test {i}", iteration=i, batch="throughput_test"
            )

        end_time = time.perf_counter()
        duration = end_time - start_time

        throughput_results["structured_logs_per_second"] = num_logs / duration

        print(
            f"  ✅ Standard throughput: {throughput_results['standard_logs_per_second']:.0f} logs/sec"
        )
        print(
            f"  ✅ Structured throughput: {throughput_results['structured_logs_per_second']:.0f} logs/sec"
        )

        return throughput_results

    def _benchmark_memory_usage(self) -> Dict[str, float]:
        """Benchmark memory usage and logger overhead"""
        print("\n💾 Memory Usage Benchmarking...")

        memory_results = {}

        # Clear instance and force garbage collection
        from app.service.logging.unified_logging_core import UnifiedLoggingCore

        UnifiedLoggingCore._instance = None
        gc.collect()

        baseline_memory = self.process.memory_info().rss / 1024 / 1024

        # Initialize unified logging core
        configure_unified_logging(
            log_level="INFO",
            log_format=LogFormat.HUMAN,
            log_outputs=[LogOutput.CONSOLE],
        )

        after_init_memory = self.process.memory_info().rss / 1024 / 1024
        memory_results["base_overhead_mb"] = after_init_memory - baseline_memory

        # Create multiple loggers and measure per-logger overhead
        logger_creation_start = self.process.memory_info().rss / 1024 / 1024

        loggers = []
        for i in range(100):
            logger = get_unified_logger(f"benchmark.memory.logger_{i}")
            loggers.append(logger)

        logger_creation_end = self.process.memory_info().rss / 1024 / 1024

        memory_results["hundred_loggers_mb"] = (
            logger_creation_end - logger_creation_start
        )
        memory_results["per_logger_kb"] = (
            memory_results["hundred_loggers_mb"] * 1024
        ) / 100

        # Test memory usage under load
        load_start_memory = self.process.memory_info().rss / 1024 / 1024

        # Generate substantial logging load
        for logger in loggers[:10]:  # Use subset to avoid excessive output
            for i in range(100):
                logger.info(f"Memory load test {i}")

        load_end_memory = self.process.memory_info().rss / 1024 / 1024
        memory_results["under_load_increase_mb"] = load_end_memory - load_start_memory

        print(f"  ✅ Base overhead: {memory_results['base_overhead_mb']:.2f} MB")
        print(f"  ✅ Per-logger overhead: {memory_results['per_logger_kb']:.3f} KB")
        print(
            f"  ✅ Memory under load increase: {memory_results['under_load_increase_mb']:.2f} MB"
        )

        return memory_results

    def _benchmark_concurrency(self) -> Dict[str, float]:
        """Benchmark concurrent logging performance"""
        print("\n🔀 Concurrency Benchmarking...")

        concurrency_results = {}

        # Clear instance
        from app.service.logging.unified_logging_core import UnifiedLoggingCore

        UnifiedLoggingCore._instance = None

        configure_unified_logging(
            log_level="INFO",
            log_format=LogFormat.HUMAN,
            log_outputs=[LogOutput.CONSOLE],
        )

        def logging_worker(thread_id: int, num_logs: int) -> float:
            """Worker function for concurrent logging"""
            logger = get_unified_logger(f"benchmark.concurrent.thread_{thread_id}")

            start_time = time.perf_counter()
            for i in range(num_logs):
                logger.info(f"Thread {thread_id} message {i}")
            end_time = time.perf_counter()

            return end_time - start_time

        # Test with different thread counts
        for num_threads in [1, 5, 10, 20]:
            logs_per_thread = 1000

            start_time = time.perf_counter()

            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                futures = [
                    executor.submit(logging_worker, i, logs_per_thread)
                    for i in range(num_threads)
                ]

                # Wait for all threads to complete
                thread_times = [future.result() for future in futures]

            end_time = time.perf_counter()
            total_duration = end_time - start_time
            total_logs = num_threads * logs_per_thread

            concurrency_results[f"{num_threads}_threads_logs_per_second"] = (
                total_logs / total_duration
            )
            concurrency_results[f"{num_threads}_threads_avg_thread_time"] = (
                statistics.mean(thread_times)
            )

        print(
            f"  ✅ 1 thread: {concurrency_results['1_threads_logs_per_second']:.0f} logs/sec"
        )
        print(
            f"  ✅ 10 threads: {concurrency_results['10_threads_logs_per_second']:.0f} logs/sec"
        )
        print(
            f"  ✅ 20 threads: {concurrency_results['20_threads_logs_per_second']:.0f} logs/sec"
        )

        return concurrency_results

    def _benchmark_format_switching(self) -> Dict[str, float]:
        """Benchmark dynamic format switching performance"""
        print("\n🔄 Format Switching Benchmarking...")

        format_results = {}

        # Clear instance
        from app.service.logging.unified_logging_core import UnifiedLoggingCore

        UnifiedLoggingCore._instance = None

        formats = [LogFormat.HUMAN, LogFormat.JSON, LogFormat.STRUCTURED]
        num_switches = 50
        logs_per_format = 100

        switch_times = []
        total_start_time = time.perf_counter()

        for i in range(num_switches):
            format_to_use = formats[i % len(formats)]

            switch_start = time.perf_counter()
            configure_unified_logging(
                log_level="INFO",
                log_format=format_to_use,
                log_outputs=[LogOutput.CONSOLE],
            )
            switch_end = time.perf_counter()

            switch_times.append((switch_end - switch_start) * 1000)  # ms

            # Log some messages with the new format
            logger = get_unified_logger(
                f"benchmark.format_switch.{format_to_use.value}"
            )
            for j in range(logs_per_format):
                logger.info(f"Format switch test {i}-{j}")

        total_end_time = time.perf_counter()

        format_results["avg_switch_time_ms"] = statistics.mean(switch_times)
        format_results["max_switch_time_ms"] = max(switch_times)
        format_results["total_switches_per_second"] = num_switches / (
            total_end_time - total_start_time
        )

        print(
            f"  ✅ Avg format switch time: {format_results['avg_switch_time_ms']:.3f} ms"
        )
        print(
            f"  ✅ Switches per second: {format_results['total_switches_per_second']:.1f}"
        )

        return format_results

    def _system_health_check(self) -> Dict[str, Any]:
        """Perform overall system health check"""
        print("\n🏥 System Health Check...")

        health_results = {}

        # Memory leak check
        initial_memory = self.process.memory_info().rss / 1024 / 1024

        # Perform intensive logging operations
        configure_unified_logging(log_level="INFO", log_format=LogFormat.HUMAN)

        for cycle in range(5):
            logger = get_unified_logger(f"health.cycle_{cycle}")
            for i in range(1000):
                logger.info(f"Health check cycle {cycle} message {i}")

            # Force garbage collection
            gc.collect()

        final_memory = self.process.memory_info().rss / 1024 / 1024
        memory_growth = final_memory - initial_memory

        health_results["memory_growth_mb"] = memory_growth
        health_results["memory_leak_detected"] = (
            memory_growth > 50
        )  # Arbitrary threshold

        # Performance consistency check
        latencies = []
        for i in range(100):
            start = time.perf_counter()
            logger.info(f"Consistency check {i}")
            end = time.perf_counter()
            latencies.append((end - start) * 1000)

        health_results["latency_consistency_cv"] = statistics.stdev(
            latencies
        ) / statistics.mean(latencies)
        health_results["performance_consistent"] = (
            health_results["latency_consistency_cv"] < 0.5
        )

        print(f"  ✅ Memory growth: {memory_growth:.2f} MB")
        print(
            f"  ✅ Performance consistent: {health_results['performance_consistent']}"
        )

        return health_results

    def _print_benchmark_summary(self):
        """Print comprehensive benchmark summary"""
        print("\n" + "=" * 60)
        print("📈 UNIFIED LOGGING PERFORMANCE BENCHMARK RESULTS")
        print("=" * 60)

        # Performance targets validation
        print("\n🎯 Performance Targets Validation:")

        # Latency targets
        standard_avg = self.results["latency"]["standard_avg_ms"]
        json_avg = self.results["latency"]["json_avg_ms"]
        structured_avg = self.results["latency"]["structured_avg_ms"]

        print(
            f"  Standard Logging Target (<1ms):    {standard_avg:.3f}ms {'✅ PASS' if standard_avg < 1.0 else '❌ FAIL'}"
        )
        print(
            f"  JSON Logging Target (<5ms):        {json_avg:.3f}ms {'✅ PASS' if json_avg < 5.0 else '❌ FAIL'}"
        )
        print(
            f"  Structured Logging Target (<5ms):  {structured_avg:.3f}ms {'✅ PASS' if structured_avg < 5.0 else '❌ FAIL'}"
        )

        # Throughput targets
        standard_throughput = self.results["throughput"]["standard_logs_per_second"]
        structured_throughput = self.results["throughput"]["structured_logs_per_second"]

        print(
            f"  Standard Throughput Target (>10k):  {standard_throughput:.0f}/s {'✅ PASS' if standard_throughput > 10000 else '❌ FAIL'}"
        )
        print(
            f"  Structured Throughput Target (>2k): {structured_throughput:.0f}/s {'✅ PASS' if structured_throughput > 2000 else '❌ FAIL'}"
        )

        # Memory targets
        base_overhead = self.results["memory"]["base_overhead_mb"]
        per_logger = self.results["memory"]["per_logger_kb"]

        print(
            f"  Base Memory Target (<10MB):        {base_overhead:.2f}MB {'✅ PASS' if base_overhead < 10.0 else '❌ FAIL'}"
        )
        print(
            f"  Per-Logger Target (<1KB):          {per_logger:.3f}KB {'✅ PASS' if per_logger < 1.0 else '❌ FAIL'}"
        )

        # Overall system health
        health = self.results["system_health"]
        print(
            f"  Memory Leak Check:                  {'✅ PASS' if not health['memory_leak_detected'] else '❌ FAIL'}"
        )
        print(
            f"  Performance Consistency:            {'✅ PASS' if health['performance_consistent'] else '❌ FAIL'}"
        )

        # Concurrency performance
        concurrent_10 = self.results["concurrency"]["10_threads_logs_per_second"]
        print(
            f"  Concurrency (10 threads):           {concurrent_10:.0f}/s {'✅ GOOD' if concurrent_10 > 5000 else '⚠️  OK'}"
        )

        print("\n📋 Summary:")
        total_tests = 8
        passed_tests = sum(
            [
                standard_avg < 1.0,
                json_avg < 5.0,
                structured_avg < 5.0,
                standard_throughput > 10000,
                structured_throughput > 2000,
                base_overhead < 10.0,
                per_logger < 1.0,
                not health["memory_leak_detected"],
            ]
        )

        print(f"  Tests Passed: {passed_tests}/{total_tests}")
        print(
            f"  Overall Grade: {'🏆 EXCELLENT' if passed_tests >= 7 else '✅ GOOD' if passed_tests >= 6 else '⚠️  NEEDS IMPROVEMENT'}"
        )

        print("\n🔧 Recommendations:")
        if standard_avg >= 1.0:
            print("  • Consider optimizing standard logging formatter")
        if structured_avg >= 5.0:
            print("  • Consider async logging for structured format")
        if base_overhead >= 10.0:
            print("  • Review memory usage in core initialization")
        if health["memory_leak_detected"]:
            print("  • Investigate potential memory leaks in logger caching")

        print("\n" + "=" * 60)


def main():
    """Run performance benchmark suite"""
    benchmark = PerformanceBenchmark()
    results = benchmark.run_all_benchmarks()

    # Optionally save results to file
    import json

    results_file = "unified_logging_benchmark_results.json"

    # Convert any non-serializable objects to strings
    serializable_results = json.loads(json.dumps(results, default=str))

    with open(results_file, "w") as f:
        json.dump(serializable_results, f, indent=2)

    print(f"\n💾 Results saved to: {results_file}")


if __name__ == "__main__":
    main()
