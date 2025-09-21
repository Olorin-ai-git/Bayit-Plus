"""
Performance Benchmarking Framework - Comprehensive performance monitoring and benchmarking.

This module implements Phase 3 of the LangGraph enhancement plan, providing:
- Automated performance testing
- Regression detection
- Optimization recommendations
- Continuous performance monitoring
"""

import asyncio
import json
import time
import statistics
from typing import Dict, Any, List, Optional, Callable, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
import os

import numpy as np
from pathlib import Path
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class BenchmarkType(Enum):
    """Types of benchmarks."""
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    MEMORY = "memory"
    ERROR_RATE = "error_rate"
    CACHE_EFFICIENCY = "cache_efficiency"


@dataclass
class BenchmarkResult:
    """Result of a benchmark run."""
    benchmark_id: str
    timestamp: str
    investigation_type: str
    metrics: Dict[str, float]
    percentiles: Dict[str, float]
    success_rate: float
    error_count: int
    duration: float
    config: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class PerformanceBaseline:
    """Performance baseline for comparison."""
    investigation_type: str
    metrics: Dict[str, float]
    thresholds: Dict[str, float]
    created_at: str
    version: str
    
    def check_regression(self, current_metrics: Dict[str, float]) -> List[str]:
        """
        Check for performance regression.
        
        Args:
            current_metrics: Current performance metrics
            
        Returns:
            List of regression warnings
        """
        regressions = []
        
        for metric_name, baseline_value in self.metrics.items():
            if metric_name not in current_metrics:
                continue
            
            current_value = current_metrics[metric_name]
            threshold = self.thresholds.get(metric_name, 0.2)  # 20% default threshold
            
            # Check for regression
            if metric_name in ["latency", "duration", "error_rate"]:
                # Lower is better
                if current_value > baseline_value * (1 + threshold):
                    regression_pct = ((current_value - baseline_value) / baseline_value) * 100
                    regressions.append(
                        f"{metric_name} regressed by {regression_pct:.1f}% "
                        f"(baseline: {baseline_value:.2f}, current: {current_value:.2f})"
                    )
            else:
                # Higher is better (throughput, success_rate)
                if current_value < baseline_value * (1 - threshold):
                    regression_pct = ((baseline_value - current_value) / baseline_value) * 100
                    regressions.append(
                        f"{metric_name} regressed by {regression_pct:.1f}% "
                        f"(baseline: {baseline_value:.2f}, current: {current_value:.2f})"
                    )
        
        return regressions


