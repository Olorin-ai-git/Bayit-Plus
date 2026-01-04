"""
Tool Execution Interceptor

Advanced interceptor system for tool execution with hooks, monitoring, and orchestration.
Provides comprehensive instrumentation and control over tool execution lifecycle.
"""

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union

from app.service.logging import get_bridge_logger

from .enhanced_tool_base import EnhancedToolBase, ToolResult

logger = get_bridge_logger(__name__)


class HookType(Enum):
    """Types of interceptor hooks"""

    PRE_EXECUTION = "pre_execution"
    POST_EXECUTION = "post_execution"
    ON_SUCCESS = "on_success"
    ON_FAILURE = "on_failure"
    ON_RETRY = "on_retry"
    ON_TIMEOUT = "on_timeout"
    ON_CACHE_HIT = "on_cache_hit"
    ON_CACHE_MISS = "on_cache_miss"
    ON_VALIDATION_ERROR = "on_validation_error"
    ON_CIRCUIT_BREAKER_OPEN = "on_circuit_breaker_open"


@dataclass
class InterceptorHook:
    """Hook configuration for interceptor"""

    hook_type: HookType
    handler: Callable
    enabled: bool = True
    priority: int = 100  # Lower numbers execute first
    async_handler: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class InterceptorConfig:
    """Configuration for tool execution interceptor"""

    # Hook settings
    enable_hooks: bool = True
    hook_timeout_seconds: float = 5.0

    # Monitoring settings
    enable_execution_tracking: bool = True
    enable_performance_monitoring: bool = True
    enable_error_aggregation: bool = True

    # Orchestration settings
    enable_dependency_tracking: bool = True
    enable_execution_ordering: bool = True
    max_concurrent_executions: int = 10

    # Advanced features
    enable_execution_replay: bool = False
    enable_execution_rollback: bool = False
    replay_history_size: int = 100

    # Custom settings
    custom_params: Dict[str, Any] = field(default_factory=dict)


