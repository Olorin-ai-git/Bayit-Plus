"""
Enhanced Tool Executor - Advanced LangGraph tool execution with resilience patterns.

This module implements Phase 1 of the LangGraph enhancement plan, providing:
- Advanced retry logic with exponential backoff
- Circuit breaker pattern for external service protection
- Performance monitoring and tracing
- Tool health checking and dynamic filtering
"""

import asyncio
import time
import threading
from typing import Any, Dict, List, Optional, Set, Union, Sequence
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from langchain_core.tools import BaseTool
from langgraph.prebuilt import ToolNode
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import AIMessage, ToolMessage, BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict, Annotated
from app.service.logging import get_bridge_logger
from app.utils.security_utils import (
    sanitize_tool_result,
    sanitize_exception_message,
    sanitize_websocket_event_data,
    get_error_category,
    create_result_hash
)

logger = get_bridge_logger(__name__)

# Global tool execution event handlers
_tool_event_handlers = []

# Resource limits for metrics storage
MAX_TOOL_METRICS = 1000  # Maximum number of tools to track
MAX_PERFORMANCE_SAMPLES = 50  # Reduced from 100 for memory efficiency


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failures exceeded threshold
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class ToolHealthMetrics:
    """Health metrics for a tool."""
    tool_name: str
    success_count: int = 0
    failure_count: int = 0
    total_latency: float = 0.0
    last_failure_time: Optional[datetime] = None
    circuit_state: CircuitState = CircuitState.CLOSED
    consecutive_failures: int = 0
    
    @property
    def average_latency(self) -> float:
        """Calculate average latency."""
        total = self.success_count + self.failure_count
        return self.total_latency / total if total > 0 else 0.0
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 1.0


class MessagesState(TypedDict):
    """State with messages for LangGraph."""
    messages: Annotated[List[BaseMessage], add_messages]


