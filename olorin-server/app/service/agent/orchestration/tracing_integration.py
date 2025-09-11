"""
Performance Tracing Integration - Complete tracing for performance analysis.

This module implements Phase 3 of the LangGraph enhancement plan, providing:
- Complete investigation execution visibility
- Performance bottleneck identification
- Agent execution analysis
- Automatic optimization recommendations
"""

import time
import os
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from dataclasses import dataclass, field
from contextlib import asynccontextmanager
import functools

from langchain_core.runnables import RunnableConfig
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.base import BaseCallbackHandler
from app.service.logging import get_bridge_logger

# Simple trace decorator for performance monitoring
def trace(func):
    """Simple trace decorator that passes through the function unchanged."""
    return func

logger = get_bridge_logger(__name__)


@dataclass
class TraceMetrics:
    """Metrics collected during trace execution."""
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    agent_metrics: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    tool_metrics: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    error_count: int = 0
    retry_count: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    
    def finalize(self):
        """Calculate final metrics."""
        if self.end_time is None:
            self.end_time = time.time()
        self.duration = self.end_time - self.start_time


class TracedInvestigationGraph:
    """Investigation graph with complete performance tracing integration."""
    
    def __init__(self, graph_builder_func: Callable, project: Optional[str] = None):
        """
        Initialize traced investigation graph.
        
        Args:
            graph_builder_func: Function to build the graph
            project: Optional project name for tracing
        """
        self.graph_builder_func = graph_builder_func
        self.project = project or os.getenv("TRACING_PROJECT", "olorin-investigations")
        self.metrics_collector = MetricsCollector()
        logger.info(f"✅ Performance tracing initialized for project: {self.project}")
        
    @trace
    async def execute_investigation(self, input_data: Dict[str, Any], config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        """
        Execute investigation with full tracing.
        
        Args:
            input_data: Investigation input data
            config: Runtime configuration
            
        Returns:
            Investigation results with trace metadata
        """
        # Start metrics collection
        trace_id = f"inv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        metrics = TraceMetrics(start_time=time.time())
        
        # Create traced config
        traced_config = self._create_traced_config(config, trace_id)
        
        try:
            # Build graph with tracing
            graph = await self.graph_builder_func()
            
            # Execute with tracing
            result = await self._execute_with_tracing(
                graph,
                input_data,
                traced_config,
                metrics
            )
            
            # Finalize metrics
            metrics.finalize()
            
            # Get optimization recommendations
            recommendations = self._get_optimization_recommendations(metrics)
            
            # Add trace metadata to result
            result["trace_metadata"] = {
                "trace_id": trace_id,
                "duration": metrics.duration,
                "agent_count": len(metrics.agent_metrics),
                "tool_calls": sum(m.get("calls", 0) for m in metrics.tool_metrics.values()),
                "recommendations": recommendations
            }
            
            # Log performance metrics
            self._log_performance_metrics(trace_id, metrics, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Investigation failed with tracing: {e}")
            metrics.error_count += 1
            metrics.finalize()
            
            # Log error metrics
            self._log_error_metrics(trace_id, e, metrics)
            
            raise
    
    def _create_traced_config(self, config: Optional[RunnableConfig], trace_id: str) -> RunnableConfig:
        """Create configuration with tracing callbacks."""
        if config is None:
            config = RunnableConfig()
        
        # Add tracing callbacks
        callbacks = config.get("callbacks", [])
        
        # Add performance callback
        callbacks.append(PerformanceCallback(self.metrics_collector, trace_id))
        
        # Performance callbacks are handled by PerformanceCallback
        
        config["callbacks"] = callbacks
        config["tags"] = config.get("tags", []) + [trace_id, "traced_investigation"]
        
        return config
    
    @trace
    async def _execute_with_tracing(self, graph, input_data: Dict[str, Any], 
                                   config: RunnableConfig, metrics: TraceMetrics) -> Dict[str, Any]:
        """Execute graph with detailed tracing."""
        # Track execution stages
        stages = {
            "initialization": time.time(),
            "execution": None,
            "completion": None
        }
        
        try:
            # Execute graph
            stages["execution"] = time.time()
            result = await graph.ainvoke(input_data, config=config)
            stages["completion"] = time.time()
            
            # Calculate stage durations
            init_duration = stages["execution"] - stages["initialization"]
            exec_duration = stages["completion"] - stages["execution"]
            
            logger.info(f"Execution stages - Init: {init_duration:.2f}s, Exec: {exec_duration:.2f}s")
            
            # Update metrics from collector
            collected_metrics = self.metrics_collector.get_metrics()
            metrics.agent_metrics = collected_metrics.get("agents", {})
            metrics.tool_metrics = collected_metrics.get("tools", {})
            metrics.cache_hits = collected_metrics.get("cache_hits", 0)
            metrics.cache_misses = collected_metrics.get("cache_misses", 0)
            
            return result
            
        except Exception as e:
            metrics.error_count += 1
            raise
    
    def _get_optimization_recommendations(self, metrics: TraceMetrics) -> List[str]:
        """
        Generate optimization recommendations based on metrics.
        
        Args:
            metrics: Collected trace metrics
            
        Returns:
            List of optimization recommendations
        """
        recommendations = []
        
        # Check overall duration
        if metrics.duration and metrics.duration > 60:
            recommendations.append(f"Investigation took {metrics.duration:.1f}s - consider parallel execution")
        
        # Check agent performance
        for agent_name, agent_metrics in metrics.agent_metrics.items():
            avg_duration = agent_metrics.get("avg_duration", 0)
            if avg_duration > 10:
                recommendations.append(f"Agent '{agent_name}' averaging {avg_duration:.1f}s - investigate bottleneck")
        
        # Check tool performance
        slow_tools = []
        for tool_name, tool_metrics in metrics.tool_metrics.items():
            avg_duration = tool_metrics.get("avg_duration", 0)
            if avg_duration > 5:
                slow_tools.append((tool_name, avg_duration))
        
        if slow_tools:
            slowest = max(slow_tools, key=lambda x: x[1])
            recommendations.append(f"Tool '{slowest[0]}' is slowest at {slowest[1]:.1f}s avg")
        
        # Check cache efficiency
        total_cache_ops = metrics.cache_hits + metrics.cache_misses
        if total_cache_ops > 0:
            cache_hit_rate = metrics.cache_hits / total_cache_ops
            if cache_hit_rate < 0.5:
                recommendations.append(f"Low cache hit rate ({cache_hit_rate:.1%}) - review caching strategy")
        
        # Check error rate
        if metrics.error_count > 0:
            recommendations.append(f"{metrics.error_count} errors occurred - review error handling")
        
        # Check retry rate
        if metrics.retry_count > 5:
            recommendations.append(f"High retry count ({metrics.retry_count}) - check service reliability")
        
        return recommendations
    
    def _log_performance_metrics(self, trace_id: str, metrics: TraceMetrics, result: Dict[str, Any]):
        """Log performance metrics for analysis."""
        try:
            # Create performance log data
            performance_data = {
                "trace_id": trace_id,
                "duration": metrics.duration,
                "success": True,
                "agent_metrics": metrics.agent_metrics,
                "tool_metrics": metrics.tool_metrics,
                "cache_stats": {
                    "hits": metrics.cache_hits,
                    "misses": metrics.cache_misses
                }
            }
            
            logger.info(f"Performance metrics logged for trace {trace_id}", extra=performance_data)
            
        except Exception as e:
            logger.error(f"Failed to log performance metrics: {e}")
    
    def _log_error_metrics(self, trace_id: str, error: Exception, metrics: TraceMetrics):
        """Log error metrics for analysis."""
        try:
            error_data = {
                "trace_id": trace_id,
                "error": str(error),
                "error_type": type(error).__name__,
                "metrics": metrics.__dict__
            }
            
            logger.error(f"Investigation error logged for trace {trace_id}", extra=error_data)
            
        except Exception as e:
            logger.error(f"Failed to log error metrics: {e}")


class MetricsCollector:
    """Collects performance metrics during execution."""
    
    def __init__(self):
        """Initialize metrics collector."""
        self.metrics: Dict[str, Any] = {
            "agents": {},
            "tools": {},
            "cache_hits": 0,
            "cache_misses": 0,
            "errors": []
        }
        
    def record_agent_execution(self, agent_name: str, duration: float):
        """Record agent execution metrics."""
        if agent_name not in self.metrics["agents"]:
            self.metrics["agents"][agent_name] = {
                "executions": 0,
                "total_duration": 0,
                "avg_duration": 0
            }
        
        agent_metrics = self.metrics["agents"][agent_name]
        agent_metrics["executions"] += 1
        agent_metrics["total_duration"] += duration
        agent_metrics["avg_duration"] = agent_metrics["total_duration"] / max(1, agent_metrics["executions"])  # CRITICAL FIX: Division by zero protection
    
    def record_tool_call(self, tool_name: str, duration: float):
        """Record tool call metrics."""
        if tool_name not in self.metrics["tools"]:
            self.metrics["tools"][tool_name] = {
                "calls": 0,
                "total_duration": 0,
                "avg_duration": 0
            }
        
        tool_metrics = self.metrics["tools"][tool_name]
        tool_metrics["calls"] += 1
        tool_metrics["total_duration"] += duration
        tool_metrics["avg_duration"] = tool_metrics["total_duration"] / max(1, tool_metrics["calls"])  # CRITICAL FIX: Division by zero protection
    
    def record_cache_hit(self):
        """Record cache hit."""
        self.metrics["cache_hits"] += 1
    
    def record_cache_miss(self):
        """Record cache miss."""
        self.metrics["cache_misses"] += 1
    
    def record_error(self, error: str):
        """Record error occurrence."""
        self.metrics["errors"].append({
            "timestamp": datetime.now().isoformat(),
            "error": error
        })
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get collected metrics."""
        return self.metrics.copy()
    
    def reset(self):
        """Reset metrics."""
        self.metrics = {
            "agents": {},
            "tools": {},
            "cache_hits": 0,
            "cache_misses": 0,
            "errors": []
        }


class PerformanceCallback(BaseCallbackHandler):
    """Callback handler for performance monitoring."""
    
    def __init__(self, metrics_collector: MetricsCollector, trace_id: str):
        """Initialize performance callback."""
        self.metrics_collector = metrics_collector
        self.trace_id = trace_id
        self.start_times: Dict[str, float] = {}
        
    def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs):
        """Track chain start."""
        chain_id = kwargs.get("run_id", "unknown")
        self.start_times[chain_id] = time.time()
        
    def on_chain_end(self, outputs: Dict[str, Any], **kwargs):
        """Track chain end and record metrics."""
        chain_id = kwargs.get("run_id", "unknown")
        if chain_id in self.start_times:
            duration = time.time() - self.start_times[chain_id]
            chain_name = kwargs.get("name", "unknown_chain")
            
            if "agent" in chain_name.lower():
                self.metrics_collector.record_agent_execution(chain_name, duration)
            
            del self.start_times[chain_id]
    
    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs):
        """Track tool start."""
        tool_id = kwargs.get("run_id", "unknown")
        self.start_times[tool_id] = time.time()
    
    def on_tool_end(self, output: str, **kwargs):
        """Track tool end and record metrics."""
        tool_id = kwargs.get("run_id", "unknown")
        if tool_id in self.start_times:
            duration = time.time() - self.start_times[tool_id]
            tool_name = kwargs.get("name", "unknown_tool")
            self.metrics_collector.record_tool_call(tool_name, duration)
            del self.start_times[tool_id]
    
    def on_tool_error(self, error: Exception, **kwargs):
        """Track tool errors."""
        self.metrics_collector.record_error(str(error))




@asynccontextmanager
async def traced_investigation(graph_builder_func: Callable, project: Optional[str] = None):
    """
    Context manager for traced investigation execution.
    
    Args:
        graph_builder_func: Function to build the graph
        project: Optional LangSmith project name
        
    Yields:
        TracedInvestigationGraph instance
    """
    tracer = TracedInvestigationGraph(graph_builder_func, project)
    try:
        yield tracer
    finally:
        # Cleanup if needed
        pass


# Decorator for tracing individual functions
def trace_performance(func):
    """Decorator to trace function performance."""
    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"{func.__name__} completed in {duration:.2f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{func.__name__} failed after {duration:.2f}s: {e}")
            raise
    
    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"{func.__name__} completed in {duration:.2f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{func.__name__} failed after {duration:.2f}s: {e}")
            raise
    
    # Return appropriate wrapper based on function type
    import asyncio
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper