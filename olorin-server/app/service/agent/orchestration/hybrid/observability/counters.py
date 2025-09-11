"""
Observability Counters for Hybrid Intelligence Graph

Provides production monitoring counters to track system behavior,
performance metrics, and the effectiveness of Week 0 hotfixes.
"""

import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from collections import defaultdict, deque
from threading import Lock

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class CounterSnapshot:
    """Point-in-time snapshot of counter values."""
    timestamp: datetime
    counter_name: str
    value: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CounterStats:
    """Statistical summary of counter behavior."""
    total: int
    rate_per_minute: float
    rate_per_hour: float
    peak_rate: float
    last_updated: datetime
    samples_count: int


class ObservabilityCounter:
    """
    Thread-safe counter with rate tracking and statistical analysis.
    
    Features:
    - Thread-safe increment/decrement operations
    - Rate calculation (per minute, per hour)
    - Peak rate tracking
    - Historical snapshots for trending analysis
    - Metadata attachment for contextual information
    """
    
    def __init__(self, name: str, window_minutes: int = 60):
        """
        Initialize observability counter.
        
        Args:
            name: Counter identifier
            window_minutes: Rolling window for rate calculations
        """
        self.name = name
        self.window_minutes = window_minutes
        self._value = 0
        self._lock = Lock()
        
        # Rate tracking with sliding window
        self._timestamps = deque()
        self._peak_rate = 0.0
        self._last_rate_calculation = time.time()
        
        # Historical snapshots (last 24 hours)
        self._snapshots = deque(maxlen=1440)  # 1 per minute for 24 hours
        self._last_snapshot = time.time()
    
    def increment(self, amount: int = 1, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Increment counter value.
        
        Args:
            amount: Amount to increment by
            metadata: Optional contextual information
        """
        with self._lock:
            self._value += amount
            current_time = time.time()
            self._timestamps.append(current_time)
            
            # Take snapshot if needed (every minute)
            if current_time - self._last_snapshot >= 60:
                self._take_snapshot(metadata or {})
                self._last_snapshot = current_time
            
            # Clean old timestamps outside window
            cutoff = current_time - (self.window_minutes * 60)
            while self._timestamps and self._timestamps[0] < cutoff:
                self._timestamps.popleft()
            
            # Update peak rate
            current_rate = self._calculate_current_rate()
            if current_rate > self._peak_rate:
                self._peak_rate = current_rate
    
    def decrement(self, amount: int = 1) -> None:
        """Decrement counter value."""
        with self._lock:
            self._value = max(0, self._value - amount)
    
    def get_value(self) -> int:
        """Get current counter value."""
        return self._value
    
    def get_rate_per_minute(self) -> float:
        """Get current rate per minute."""
        with self._lock:
            return self._calculate_current_rate()
    
    def get_rate_per_hour(self) -> float:
        """Get current rate per hour."""
        return self.get_rate_per_minute() * 60
    
    def get_stats(self) -> CounterStats:
        """Get comprehensive counter statistics."""
        with self._lock:
            return CounterStats(
                total=self._value,
                rate_per_minute=self._calculate_current_rate(),
                rate_per_hour=self._calculate_current_rate() * 60,
                peak_rate=self._peak_rate,
                last_updated=datetime.now(),
                samples_count=len(self._timestamps)
            )
    
    def get_snapshots(self, last_hours: int = 1) -> List[CounterSnapshot]:
        """Get historical snapshots for the specified time period."""
        cutoff = datetime.now() - timedelta(hours=last_hours)
        return [s for s in self._snapshots if s.timestamp >= cutoff]
    
    def reset(self) -> None:
        """Reset counter to zero."""
        with self._lock:
            self._value = 0
            self._timestamps.clear()
            self._peak_rate = 0.0
            self._snapshots.clear()
    
    def _calculate_current_rate(self) -> float:
        """Calculate current rate per minute (internal method)."""
        if not self._timestamps:
            return 0.0
        
        # Count events in last minute
        current_time = time.time()
        cutoff = current_time - 60  # Last minute
        recent_events = sum(1 for ts in self._timestamps if ts >= cutoff)
        
        return float(recent_events)
    
    def _take_snapshot(self, metadata: Dict[str, Any]) -> None:
        """Take a point-in-time snapshot (internal method)."""
        snapshot = CounterSnapshot(
            timestamp=datetime.now(),
            counter_name=self.name,
            value=self._value,
            metadata=metadata.copy()
        )
        self._snapshots.append(snapshot)


class ObservabilityRegistry:
    """
    Central registry for all observability counters.
    
    Provides centralized management, bulk operations, and
    dashboard-style reporting for all system counters.
    """
    
    def __init__(self):
        """Initialize the observability registry."""
        self._counters: Dict[str, ObservabilityCounter] = {}
        self._lock = Lock()
        
        # Initialize core system counters
        self._initialize_core_counters()
    
    def _initialize_core_counters(self) -> None:
        """Initialize core system monitoring counters."""
        core_counters = [
            # Graph Selection Metrics (Week 0 Hotfix)
            "graph_selection_attempts",
            "graph_selection_failures", 
            "graph_selection_fallbacks",
            "graph_selection_typed_errors",
            
            # Context Propagation Metrics (Week 0 Hotfix)
            "context_propagation_successes",
            "entity_drift_detections",
            "entity_validation_failures",
            "tool_context_creations",
            
            # Safety Management Metrics (Week 0 Hotfix)  
            "graceful_finalization_triggers",
            "hard_termination_triggers",
            "budget_threshold_breaches",
            "domain_coverage_checks",
            
            # Async Client Metrics (Week 0 Hotfix)
            "async_sessions_created",
            "async_sessions_cleaned",
            "session_cleanup_failures",
            "registry_initialization_calls",
            
            # General Investigation Metrics
            "investigation_starts",
            "investigation_completions", 
            "investigation_failures",
            "tool_executions",
            "orchestrator_loops",
            "ai_confidence_calculations",
            
            # Performance Metrics
            "response_times_ms",
            "memory_usage_mb",
            "cpu_utilization_percent"
        ]
        
        for counter_name in core_counters:
            self._counters[counter_name] = ObservabilityCounter(counter_name)
        
        logger.info(f"📊 Initialized {len(core_counters)} observability counters")
    
    def get_counter(self, name: str) -> ObservabilityCounter:
        """Get or create a counter by name."""
        with self._lock:
            if name not in self._counters:
                self._counters[name] = ObservabilityCounter(name)
                logger.debug(f"📊 Created new counter: {name}")
            return self._counters[name]
    
    def increment(self, counter_name: str, amount: int = 1, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Increment a counter by name."""
        counter = self.get_counter(counter_name)
        counter.increment(amount, metadata)
    
    def get_all_stats(self) -> Dict[str, CounterStats]:
        """Get statistics for all counters."""
        with self._lock:
            return {name: counter.get_stats() for name, counter in self._counters.items()}
    
    def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get a dashboard-friendly summary of key metrics."""
        stats = self.get_all_stats()
        
        # Week 0 Hotfix Effectiveness
        hotfix_metrics = {
            "graph_selection": {
                "attempts": stats.get("graph_selection_attempts", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "failures": stats.get("graph_selection_failures", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "fallbacks": stats.get("graph_selection_fallbacks", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "success_rate": self._calculate_success_rate("graph_selection_attempts", "graph_selection_failures")
            },
            "context_propagation": {
                "successes": stats.get("context_propagation_successes", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "entity_drifts": stats.get("entity_drift_detections", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "validation_failures": stats.get("entity_validation_failures", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total
            },
            "safety_management": {
                "graceful_finalizations": stats.get("graceful_finalization_triggers", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "hard_terminations": stats.get("hard_termination_triggers", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "budget_breaches": stats.get("budget_threshold_breaches", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total
            },
            "async_clients": {
                "sessions_created": stats.get("async_sessions_created", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "sessions_cleaned": stats.get("async_sessions_cleaned", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "cleanup_failures": stats.get("session_cleanup_failures", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total
            }
        }
        
        # System Health
        system_health = {
            "investigations": {
                "starts": stats.get("investigation_starts", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "completions": stats.get("investigation_completions", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "completion_rate": self._calculate_success_rate("investigation_starts", "investigation_failures")
            },
            "performance": {
                "tool_executions": stats.get("tool_executions", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "orchestrator_loops": stats.get("orchestrator_loops", CounterStats(0, 0, 0, 0, datetime.now(), 0)).total,
                "avg_response_time": stats.get("response_times_ms", CounterStats(0, 0, 0, 0, datetime.now(), 0)).rate_per_minute
            }
        }
        
        return {
            "timestamp": datetime.now().isoformat(),
            "hotfix_effectiveness": hotfix_metrics,
            "system_health": system_health,
            "total_counters": len(self._counters),
            "active_counters": len([s for s in stats.values() if s.total > 0])
        }
    
    def _calculate_success_rate(self, attempts_counter: str, failures_counter: str) -> float:
        """Calculate success rate percentage."""
        attempts = self._counters.get(attempts_counter, ObservabilityCounter("temp")).get_value()
        failures = self._counters.get(failures_counter, ObservabilityCounter("temp")).get_value()
        
        if attempts == 0:
            return 100.0
        
        successes = attempts - failures
        return (successes / attempts) * 100.0
    
    def reset_all_counters(self) -> None:
        """Reset all counters (use with caution)."""
        with self._lock:
            for counter in self._counters.values():
                counter.reset()
        logger.warning("🔄 All observability counters have been reset")
    
    def export_metrics(self, format_type: str = "json") -> str:
        """Export metrics in various formats."""
        dashboard = self.get_dashboard_summary()
        
        if format_type == "json":
            import json
            return json.dumps(dashboard, indent=2, default=str)
        elif format_type == "prometheus":
            # Basic Prometheus format
            lines = []
            for category, metrics in dashboard["hotfix_effectiveness"].items():
                for metric_name, value in metrics.items():
                    if isinstance(value, (int, float)):
                        lines.append(f"olorin_{category}_{metric_name} {value}")
            return "\n".join(lines)
        else:
            return str(dashboard)


# Global registry instance
_observability_registry: Optional[ObservabilityRegistry] = None


def get_observability_registry() -> ObservabilityRegistry:
    """Get the global observability registry instance."""
    global _observability_registry
    if _observability_registry is None:
        _observability_registry = ObservabilityRegistry()
    return _observability_registry


def increment_counter(name: str, amount: int = 1, metadata: Optional[Dict[str, Any]] = None) -> None:
    """Convenience function to increment a counter."""
    registry = get_observability_registry()
    registry.increment(name, amount, metadata)


def get_counter_stats(name: str) -> CounterStats:
    """Convenience function to get counter statistics."""
    registry = get_observability_registry()
    return registry.get_counter(name).get_stats()


def get_dashboard_summary() -> Dict[str, Any]:
    """Convenience function to get dashboard summary."""
    registry = get_observability_registry()
    return registry.get_dashboard_summary()