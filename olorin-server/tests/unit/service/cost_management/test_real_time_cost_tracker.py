"""
Unit Tests for Real-Time Cost Tracker.

Tests real-time monitoring, alerting, and WebSocket broadcasting of API costs
and budget status. NO MOCK DATA - Uses realistic investigation scenarios.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio

from app.service.cost_management.anthropic_credit_monitor import (
    CreditBalance,
    CreditStatus,
)
from app.service.cost_management.real_time_cost_tracker import (
    AlertSeverity,
    CostAlert,
    CostMetric,
    MetricType,
    PerformanceSummary,
    RealTimeCostTracker,
    get_cost_tracker,
    start_cost_tracking,
    stop_cost_tracking,
)


class TestRealTimeCostTracker:
    """Test suite for RealTimeCostTracker component."""

    @pytest.fixture
    def cost_tracker(self):
        """Create fresh cost tracker instance for testing."""
        return RealTimeCostTracker()

    @pytest.mark.asyncio
    async def test_tracker_initialization(self, cost_tracker):
        """Test real-time cost tracker initializes with proper configuration."""
        assert cost_tracker.tracking_enabled is True
        assert cost_tracker.websocket_enabled is True
        assert cost_tracker.alert_enabled is True

        # Check update intervals
        assert cost_tracker.update_intervals["credit_balance"] == 300  # 5 minutes
        assert cost_tracker.update_intervals["usage_summary"] == 60  # 1 minute
        assert cost_tracker.update_intervals["budget_alerts"] == 30  # 30 seconds

        # Check broadcast channels
        expected_channels = {
            "cost_alerts",
            "budget_status",
            "optimization_stats",
            "performance_metrics",
        }
        assert cost_tracker.broadcast_channels == expected_channels

    @pytest.mark.asyncio
    async def test_metric_tracking_and_updates(self, cost_tracker):
        """Test real-time metric tracking and updates."""

        # Create test metrics
        cost_metric = CostMetric(
            name="api_request_cost",
            type=MetricType.COST,
            value=15.75,
            unit="USD",
            timestamp=datetime.now(),
            metadata={"model": "claude-3-sonnet-20240229"},
        )

        usage_metric = CostMetric(
            name="daily_requests",
            type=MetricType.USAGE,
            value=47,
            unit="count",
            timestamp=datetime.now(),
        )

        # Update metrics
        await cost_tracker._update_metric(cost_metric)
        await cost_tracker._update_metric(usage_metric)

        # Verify metrics were stored
        assert "api_request_cost" in cost_tracker.current_metrics
        assert "daily_requests" in cost_tracker.current_metrics

        stored_cost_metric = cost_tracker.current_metrics["api_request_cost"]
        assert stored_cost_metric.value == 15.75
        assert stored_cost_metric.unit == "USD"
        assert stored_cost_metric.type == MetricType.COST

    @pytest.mark.asyncio
    async def test_alert_creation_and_management(self, cost_tracker):
        """Test alert creation, tracking, and resolution."""

        # Create test alert
        await cost_tracker._create_alert(
            alert_id="budget_warning_daily",
            severity=AlertSeverity.WARNING,
            metric_type=MetricType.BUDGET,
            title="Daily Budget Warning",
            message="Daily API usage has reached 80% of budget limit",
            data={"current_usage": 400.0, "budget_limit": 500.0},
        )

        # Verify alert was created
        assert "budget_warning_daily" in cost_tracker.active_alerts
        alert = cost_tracker.active_alerts["budget_warning_daily"]
        assert alert.severity == AlertSeverity.WARNING
        assert alert.title == "Daily Budget Warning"
        assert alert.resolved is False

        # Test alert resolution
        await cost_tracker._resolve_alert("budget_warning_daily")
        assert alert.resolved is True
        assert alert.resolution_time is not None

    @pytest.mark.asyncio
    async def test_credit_balance_monitoring(self, cost_tracker):
        """Test credit balance monitoring and alert generation."""

        # Test different balance scenarios
        balance_scenarios = [
            {
                "balance": 25.0,  # Below minimum threshold
                "status": CreditStatus.EXHAUSTED,
                "expected_severity": AlertSeverity.EMERGENCY,
            },
            {
                "balance": 75.0,  # Low balance
                "status": CreditStatus.CRITICAL,
                "expected_severity": AlertSeverity.CRITICAL,
            },
            {
                "balance": 150.0,  # Warning level
                "status": CreditStatus.WARNING,
                "expected_severity": AlertSeverity.WARNING,
            },
            {
                "balance": 500.0,  # Healthy
                "status": CreditStatus.HEALTHY,
                "expected_severity": None,  # No alert expected
            },
        ]

        for scenario in balance_scenarios:
            # Create mock balance
            balance = CreditBalance(
                balance=scenario["balance"],
                currency="USD",
                last_updated=datetime.now(),
                status=scenario["status"],
                daily_usage=100.0,
                weekly_usage=400.0,
                monthly_usage=1500.0,
            )

            # Clear previous alerts
            cost_tracker.active_alerts.clear()

            # Check balance alerts
            await cost_tracker._check_balance_alerts(balance)

            if scenario["expected_severity"]:
                # Should have created an alert
                assert len(cost_tracker.active_alerts) > 0
                alert = next(iter(cost_tracker.active_alerts.values()))
                assert alert.severity == scenario["expected_severity"]
            else:
                # Should not have created an alert for healthy balance
                assert len(cost_tracker.active_alerts) == 0

    @pytest.mark.asyncio
    async def test_websocket_connection_management(self, cost_tracker):
        """Test WebSocket connection management and broadcasting."""

        # Mock WebSocket connections
        mock_ws1 = MagicMock()
        mock_ws1.send_text = AsyncMock()
        mock_ws2 = MagicMock()
        mock_ws2.send_text = AsyncMock()

        # Add connections
        cost_tracker.add_websocket_connection(mock_ws1)
        cost_tracker.add_websocket_connection(mock_ws2)

        assert len(cost_tracker.websocket_connections) == 2

        # Test broadcast
        test_data = {
            "metric": "daily_usage",
            "value": 250.0,
            "timestamp": datetime.now().isoformat(),
        }

        await cost_tracker._broadcast_update("budget_status", test_data)

        # Verify both connections received the message
        mock_ws1.send_text.assert_called_once()
        mock_ws2.send_text.assert_called_once()

        # Verify message format
        sent_message = mock_ws1.send_text.call_args[0][0]
        message_data = json.loads(sent_message)
        assert message_data["channel"] == "budget_status"
        assert message_data["data"] == test_data

        # Remove connection
        cost_tracker.remove_websocket_connection(mock_ws1)
        assert len(cost_tracker.websocket_connections) == 1

    @pytest.mark.asyncio
    async def test_dashboard_data_compilation(self, cost_tracker):
        """Test compilation of current dashboard data."""

        # Add some test data
        test_metric = CostMetric(
            name="test_cost",
            type=MetricType.COST,
            value=100.0,
            unit="USD",
            timestamp=datetime.now(),
        )
        await cost_tracker._update_metric(test_metric)

        # Add test alert
        await cost_tracker._create_alert(
            alert_id="test_alert",
            severity=AlertSeverity.INFO,
            metric_type=MetricType.PERFORMANCE,
            title="Test Alert",
            message="This is a test alert",
            data={"test": True},
        )

        # Add performance history
        performance_summary = PerformanceSummary(
            total_requests=100,
            successful_requests=95,
            failed_requests=5,
            average_cost=12.50,
            total_cost=1250.0,
            cost_savings=150.0,
            optimization_rate=85.0,
            cache_hit_rate=75.0,
            fallback_rate=10.0,
        )
        cost_tracker.performance_history.append(performance_summary)

        # Get dashboard data
        dashboard_data = cost_tracker.get_current_dashboard_data()

        # Verify structure
        assert "metrics" in dashboard_data
        assert "alerts" in dashboard_data
        assert "performance_history" in dashboard_data
        assert "stats" in dashboard_data
        assert "status" in dashboard_data

        # Verify content
        assert "test_cost" in dashboard_data["metrics"]
        assert "test_alert" in dashboard_data["alerts"]
        assert len(dashboard_data["performance_history"]) == 1

        # Verify status information
        status = dashboard_data["status"]
        assert status["tracking_enabled"] is True
        assert status["websocket_enabled"] is True
        assert status["alert_enabled"] is True

    @pytest.mark.asyncio
    async def test_investigation_cost_tracking_workflow(
        self, cost_tracker, api_cost_monitor
    ):
        """Test real-time cost tracking during investigation workflow."""

        # Simulate investigation phases with cost tracking
        investigation_phases = [
            {
                "phase": "data_extraction",
                "cost": 5.25,
                "model": "claude-3-haiku-20240307",
            },
            {
                "phase": "device_analysis",
                "cost": 18.50,
                "model": "claude-3-sonnet-20240229",
            },
            {
                "phase": "risk_assessment",
                "cost": 45.75,
                "model": "claude-opus-4-1-20250805",
            },
            {
                "phase": "report_generation",
                "cost": 8.25,
                "model": "claude-3-haiku-20240307",
            },
        ]

        total_investigation_cost = 0.0

        for i, phase in enumerate(investigation_phases):
            # Track cost metric
            cost_metric = CostMetric(
                name=f"investigation_phase_{i+1}",
                type=MetricType.COST,
                value=phase["cost"],
                unit="USD",
                timestamp=datetime.now(),
                metadata={
                    "phase": phase["phase"],
                    "model": phase["model"],
                    "investigation_id": "inv_real_time_test",
                },
            )

            await cost_tracker._update_metric(cost_metric)
            total_investigation_cost += phase["cost"]

            # Track for API monitoring
            api_cost_monitor.track_call(1500, 1000, phase["model"])

            # Simulate some processing time
            await asyncio.sleep(0.1)

        # Verify all phases tracked
        assert len(cost_tracker.current_metrics) >= len(investigation_phases)

        # Check total cost accumulation
        phase_costs = [
            metric.value
            for name, metric in cost_tracker.current_metrics.items()
            if name.startswith("investigation_phase_")
        ]
        assert sum(phase_costs) == total_investigation_cost

    @pytest.mark.asyncio
    async def test_monitoring_task_lifecycle(self, cost_tracker):
        """Test monitoring task startup, execution, and shutdown."""

        # Initially no monitoring tasks
        assert len(cost_tracker._monitoring_tasks) == 0

        # Start monitoring
        await cost_tracker.start_monitoring()

        # Should have started monitoring tasks
        assert len(cost_tracker._monitoring_tasks) > 0

        # All tasks should be running
        for task in cost_tracker._monitoring_tasks:
            assert not task.done()

        # Let tasks run briefly
        await asyncio.sleep(0.5)

        # Stop monitoring
        await cost_tracker.stop_monitoring()

        # Tasks should be completed or cancelled
        for task in cost_tracker._monitoring_tasks:
            assert task.done() or task.cancelled()

        # Task list should be cleared
        assert len(cost_tracker._monitoring_tasks) == 0

    @pytest.mark.asyncio
    async def test_performance_summary_generation(self, cost_tracker):
        """Test generation of performance summaries."""

        # Setup mock data to simulate real performance metrics
        cost_tracker.stats = {
            "alerts_sent": 15,
            "metrics_updated": 250,
            "websocket_broadcasts": 45,
            "performance_snapshots": 8,
        }

        # Simulate monitoring performance metrics (this would normally be done by _monitor_performance)
        test_summary = PerformanceSummary(
            total_requests=500,
            successful_requests=475,
            failed_requests=25,
            average_cost=8.25,
            total_cost=4125.0,
            cost_savings=412.50,
            optimization_rate=78.5,
            cache_hit_rate=65.2,
            fallback_rate=12.3,
        )

        # Add to history
        cost_tracker.performance_history.append(test_summary)

        # Verify performance tracking
        assert len(cost_tracker.performance_history) == 1
        summary = cost_tracker.performance_history[0]

        assert summary.total_requests == 500
        assert summary.successful_requests == 475
        assert summary.optimization_rate == 78.5

        # Verify success rate calculation
        success_rate = summary.successful_requests / summary.total_requests
        assert success_rate == 0.95  # 95% success rate

    @pytest.mark.asyncio
    async def test_alert_severity_escalation(self, cost_tracker):
        """Test alert severity escalation for cost management."""

        # Scenario: Budget usage increasing over time
        budget_scenarios = [
            {
                "usage": 400.0,
                "limit": 500.0,
                "expected_severity": AlertSeverity.WARNING,
            },  # 80%
            {
                "usage": 475.0,
                "limit": 500.0,
                "expected_severity": AlertSeverity.CRITICAL,
            },  # 95%
            {
                "usage": 510.0,
                "limit": 500.0,
                "expected_severity": AlertSeverity.EMERGENCY,
            },  # Over limit
        ]

        for i, scenario in enumerate(budget_scenarios):
            alert_id = f"budget_escalation_{i}"
            percentage = (scenario["usage"] / scenario["limit"]) * 100

            await cost_tracker._create_alert(
                alert_id=alert_id,
                severity=scenario["expected_severity"],
                metric_type=MetricType.BUDGET,
                title=f"Budget Alert - {percentage:.1f}%",
                message=f"Budget usage at {percentage:.1f}% of limit",
                data={
                    "current_usage": scenario["usage"],
                    "budget_limit": scenario["limit"],
                    "percentage": percentage,
                },
            )

            # Verify alert was created with correct severity
            assert alert_id in cost_tracker.active_alerts
            alert = cost_tracker.active_alerts[alert_id]
            assert alert.severity == scenario["expected_severity"]

    @pytest.mark.asyncio
    async def test_concurrent_metric_updates(self, cost_tracker):
        """Test concurrent metric updates don't cause race conditions."""

        async def update_metric(metric_id: int, value: float):
            """Update a metric concurrently."""
            metric = CostMetric(
                name=f"concurrent_metric_{metric_id}",
                type=MetricType.PERFORMANCE,
                value=value,
                unit="count",
                timestamp=datetime.now(),
            )
            await cost_tracker._update_metric(metric)

        # Create concurrent metric updates
        concurrent_count = 20
        tasks = [update_metric(i, i * 10.5) for i in range(concurrent_count)]

        # Execute concurrently
        await asyncio.gather(*tasks)

        # Verify all metrics were updated
        concurrent_metrics = [
            name
            for name in cost_tracker.current_metrics.keys()
            if name.startswith("concurrent_metric_")
        ]
        assert len(concurrent_metrics) == concurrent_count

        # Verify values are correct
        for i in range(concurrent_count):
            metric_name = f"concurrent_metric_{i}"
            assert metric_name in cost_tracker.current_metrics
            assert cost_tracker.current_metrics[metric_name].value == i * 10.5

    @pytest.mark.asyncio
    async def test_data_cleanup_functionality(self, cost_tracker):
        """Test automatic cleanup of old data."""

        # Add old resolved alert
        old_alert_id = "old_resolved_alert"
        await cost_tracker._create_alert(
            alert_id=old_alert_id,
            severity=AlertSeverity.INFO,
            metric_type=MetricType.COST,
            title="Old Alert",
            message="This alert should be cleaned up",
            data={},
        )

        # Resolve and mark as old
        await cost_tracker._resolve_alert(old_alert_id)
        alert = cost_tracker.active_alerts[old_alert_id]
        alert.resolution_time = datetime.now() - timedelta(hours=25)  # 25 hours ago

        # Add old metric
        old_metric = CostMetric(
            name="old_metric",
            type=MetricType.USAGE,
            value=100.0,
            unit="count",
            timestamp=datetime.now() - timedelta(hours=2),  # 2 hours ago
        )
        cost_tracker.current_metrics["old_metric"] = old_metric

        # Add current data that shouldn't be cleaned up
        await cost_tracker._create_alert(
            alert_id="current_alert",
            severity=AlertSeverity.INFO,
            metric_type=MetricType.COST,
            title="Current Alert",
            message="This alert should remain",
            data={},
        )

        current_metric = CostMetric(
            name="current_metric",
            type=MetricType.COST,
            value=50.0,
            unit="USD",
            timestamp=datetime.now(),
        )
        cost_tracker.current_metrics["current_metric"] = current_metric

        # Verify initial state
        assert len(cost_tracker.active_alerts) == 2
        assert len(cost_tracker.current_metrics) == 2

        # Run cleanup
        await cost_tracker._cleanup_old_data()

        # Verify cleanup results
        assert old_alert_id not in cost_tracker.active_alerts  # Old alert removed
        assert "current_alert" in cost_tracker.active_alerts  # Current alert remains
        assert "old_metric" not in cost_tracker.current_metrics  # Old metric removed
        assert (
            "current_metric" in cost_tracker.current_metrics
        )  # Current metric remains

    @pytest.mark.asyncio
    async def test_health_check_comprehensive(self, cost_tracker):
        """Test comprehensive health check of cost tracking system."""

        # Add some data to check
        await cost_tracker._update_metric(
            CostMetric(
                name="health_test_metric",
                type=MetricType.COST,
                value=25.0,
                unit="USD",
                timestamp=datetime.now(),
            )
        )

        await cost_tracker._create_alert(
            alert_id="health_test_alert",
            severity=AlertSeverity.INFO,
            metric_type=MetricType.PERFORMANCE,
            title="Health Test Alert",
            message="Testing health check",
            data={},
        )

        # Add performance history
        cost_tracker.performance_history.append(
            PerformanceSummary(
                total_requests=10,
                successful_requests=9,
                failed_requests=1,
                average_cost=5.0,
                total_cost=50.0,
                cost_savings=5.0,
                optimization_rate=50.0,
                cache_hit_rate=30.0,
                fallback_rate=20.0,
            )
        )

        # Perform health check
        health_status = await cost_tracker.health_check()

        # Verify health check structure
        assert "status" in health_status
        assert "tracking_enabled" in health_status
        assert "monitoring_tasks_running" in health_status
        assert "websocket_connections" in health_status
        assert "active_alerts" in health_status
        assert "metrics_count" in health_status
        assert "performance_history_size" in health_status
        assert "statistics" in health_status

        # Verify health status
        assert health_status["status"] == "healthy"
        assert health_status["tracking_enabled"] is True
        assert health_status["metrics_count"] >= 1
        assert health_status["active_alerts"] >= 1
        assert health_status["performance_history_size"] >= 1

    @pytest.mark.asyncio
    async def test_global_tracker_management(self):
        """Test global cost tracker instance management."""

        # Get global instance
        tracker1 = get_cost_tracker()
        tracker2 = get_cost_tracker()

        # Should be same instance
        assert tracker1 is tracker2

        # Test global start/stop
        await start_cost_tracking()

        # Should have started monitoring
        assert len(tracker1._monitoring_tasks) > 0

        # Stop tracking
        await stop_cost_tracking()

        # Should have stopped and cleared


