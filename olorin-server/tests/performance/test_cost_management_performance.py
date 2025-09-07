"""
Performance Tests for API Cost Management System.

Tests performance characteristics, overhead measurements, and scalability
of the cost management system components. NO MOCK DATA.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
import pytest
import pytest_asyncio
import time
import psutil
import gc
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, Any, List

from app.service.cost_management.anthropic_credit_monitor import get_credit_monitor
from app.service.cost_management.model_tier_fallback import get_model_fallback
from app.service.cost_management.api_circuit_breaker import get_circuit_breaker, CircuitBreakerConfig
from app.service.cost_management.cost_optimization_framework import get_cost_optimization
from app.service.cost_management.real_time_cost_tracker import get_cost_tracker


@pytest.mark.performance
class TestCostManagementPerformance:
    """Performance tests for cost management system components."""

    @pytest.mark.asyncio
    async def test_credit_monitor_performance_overhead(self, api_cost_monitor):
        """Test credit monitor performance overhead meets <100ms requirement."""
        
        credit_monitor = get_credit_monitor()
        
        # Warm up
        for _ in range(10):
            await credit_monitor.estimate_request_cost("claude-3-haiku-20240307", 1000, 1000)
        
        # Performance test
        iterations = 1000
        start_time = time.perf_counter()
        
        for i in range(iterations):
            await credit_monitor.estimate_request_cost("claude-3-sonnet-20240229", 1000 + i, 1500 + i)
            
            if i % 100 == 0:
                # Track some usage for realism
                api_cost_monitor.track_call(1000 + i, 1500 + i, "claude-3-sonnet-20240229")
        
        end_time = time.perf_counter()
        elapsed_time = end_time - start_time
        avg_time_per_operation = (elapsed_time / iterations) * 1000  # Convert to milliseconds
        
        # Should be well under 100ms per operation
        assert avg_time_per_operation < 1.0, f"Credit monitor overhead too high: {avg_time_per_operation:.2f}ms per operation"
        
        # Log performance metrics
        print(f"Credit Monitor Performance: {avg_time_per_operation:.4f}ms per operation")

    @pytest.mark.asyncio
    async def test_model_fallback_selection_performance(self):
        """Test model selection performance under various conditions."""
        
        model_fallback = get_model_fallback()
        
        # Test scenarios with different complexities
        test_scenarios = [
            ("data_extraction", 1000, "claude-3-haiku-20240307"),
            ("device_spoofing", 2500, "claude-3-sonnet-20240229"),
            ("synthetic_identity", 4000, "claude-opus-4-1-20250805"),
            ("money_laundering", 3500, "claude-opus-4-1-20250805"),
        ]
        
        # Warm up
        for scenario in test_scenarios[:2]:
            await model_fallback.select_model(*scenario)
        
        # Performance test
        iterations = 500
        total_time = 0.0
        
        for i in range(iterations):
            scenario = test_scenarios[i % len(test_scenarios)]
            
            start_time = time.perf_counter()
            selection = await model_fallback.select_model(*scenario)
            end_time = time.perf_counter()
            
            operation_time = end_time - start_time
            total_time += operation_time
            
            # Verify selection is valid
            assert selection.selected_model is not None
            assert selection.estimated_cost >= 0
        
        avg_time_per_selection = (total_time / iterations) * 1000  # Convert to milliseconds
        
        # Model selection should be very fast
        assert avg_time_per_selection < 10.0, f"Model selection too slow: {avg_time_per_selection:.2f}ms per selection"
        
        print(f"Model Selection Performance: {avg_time_per_selection:.4f}ms per selection")

    @pytest.mark.asyncio
    async def test_cost_optimization_throughput(self, api_cost_monitor):
        """Test cost optimization framework throughput and performance."""
        
        cost_optimizer = get_cost_optimization()
        
        # Test prompts representing typical investigation tasks
        test_prompts = [
            ("data_extraction", "Extract relevant data from transaction logs for analysis"),
            ("pattern_recognition", "Identify suspicious patterns in user behavior over the last 30 days"),
            ("risk_assessment", "Assess fraud risk based on device fingerprint and transaction history"),
            ("device_analysis", "Analyze device fingerprint for potential spoofing indicators"),
            ("location_analysis", "Validate geographic consistency of user locations"),
        ]
        
        # Warm up
        for prompt_data in test_prompts[:2]:
            await cost_optimizer.optimize_request(
                task_type=prompt_data[0],
                prompt=prompt_data[1],
                preferred_model="claude-3-haiku-20240307",
                max_tokens=1500
            )
        
        # Throughput test
        iterations = 200
        start_time = time.perf_counter()
        successful_optimizations = 0
        
        for i in range(iterations):
            prompt_data = test_prompts[i % len(test_prompts)]
            
            try:
                model_selection, optimization_result = await cost_optimizer.optimize_request(
                    task_type=prompt_data[0],
                    prompt=prompt_data[1],
                    preferred_model="claude-3-sonnet-20240229",
                    max_tokens=2000
                )
                
                successful_optimizations += 1
                
                # Track some operations for realism
                if i % 10 == 0:
                    api_cost_monitor.track_call(1000, 1000, model_selection.selected_model)
                
            except Exception as e:
                print(f"Optimization failed: {e}")
        
        end_time = time.perf_counter()
        elapsed_time = end_time - start_time
        throughput = successful_optimizations / elapsed_time  # Operations per second
        avg_time_per_optimization = (elapsed_time / successful_optimizations) * 1000  # Milliseconds
        
        # Should maintain high throughput
        assert throughput >= 20.0, f"Cost optimization throughput too low: {throughput:.2f} ops/sec"
        assert avg_time_per_optimization < 50.0, f"Cost optimization too slow: {avg_time_per_optimization:.2f}ms per operation"
        
        print(f"Cost Optimization Performance: {throughput:.2f} ops/sec, {avg_time_per_optimization:.2f}ms per operation")

    @pytest.mark.asyncio
    async def test_circuit_breaker_performance_impact(self):
        """Test circuit breaker performance impact on API calls."""
        
        circuit_breaker = get_circuit_breaker("performance_test", CircuitBreakerConfig(
            failure_threshold=5,
            recovery_timeout=10.0,
            timeout=5.0
        ))
        
        async def fast_api_call():
            """Simulate fast API call."""
            await asyncio.sleep(0.01)  # 10ms API call
            return {"status": "success", "data": "api_response"}
        
        # Test without circuit breaker
        iterations = 500
        start_time = time.perf_counter()
        
        for _ in range(iterations):
            await fast_api_call()
        
        end_time = time.perf_counter()
        baseline_time = end_time - start_time
        
        # Test with circuit breaker
        start_time = time.perf_counter()
        
        for _ in range(iterations):
            result = await circuit_breaker.call(fast_api_call)
            assert result["status"] == "success"
        
        end_time = time.perf_counter()
        circuit_breaker_time = end_time - start_time
        
        # Calculate overhead
        overhead = circuit_breaker_time - baseline_time
        overhead_per_call = (overhead / iterations) * 1000  # Milliseconds
        overhead_percentage = (overhead / baseline_time) * 100
        
        # Circuit breaker overhead should be minimal
        assert overhead_per_call < 1.0, f"Circuit breaker overhead too high: {overhead_per_call:.4f}ms per call"
        assert overhead_percentage < 10.0, f"Circuit breaker overhead percentage too high: {overhead_percentage:.2f}%"
        
        print(f"Circuit Breaker Overhead: {overhead_per_call:.4f}ms per call ({overhead_percentage:.2f}%)")

    @pytest.mark.asyncio
    async def test_real_time_tracker_monitoring_performance(self):
        """Test real-time tracker monitoring performance and resource usage."""
        
        cost_tracker = get_cost_tracker()
        
        # Start monitoring
        await cost_tracker.start_monitoring()
        
        try:
            # Generate load while monitoring
            start_time = time.perf_counter()
            
            # Add many metrics rapidly
            for i in range(1000):
                metric = cost_tracker.CostMetric(
                    name=f"perf_metric_{i}",
                    type=cost_tracker.MetricType.COST,
                    value=float(i * 0.5),
                    unit="USD",
                    timestamp=datetime.now()
                )
                await cost_tracker._update_metric(metric)
                
                # Add some alerts
                if i % 100 == 0:
                    await cost_tracker._create_alert(
                        alert_id=f"perf_alert_{i}",
                        severity=cost_tracker.AlertSeverity.INFO,
                        metric_type=cost_tracker.MetricType.PERFORMANCE,
                        title=f"Performance Test Alert {i}",
                        message=f"Test alert {i}",
                        data={"test_index": i}
                    )
            
            end_time = time.perf_counter()
            elapsed_time = end_time - start_time
            throughput = 1000 / elapsed_time  # Metrics per second
            
            # Should maintain high throughput for metric updates
            assert throughput >= 500.0, f"Real-time tracker throughput too low: {throughput:.2f} metrics/sec"
            
            print(f"Real-time Tracker Performance: {throughput:.2f} metrics/sec")
            
        finally:
            await cost_tracker.stop_monitoring()

    @pytest.mark.asyncio
    async def test_concurrent_access_performance(self, api_cost_monitor):
        """Test system performance under concurrent access."""
        
        credit_monitor = get_credit_monitor()
        model_fallback = get_model_fallback()
        cost_optimizer = get_cost_optimization()
        
        async def concurrent_cost_operation(operation_id: int):
            """Perform concurrent cost management operations."""
            
            # Credit estimation
            estimate = await credit_monitor.estimate_request_cost(
                "claude-3-sonnet-20240229", 1000 + operation_id, 1500 + operation_id
            )
            
            # Model selection
            selection = await model_fallback.select_model(
                task_type="device_analysis",
                estimated_tokens=2000 + operation_id,
                preferred_model="claude-3-sonnet-20240229"
            )
            
            # Cost optimization
            model_sel, opt_result = await cost_optimizer.optimize_request(
                task_type="pattern_recognition",
                prompt=f"Analyze pattern {operation_id}",
                preferred_model="claude-3-sonnet-20240229",
                max_tokens=2000
            )
            
            # Track for monitoring
            api_cost_monitor.track_call(1000, 1000, selection.selected_model)
            
            return {
                "operation_id": operation_id,
                "estimate_cost": estimate.estimated_cost,
                "selected_model": selection.selected_model,
                "optimized_cost": opt_result.optimized_cost
            }
        
        # Test concurrent operations
        concurrent_count = 50
        start_time = time.perf_counter()
        
        tasks = [concurrent_cost_operation(i) for i in range(concurrent_count)]
        results = await asyncio.gather(*tasks)
        
        end_time = time.perf_counter()
        elapsed_time = end_time - start_time
        
        # Verify all operations completed successfully
        assert len(results) == concurrent_count
        for result in results:
            assert result["estimate_cost"] > 0
            assert result["selected_model"] is not None
            assert result["optimized_cost"] >= 0
        
        # Calculate performance metrics
        throughput = concurrent_count / elapsed_time
        avg_time_per_operation = (elapsed_time / concurrent_count) * 1000  # Milliseconds
        
        # Should handle concurrent operations efficiently
        assert throughput >= 10.0, f"Concurrent throughput too low: {throughput:.2f} ops/sec"
        assert avg_time_per_operation < 500.0, f"Concurrent operations too slow: {avg_time_per_operation:.2f}ms per operation"
        
        print(f"Concurrent Access Performance: {throughput:.2f} ops/sec, {avg_time_per_operation:.2f}ms per operation")

    @pytest.mark.asyncio
    async def test_memory_usage_under_load(self):
        """Test memory usage characteristics under sustained load."""
        
        import tracemalloc
        
        # Start memory tracing
        tracemalloc.start()
        
        cost_optimizer = get_cost_optimization()
        cost_tracker = get_cost_tracker()
        
        # Get initial memory snapshot
        initial_snapshot = tracemalloc.take_snapshot()
        initial_stats = initial_snapshot.statistics('lineno')
        initial_memory = sum(stat.size for stat in initial_stats)
        
        # Generate sustained load
        for batch in range(10):  # 10 batches of 100 operations each
            tasks = []
            
            for i in range(100):
                operation_id = batch * 100 + i
                task = cost_optimizer.optimize_request(
                    task_type="data_extraction",
                    prompt=f"Extract data for operation {operation_id}",
                    preferred_model="claude-3-haiku-20240307",
                    max_tokens=1000
                )
                tasks.append(task)
            
            # Execute batch
            await asyncio.gather(*tasks)
            
            # Force garbage collection
            gc.collect()
        
        # Get final memory snapshot
        final_snapshot = tracemalloc.take_snapshot()
        final_stats = final_snapshot.statistics('lineno')
        final_memory = sum(stat.size for stat in final_stats)
        
        # Calculate memory growth
        memory_growth = final_memory - initial_memory
        memory_growth_mb = memory_growth / (1024 * 1024)  # Convert to MB
        
        # Memory growth should be reasonable for 1000 operations
        assert memory_growth_mb < 50.0, f"Memory growth too high: {memory_growth_mb:.2f}MB for 1000 operations"
        
        print(f"Memory Usage: {memory_growth_mb:.2f}MB growth for 1000 operations")
        
        tracemalloc.stop()

    @pytest.mark.asyncio
    async def test_cache_performance_characteristics(self):
        """Test cache performance and hit rate characteristics."""
        
        cost_optimizer = get_cost_optimization()
        
        # Generate test data with some repetition for cache hits
        test_prompts = [
            "Analyze user behavior pattern",
            "Extract transaction data", 
            "Validate device fingerprint",
            "Assess fraud risk level",
            "Generate investigation report"
        ]
        
        # First pass - populate cache
        start_time = time.perf_counter()
        
        for i in range(100):
            prompt = test_prompts[i % len(test_prompts)]
            await cost_optimizer.optimize_request(
                task_type="pattern_recognition",
                prompt=prompt,
                preferred_model="claude-3-haiku-20240307",
                max_tokens=1500
            )
        
        first_pass_time = time.perf_counter() - start_time
        
        # Clear stats and run second pass - should benefit from cache
        cost_optimizer.optimization_stats['total_requests'] = 0
        cost_optimizer.cache_stats = {'hits': 0, 'misses': 0, 'evictions': 0, 'savings': 0.0}
        
        start_time = time.perf_counter()
        
        for i in range(100):
            prompt = test_prompts[i % len(test_prompts)]
            await cost_optimizer.optimize_request(
                task_type="pattern_recognition",
                prompt=prompt,
                preferred_model="claude-3-haiku-20240307",
                max_tokens=1500
            )
        
        second_pass_time = time.perf_counter() - start_time
        
        # Get cache statistics
        cache_stats = cost_optimizer.get_optimization_stats()['cache']
        cache_hit_rate = cache_stats['hit_rate_percent']
        
        # Cache should improve performance
        performance_improvement = (first_pass_time - second_pass_time) / first_pass_time * 100
        
        # Should see cache hits and performance improvement
        assert cache_hit_rate > 50.0, f"Cache hit rate too low: {cache_hit_rate:.2f}%"
        
        print(f"Cache Performance: {cache_hit_rate:.2f}% hit rate, {performance_improvement:.2f}% performance improvement")

    @pytest.mark.asyncio  
    async def test_system_scalability_limits(self):
        """Test system behavior at scalability limits."""
        
        # Test with increasing load to find performance boundaries
        load_levels = [10, 50, 100, 200, 500]
        performance_results = []
        
        cost_optimizer = get_cost_optimization()
        
        for load_level in load_levels:
            # Test performance at this load level
            start_time = time.perf_counter()
            successful_operations = 0
            
            tasks = []
            for i in range(load_level):
                task = cost_optimizer.optimize_request(
                    task_type="data_extraction", 
                    prompt=f"Process item {i}",
                    preferred_model="claude-3-haiku-20240307",
                    max_tokens=1000
                )
                tasks.append(task)
            
            try:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                successful_operations = sum(1 for r in results if not isinstance(r, Exception))
                
                end_time = time.perf_counter()
                elapsed_time = end_time - start_time
                throughput = successful_operations / elapsed_time
                
                performance_results.append({
                    'load_level': load_level,
                    'successful_operations': successful_operations,
                    'throughput': throughput,
                    'success_rate': successful_operations / load_level,
                    'avg_latency': elapsed_time / successful_operations if successful_operations > 0 else float('inf')
                })
                
            except Exception as e:
                performance_results.append({
                    'load_level': load_level,
                    'successful_operations': 0,
                    'throughput': 0,
                    'success_rate': 0,
                    'error': str(e)
                })
        
        # Analyze scalability characteristics
        max_throughput = max(r['throughput'] for r in performance_results if 'throughput' in r)
        degradation_point = None
        
        for i, result in enumerate(performance_results):
            if result.get('success_rate', 0) < 0.95:  # Less than 95% success rate
                degradation_point = result['load_level']
                break
        
        # System should handle reasonable load
        assert max_throughput >= 50.0, f"Maximum throughput too low: {max_throughput:.2f} ops/sec"
        
        if degradation_point:
            assert degradation_point >= 100, f"Performance degradation too early at load level: {degradation_point}"
        
        print(f"Scalability Results: Max throughput {max_throughput:.2f} ops/sec")
        print(f"Performance degradation point: {degradation_point or 'Not reached'}")


@pytest.mark.performance
class TestCostManagementStressTests:
    """Stress tests for cost management system resilience."""

    @pytest.mark.asyncio
    async def test_sustained_high_load_stress(self, api_cost_monitor):
        """Test system behavior under sustained high load."""
        
        cost_optimizer = get_cost_optimization()
        model_fallback = get_model_fallback()
        
        # Sustained load parameters
        duration_seconds = 30  # 30 second stress test
        target_rps = 20  # 20 requests per second
        total_requests = duration_seconds * target_rps
        
        # Track results
        start_time = time.perf_counter()
        completed_requests = 0
        failed_requests = 0
        
        async def stress_operation(request_id: int):
            """Single stress test operation."""
            nonlocal completed_requests, failed_requests
            
            try:
                # Mixed workload
                if request_id % 3 == 0:
                    # Cost optimization
                    await cost_optimizer.optimize_request(
                        task_type="device_analysis",
                        prompt=f"Analyze device {request_id}",
                        preferred_model="claude-3-haiku-20240307",
                        max_tokens=1500
                    )
                else:
                    # Model selection
                    await model_fallback.select_model(
                        task_type="pattern_recognition",
                        estimated_tokens=1500,
                        preferred_model="claude-3-sonnet-20240229"
                    )
                
                completed_requests += 1
                
                # Track some for monitoring
                if request_id % 50 == 0:
                    api_cost_monitor.track_call(1000, 1000, "claude-3-haiku-20240307")
                
            except Exception:
                failed_requests += 1
        
        # Execute stress test with rate limiting
        for second in range(duration_seconds):
            second_start = time.perf_counter()
            
            # Create batch of requests for this second
            batch_tasks = [
                stress_operation(second * target_rps + i)
                for i in range(target_rps)
            ]
            
            # Execute batch
            await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Rate limiting - wait for remainder of second
            elapsed = time.perf_counter() - second_start
            if elapsed < 1.0:
                await asyncio.sleep(1.0 - elapsed)
        
        total_time = time.perf_counter() - start_time
        actual_rps = completed_requests / total_time
        success_rate = completed_requests / total_requests
        
        # Stress test success criteria
        assert success_rate >= 0.95, f"Success rate too low under stress: {success_rate:.2%}"
        assert actual_rps >= target_rps * 0.8, f"Throughput degraded too much: {actual_rps:.2f} < {target_rps * 0.8:.2f} rps"
        
        print(f"Stress Test Results: {success_rate:.2%} success rate, {actual_rps:.2f} rps")

    @pytest.mark.asyncio
    async def test_memory_stress_and_recovery(self):
        """Test system memory behavior under stress and recovery."""
        
        import psutil
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        cost_optimizer = get_cost_optimization()
        cost_tracker = get_cost_tracker()
        
        # Memory stress phase
        stress_operations = 2000  # Large number of operations
        
        for i in range(stress_operations):
            # Create temporary load
            await cost_optimizer.optimize_request(
                task_type="data_extraction",
                prompt=f"Memory stress operation {i} with extra content to increase memory usage",
                preferred_model="claude-3-haiku-20240307",
                max_tokens=1000
            )
            
            # Add tracker data
            if i % 10 == 0:
                metric = cost_tracker.CostMetric(
                    name=f"stress_metric_{i}",
                    type=cost_tracker.MetricType.COST,
                    value=float(i),
                    unit="USD",
                    timestamp=datetime.now()
                )
                await cost_tracker._update_metric(metric)
        
        stress_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_growth = stress_memory - initial_memory
        
        # Recovery phase - trigger cleanup
        gc.collect()
        await asyncio.sleep(1.0)  # Allow cleanup
        
        # Trigger internal cleanup if available
        if hasattr(cost_optimizer, '_cleanup_cache'):
            await cost_optimizer._cleanup_cache()
        
        if hasattr(cost_tracker, '_cleanup_old_data'):
            await cost_tracker._cleanup_old_data()
        
        gc.collect()
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Memory should be reasonable and show some recovery
        assert memory_growth < 200.0, f"Memory growth too high: {memory_growth:.2f}MB"
        
        memory_recovered = stress_memory - final_memory
        recovery_rate = memory_recovered / memory_growth if memory_growth > 0 else 0
        
        print(f"Memory Stress: {memory_growth:.2f}MB growth, {recovery_rate:.2%} recovered")

    @pytest.mark.asyncio
    async def test_circuit_breaker_stress_scenarios(self):
        """Test circuit breaker behavior under stress conditions."""
        
        circuit_breaker = get_circuit_breaker("stress_test", CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=2.0,
            timeout=1.0
        ))
        
        # Stress scenario: Mixed success/failure patterns
        call_patterns = [
            ("success", 0.1),  # Fast success
            ("success", 0.1),
            ("failure", 0.0),  # Immediate failure
            ("success", 0.1),
            ("timeout", 2.0),  # Timeout
            ("failure", 0.0),
            ("failure", 0.0),  # Should trigger circuit open
        ]
        
        results = []
        
        for i, (pattern_type, delay) in enumerate(call_patterns * 10):  # Repeat pattern 10 times
            async def stress_api_call():
                await asyncio.sleep(delay)
                if pattern_type == "failure":
                    raise Exception(f"Stress test failure {i}")
                elif pattern_type == "timeout":
                    await asyncio.sleep(5.0)  # Will timeout
                return {"call_id": i, "status": "success"}
            
            try:
                result = await circuit_breaker.call(stress_api_call)
                results.append(("success", result))
            except Exception as e:
                results.append(("failure", str(e)))
        
        # Analyze circuit breaker stress behavior
        stats = circuit_breaker.get_stats_dict()
        
        # Should have handled stress appropriately
        assert stats["total_requests"] > 0
        assert stats["total_failures"] > 0  # Some failures expected
        
        # Circuit should have opened and potentially recovered
        state_transitions_expected = stats["total_failures"] >= circuit_breaker.config.failure_threshold
        
        print(f"Circuit Breaker Stress: {stats['total_requests']} requests, {stats['total_failures']} failures")
        print(f"Final state: {circuit_breaker.state.value}")

    @pytest.mark.asyncio
    async def test_real_time_monitoring_stress(self):
        """Test real-time monitoring under stress conditions."""
        
        cost_tracker = get_cost_tracker()
        
        # Start monitoring
        await cost_tracker.start_monitoring()
        
        try:
            # High-frequency metric updates
            metrics_count = 5000
            alerts_count = 50
            
            start_time = time.perf_counter()
            
            # Generate high-frequency updates
            tasks = []
            
            for i in range(metrics_count):
                metric = cost_tracker.CostMetric(
                    name=f"stress_metric_{i}",
                    type=cost_tracker.MetricType.PERFORMANCE,
                    value=float(i),
                    unit="count",
                    timestamp=datetime.now()
                )
                task = cost_tracker._update_metric(metric)
                tasks.append(task)
            
            # Add some alerts
            for i in range(0, metrics_count, metrics_count // alerts_count):
                alert_task = cost_tracker._create_alert(
                    alert_id=f"stress_alert_{i}",
                    severity=cost_tracker.AlertSeverity.INFO,
                    metric_type=cost_tracker.MetricType.PERFORMANCE,
                    title=f"Stress Alert {i}",
                    message=f"Stress test alert {i}",
                    data={"stress_index": i}
                )
                tasks.append(alert_task)
            
            # Execute all updates
            await asyncio.gather(*tasks)
            
            end_time = time.perf_counter()
            elapsed_time = end_time - start_time
            
            # Calculate performance
            updates_per_second = len(tasks) / elapsed_time
            
            # Should handle high-frequency updates
            assert updates_per_second >= 1000.0, f"Real-time monitoring too slow under stress: {updates_per_second:.2f} updates/sec"
            
            # Verify data integrity
            assert len(cost_tracker.current_metrics) >= metrics_count * 0.9  # Allow some cleanup
            assert len(cost_tracker.active_alerts) >= alerts_count * 0.9
            
            print(f"Real-time Monitoring Stress: {updates_per_second:.2f} updates/sec")
            
        finally:
            await cost_tracker.stop_monitoring()


@pytest.mark.performance
class TestCostManagementBenchmarks:
    """Benchmark tests for cost management system components."""

    @pytest.mark.asyncio
    async def test_end_to_end_investigation_benchmark(self, api_cost_monitor):
        """Benchmark complete investigation workflow performance."""
        
        # Initialize all components
        credit_monitor = get_credit_monitor()
        model_fallback = get_model_fallback()
        cost_optimizer = get_cost_optimization()
        circuit_breaker = get_circuit_breaker("benchmark", CircuitBreakerConfig())
        
        # Benchmark investigation workflow
        investigation_phases = [
            ("data_extraction", "Extract initial data", "claude-3-haiku-20240307", 1000),
            ("device_analysis", "Analyze device fingerprint", "claude-3-sonnet-20240229", 2500),
            ("pattern_recognition", "Identify suspicious patterns", "claude-3-sonnet-20240229", 2000),
            ("risk_assessment", "Final risk determination", "claude-opus-4-1-20250805", 3000),
        ]
        
        benchmark_iterations = 20
        total_benchmark_time = 0.0
        
        for iteration in range(benchmark_iterations):
            iteration_start = time.perf_counter()
            
            for task_type, prompt, preferred_model, max_tokens in investigation_phases:
                # Full cost management workflow
                model_selection, optimization_result = await cost_optimizer.optimize_request(
                    task_type=task_type,
                    prompt=prompt,
                    preferred_model=preferred_model,
                    max_tokens=max_tokens
                )
                
                # Validate affordability
                cost_estimate = await credit_monitor.estimate_request_cost(
                    model_selection.selected_model,
                    max_tokens // 2,
                    max_tokens // 2
                )
                
                is_affordable, _ = await credit_monitor.validate_request_affordability(cost_estimate)
                
                if is_affordable:
                    # Simulate API call through circuit breaker
                    async def benchmark_api_call():
                        await asyncio.sleep(0.1)  # Simulate API latency
                        api_cost_monitor.track_call(
                            max_tokens // 2,
                            max_tokens // 2,
                            model_selection.selected_model
                        )
                        return {"status": "success"}
                    
                    await circuit_breaker.call(benchmark_api_call)
                    await credit_monitor.track_request_usage(cost_estimate)
            
            iteration_end = time.perf_counter()
            iteration_time = iteration_end - iteration_start
            total_benchmark_time += iteration_time
        
        # Calculate benchmark metrics
        avg_investigation_time = total_benchmark_time / benchmark_iterations
        investigations_per_hour = 3600 / avg_investigation_time
        
        # Performance targets
        assert avg_investigation_time < 5.0, f"Investigation too slow: {avg_investigation_time:.2f}s per investigation"
        assert investigations_per_hour >= 720, f"Throughput too low: {investigations_per_hour:.2f} investigations/hour"
        
        print(f"Investigation Benchmark: {avg_investigation_time:.2f}s per investigation")
        print(f"Potential throughput: {investigations_per_hour:.2f} investigations/hour")

    @pytest.mark.asyncio
    async def test_cost_management_overhead_benchmark(self):
        """Benchmark pure cost management overhead."""
        
        cost_optimizer = get_cost_optimization()
        
        # Test overhead of cost management vs direct operations
        iterations = 1000
        
        # Benchmark direct operation (minimal processing)
        start_time = time.perf_counter()
        
        for i in range(iterations):
            # Minimal operation - just create a simple object
            result = {
                "model": "claude-3-haiku-20240307",
                "cost": i * 0.001,
                "tokens": 1000 + i
            }
        
        direct_time = time.perf_counter() - start_time
        
        # Benchmark with cost management
        start_time = time.perf_counter()
        
        for i in range(iterations):
            await cost_optimizer.optimize_request(
                task_type="data_extraction",
                prompt=f"Simple operation {i}",
                preferred_model="claude-3-haiku-20240307",
                max_tokens=1000
            )
        
        cost_management_time = time.perf_counter() - start_time
        
        # Calculate overhead
        overhead = cost_management_time - direct_time
        overhead_per_operation = (overhead / iterations) * 1000  # Milliseconds
        
        # Overhead should be reasonable
        assert overhead_per_operation < 10.0, f"Cost management overhead too high: {overhead_per_operation:.2f}ms per operation"
        
        print(f"Cost Management Overhead: {overhead_per_operation:.2f}ms per operation")

    @pytest.mark.asyncio
    async def test_component_isolation_benchmark(self):
        """Benchmark individual component performance in isolation."""
        
        components = {
            'credit_monitor': get_credit_monitor(),
            'model_fallback': get_model_fallback(), 
            'cost_optimization': get_cost_optimization(),
        }
        
        iterations = 500
        component_benchmarks = {}
        
        # Benchmark each component individually
        for component_name, component in components.items():
            start_time = time.perf_counter()
            
            if component_name == 'credit_monitor':
                for i in range(iterations):
                    await component.estimate_request_cost("claude-3-sonnet-20240229", 1000 + i, 1500 + i)
            
            elif component_name == 'model_fallback':
                for i in range(iterations):
                    await component.select_model("device_analysis", 2000 + i, "claude-3-sonnet-20240229")
            
            elif component_name == 'cost_optimization':
                for i in range(iterations):
                    await component.optimize_request(
                        task_type="pattern_recognition",
                        prompt=f"Benchmark operation {i}",
                        preferred_model="claude-3-haiku-20240307",
                        max_tokens=1500
                    )
            
            end_time = time.perf_counter()
            elapsed_time = end_time - start_time
            
            component_benchmarks[component_name] = {
                'total_time': elapsed_time,
                'avg_time_ms': (elapsed_time / iterations) * 1000,
                'throughput': iterations / elapsed_time
            }
        
        # Print benchmark results
        for component_name, metrics in component_benchmarks.items():
            print(f"{component_name}: {metrics['avg_time_ms']:.4f}ms per operation, {metrics['throughput']:.2f} ops/sec")
            
            # Performance assertions
            assert metrics['avg_time_ms'] < 50.0, f"{component_name} too slow: {metrics['avg_time_ms']:.4f}ms"
            assert metrics['throughput'] >= 20.0, f"{component_name} throughput too low: {metrics['throughput']:.2f} ops/sec"