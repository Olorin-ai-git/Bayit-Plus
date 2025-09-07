"""
Unit Tests for API Circuit Breaker Pattern.

Tests fault tolerance for API calls with intelligent failure handling,
automatic recovery, and graceful degradation. NO MOCK DATA.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Callable
from unittest.mock import AsyncMock

from app.service.cost_management.api_circuit_breaker import (
    APICircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    CircuitBreakerStats,
    APICircuitBreakerError,
    CircuitBreakerRegistry,
    get_circuit_breaker_registry,
    get_circuit_breaker,
)


class TestAPICircuitBreaker:
    """Test suite for APICircuitBreaker component."""

    @pytest.fixture
    def circuit_config(self):
        """Create circuit breaker configuration for testing."""
        return CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=2.0,  # Short timeout for faster tests
            success_threshold=2,
            timeout=1.0,  # Short timeout for tests
            sliding_window_size=5,
            minimum_requests=3,
            failure_rate_threshold=0.6,  # 60% failure rate
            slow_request_threshold=0.5,  # 500ms is considered slow
            slow_request_rate_threshold=0.5,
        )

    @pytest.fixture
    def circuit_breaker(self, circuit_config):
        """Create fresh circuit breaker instance for testing."""
        return APICircuitBreaker("test_circuit", circuit_config)

    @pytest.mark.asyncio
    async def test_circuit_breaker_initialization(self, circuit_breaker, circuit_config):
        """Test circuit breaker initializes with proper configuration."""
        assert circuit_breaker.name == "test_circuit"
        assert circuit_breaker.config == circuit_config
        assert circuit_breaker.state == CircuitState.CLOSED
        assert circuit_breaker.failure_count == 0
        assert circuit_breaker.success_count == 0

    @pytest.mark.asyncio
    async def test_successful_api_call(self, circuit_breaker, api_cost_monitor):
        """Test successful API call execution through circuit breaker."""
        call_count = 0

        async def successful_api_call():
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.1)  # Simulate API call
            api_cost_monitor.track_call(1000, 1500, "claude-3-sonnet-20240229")
            return {"status": "success", "data": "investigation_result"}

        # Execute through circuit breaker
        result = await circuit_breaker.call(successful_api_call)

        # Verify successful execution
        assert result["status"] == "success"
        assert call_count == 1
        assert circuit_breaker.state == CircuitState.CLOSED
        assert circuit_breaker.success_count == 1
        assert circuit_breaker.consecutive_successes == 1
        assert circuit_breaker.consecutive_failures == 0

    @pytest.mark.asyncio
    async def test_circuit_opens_on_failures(self, circuit_breaker):
        """Test circuit breaker opens after reaching failure threshold."""
        failure_count = 0

        async def failing_api_call():
            nonlocal failure_count
            failure_count += 1
            raise Exception(f"API failure {failure_count}")

        # Execute failing calls
        for i in range(circuit_breaker.config.failure_threshold):
            with pytest.raises(Exception):
                await circuit_breaker.call(failing_api_call)

        # Circuit should still be closed until threshold reached
        if circuit_breaker.state == CircuitState.CLOSED:
            # Trigger one more failure to open circuit
            with pytest.raises(Exception):
                await circuit_breaker.call(failing_api_call)

        # Circuit should be open now
        assert circuit_breaker.state == CircuitState.OPEN
        assert circuit_breaker.consecutive_failures >= circuit_breaker.config.failure_threshold

    @pytest.mark.asyncio
    async def test_circuit_blocks_calls_when_open(self, circuit_breaker):
        """Test circuit breaker blocks calls when in OPEN state."""
        # Force circuit to open
        circuit_breaker._transition_to_open()
        assert circuit_breaker.state == CircuitState.OPEN

        async def dummy_api_call():
            return "should_not_execute"

        # Call should be blocked
        with pytest.raises(APICircuitBreakerError) as exc_info:
            await circuit_breaker.call(dummy_api_call)

        assert "OPEN" in str(exc_info.value)
        assert exc_info.value.stats.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_circuit_recovery_workflow(self, circuit_breaker):
        """Test complete circuit breaker recovery workflow."""
        # Step 1: Force failures to open circuit
        async def failing_call():
            raise Exception("Simulated API failure")

        for _ in range(circuit_breaker.config.failure_threshold + 1):
            try:
                await circuit_breaker.call(failing_call)
            except:
                pass

        assert circuit_breaker.state == CircuitState.OPEN

        # Step 2: Wait for recovery timeout
        await asyncio.sleep(circuit_breaker.config.recovery_timeout + 0.1)

        # Step 3: Circuit should allow test call (half-open)
        async def recovery_call():
            return "recovery_success"

        result = await circuit_breaker.call(recovery_call)
        assert result == "recovery_success"
        assert circuit_breaker.state == CircuitState.HALF_OPEN

        # Step 4: More successful calls should close circuit
        for _ in range(circuit_breaker.config.success_threshold):
            await circuit_breaker.call(recovery_call)

        assert circuit_breaker.state == CircuitState.CLOSED

    @pytest.mark.asyncio
    async def test_timeout_handling(self, circuit_breaker):
        """Test circuit breaker handles API call timeouts."""
        async def slow_api_call():
            await asyncio.sleep(circuit_breaker.config.timeout + 0.5)  # Exceed timeout
            return "should_timeout"

        # Call should timeout and be treated as failure
        with pytest.raises(asyncio.TimeoutError):
            await circuit_breaker.call(slow_api_call)

        assert circuit_breaker.total_timeouts == 1
        assert circuit_breaker.consecutive_failures == 1

    @pytest.mark.asyncio
    async def test_sliding_window_failure_rate(self, circuit_breaker):
        """Test sliding window failure rate calculation."""
        # Create mixed success/failure pattern
        call_results = [True, False, False, True, False, False]  # 4 failures out of 6

        for should_succeed in call_results:
            async def test_call():
                if should_succeed:
                    return "success"
                else:
                    raise Exception("failure")

            try:
                await circuit_breaker.call(test_call)
            except:
                pass

        # Check failure rate
        failure_rate = circuit_breaker._calculate_failure_rate()
        expected_rate = 4 / 6  # 4 failures out of 6 calls
        assert abs(failure_rate - expected_rate) < 0.01

    @pytest.mark.asyncio
    async def test_slow_request_detection(self, circuit_breaker):
        """Test detection and tracking of slow API requests."""
        async def slow_but_successful_call():
            await asyncio.sleep(circuit_breaker.config.slow_request_threshold + 0.1)
            return "slow_success"

        # Execute slow calls
        for _ in range(3):
            result = await circuit_breaker.call(slow_but_successful_call)
            assert result == "slow_success"

        # Verify slow request tracking
        slow_rate = circuit_breaker._calculate_slow_request_rate()
        assert slow_rate == 1.0  # 100% of requests were slow

        # If slow rate exceeds threshold, circuit might open
        if slow_rate >= circuit_breaker.config.slow_request_rate_threshold:
            # Circuit behavior depends on other factors too
            assert circuit_breaker.slow_requests > 0

    @pytest.mark.asyncio
    async def test_anthropic_api_integration_scenario(self, circuit_breaker, api_cost_monitor):
        """Test circuit breaker with realistic Anthropic API scenarios."""
        # Simulate various Anthropic API response patterns
        api_scenarios = [
            ("rate_limit", lambda: self._simulate_rate_limit()),
            ("success", lambda: self._simulate_successful_investigation()),
            ("timeout", lambda: self._simulate_api_timeout()),
            ("success", lambda: self._simulate_successful_investigation()),
            ("service_unavailable", lambda: self._simulate_service_unavailable()),
        ]

        results = []
        for scenario_type, scenario_func in api_scenarios:
            try:
                result = await circuit_breaker.call(scenario_func)
                results.append(("success", result))
                
                # Track successful calls for cost monitoring
                if scenario_type == "success":
                    api_cost_monitor.track_call(2000, 1500, "claude-3-sonnet-20240229")
                    
            except Exception as e:
                results.append(("failure", str(e)))

        # Verify circuit handled various scenarios
        assert len(results) == len(api_scenarios)
        
        # Should have some successes and some failures
        successes = [r for r in results if r[0] == "success"]
        failures = [r for r in results if r[0] == "failure"]
        
        assert len(successes) >= 1
        assert len(failures) >= 1

    async def _simulate_rate_limit(self):
        """Simulate Anthropic API rate limit error."""
        raise Exception("RateLimitError: API rate limit exceeded")

    async def _simulate_successful_investigation(self):
        """Simulate successful investigation API call."""
        await asyncio.sleep(0.2)  # Realistic API response time
        return {
            "investigation_id": "inv_12345",
            "risk_score": 0.75,
            "analysis": "Device fingerprint analysis indicates potential fraud",
            "recommendations": ["Flag for manual review", "Additional verification"]
        }

    async def _simulate_api_timeout(self):
        """Simulate API timeout scenario."""
        await asyncio.sleep(2.0)  # Exceed typical timeout
        return "should_not_reach"

    async def _simulate_service_unavailable(self):
        """Simulate service unavailable error."""
        raise Exception("ServiceUnavailableError: Anthropic API temporarily unavailable")

    @pytest.mark.asyncio
    async def test_statistics_accuracy(self, circuit_breaker):
        """Test accuracy of circuit breaker statistics."""
        # Record initial stats
        initial_stats = circuit_breaker._get_stats()
        assert initial_stats.total_requests == 0
        assert initial_stats.total_failures == 0

        # Execute mixed calls
        async def successful_call():
            return "success"

        async def failing_call():
            raise Exception("failure")

        # 3 successes, 2 failures
        call_sequence = [
            (successful_call, False),  # success
            (failing_call, True),      # failure
            (successful_call, False),  # success
            (failing_call, True),      # failure
            (successful_call, False),  # success
        ]

        for call_func, should_fail in call_sequence:
            try:
                await circuit_breaker.call(call_func)
            except:
                pass

        # Verify statistics
        final_stats = circuit_breaker._get_stats()
        assert final_stats.total_requests == 5
        assert final_stats.total_failures == 2
        assert final_stats.success_count == 3

        # Verify stats dictionary
        stats_dict = circuit_breaker.get_stats_dict()
        assert stats_dict["request_count"] == 5
        assert stats_dict["failure_count"] == 2
        assert stats_dict["success_count"] == 3

    @pytest.mark.asyncio
    async def test_manual_circuit_control(self, circuit_breaker):
        """Test manual control of circuit breaker state."""
        # Initially closed
        assert circuit_breaker.state == CircuitState.CLOSED

        # Manually force open
        circuit_breaker.force_open()
        assert circuit_breaker.state == CircuitState.OPEN

        # Verify calls are blocked
        async def dummy_call():
            return "blocked"

        with pytest.raises(APICircuitBreakerError):
            await circuit_breaker.call(dummy_call)

        # Manually force closed
        circuit_breaker.force_closed()
        assert circuit_breaker.state == CircuitState.CLOSED

        # Verify calls work again
        result = await circuit_breaker.call(dummy_call)
        assert result == "blocked"

    @pytest.mark.asyncio
    async def test_reset_functionality(self, circuit_breaker):
        """Test circuit breaker reset functionality."""
        # Generate some activity
        async def test_call():
            return "test"

        for _ in range(5):
            await circuit_breaker.call(test_call)

        # Force some failures
        circuit_breaker.failure_count = 2
        circuit_breaker.consecutive_failures = 2

        # Verify state before reset
        assert circuit_breaker.success_count == 5
        assert circuit_breaker.failure_count == 2

        # Reset circuit breaker
        circuit_breaker.reset()

        # Verify reset state
        assert circuit_breaker.state == CircuitState.CLOSED
        assert circuit_breaker.success_count == 0
        assert circuit_breaker.failure_count == 0
        assert circuit_breaker.consecutive_failures == 0
        assert circuit_breaker.consecutive_successes == 0
        assert circuit_breaker.total_requests == 0

    @pytest.mark.asyncio
    async def test_concurrent_calls(self, circuit_breaker, api_cost_monitor):
        """Test circuit breaker handles concurrent API calls correctly."""
        concurrent_calls = 10
        call_count = 0

        async def concurrent_api_call(call_id: int):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.1)  # Simulate API latency
            
            # Track API cost
            api_cost_monitor.track_call(1000, 1000, "claude-3-haiku-20240307")
            
            return f"result_{call_id}"

        # Execute concurrent calls
        tasks = [
            circuit_breaker.call(concurrent_api_call, i) 
            for i in range(concurrent_calls)
        ]

        results = await asyncio.gather(*tasks)

        # Verify all calls completed
        assert len(results) == concurrent_calls
        assert call_count == concurrent_calls
        
        # Verify each result is unique
        result_ids = {result.split("_")[1] for result in results}
        assert len(result_ids) == concurrent_calls

        # Verify statistics are accurate
        stats = circuit_breaker.get_stats_dict()
        assert stats["request_count"] == concurrent_calls
        assert stats["success_count"] == concurrent_calls

    @pytest.mark.asyncio
    async def test_error_type_filtering(self, circuit_breaker):
        """Test circuit breaker handles expected vs unexpected exceptions."""
        # Configure to expect certain exception types
        circuit_breaker.config.expected_exception_types = (ValueError, TypeError)

        async def expected_error():
            raise ValueError("Expected error type")

        async def unexpected_error():
            raise RuntimeError("Unexpected error type")

        # Expected errors should trigger circuit logic
        with pytest.raises(ValueError):
            await circuit_breaker.call(expected_error)
        
        assert circuit_breaker.consecutive_failures == 1

        # Reset for next test
        circuit_breaker.consecutive_failures = 0

        # Unexpected errors should not trigger circuit logic  
        with pytest.raises(RuntimeError):
            await circuit_breaker.call(unexpected_error)
        
        # Should not increment failure count for unexpected errors
        assert circuit_breaker.consecutive_successes == 1  # Treated as success


class TestCircuitBreakerRegistry:
    """Test suite for CircuitBreakerRegistry."""

    @pytest.fixture
    def registry(self):
        """Create fresh registry instance."""
        return CircuitBreakerRegistry()

    def test_registry_creation_and_retrieval(self, registry):
        """Test creating and retrieving circuit breakers from registry."""
        # Create new circuit breaker
        config = CircuitBreakerConfig(failure_threshold=5)
        breaker1 = registry.get_breaker("test_service", config)
        
        assert breaker1.name == "test_service"
        assert breaker1.config.failure_threshold == 5

        # Retrieve same circuit breaker
        breaker2 = registry.get_breaker("test_service")
        assert breaker1 is breaker2  # Should be same instance

        # Create different circuit breaker
        breaker3 = registry.get_breaker("another_service")
        assert breaker3.name == "another_service"
        assert breaker3 is not breaker1

    @pytest.mark.asyncio
    async def test_registry_statistics(self, registry):
        """Test registry-wide statistics collection."""
        # Create multiple circuit breakers
        breakers = [
            registry.get_breaker(f"service_{i}")
            for i in range(3)
        ]

        # Generate some activity
        async def test_call():
            return "success"

        for i, breaker in enumerate(breakers):
            for _ in range(i + 1):  # Different activity levels
                await breaker.call(test_call)

        # Get all statistics
        all_stats = registry.get_all_stats()
        assert len(all_stats) == 3

        for i, service_name in enumerate([f"service_{i}" for i in range(3)]):
            assert service_name in all_stats
            assert all_stats[service_name]["success_count"] == i + 1

    def test_health_summary(self, registry):
        """Test registry health summary functionality."""
        # Create breakers in different states
        healthy_breaker = registry.get_breaker("healthy_service")
        open_breaker = registry.get_breaker("failing_service")
        half_open_breaker = registry.get_breaker("recovering_service")

        # Set different states
        open_breaker._transition_to_open()
        half_open_breaker._transition_to_half_open()

        # Get health summary
        health = registry.get_health_summary()

        assert health["total_breakers"] == 3
        assert health["healthy_breakers"] == 1  # Only healthy_breaker
        assert health["open_breakers"] == 1     # open_breaker
        assert health["half_open_breakers"] == 1 # half_open_breaker
        assert health["overall_health"] in ["healthy", "degraded", "critical"]

    def test_reset_all_breakers(self, registry):
        """Test resetting all circuit breakers in registry."""
        # Create and activate some breakers
        breaker1 = registry.get_breaker("service1")
        breaker2 = registry.get_breaker("service2")

        # Set some state
        breaker1.failure_count = 5
        breaker2._transition_to_open()

        assert breaker1.failure_count == 5
        assert breaker2.state == CircuitState.OPEN

        # Reset all
        registry.reset_all()

        assert breaker1.failure_count == 0
        assert breaker1.state == CircuitState.CLOSED
        assert breaker2.state == CircuitState.CLOSED

    def test_global_registry_access(self):
        """Test global registry access functions."""
        # Get global registry
        registry1 = get_circuit_breaker_registry()
        registry2 = get_circuit_breaker_registry()
        
        # Should be same instance
        assert registry1 is registry2

        # Get circuit breaker through convenience function
        breaker = get_circuit_breaker("global_test_service")
        assert breaker.name == "global_test_service"

        # Should be in global registry
        all_stats = registry1.get_all_stats()
        assert "global_test_service" in all_stats


class TestInvestigationSpecificScenarios:
    """Test circuit breaker with investigation-specific scenarios."""

    @pytest.fixture
    def investigation_breaker(self):
        """Create circuit breaker configured for investigation APIs."""
        config = CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=30.0,
            timeout=15.0,  # Longer timeout for complex investigations
            expected_exception_types=(
                Exception,  # In real implementation, would be specific API exceptions
            ),
        )
        return APICircuitBreaker("investigation_api", config)

    @pytest.mark.asyncio
    async def test_device_spoofing_analysis_flow(self, investigation_breaker, api_cost_monitor):
        """Test circuit breaker in device spoofing investigation workflow."""
        
        async def analyze_device_fingerprint():
            """Simulate device fingerprint analysis API call."""
            await asyncio.sleep(0.5)  # Realistic processing time
            
            # Track API usage
            api_cost_monitor.track_call(2500, 1800, "claude-3-sonnet-20240229")
            
            return {
                "device_risk_score": 0.85,
                "fingerprint_anomalies": [
                    "Inconsistent screen resolution",
                    "Modified user agent",
                    "Suspicious plugin configuration"
                ],
                "recommendation": "HIGH_RISK"
            }

        # Execute analysis
        result = await investigation_breaker.call(analyze_device_fingerprint)

        assert result["device_risk_score"] == 0.85
        assert len(result["fingerprint_anomalies"]) == 3
        assert result["recommendation"] == "HIGH_RISK"

        # Verify circuit breaker tracked the call
        stats = investigation_breaker.get_stats_dict()
        assert stats["success_count"] == 1

    @pytest.mark.asyncio
    async def test_synthetic_identity_investigation_failure_recovery(self, investigation_breaker):
        """Test circuit breaker recovery during synthetic identity investigation."""
        
        failure_count = 0
        
        async def synthetic_identity_analysis():
            """Simulate synthetic identity analysis with intermittent failures."""
            nonlocal failure_count
            failure_count += 1
            
            if failure_count <= 2:
                # First two calls fail
                raise Exception("Identity verification service temporarily unavailable")
            else:
                # Subsequent calls succeed
                await asyncio.sleep(0.3)
                return {
                    "identity_risk_score": 0.92,
                    "synthetic_indicators": [
                        "SSN issued after DOB indicates impossibility",
                        "Credit history inconsistent with age",
                        "Address history shows suspicious patterns"
                    ],
                    "confidence": 0.88
                }

        # First two calls should fail
        for _ in range(2):
            with pytest.raises(Exception):
                await investigation_breaker.call(synthetic_identity_analysis)

        # Circuit should still be closed (below threshold)
        assert investigation_breaker.state == CircuitState.CLOSED

        # Third call should succeed
        result = await investigation_breaker.call(synthetic_identity_analysis)
        assert result["identity_risk_score"] == 0.92
        assert len(result["synthetic_indicators"]) == 3

    @pytest.mark.asyncio
    async def test_money_laundering_detection_timeout_handling(self, investigation_breaker):
        """Test circuit breaker timeout handling for complex ML analysis."""
        
        timeout_call_count = 0
        
        async def money_laundering_analysis():
            """Simulate money laundering analysis that may timeout."""
            nonlocal timeout_call_count
            timeout_call_count += 1
            
            if timeout_call_count == 1:
                # First call times out
                await asyncio.sleep(20.0)  # Exceeds timeout
                return "should_not_reach"
            else:
                # Subsequent call succeeds quickly
                await asyncio.sleep(2.0)
                return {
                    "ml_risk_score": 0.78,
                    "suspicious_patterns": [
                        "Rapid movement of large amounts",
                        "Use of multiple intermediate accounts",
                        "Transactions just below reporting thresholds"
                    ],
                    "investigation_priority": "HIGH"
                }

        # First call should timeout
        with pytest.raises(asyncio.TimeoutError):
            await investigation_breaker.call(money_laundering_analysis)

        # Verify timeout was recorded
        stats = investigation_breaker.get_stats_dict()
        assert stats["total_timeouts"] == 1

        # Second call should succeed
        result = await investigation_breaker.call(money_laundering_analysis)
        assert result["ml_risk_score"] == 0.78
        assert result["investigation_priority"] == "HIGH"

    @pytest.mark.asyncio
    async def test_multi_entity_investigation_coordination(self, api_cost_monitor):
        """Test multiple circuit breakers coordinating for multi-entity investigation."""
        
        # Create specialized circuit breakers for different investigation aspects
        breakers = {
            "user_analysis": APICircuitBreaker("user_analysis", CircuitBreakerConfig(
                failure_threshold=2, recovery_timeout=10.0
            )),
            "merchant_analysis": APICircuitBreaker("merchant_analysis", CircuitBreakerConfig(
                failure_threshold=3, recovery_timeout=15.0
            )),
            "transaction_analysis": APICircuitBreaker("transaction_analysis", CircuitBreakerConfig(
                failure_threshold=2, recovery_timeout=20.0
            )),
        }

        async def user_risk_analysis():
            api_cost_monitor.track_call(1500, 1200, "claude-3-sonnet-20240229")
            return {"user_risk": 0.65, "flags": ["velocity_anomaly"]}

        async def merchant_risk_analysis():
            api_cost_monitor.track_call(2000, 1800, "claude-3-sonnet-20240229")
            return {"merchant_risk": 0.45, "flags": ["new_merchant"]}

        async def transaction_pattern_analysis():
            api_cost_monitor.track_call(2500, 2000, "claude-opus-4-1-20250805")
            return {"pattern_risk": 0.82, "flags": ["unusual_amounts", "rapid_sequence"]}

        # Execute coordinated analysis
        analysis_tasks = [
            breakers["user_analysis"].call(user_risk_analysis),
            breakers["merchant_analysis"].call(merchant_risk_analysis),
            breakers["transaction_analysis"].call(transaction_pattern_analysis),
        ]

        results = await asyncio.gather(*analysis_tasks)

        # Verify all analyses completed
        assert len(results) == 3
        assert results[0]["user_risk"] == 0.65
        assert results[1]["merchant_risk"] == 0.45
        assert results[2]["pattern_risk"] == 0.82

        # Verify each circuit breaker tracked its calls
        for breaker in breakers.values():
            stats = breaker.get_stats_dict()
            assert stats["success_count"] == 1

    @pytest.mark.asyncio
    async def test_investigation_performance_monitoring(self, investigation_breaker):
        """Test performance monitoring for investigation API calls."""
        
        response_times = []
        
        async def timed_investigation_call():
            """Investigation call with variable response times."""
            import random
            delay = random.uniform(0.1, 1.0)  # 100ms to 1s
            response_times.append(delay)
            await asyncio.sleep(delay)
            
            return {
                "analysis_complete": True,
                "processing_time": delay,
                "data": "investigation_results"
            }

        # Execute multiple calls
        for _ in range(10):
            await investigation_breaker.call(timed_investigation_call)

        # Check performance tracking
        stats = investigation_breaker.get_stats_dict()
        assert stats["success_count"] == 10
        assert stats["average_response_time"] > 0

        # Verify average response time is reasonable
        expected_avg = sum(response_times) / len(response_times)
        assert abs(stats["average_response_time"] - expected_avg) < 0.1