class InvestigationPerformanceBenchmark:
    """Comprehensive performance benchmarking for investigations."""
    
    def __init__(self, results_dir: str = "./benchmark_results"):
        """
        Initialize performance benchmark.
        
        Args:
            results_dir: Directory to store benchmark results
        """
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        self.baselines: Dict[str, PerformanceBaseline] = {}
        self.load_baselines()
        
        # Benchmark configurations
        self.benchmark_configs = {
            "small": {
                "entity_count": 10,
                "parallel_requests": 1,
                "investigation_depth": "shallow"
            },
            "medium": {
                "entity_count": 50,
                "parallel_requests": 5,
                "investigation_depth": "standard"
            },
            "large": {
                "entity_count": 100,
                "parallel_requests": 10,
                "investigation_depth": "deep"
            }
        }
    
    def load_baselines(self):
        """Load performance baselines from disk."""
        baseline_file = self.results_dir / "baselines.json"
        if baseline_file.exists():
            try:
                with open(baseline_file, 'r') as f:
                    data = json.load(f)
                    for inv_type, baseline_data in data.items():
                        self.baselines[inv_type] = PerformanceBaseline(**baseline_data)
                logger.info(f"Loaded {len(self.baselines)} performance baselines")
            except Exception as e:
                logger.error(f"Failed to load baselines: {e}")
    
    def save_baselines(self):
        """Save performance baselines to disk."""
        baseline_file = self.results_dir / "baselines.json"
        try:
            data = {
                inv_type: asdict(baseline)
                for inv_type, baseline in self.baselines.items()
            }
            with open(baseline_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved {len(self.baselines)} performance baselines")
        except Exception as e:
            logger.error(f"Failed to save baselines: {e}")
    
    async def benchmark_investigation_types(
        self,
        graph_builder: Callable,
        investigation_types: List[str],
        config_size: str = "medium"
    ) -> Dict[str, BenchmarkResult]:
        """
        Benchmark different investigation types.
        
        Args:
            graph_builder: Function to build investigation graph
            investigation_types: List of investigation types to benchmark
            config_size: Benchmark configuration size
            
        Returns:
            Benchmark results for each type
        """
        results = {}
        config = self.benchmark_configs[config_size]
        
        for inv_type in investigation_types:
            logger.info(f"Benchmarking investigation type: {inv_type}")
            
            # Generate test data
            test_data = self._generate_test_data(inv_type, config)
            
            # Run benchmark
            result = await self._run_single_benchmark(
                graph_builder,
                inv_type,
                test_data,
                config
            )
            
            results[inv_type] = result
            
            # Check for regression
            if inv_type in self.baselines:
                regressions = self.baselines[inv_type].check_regression(result.metrics)
                if regressions:
                    logger.warning(f"Performance regressions detected for {inv_type}:")
                    for regression in regressions:
                        logger.warning(f"  - {regression}")
            
            # Save result
            self._save_benchmark_result(result)
        
        return results
    
    async def _run_single_benchmark(
        self,
        graph_builder: Callable,
        investigation_type: str,
        test_data: List[Dict[str, Any]],
        config: Dict[str, Any]
    ) -> BenchmarkResult:
        """Run a single benchmark."""
        benchmark_id = f"{investigation_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Metrics collection
        latencies = []
        memory_usage = []
        errors = 0
        successes = 0
        
        # Build graph
        graph = await graph_builder()
        
        # Warm-up run
        logger.info(f"Running warm-up for {investigation_type}")
        await self._run_investigation(graph, test_data[0])
        
        # Benchmark runs
        start_time = time.time()
        
        for i, data in enumerate(test_data):
            try:
                run_start = time.time()
                
                # Track memory before
                import psutil
                process = psutil.Process()
                mem_before = process.memory_info().rss / 1024 / 1024  # MB
                
                # Run investigation
                await self._run_investigation(graph, data)
                
                # Track metrics
                latency = time.time() - run_start
                latencies.append(latency)
                
                mem_after = process.memory_info().rss / 1024 / 1024  # MB
                memory_usage.append(mem_after - mem_before)
                
                successes += 1
                
                if (i + 1) % 10 == 0:
                    logger.info(f"Completed {i + 1}/{len(test_data)} benchmark runs")
                    
            except Exception as e:
                logger.error(f"Benchmark run failed: {e}")
                errors += 1
        
        total_duration = time.time() - start_time
        
        # Calculate metrics
        metrics = {
            "avg_latency": statistics.mean(latencies) if latencies else 0,
            "median_latency": statistics.median(latencies) if latencies else 0,
            "max_latency": max(latencies) if latencies else 0,
            "min_latency": min(latencies) if latencies else 0,
            "throughput": len(test_data) / total_duration if total_duration > 0 else 0,
            "avg_memory_mb": statistics.mean(memory_usage) if memory_usage else 0,
            "error_rate": errors / len(test_data) if test_data else 0
        }
        
        # Calculate percentiles
        percentiles = {}
        if latencies:
            sorted_latencies = sorted(latencies)
            percentiles = {
                "p50": np.percentile(sorted_latencies, 50),
                "p75": np.percentile(sorted_latencies, 75),
                "p90": np.percentile(sorted_latencies, 90),
                "p95": np.percentile(sorted_latencies, 95),
                "p99": np.percentile(sorted_latencies, 99)
            }
        
        return BenchmarkResult(
            benchmark_id=benchmark_id,
            timestamp=datetime.now().isoformat(),
            investigation_type=investigation_type,
            metrics=metrics,
            percentiles=percentiles,
            success_rate=successes / len(test_data) if test_data else 0,
            error_count=errors,
            duration=total_duration,
            config=config
        )
    
    async def _run_investigation(self, graph, data: Dict[str, Any]):
        """Run a single investigation."""
        # Simplified investigation run
        config = {"configurable": {"thread_id": f"benchmark_{time.time()}"}}
        await graph.ainvoke(data, config=config)
    
    def _generate_test_data(self, investigation_type: str, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate test data for benchmarking."""
        test_data = []
        entity_count = config["entity_count"]
        
        for i in range(entity_count):
            data = {
                "messages": [],
                "entity_id": f"test_entity_{i}",
                "entity_type": "user",
                "investigation_id": f"bench_inv_{i}",
                "investigation_type": investigation_type
            }
            
            # Add type-specific data
            if investigation_type == "device_fraud":
                data["device_fingerprint"] = f"fp_{i}"
                data["device_signals"] = {"suspicious": i % 10 == 0}
            elif investigation_type == "network_fraud":
                data["ip"] = f"192.168.{i % 256}.{i % 256}"
                data["network_signals"] = {"vpn": i % 5 == 0}
            elif investigation_type == "location_fraud":
                data["location"] = {"lat": 40.7 + i * 0.01, "lon": -74.0 + i * 0.01}
                data["location_signals"] = {"impossible_travel": i % 20 == 0}
            
            test_data.append(data)
        
        return test_data
    
    def _save_benchmark_result(self, result: BenchmarkResult):
        """Save benchmark result to disk."""
        result_file = self.results_dir / f"{result.benchmark_id}.json"
        try:
            with open(result_file, 'w') as f:
                json.dump(result.to_dict(), f, indent=2)
            logger.debug(f"Saved benchmark result to {result_file}")
        except Exception as e:
            logger.error(f"Failed to save benchmark result: {e}")
    
    def update_baseline(self, investigation_type: str, result: BenchmarkResult, version: str = "1.0"):
        """
        Update performance baseline.
        
        Args:
            investigation_type: Type of investigation
            result: Benchmark result to use as baseline
            version: Version identifier
        """
        self.baselines[investigation_type] = PerformanceBaseline(
            investigation_type=investigation_type,
            metrics=result.metrics,
            thresholds={
                "avg_latency": 0.2,      # 20% threshold
                "throughput": 0.15,      # 15% threshold
                "error_rate": 0.5,       # 50% threshold (more sensitive)
                "avg_memory_mb": 0.3     # 30% threshold
            },
            created_at=datetime.now().isoformat(),
            version=version
        )
        
        self.save_baselines()
        logger.info(f"Updated baseline for {investigation_type}")
    
    def generate_report(self, results: Dict[str, BenchmarkResult]) -> str:
        """
        Generate performance report.
        
        Args:
            results: Benchmark results
            
        Returns:
            Formatted report string
        """
        report = []
        report.append("=" * 80)
        report.append("PERFORMANCE BENCHMARK REPORT")
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append("=" * 80)
        report.append("")
        
        for inv_type, result in results.items():
            report.append(f"\n## Investigation Type: {inv_type}")
            report.append("-" * 40)
            
            # Metrics
            report.append("\n### Performance Metrics:")
            for metric_name, value in result.metrics.items():
                report.append(f"  - {metric_name}: {value:.3f}")
            
            # Percentiles
            if result.percentiles:
                report.append("\n### Latency Percentiles:")
                for percentile, value in result.percentiles.items():
                    report.append(f"  - {percentile}: {value:.3f}s")
            
            # Success rate
            report.append(f"\n### Reliability:")
            report.append(f"  - Success Rate: {result.success_rate:.1%}")
            report.append(f"  - Error Count: {result.error_count}")
            
            # Regression check
            if inv_type in self.baselines:
                regressions = self.baselines[inv_type].check_regression(result.metrics)
                if regressions:
                    report.append("\n### ⚠️ Performance Regressions:")
                    for regression in regressions:
                        report.append(f"  - {regression}")
                else:
                    report.append("\n### ✅ No Performance Regressions")
            
            # Recommendations
            recommendations = self._generate_recommendations(result)
            if recommendations:
                report.append("\n### Recommendations:")
                for rec in recommendations:
                    report.append(f"  - {rec}")
        
        report.append("\n" + "=" * 80)
        
        return "\n".join(report)
    
    def _generate_recommendations(self, result: BenchmarkResult) -> List[str]:
        """Generate optimization recommendations."""
        recommendations = []
        
        # Check latency
        if result.metrics.get("avg_latency", 0) > 10:
            recommendations.append("High average latency detected - consider parallel execution")
        
        # Check memory
        if result.metrics.get("avg_memory_mb", 0) > 100:
            recommendations.append("High memory usage - review caching strategy")
        
        # Check error rate
        if result.metrics.get("error_rate", 0) > 0.05:
            recommendations.append("High error rate - improve error handling and retry logic")
        
        # Check percentiles
        if result.percentiles:
            p99 = result.percentiles.get("p99", 0)
            p50 = result.percentiles.get("p50", 0)
            if p99 > p50 * 5:
                recommendations.append("High latency variance - investigate outliers")
        
        return recommendations


class ContinuousPerformanceMonitor:
    """Continuous performance monitoring in production."""
    
    def __init__(self, benchmark: InvestigationPerformanceBenchmark):
        """
        Initialize continuous monitor.
        
        Args:
            benchmark: Performance benchmark instance
        """
        self.benchmark = benchmark
        self.metrics_buffer: List[Dict[str, Any]] = []
        self.buffer_size = 100
        self.alert_thresholds = {
            "latency_spike": 2.0,      # 2x baseline
            "error_rate_high": 0.1,    # 10% errors
            "memory_leak": 500         # 500 MB growth
        }
    
    async def monitor_investigation(self, investigation_id: str, metrics: Dict[str, Any]):
        """
        Monitor a single investigation.
        
        Args:
            investigation_id: Investigation ID
            metrics: Performance metrics
        """
        # Add to buffer
        self.metrics_buffer.append({
            "investigation_id": investigation_id,
            "timestamp": time.time(),
            "metrics": metrics
        })
        
        # Maintain buffer size
        if len(self.metrics_buffer) > self.buffer_size:
            self.metrics_buffer.pop(0)
        
        # Check for anomalies
        alerts = self._check_anomalies(metrics)
        
        if alerts:
            logger.warning(f"Performance alerts for {investigation_id}:")
            for alert in alerts:
                logger.warning(f"  - {alert}")
    
    def _check_anomalies(self, current_metrics: Dict[str, Any]) -> List[str]:
        """Check for performance anomalies."""
        alerts = []
        
        # Check latency spike
        if "latency" in current_metrics:
            recent_latencies = [
                m["metrics"].get("latency", 0)
                for m in self.metrics_buffer[-10:]
                if "latency" in m.get("metrics", {})
            ]
            
            if recent_latencies:
                avg_recent = statistics.mean(recent_latencies)
                if current_metrics["latency"] > avg_recent * self.alert_thresholds["latency_spike"]:
                    alerts.append(f"Latency spike detected: {current_metrics['latency']:.2f}s")
        
        # Check error rate
        if "error_rate" in current_metrics:
            if current_metrics["error_rate"] > self.alert_thresholds["error_rate_high"]:
                alerts.append(f"High error rate: {current_metrics['error_rate']:.1%}")
        
        # Check memory
        if "memory_mb" in current_metrics:
            recent_memory = [
                m["metrics"].get("memory_mb", 0)
                for m in self.metrics_buffer[-10:]
                if "memory_mb" in m.get("metrics", {})
            ]
            
            if len(recent_memory) >= 2:
                memory_growth = current_metrics["memory_mb"] - recent_memory[0]
                if memory_growth > self.alert_thresholds["memory_leak"]:
                    alerts.append(f"Potential memory leak: {memory_growth:.0f} MB growth")
        
        return alerts
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary from buffer."""
        if not self.metrics_buffer:
            return {}
        
        # Aggregate metrics
        all_latencies = []
        all_errors = []
        all_memory = []
        
        for entry in self.metrics_buffer:
            metrics = entry.get("metrics", {})
            if "latency" in metrics:
                all_latencies.append(metrics["latency"])
            if "error_rate" in metrics:
                all_errors.append(metrics["error_rate"])
            if "memory_mb" in metrics:
                all_memory.append(metrics["memory_mb"])
        
        summary = {
            "sample_count": len(self.metrics_buffer),
            "time_window": self.metrics_buffer[-1]["timestamp"] - self.metrics_buffer[0]["timestamp"]
        }
        
        if all_latencies:
            summary["latency"] = {
                "avg": statistics.mean(all_latencies),
                "median": statistics.median(all_latencies),
                "max": max(all_latencies),
                "min": min(all_latencies)
            }
        
        if all_errors:
            summary["error_rate"] = {
                "avg": statistics.mean(all_errors),
                "max": max(all_errors)
            }
        
        if all_memory:
            summary["memory_mb"] = {
                "avg": statistics.mean(all_memory),
                "max": max(all_memory),
                "growth": all_memory[-1] - all_memory[0] if len(all_memory) >= 2 else 0
            }
        
        return summary