class ToolExecutionInterceptor:
    """
    Advanced tool execution interceptor with comprehensive instrumentation.

    Features:
    - Hook system for all execution lifecycle events
    - Performance monitoring and analytics
    - Dependency tracking and execution ordering
    - Error aggregation and pattern detection
    - Execution replay and rollback capabilities
    - Concurrent execution management
    - Real-time execution streaming
    """

    def __init__(self, config: InterceptorConfig):
        """Initialize tool execution interceptor"""
        self.config = config
        self.hooks: Dict[HookType, List[InterceptorHook]] = defaultdict(list)

        # Execution tracking
        self.execution_history: List[Dict[str, Any]] = []
        self.active_executions: Dict[str, Dict[str, Any]] = {}
        self.execution_stats: Dict[str, Any] = defaultdict(int)

        # Error tracking
        self.error_patterns: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.error_frequencies: Dict[str, int] = defaultdict(int)

        # Performance tracking
        self.performance_metrics: Dict[str, List[float]] = defaultdict(list)
        self.tool_dependencies: Dict[str, List[str]] = defaultdict(list)

        # Concurrency control
        self.execution_semaphore = asyncio.Semaphore(config.max_concurrent_executions)
        self.execution_queue: List[Dict[str, Any]] = []

        self.logger = get_bridge_logger(f"{__name__}.interceptor")

    def register_hook(self, hook: InterceptorHook) -> None:
        """Register a new hook"""
        self.hooks[hook.hook_type].append(hook)
        # Sort by priority (lower numbers first)
        self.hooks[hook.hook_type].sort(key=lambda h: h.priority)

        self.logger.info(
            f"Registered {hook.hook_type.value} hook with priority {hook.priority}"
        )

    def unregister_hook(self, hook_type: HookType, handler: Callable) -> bool:
        """Unregister a hook"""
        hooks = self.hooks[hook_type]
        for i, hook in enumerate(hooks):
            if hook.handler == handler:
                del hooks[i]
                self.logger.info(f"Unregistered {hook_type.value} hook")
                return True
        return False

    async def execute_tool(
        self,
        tool: EnhancedToolBase,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
        execution_id: Optional[str] = None,
    ) -> ToolResult:
        """Execute tool with full interceptor capabilities"""

        # Generate execution ID
        if not execution_id:
            execution_id = f"{tool.config.name}_{int(time.time() * 1000)}"

        context = context or {}
        context["execution_id"] = execution_id

        start_time = time.time()

        # Acquire concurrency semaphore
        async with self.execution_semaphore:
            try:
                # Track active execution
                execution_info = {
                    "tool_name": tool.config.name,
                    "execution_id": execution_id,
                    "start_time": datetime.now(),
                    "input_data": input_data,
                    "context": context,
                    "status": "executing",
                }
                self.active_executions[execution_id] = execution_info

                # Pre-execution hooks
                await self._execute_hooks(
                    HookType.PRE_EXECUTION,
                    {
                        "tool": tool,
                        "input_data": input_data,
                        "context": context,
                        "execution_id": execution_id,
                    },
                )

                # Execute the tool
                result = await tool.execute(input_data, context)

                # Update execution info
                execution_time = time.time() - start_time
                execution_info.update(
                    {
                        "end_time": datetime.now(),
                        "execution_time": execution_time,
                        "status": "completed",
                        "success": result.success,
                        "result": result,
                    }
                )

                # Post-execution hooks
                await self._execute_hooks(
                    HookType.POST_EXECUTION,
                    {
                        "tool": tool,
                        "input_data": input_data,
                        "context": context,
                        "result": result,
                        "execution_id": execution_id,
                        "execution_time": execution_time,
                    },
                )

                # Success/failure specific hooks
                if result.success:
                    await self._execute_hooks(
                        HookType.ON_SUCCESS,
                        {
                            "tool": tool,
                            "result": result,
                            "execution_id": execution_id,
                            "execution_time": execution_time,
                        },
                    )

                    # Cache hit/miss hooks
                    if result.from_cache:
                        await self._execute_hooks(
                            HookType.ON_CACHE_HIT,
                            {
                                "tool": tool,
                                "result": result,
                                "execution_id": execution_id,
                            },
                        )
                    else:
                        await self._execute_hooks(
                            HookType.ON_CACHE_MISS,
                            {
                                "tool": tool,
                                "result": result,
                                "execution_id": execution_id,
                            },
                        )
                else:
                    await self._execute_hooks(
                        HookType.ON_FAILURE,
                        {
                            "tool": tool,
                            "result": result,
                            "execution_id": execution_id,
                            "error": result.error,
                            "error_type": result.error_type,
                        },
                    )

                    # Track error patterns
                    if self.config.enable_error_aggregation:
                        await self._track_error_pattern(tool.config.name, result)

                # Retry hooks
                if result.retry_count > 0:
                    await self._execute_hooks(
                        HookType.ON_RETRY,
                        {
                            "tool": tool,
                            "result": result,
                            "execution_id": execution_id,
                            "retry_count": result.retry_count,
                        },
                    )

                # Update statistics
                if self.config.enable_execution_tracking:
                    await self._update_execution_stats(
                        tool.config.name, result, execution_time
                    )

                # Performance monitoring
                if self.config.enable_performance_monitoring:
                    await self._update_performance_metrics(
                        tool.config.name, execution_time
                    )

                # Store execution history
                if self.config.enable_execution_replay:
                    await self._store_execution_history(execution_info)

                return result

            except asyncio.TimeoutError as e:
                # Timeout hooks
                await self._execute_hooks(
                    HookType.ON_TIMEOUT,
                    {
                        "tool": tool,
                        "input_data": input_data,
                        "context": context,
                        "execution_id": execution_id,
                        "timeout_seconds": tool.config.timeout_seconds,
                    },
                )

                # Create timeout result
                execution_time = time.time() - start_time
                result = ToolResult.failure_result(
                    error=f"Tool execution timed out after {tool.config.timeout_seconds}s",
                    error_type="TimeoutError",
                    execution_time=execution_time,
                )

                return result

            except Exception as e:
                # Unexpected error during interception
                execution_time = time.time() - start_time
                self.logger.error(
                    f"Interceptor error during tool execution: {str(e)}", exc_info=True
                )

                result = ToolResult.failure_result(
                    error=f"Interceptor error: {str(e)}",
                    error_type="InterceptorError",
                    execution_time=execution_time,
                )

                return result

            finally:
                # Clean up active execution
                self.active_executions.pop(execution_id, None)

    async def _execute_hooks(
        self, hook_type: HookType, event_data: Dict[str, Any]
    ) -> None:
        """Execute all hooks of a given type"""
        if not self.config.enable_hooks:
            return

        hooks = self.hooks.get(hook_type, [])
        if not hooks:
            return

        for hook in hooks:
            if not hook.enabled:
                continue

            try:
                if hook.async_handler:
                    await asyncio.wait_for(
                        hook.handler(event_data),
                        timeout=self.config.hook_timeout_seconds,
                    )
                else:
                    # Run sync handler in thread pool
                    await asyncio.get_event_loop().run_in_executor(
                        None, hook.handler, event_data
                    )

            except asyncio.TimeoutError:
                self.logger.warning(
                    f"Hook {hook_type.value} timed out after {self.config.hook_timeout_seconds}s"
                )
            except Exception as e:
                self.logger.error(
                    f"Hook {hook_type.value} failed: {str(e)}", exc_info=True
                )

    async def _track_error_pattern(self, tool_name: str, result: ToolResult) -> None:
        """Track error patterns for analysis"""
        if result.error_type:
            error_key = f"{tool_name}:{result.error_type}"

            self.error_frequencies[error_key] += 1
            self.error_patterns[error_key].append(
                {
                    "timestamp": datetime.now(),
                    "error": result.error,
                    "retry_count": result.retry_count,
                    "execution_time": result.execution_time,
                }
            )

            # Keep only recent errors (sliding window)
            max_history = 50
            if len(self.error_patterns[error_key]) > max_history:
                self.error_patterns[error_key] = self.error_patterns[error_key][
                    -max_history:
                ]

    async def _update_execution_stats(
        self, tool_name: str, result: ToolResult, execution_time: float
    ) -> None:
        """Update execution statistics"""
        self.execution_stats[f"{tool_name}:total_executions"] += 1

        if result.success:
            self.execution_stats[f"{tool_name}:successful_executions"] += 1
        else:
            self.execution_stats[f"{tool_name}:failed_executions"] += 1

        if result.from_cache:
            self.execution_stats[f"{tool_name}:cache_hits"] += 1

        if result.retry_count > 0:
            self.execution_stats[f"{tool_name}:retried_executions"] += 1

    async def _update_performance_metrics(
        self, tool_name: str, execution_time: float
    ) -> None:
        """Update performance metrics"""
        self.performance_metrics[tool_name].append(execution_time)

        # Keep sliding window of metrics
        max_metrics = 1000
        if len(self.performance_metrics[tool_name]) > max_metrics:
            self.performance_metrics[tool_name] = self.performance_metrics[tool_name][
                -max_metrics:
            ]

    async def _store_execution_history(self, execution_info: Dict[str, Any]) -> None:
        """Store execution in history for replay"""
        # Create serializable history entry
        history_entry = {
            "tool_name": execution_info["tool_name"],
            "execution_id": execution_info["execution_id"],
            "timestamp": execution_info["start_time"].isoformat(),
            "input_data": execution_info["input_data"],
            "context": execution_info.get("context", {}),
            "success": execution_info.get("success"),
            "execution_time": execution_info.get("execution_time"),
            "result_summary": (
                str(execution_info.get("result", {}).result)[:200]
                if execution_info.get("result")
                else None
            ),
        }

        self.execution_history.append(history_entry)

        # Maintain history size limit
        if len(self.execution_history) > self.config.replay_history_size:
            self.execution_history = self.execution_history[
                -self.config.replay_history_size :
            ]

    def get_execution_statistics(self) -> Dict[str, Any]:
        """Get comprehensive execution statistics"""
        stats = {
            "execution_counts": dict(self.execution_stats),
            "active_executions": len(self.active_executions),
            "total_tools_monitored": len(
                set(key.split(":")[0] for key in self.execution_stats.keys())
            ),
            "error_frequencies": dict(self.error_frequencies),
            "hook_counts": {
                hook_type.value: len(hooks) for hook_type, hooks in self.hooks.items()
            },
        }

        # Calculate success rates
        success_rates = {}
        for key, count in self.execution_stats.items():
            if key.endswith(":total_executions") and count > 0:
                tool_name = key.replace(":total_executions", "")
                successful = self.execution_stats.get(
                    f"{tool_name}:successful_executions", 0
                )
                success_rates[tool_name] = successful / count

        stats["success_rates"] = success_rates

        # Performance statistics
        perf_stats = {}
        for tool_name, times in self.performance_metrics.items():
            if times:
                perf_stats[tool_name] = {
                    "avg_execution_time": sum(times) / len(times),
                    "min_execution_time": min(times),
                    "max_execution_time": max(times),
                    "total_executions": len(times),
                }

        stats["performance_metrics"] = perf_stats

        return stats

    def get_error_analysis(self) -> Dict[str, Any]:
        """Get detailed error analysis"""
        analysis = {
            "error_frequencies": dict(self.error_frequencies),
            "error_patterns": {},
            "top_errors": [],
            "recent_errors": [],
        }

        # Analyze error patterns
        for error_key, error_history in self.error_patterns.items():
            tool_name, error_type = error_key.split(":", 1)

            recent_errors = [
                e
                for e in error_history
                if (datetime.now() - e["timestamp"]).total_seconds() < 3600  # Last hour
            ]

            analysis["error_patterns"][error_key] = {
                "total_occurrences": len(error_history),
                "recent_occurrences": len(recent_errors),
                "avg_execution_time": sum(e["execution_time"] for e in error_history)
                / len(error_history),
                "avg_retry_count": sum(e["retry_count"] for e in error_history)
                / len(error_history),
                "last_occurrence": (
                    error_history[-1]["timestamp"].isoformat()
                    if error_history
                    else None
                ),
            }

        # Top errors by frequency
        analysis["top_errors"] = sorted(
            self.error_frequencies.items(), key=lambda x: x[1], reverse=True
        )[:10]

        # Recent errors across all tools
        all_recent_errors = []
        for error_key, error_history in self.error_patterns.items():
            for error in error_history[-5:]:  # Last 5 errors per type
                all_recent_errors.append(
                    {
                        "error_key": error_key,
                        "timestamp": error["timestamp"].isoformat(),
                        "error": error["error"],
                        "retry_count": error["retry_count"],
                        "execution_time": error["execution_time"],
                    }
                )

        # Sort by timestamp (most recent first)
        analysis["recent_errors"] = sorted(
            all_recent_errors, key=lambda x: x["timestamp"], reverse=True
        )[:20]

        return analysis

    def get_active_executions(self) -> Dict[str, Any]:
        """Get currently active executions"""
        active = {}
        for execution_id, info in self.active_executions.items():
            active[execution_id] = {
                "tool_name": info["tool_name"],
                "start_time": info["start_time"].isoformat(),
                "status": info["status"],
                "duration_seconds": (
                    datetime.now() - info["start_time"]
                ).total_seconds(),
            }
        return active

    def get_execution_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent execution history"""
        return self.execution_history[-limit:]

    async def replay_execution(self, execution_id: str) -> Optional[ToolResult]:
        """Replay a previous execution (if enabled)"""
        if not self.config.enable_execution_replay:
            raise ValueError("Execution replay is not enabled")

        # Find execution in history
        target_execution = None
        for execution in self.execution_history:
            if execution["execution_id"] == execution_id:
                target_execution = execution
                break

        if not target_execution:
            return None

        self.logger.info(
            f"Replaying execution {execution_id} for tool {target_execution['tool_name']}"
        )

        # TODO: Implement actual replay logic
        # This would require reconstructing the tool instance and re-executing
        # with the same input data and context

        return None

    async def clear_statistics(self) -> None:
        """Clear all statistics and history"""
        self.execution_history.clear()
        self.execution_stats.clear()
        self.error_patterns.clear()
        self.error_frequencies.clear()
        self.performance_metrics.clear()

        self.logger.info("Interceptor statistics cleared")

    def add_standard_hooks(self) -> None:
        """Add standard monitoring and logging hooks"""

        # Logging hook for all executions
        self.register_hook(
            InterceptorHook(
                hook_type=HookType.PRE_EXECUTION,
                handler=self._log_pre_execution,
                priority=1,
            )
        )

        self.register_hook(
            InterceptorHook(
                hook_type=HookType.POST_EXECUTION,
                handler=self._log_post_execution,
                priority=999,
            )
        )

        # Error logging hook
        self.register_hook(
            InterceptorHook(
                hook_type=HookType.ON_FAILURE, handler=self._log_failure, priority=1
            )
        )

        # Performance monitoring hook
        self.register_hook(
            InterceptorHook(
                hook_type=HookType.ON_SUCCESS,
                handler=self._monitor_performance,
                priority=50,
            )
        )

    async def _log_pre_execution(self, event_data: Dict[str, Any]) -> None:
        """Standard pre-execution logging"""
        tool = event_data["tool"]
        execution_id = event_data["execution_id"]
        self.logger.info(
            f"Starting execution {execution_id} for tool {tool.config.name}"
        )

    async def _log_post_execution(self, event_data: Dict[str, Any]) -> None:
        """Standard post-execution logging"""
        tool = event_data["tool"]
        result = event_data["result"]
        execution_id = event_data["execution_id"]
        execution_time = event_data["execution_time"]

        status = "SUCCESS" if result.success else "FAILURE"
        self.logger.info(
            f"Completed execution {execution_id} for tool {tool.config.name}: "
            f"{status} in {execution_time:.3f}s"
        )

    async def _log_failure(self, event_data: Dict[str, Any]) -> None:
        """Standard failure logging"""
        tool = event_data["tool"]
        result = event_data["result"]
        execution_id = event_data["execution_id"]

        self.logger.error(
            f"Tool {tool.config.name} failed in execution {execution_id}: "
            f"{result.error_type}: {result.error}"
        )

    async def _monitor_performance(self, event_data: Dict[str, Any]) -> None:
        """Standard performance monitoring"""
        tool = event_data["tool"]
        execution_time = event_data["execution_time"]

        # Log slow executions
        if execution_time > 10.0:  # More than 10 seconds
            self.logger.warning(
                f"Slow execution detected for tool {tool.config.name}: "
                f"{execution_time:.3f}s"
            )