class EnhancedToolNode(ToolNode):
    """Enhanced tool node with resilience patterns and monitoring."""
    
    def __init__(self, tools: Sequence[BaseTool], investigation_id: str = None, **kwargs):
        """Initialize enhanced tool node with validation."""
        # Input validation
        if not tools:
            raise ValueError("Tools sequence cannot be empty")
        if not isinstance(tools, (list, tuple)):
            raise TypeError("Tools must be a sequence (list or tuple)")
        
        super().__init__(tools, **kwargs)
        # Store tools explicitly for our enhanced functionality
        self.tools = tools
        self.investigation_id = investigation_id if investigation_id else None
        
        # Thread lock for circuit breaker state changes
        self._state_lock = threading.RLock()
        
        # Retry configuration with validation
        self.retry_config = {
            'max_retries': 3,
            'backoff_factor': 1.5,
            'retry_exceptions': [ConnectionError, TimeoutError, asyncio.TimeoutError],
            'max_backoff': 30.0  # Maximum backoff time in seconds
        }
        
        # Circuit breaker configuration with validation
        self.circuit_config = {
            'failure_threshold': 5,  # Open circuit after 5 failures
            'recovery_timeout': 60,  # Try recovery after 60 seconds
            'half_open_requests': 2   # Number of test requests in half-open state
        }
        
        # Validate configurations
        self._validate_config()
        
        # Tool health tracking - Initialize proper health manager
        self.health_manager = ToolHealthManager()
        self.tool_metrics: Dict[str, ToolHealthMetrics] = {}
        self._initialize_metrics()
        
        # Initialize health manager with our tools
        for tool in self.tools:
            if isinstance(tool, BaseTool):
                # Add tool to health manager
                self.health_manager.health_checks[tool.name] = ToolHealthMetrics(tool_name=tool.name)
                # Ensure circuit breaker starts in CLOSED state (working)
                self.health_manager.health_checks[tool.name].circuit_state = CircuitState.CLOSED
        
    def _validate_config(self):
        """Validate configuration parameters."""
        if self.retry_config['max_retries'] <= 0:
            raise ValueError("max_retries must be greater than 0")
        if self.retry_config['backoff_factor'] <= 1.0:
            raise ValueError("backoff_factor must be greater than 1.0")
        if self.retry_config['max_backoff'] <= 0:
            raise ValueError("max_backoff must be greater than 0")
        if self.circuit_config['failure_threshold'] <= 0:
            raise ValueError("failure_threshold must be greater than 0")
        if self.circuit_config['recovery_timeout'] <= 0:
            raise ValueError("recovery_timeout must be greater than 0")
        if self.circuit_config['half_open_requests'] <= 0:
            raise ValueError("half_open_requests must be greater than 0")
        
        # Performance monitoring
        self.performance_threshold = 5.0  # Warn if tool takes > 5 seconds
        
    def _initialize_metrics(self):
        """Initialize metrics for all tools."""
        for tool in self.tools:
            if isinstance(tool, BaseTool):
                self.tool_metrics[tool.name] = ToolHealthMetrics(tool_name=tool.name)
    
    async def ainvoke(self, input: Union[Dict[str, Any], MessagesState], config: Optional[RunnableConfig] = None) -> Union[Dict[str, Any], MessagesState]:
        """
        Enhanced invoke with resilience patterns.
        
        Args:
            input: Input state or messages
            config: Runtime configuration
            
        Returns:
            Updated state with tool responses
        """
        logger.info(f"🔧 EnhancedToolNode.ainvoke called with input type: {type(input)}")
        
        # Extract messages from input
        if isinstance(input, dict) and "messages" in input:
            messages = input["messages"]
            logger.info(f"🔧 Extracted {len(messages)} messages from dict input")
        else:
            # Handle direct message input
            messages = input if isinstance(input, list) else [input]
            logger.info(f"🔧 Processing {len(messages)} direct messages")
        
        # Process each message that requires tool invocation
        result_messages = []
        tool_calls_found = 0
        
        for message_idx, message in enumerate(messages):
            logger.debug(f"🔧 Processing message {message_idx + 1}/{len(messages)}: {type(message)}")
            
            if isinstance(message, AIMessage) and message.tool_calls:
                tool_calls_found += len(message.tool_calls)
                logger.info(f"🔧 Found {len(message.tool_calls)} tool calls in AIMessage")
                
                for tool_idx, tool_call in enumerate(message.tool_calls):
                    tool_name = tool_call.get("name", "unknown")
                    tool_id = tool_call.get("id", "")
                    logger.info(f"🔧 Executing tool {tool_idx + 1}/{len(message.tool_calls)}: {tool_name} (id: {tool_id})")
                    
                    try:
                        # Execute with resilience
                        result = await self._execute_tool_with_resilience(tool_call, config)
                        logger.info(f"🔧 ✅ Tool {tool_name} executed successfully, result type: {type(result)}")
                        
                        # Create tool message with result
                        tool_message = ToolMessage(
                            content=str(result),
                            tool_call_id=tool_call.get("id", ""),
                            name=tool_call.get("name", "unknown")
                        )
                        result_messages.append(tool_message)
                        logger.debug(f"🔧 Created ToolMessage for {tool_name}")
                        
                    except Exception as e:
                        # Sanitize error message for security
                        safe_error_msg = sanitize_exception_message(e)
                        error_category = get_error_category(e)
                        logger.error(f"🔧 ❌ Tool {tool_name} execution failed - {error_category}: {safe_error_msg}")
                        
                        # Create safe error tool message
                        tool_message = ToolMessage(
                            content=f"Tool execution failed: {safe_error_msg}",
                            tool_call_id=tool_call.get("id", ""),
                            name=tool_call.get("name", "unknown")
                        )
                        result_messages.append(tool_message)
                        logger.debug(f"🔧 Created error ToolMessage for {tool_name}")
            else:
                logger.debug(f"🔧 Message {message_idx + 1} is not an AIMessage with tool_calls")
        
        logger.info(f"🔧 Tool execution summary: {tool_calls_found} tool calls found, {len(result_messages)} results generated")
        
        # If no tool calls were processed, use parent implementation
        if not result_messages:
            logger.info(f"🔧 No tool calls processed, delegating to parent ToolNode")
            return await super().ainvoke(input, config)
        
        # Return updated state
        if isinstance(input, dict):
            result = {"messages": result_messages}
            logger.info(f"🔧 Returning dict result with {len(result_messages)} messages")
            return result
        else:
            logger.info(f"🔧 Returning list result with {len(result_messages)} messages")
            return result_messages
    
    async def _execute_tool_with_resilience(self, tool_call: Dict[str, Any], config: Optional[RunnableConfig]) -> Any:
        """
        Execute tool with resilience patterns and emit WebSocket events.
        
        Args:
            tool_call: Tool invocation details
            config: Runtime configuration
            
        Returns:
            Tool execution result
        """
        tool_name = tool_call.get("name", "unknown")
        metrics = self.tool_metrics.get(tool_name)
        
        if not metrics:
            logger.warning(f"No metrics found for tool {tool_name}, executing without resilience")
            # Find and execute tool directly
            tool = self._get_tool_by_name(tool_name)
            if tool:
                return await tool.ainvoke(tool_call.get("args", {}), config)
            else:
                raise ValueError(f"Tool {tool_name} not found")
        
        # Check circuit breaker (thread-safe)
        with self._state_lock:
            if metrics.circuit_state == CircuitState.OPEN:
                if self._should_attempt_recovery(metrics):
                    metrics.circuit_state = CircuitState.HALF_OPEN
                    logger.info(f"Circuit breaker for {tool_name} entering HALF_OPEN state")
                else:
                    await self._emit_tool_event("tool_execution_skipped", tool_name, {
                        "reason": "circuit_breaker_open",
                        "consecutive_failures": metrics.consecutive_failures,
                        "last_failure_time": metrics.last_failure_time.isoformat() if metrics.last_failure_time else None
                    })
                    raise Exception(f"Circuit breaker OPEN for {tool_name}")
        
        # Execute with retry logic
        start_time = time.time()
        last_exception = None
        
        # Emit tool execution started event
        await self._emit_tool_event("tool_execution_started", tool_name, {
            "args": tool_call.get("args", {}),
            "attempt": 1,
            "max_retries": self.retry_config['max_retries']
        })
        
        for attempt in range(self.retry_config['max_retries']):
            try:
                # Find the tool
                tool = self._get_tool_by_name(tool_name)
                if not tool:
                    raise ValueError(f"Tool {tool_name} not found")
                
                # Execute tool with timeout
                result = await self._execute_with_timeout(
                    tool, 
                    tool_call.get("args", {}), 
                    config
                )
                
                # Update metrics on success
                elapsed = time.time() - start_time
                metrics.success_count += 1
                metrics.total_latency += elapsed
                metrics.consecutive_failures = 0
                
                # Close circuit if in half-open state (thread-safe)
                circuit_recovered = False
                with self._state_lock:
                    if metrics.circuit_state == CircuitState.HALF_OPEN:
                        metrics.circuit_state = CircuitState.CLOSED
                        circuit_recovered = True
                        logger.info(f"Circuit breaker for {tool_name} CLOSED after successful recovery")
                
                # Warn if slow
                performance_warning = None
                if elapsed > self.performance_threshold:
                    performance_warning = f"Tool execution exceeded threshold: {elapsed:.2f}s > {self.performance_threshold}s"
                    logger.warning(f"Tool {tool_name} took {elapsed:.2f}s (threshold: {self.performance_threshold}s)")
                
                # Emit successful completion event with sanitized data
                await self._emit_tool_event("tool_execution_completed", tool_name, {
                    "result_summary": sanitize_tool_result(result, max_length=200),
                    "result_hash": create_result_hash(result),
                    "execution_time": f"{elapsed:.3f}s",
                    "attempt": attempt + 1,
                    "success_rate": f"{metrics.success_rate * 100:.1f}%",
                    "circuit_recovered": circuit_recovered,
                    "performance_warning": performance_warning
                })
                
                return result
                
            except Exception as e:
                last_exception = e
                elapsed = time.time() - start_time
                
                # Check if exception is retryable
                is_retryable = any(
                    isinstance(e, exc_type) 
                    for exc_type in self.retry_config['retry_exceptions']
                )
                
                if not is_retryable or attempt == self.retry_config['max_retries'] - 1:
                    # Update failure metrics
                    metrics.failure_count += 1
                    metrics.total_latency += elapsed
                    metrics.consecutive_failures += 1
                    metrics.last_failure_time = datetime.now()
                    
                    # Check if circuit should open (thread-safe)
                    circuit_opened = False
                    with self._state_lock:
                        if metrics.consecutive_failures >= self.circuit_config['failure_threshold']:
                            metrics.circuit_state = CircuitState.OPEN
                            circuit_opened = True
                            logger.error(f"Circuit breaker OPEN for {tool_name} after {metrics.consecutive_failures} failures")
                    
                    # Emit failure event with sanitized error information
                    await self._emit_tool_event("tool_execution_failed", tool_name, {
                        "error": sanitize_exception_message(e),
                        "error_category": get_error_category(e),
                        "error_type": type(e).__name__,
                        "execution_time": f"{elapsed:.3f}s",
                        "final_attempt": attempt + 1,
                        "max_retries": self.retry_config['max_retries'],
                        "is_retryable": is_retryable,
                        "consecutive_failures": metrics.consecutive_failures,
                        "circuit_opened": circuit_opened,
                        "success_rate": f"{metrics.success_rate * 100:.1f}%"
                    })
                    
                    raise
                
                # Calculate backoff time
                backoff = min(
                    self.retry_config['backoff_factor'] ** attempt,
                    self.retry_config['max_backoff']
                )
                
                logger.warning(f"Tool {tool_name} failed (attempt {attempt + 1}/{self.retry_config['max_retries']}), "
                             f"retrying in {backoff:.1f}s: {str(e)}")
                
                await asyncio.sleep(backoff)
        
        # All retries exhausted - convert to safe tool message instead of raising
        if last_exception:
            safe_error_msg = sanitize_exception_message(last_exception)
            error_category = get_error_category(last_exception)
            logger.error(f"Tool {tool_name} failed after all retries - {error_category}: {safe_error_msg}")
            
            # Return safe error result instead of raising exception
            return f"Tool execution failed: {safe_error_msg} (after {self.retry_config['max_retries']} retries)"
    
    def _get_tool_by_name(self, name: str) -> Optional[BaseTool]:
        """Get tool by name with input validation."""
        if not name or not isinstance(name, str):
            logger.warning(f"🔧 Invalid tool name: {name}")
            return None
        
        logger.debug(f"🔧 Looking for tool: '{name}' among {len(self.tools)} available tools")
        
        # Log all available tool names for debugging
        available_tools = []
        for tool in self.tools:
            if isinstance(tool, BaseTool) and hasattr(tool, 'name'):
                available_tools.append(tool.name)
        logger.debug(f"🔧 Available tools: {available_tools}")
        
        for tool in self.tools:
            if isinstance(tool, BaseTool) and hasattr(tool, 'name') and tool.name == name:
                logger.debug(f"🔧 ✅ Found matching tool: {tool.name}")
                return tool
        
        logger.error(f"🔧 ❌ Tool '{name}' not found in available tools: {available_tools}")
        return None
    
    async def _execute_with_timeout(self, tool: BaseTool, args: Dict[str, Any], config: Optional[RunnableConfig], timeout: float = 30.0) -> Any:
        """Execute tool with timeout."""
        try:
            return await asyncio.wait_for(
                tool.ainvoke(args, config),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            raise TimeoutError(f"Tool execution timed out after {timeout}s")
    
    def _should_attempt_recovery(self, metrics: ToolHealthMetrics) -> bool:
        """Check if circuit breaker should attempt recovery."""
        if not metrics.last_failure_time:
            return True
        
        recovery_time = metrics.last_failure_time + timedelta(seconds=self.circuit_config['recovery_timeout'])
        return datetime.now() >= recovery_time
    
    def get_health_report(self) -> Dict[str, Dict[str, Any]]:
        """
        Get health report for all tools.
        
        Returns:
            Dictionary with health metrics for each tool
        """
        report = {}
        for tool_name, metrics in self.tool_metrics.items():
            report[tool_name] = {
                'success_rate': f"{metrics.success_rate * 100:.1f}%",
                'average_latency': f"{metrics.average_latency:.2f}s",
                'circuit_state': metrics.circuit_state.value,
                'consecutive_failures': metrics.consecutive_failures,
                'total_requests': metrics.success_count + metrics.failure_count
            }
        return report
    
    def get_working_tools(self) -> List[BaseTool]:
        """
        Get list of currently working tools.
        
        Returns:
            List of tools that are not in OPEN circuit state
        """
        working_tools = []
        for tool in self.tools:
            if isinstance(tool, BaseTool):
                metrics = self.tool_metrics.get(tool.name)
                if not metrics or metrics.circuit_state != CircuitState.OPEN:
                    working_tools.append(tool)
        return working_tools
    
    async def _emit_tool_event(self, event_type: str, tool_name: str, event_data: Dict[str, Any]):
        """
        Emit tool execution event via WebSocket and event handlers.
        
        Args:
            event_type: Type of event (started, completed, failed, skipped)
            tool_name: Name of the tool
            event_data: Additional event data
        """
        try:
            # Sanitize event data before broadcasting
            sanitized_event_data = sanitize_websocket_event_data(event_data)
            
            event = {
                "type": event_type,
                "tool_name": tool_name,
                "timestamp": datetime.now().isoformat(),
                "investigation_id": self.investigation_id,
                "data": sanitized_event_data
            }
            
            # Emit to registered event handlers
            for handler in _tool_event_handlers:
                try:
                    await handler(event)
                except Exception as e:
                    logger.warning(f"Tool event handler failed: {e}")
            
            # Emit via WebSocket if investigation_id is available
            if self.investigation_id:
                try:
                    from app.router.handlers.websocket_handler import notify_websocket_connections
                    await notify_websocket_connections(self.investigation_id, {
                        "type": "tool_execution_event",
                        "event": event
                    })
                except ImportError:
                    logger.debug("WebSocket handler not available for tool events")
                except Exception as e:
                    logger.warning(f"Failed to emit tool event via WebSocket: {e}")
        except Exception as e:
            logger.error(f"Critical error in _emit_tool_event: {e}")


class ToolHealthManager:
    """Manages tool health checking and dynamic filtering."""
    
    def __init__(self):
        """Initialize tool health manager."""
        self.health_checks: Dict[str, ToolHealthMetrics] = {}
        self.performance_metrics: Dict[str, List[float]] = {}
        self.health_check_interval = 60  # Check health every 60 seconds
        self.last_health_check = datetime.now()
        
    async def validate_tool_ecosystem(self, tools: List[BaseTool]) -> List[BaseTool]:
        """
        Validate and filter tools based on health.
        
        Args:
            tools: List of available tools
            
        Returns:
            List of healthy tools
        """
        healthy_tools = []
        
        for tool in tools:
            if await self._check_tool_health(tool):
                healthy_tools.append(tool)
            else:
                logger.warning(f"Tool {tool.name} failed health check")
        
        # Rank tools by performance if we have metrics
        if self.performance_metrics:
            healthy_tools = self._rank_by_performance(healthy_tools)
        
        return healthy_tools
    
    async def _check_tool_health(self, tool: BaseTool) -> bool:
        """
        Check if a tool is healthy.
        
        Args:
            tool: Tool to check
            
        Returns:
            True if tool is healthy
        """
        try:
            # Check if tool has required attributes
            if not hasattr(tool, 'name') or not tool.name:
                return False
            
            # Try to get tool description (basic health check)
            if hasattr(tool, 'description'):
                _ = tool.description
            
            # Tool-specific health checks could be added here
            # For example, checking if external services are reachable
            
            return True
            
        except Exception as e:
            logger.error(f"Health check failed for tool {getattr(tool, 'name', 'unknown')}: {e}")
            return False
    
    def _rank_by_performance(self, tools: List[BaseTool]) -> List[BaseTool]:
        """
        Rank tools by performance metrics.
        
        Args:
            tools: List of tools to rank
            
        Returns:
            Tools sorted by performance (best first)
        """
        def get_avg_latency(tool: BaseTool) -> float:
            """Get average latency for a tool."""
            if tool.name not in self.performance_metrics:
                return 0.0
            latencies = self.performance_metrics[tool.name]
            return sum(latencies) / len(latencies) if latencies else 0.0
        
        return sorted(tools, key=get_avg_latency)


def register_tool_event_handler(handler):
    """
    Register a handler for tool execution events.
    
    Args:
        handler: Async function that takes event dict as parameter
    """
    _tool_event_handlers.append(handler)


def clear_tool_event_handlers():
    """Clear all registered tool event handlers."""
    global _tool_event_handlers
    _tool_event_handlers = []
    
    def record_performance(self, tool_name: str, latency: float):
        """
        Record performance metric for a tool with resource limits.
        
        Args:
            tool_name: Name of the tool
            latency: Execution latency in seconds
        """
        # Enforce maximum number of tracked tools
        if len(self.performance_metrics) >= MAX_TOOL_METRICS and tool_name not in self.performance_metrics:
            # Remove oldest tool metrics to make space
            oldest_tool = next(iter(self.performance_metrics))
            del self.performance_metrics[oldest_tool]
            logger.warning(f"Removed metrics for {oldest_tool} to stay within resource limits")
        
        if tool_name not in self.performance_metrics:
            self.performance_metrics[tool_name] = []
        
        # Keep limited number of performance samples
        self.performance_metrics[tool_name].append(latency)
        if len(self.performance_metrics[tool_name]) > MAX_PERFORMANCE_SAMPLES:
            self.performance_metrics[tool_name].pop(0)
    
    def should_perform_health_check(self) -> bool:
        """Check if it's time for a health check."""
        elapsed = (datetime.now() - self.last_health_check).total_seconds()
        return elapsed >= self.health_check_interval