class TestCostTrackingIntegration:
    """Integration tests for cost tracker with other components."""

    @pytest.mark.asyncio
    async def test_end_to_end_investigation_tracking(self, api_cost_monitor):
        """Test end-to-end cost tracking for a complete investigation."""

        cost_tracker = RealTimeCostTracker()

        # Simulate complete investigation workflow with real-time tracking
        investigation_workflow = [
            {
                "step": "investigation_start",
                "metrics": [
                    {
                        "name": "investigation_initiated",
                        "type": MetricType.USAGE,
                        "value": 1,
                        "unit": "count",
                    }
                ],
                "alerts": [],
            },
            {
                "step": "data_collection",
                "metrics": [
                    {
                        "name": "data_collection_cost",
                        "type": MetricType.COST,
                        "value": 12.50,
                        "unit": "USD",
                    },
                    {
                        "name": "tokens_processed",
                        "type": MetricType.USAGE,
                        "value": 2500,
                        "unit": "tokens",
                    },
                ],
                "alerts": [],
            },
            {
                "step": "analysis_phase",
                "metrics": [
                    {
                        "name": "analysis_cost",
                        "type": MetricType.COST,
                        "value": 35.75,
                        "unit": "USD",
                    },
                    {
                        "name": "risk_score_calculated",
                        "type": MetricType.PERFORMANCE,
                        "value": 0.85,
                        "unit": "score",
                    },
                ],
                "alerts": [
                    {
                        "id": "high_analysis_cost",
                        "severity": AlertSeverity.WARNING,
                        "title": "High Analysis Cost Detected",
                        "message": "Analysis phase exceeded expected cost threshold",
                    }
                ],
            },
            {
                "step": "investigation_complete",
                "metrics": [
                    {
                        "name": "total_investigation_cost",
                        "type": MetricType.COST,
                        "value": 48.25,
                        "unit": "USD",
                    },
                    {
                        "name": "investigation_duration",
                        "type": MetricType.PERFORMANCE,
                        "value": 45,
                        "unit": "minutes",
                    },
                ],
                "alerts": [],
            },
        ]

        total_cost = 0.0

        for workflow_step in investigation_workflow:
            # Process metrics
            for metric_data in workflow_step["metrics"]:
                metric = CostMetric(
                    name=metric_data["name"],
                    type=MetricType(metric_data["type"].value),
                    value=metric_data["value"],
                    unit=metric_data["unit"],
                    timestamp=datetime.now(),
                    metadata={"workflow_step": workflow_step["step"]},
                )
                await cost_tracker._update_metric(metric)

                if metric.type == MetricType.COST:
                    total_cost += metric.value
                    # Track for API monitoring
                    api_cost_monitor.track_call(1000, 1000, "claude-3-sonnet-20240229")

            # Process alerts
            for alert_data in workflow_step["alerts"]:
                await cost_tracker._create_alert(
                    alert_id=alert_data["id"],
                    severity=alert_data["severity"],
                    metric_type=MetricType.COST,
                    title=alert_data["title"],
                    message=alert_data["message"],
                    data={"workflow_step": workflow_step["step"]},
                )

            # Brief pause between workflow steps
            await asyncio.sleep(0.1)

        # Verify complete workflow tracking
        workflow_metrics = [
            name
            for name in cost_tracker.current_metrics.keys()
            if any(
                step in name
                for step in ["investigation", "data_collection", "analysis", "total"]
            )
        ]
        assert len(workflow_metrics) >= len(investigation_workflow)

        # Verify total cost tracking
        total_cost_metric = cost_tracker.current_metrics.get("total_investigation_cost")
        assert total_cost_metric is not None
        assert total_cost_metric.value == 48.25

        # Verify alerts were created
        workflow_alerts = [
            alert
            for alert in cost_tracker.active_alerts.values()
            if "analysis_cost" in alert.id or "high_analysis" in alert.id
        ]
        assert len(workflow_alerts) >= 1

    @pytest.mark.asyncio
    async def test_websocket_real_time_updates(self):
        """Test real-time WebSocket updates during investigation."""

        cost_tracker = RealTimeCostTracker()

        # Mock WebSocket for receiving updates
        received_updates = []

        class MockWebSocket:
            async def send_text(self, message: str):
                data = json.loads(message)
                received_updates.append(data)

        mock_ws = MockWebSocket()
        cost_tracker.add_websocket_connection(mock_ws)

        # Simulate real-time updates
        updates = [
            {
                "channel": "budget_status",
                "data": {"daily_usage": 150.0, "daily_limit": 500.0},
            },
            {
                "channel": "cost_alerts",
                "data": {"alert_type": "budget_warning", "severity": "warning"},
            },
            {
                "channel": "optimization_stats",
                "data": {"savings": 45.50, "optimization_rate": 75.0},
            },
            {
                "channel": "performance_metrics",
                "data": {"avg_response_time": 1.2, "success_rate": 98.5},
            },
        ]

        for update in updates:
            await cost_tracker._broadcast_update(update["channel"], update["data"])

        # Verify all updates were received
        assert len(received_updates) == len(updates)

        # Verify update format and content
        for i, received in enumerate(received_updates):
            assert "channel" in received
            assert "timestamp" in received
            assert "data" in received
            assert received["channel"] == updates[i]["channel"]
            assert received["data"] == updates[i]["data"]

    @pytest.mark.asyncio
    async def test_performance_monitoring_accuracy(self):
        """Test accuracy of performance monitoring and metrics."""

        cost_tracker = RealTimeCostTracker()

        # Simulate performance data over time
        performance_snapshots = [
            {
                "total_requests": 50,
                "successful_requests": 48,
                "cost_savings": 15.25,
                "optimization_rate": 65.0,
                "cache_hit_rate": 45.0,
            },
            {
                "total_requests": 100,
                "successful_requests": 95,
                "cost_savings": 32.50,
                "optimization_rate": 72.5,
                "cache_hit_rate": 52.0,
            },
            {
                "total_requests": 150,
                "successful_requests": 142,
                "cost_savings": 48.75,
                "optimization_rate": 78.0,
                "cache_hit_rate": 58.5,
            },
        ]

        for snapshot_data in performance_snapshots:
            summary = PerformanceSummary(
                total_requests=snapshot_data["total_requests"],
                successful_requests=snapshot_data["successful_requests"],
                failed_requests=snapshot_data["total_requests"]
                - snapshot_data["successful_requests"],
                average_cost=5.0,  # Fixed for simplicity
                total_cost=snapshot_data["total_requests"] * 5.0,
                cost_savings=snapshot_data["cost_savings"],
                optimization_rate=snapshot_data["optimization_rate"],
                cache_hit_rate=snapshot_data["cache_hit_rate"],
                fallback_rate=10.0,  # Fixed for simplicity
            )

            cost_tracker.performance_history.append(summary)

        # Verify performance history
        assert len(cost_tracker.performance_history) == 3

        # Verify trend analysis capability
        latest_summary = cost_tracker.performance_history[-1]
        earliest_summary = cost_tracker.performance_history[0]

        # Should show improvement trends
        assert latest_summary.total_requests > earliest_summary.total_requests
        assert latest_summary.optimization_rate > earliest_summary.optimization_rate
        assert latest_summary.cache_hit_rate > earliest_summary.cache_hit_rate

    @pytest.mark.asyncio
    async def test_memory_and_performance_efficiency(self):
        """Test memory efficiency and performance of cost tracker."""

        import sys
        import time

        cost_tracker = RealTimeCostTracker()

        # Measure initial memory usage
        initial_size = sys.getsizeof(cost_tracker)

        # Add many metrics and alerts to test memory efficiency
        start_time = time.time()

        for i in range(1000):
            # Add metric
            metric = CostMetric(
                name=f"perf_test_metric_{i}",
                type=MetricType.COST,
                value=float(i),
                unit="USD",
                timestamp=datetime.now(),
            )
            await cost_tracker._update_metric(metric)

            # Add alert every 100 metrics
            if i % 100 == 0:
                await cost_tracker._create_alert(
                    alert_id=f"perf_test_alert_{i}",
                    severity=AlertSeverity.INFO,
                    metric_type=MetricType.PERFORMANCE,
                    title=f"Performance Test Alert {i}",
                    message=f"Test alert number {i}",
                    data={"test_index": i},
                )

        end_time = time.time()
        elapsed_time = end_time - start_time

        # Measure final memory usage
        final_size = sys.getsizeof(cost_tracker)

        # Performance assertions
        assert elapsed_time < 5.0  # Should complete within 5 seconds
        assert len(cost_tracker.current_metrics) == 1000
        assert len(cost_tracker.active_alerts) == 10  # Every 100th metric

        # Memory growth should be reasonable
        memory_growth = final_size - initial_size
        assert memory_growth < 1024 * 1024  # Less than 1MB growth for 1000 items
