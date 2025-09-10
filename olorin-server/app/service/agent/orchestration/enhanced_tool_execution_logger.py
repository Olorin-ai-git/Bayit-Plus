"""
Enhanced Tool Execution Logger for Hybrid Intelligence System

This module provides comprehensive logging and monitoring for tool execution
in the hybrid intelligence graph, with detailed error surfacing and debugging capabilities.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime
from dataclasses import asdict
import json

from langchain_core.tools import BaseTool
from langchain_core.runnables import RunnableConfig

from app.service.logging import get_bridge_logger
from app.utils.tool_error_categorization import (
    ToolErrorDetails,
    ToolExecutionMetrics,
    ToolExecutionStatus,
    ToolErrorCategory,
    create_tool_error_details
)
from app.service.agent.orchestration.hybrid.hybrid_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class EnhancedToolExecutionLogger:
    """
    Comprehensive tool execution logger with error surfacing and performance monitoring.
    
    Provides detailed logging for:
    - Tool execution attempts, successes, and failures
    - Comprehensive error categorization and recovery suggestions
    - Performance metrics and timing analysis
    - Integration with hybrid intelligence state management
    """
    
    def __init__(self, investigation_id: Optional[str] = None):
        """Initialize the tool execution logger."""
        self.investigation_id = investigation_id
        self._execution_metrics: Dict[str, ToolExecutionMetrics] = {}
        self._error_history: List[ToolErrorDetails] = []
        self._websocket_handlers: List[Callable] = []
        
        # Performance thresholds for warnings
        self.slow_execution_threshold_ms = 5000  # 5 seconds
        self.very_slow_execution_threshold_ms = 15000  # 15 seconds
        
        # Error rate thresholds
        self.error_rate_warning_threshold = 0.3  # 30% error rate
        self.error_rate_critical_threshold = 0.5  # 50% error rate
    
    def register_websocket_handler(self, handler: Callable):
        """Register a WebSocket event handler for real-time updates."""
        self._websocket_handlers.append(handler)
    
    async def log_tool_execution_start(
        self,
        tool_name: str,
        tool_args: Dict[str, Any],
        state: Optional[HybridInvestigationState] = None,
        attempt_number: int = 1,
        max_retries: int = 0
    ) -> str:
        """
        Log the start of tool execution with comprehensive context.
        
        Args:
            tool_name: Name of the tool being executed
            tool_args: Arguments passed to the tool
            state: Current investigation state
            attempt_number: Current retry attempt
            max_retries: Maximum retry attempts
            
        Returns:
            Execution ID for tracking
        """
        
        execution_id = f"{tool_name}_{int(time.time() * 1000)}"
        
        # Create execution metrics
        metrics = ToolExecutionMetrics(
            tool_name=tool_name,
            execution_status=ToolExecutionStatus.STARTED,
            investigation_id=self.investigation_id,
            attempt_number=attempt_number,
            max_retries=max_retries
        )
        
        self._execution_metrics[execution_id] = metrics
        
        # Extract entity context from state
        entity_type = state.get("entity_type") if state else "unknown"
        entity_id = state.get("entity_id") if state else "unknown"
        
        # Log execution start with detailed context
        logger.info(f"🛠️ TOOL EXECUTION STARTED: {tool_name}")
        logger.info(f"   Execution ID: {execution_id}")
        logger.info(f"   Investigation: {self.investigation_id}")
        logger.info(f"   Entity: {entity_type} - {entity_id}")
        logger.info(f"   Attempt: {attempt_number}/{max_retries + 1}")
        
        # Log tool arguments (sanitized)
        sanitized_args = self._sanitize_args(tool_args)
        if sanitized_args:
            logger.debug(f"   Arguments: {json.dumps(sanitized_args, indent=2)}")
        
        # Log investigation context if available
        if state:
            ai_confidence = state.get("ai_confidence", 0.0)
            orchestrator_loops = state.get("orchestrator_loops", 0)
            tools_used = len(state.get("tools_used", []))
            
            logger.debug(f"   Investigation Context:")
            logger.debug(f"     AI Confidence: {ai_confidence:.3f}")
            logger.debug(f"     Orchestrator Loops: {orchestrator_loops}")
            logger.debug(f"     Tools Previously Used: {tools_used}")
        
        # Emit WebSocket event
        await self._emit_websocket_event("tool_execution_started", {
            "execution_id": execution_id,
            "tool_name": tool_name,
            "investigation_id": self.investigation_id,
            "attempt_number": attempt_number,
            "max_retries": max_retries,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "args_summary": self._create_args_summary(tool_args)
        })
        
        return execution_id
    
    async def log_tool_execution_success(
        self,
        execution_id: str,
        result: Any,
        state: Optional[HybridInvestigationState] = None
    ):
        """
        Log successful tool execution with result analysis.
        
        Args:
            execution_id: Execution ID from start logging
            result: Tool execution result
            state: Updated investigation state
        """
        
        metrics = self._execution_metrics.get(execution_id)
        if not metrics:
            logger.warning(f"No metrics found for execution ID: {execution_id}")
            return
        
        # Update metrics
        metrics.mark_completed(result)
        
        # Analyze result quality
        result_analysis = self._analyze_result_quality(result, metrics.tool_name)
        metrics.data_completeness_score = result_analysis["completeness_score"]
        metrics.confidence_score = result_analysis["confidence_score"]
        
        # Log success with comprehensive metrics
        logger.info(f"✅ TOOL EXECUTION COMPLETED: {metrics.tool_name}")
        logger.info(f"   Execution ID: {execution_id}")
        logger.info(f"   Duration: {metrics.duration_ms}ms")
        logger.info(f"   Result Size: {metrics.result_size_bytes} bytes")
        logger.info(f"   Record Count: {metrics.result_record_count}")
        logger.info(f"   Data Completeness: {metrics.data_completeness_score:.3f}")
        logger.info(f"   Result Hash: {metrics.result_hash}")
        
        # Performance analysis
        if metrics.duration_ms:
            if metrics.duration_ms > self.very_slow_execution_threshold_ms:
                logger.warning(f"⚠️ VERY SLOW EXECUTION: {metrics.duration_ms}ms (threshold: {self.very_slow_execution_threshold_ms}ms)")
                logger.warning(f"   Tool: {metrics.tool_name}")
                logger.warning(f"   Consider optimization or timeout adjustment")
            elif metrics.duration_ms > self.slow_execution_threshold_ms:
                logger.warning(f"⚠️ Slow execution: {metrics.duration_ms}ms (threshold: {self.slow_execution_threshold_ms}ms)")
        
        # Result quality warnings
        if result_analysis["has_warnings"]:
            for warning in result_analysis["warnings"]:
                logger.warning(f"⚠️ Result Quality: {warning}")
        
        # Log investigation impact if state provided
        if state:
            self._log_investigation_impact(metrics.tool_name, state)
        
        # Emit WebSocket event
        await self._emit_websocket_event("tool_execution_completed", {
            "execution_id": execution_id,
            "tool_name": metrics.tool_name,
            "duration_ms": metrics.duration_ms,
            "result_summary": result_analysis["summary"],
            "completeness_score": metrics.data_completeness_score,
            "confidence_score": metrics.confidence_score,
            "performance_category": self._categorize_performance(metrics.duration_ms),
            "result_hash": metrics.result_hash
        })
    
    async def log_tool_execution_failure(
        self,
        execution_id: str,
        error: Exception,
        tool_args: Dict[str, Any],
        state: Optional[HybridInvestigationState] = None,
        http_status: Optional[int] = None
    ):
        """
        Log tool execution failure with comprehensive error analysis.
        
        Args:
            execution_id: Execution ID from start logging
            error: Exception that occurred
            tool_args: Arguments that were passed to the tool
            state: Investigation state at time of failure
            http_status: HTTP status code if applicable
        """
        
        metrics = self._execution_metrics.get(execution_id)
        if not metrics:
            logger.warning(f"No metrics found for execution ID: {execution_id}")
            return
        
        # Update metrics
        metrics.mark_failed(error)
        
        # Extract investigation context
        entity_type = state.get("entity_type") if state else None
        entity_id = state.get("entity_id") if state else None
        
        # Create comprehensive error details
        error_details = create_tool_error_details(
            error=error,
            tool_name=metrics.tool_name,
            tool_args=tool_args,
            execution_duration_ms=metrics.duration_ms,
            attempt_number=metrics.attempt_number,
            max_retries=metrics.max_retries,
            investigation_id=self.investigation_id,
            entity_type=entity_type,
            entity_id=entity_id,
            http_status=http_status
        )
        
        # Add to error history
        self._error_history.append(error_details)
        
        # Log comprehensive error information
        logger.error(f"❌ TOOL EXECUTION FAILED: {metrics.tool_name}")
        logger.error(f"   Execution ID: {execution_id}")
        logger.error(f"   Error Category: {error_details.category.value}")
        logger.error(f"   Error Type: {error_details.error_type}")
        logger.error(f"   Error Message: {error_details.error_message}")
        logger.error(f"   Duration: {metrics.duration_ms}ms")
        logger.error(f"   Attempt: {metrics.attempt_number}/{metrics.max_retries + 1}")
        
        if error_details.error_code:
            logger.error(f"   Error Code: {error_details.error_code}")
        
        # Log recovery information
        logger.error(f"   Is Retryable: {error_details.is_retryable}")
        logger.error(f"   Suggested Action: {error_details.suggested_action}")
        logger.error(f"   Recovery Strategy: {error_details.recovery_strategy}")
        logger.error(f"   Error Hash: {error_details.error_hash}")
        
        # Log investigation context
        if state:
            logger.error(f"   Investigation Context:")
            logger.error(f"     AI Confidence: {state.get('ai_confidence', 0.0):.3f}")
            logger.error(f"     Orchestrator Loops: {state.get('orchestrator_loops', 0)}")
            logger.error(f"     Previous Tools Used: {len(state.get('tools_used', []))}")
        
        # Analyze error patterns and trends
        error_analysis = self._analyze_error_patterns(metrics.tool_name)
        if error_analysis["should_warn"]:
            logger.warning(f"⚠️ ERROR PATTERN DETECTED:")
            logger.warning(f"   Tool: {metrics.tool_name}")
            logger.warning(f"   Recent Error Rate: {error_analysis['error_rate']:.1%}")
            logger.warning(f"   Common Error Category: {error_analysis['most_common_category']}")
            logger.warning(f"   Recommendation: {error_analysis['recommendation']}")
        
        # Add error to investigation state if provided
        if state and isinstance(state, dict):
            if "errors" not in state:
                state["errors"] = []
            
            state["errors"].append({
                "timestamp": error_details.timestamp,
                "tool_name": metrics.tool_name,
                "error_category": error_details.category.value,
                "error_type": error_details.error_type,
                "error_message": error_details.error_message,
                "error_hash": error_details.error_hash,
                "is_retryable": error_details.is_retryable,
                "recovery_action": error_details.suggested_action,
                "execution_id": execution_id
            })
        
        # Emit WebSocket event
        await self._emit_websocket_event("tool_execution_failed", {
            "execution_id": execution_id,
            "tool_name": metrics.tool_name,
            "error_category": error_details.category.value,
            "error_message": error_details.error_message,
            "error_code": error_details.error_code,
            "duration_ms": metrics.duration_ms,
            "is_retryable": error_details.is_retryable,
            "suggested_action": error_details.suggested_action,
            "attempt_number": metrics.attempt_number,
            "max_retries": metrics.max_retries,
            "error_hash": error_details.error_hash
        })
    
    async def log_empty_result(
        self,
        tool_name: str,
        execution_id: str,
        reason: str,
        context: Dict[str, Any] = None
    ):
        """
        Log when a tool returns empty results with detailed context.
        
        Args:
            tool_name: Name of the tool
            execution_id: Execution ID
            reason: Specific reason for empty result
            context: Additional context (query, filters, etc.)
        """
        
        logger.warning(f"📭 TOOL RETURNED EMPTY RESULT: {tool_name}")
        logger.warning(f"   Execution ID: {execution_id}")
        logger.warning(f"   Reason: {reason}")
        
        if context:
            logger.warning(f"   Context: {json.dumps(context, indent=2, default=str)}")
        
        # Common reasons for empty results
        common_reasons = {
            "no_data_found": "Query returned no matching records",
            "api_limit_reached": "API quota or rate limit exceeded", 
            "invalid_query": "Query parameters may be incorrect",
            "service_timeout": "External service timed out",
            "authentication_failed": "API authentication failed",
            "data_not_available": "Requested data is not available",
            "filter_too_restrictive": "Query filters may be too restrictive"
        }
        
        if reason in common_reasons:
            logger.warning(f"   Explanation: {common_reasons[reason]}")
        
        # Emit WebSocket event
        await self._emit_websocket_event("tool_empty_result", {
            "execution_id": execution_id,
            "tool_name": tool_name,
            "reason": reason,
            "context": context or {}
        })
    
    def get_execution_summary(self) -> Dict[str, Any]:
        """Get comprehensive execution summary for the investigation."""
        
        total_executions = len(self._execution_metrics)
        if total_executions == 0:
            return {"total_executions": 0, "summary": "No tool executions recorded"}
        
        # Calculate statistics
        completed = sum(1 for m in self._execution_metrics.values() 
                       if m.execution_status == ToolExecutionStatus.COMPLETED)
        failed = sum(1 for m in self._execution_metrics.values() 
                    if m.execution_status == ToolExecutionStatus.FAILED)
        
        success_rate = completed / total_executions if total_executions > 0 else 0.0
        
        # Calculate average duration
        durations = [m.duration_ms for m in self._execution_metrics.values() 
                    if m.duration_ms is not None]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        # Tool usage statistics
        tool_usage = {}
        for metrics in self._execution_metrics.values():
            tool_name = metrics.tool_name
            if tool_name not in tool_usage:
                tool_usage[tool_name] = {"total": 0, "successful": 0, "failed": 0}
            tool_usage[tool_name]["total"] += 1
            if metrics.execution_status == ToolExecutionStatus.COMPLETED:
                tool_usage[tool_name]["successful"] += 1
            elif metrics.execution_status == ToolExecutionStatus.FAILED:
                tool_usage[tool_name]["failed"] += 1
        
        # Error analysis
        error_categories = {}
        for error in self._error_history:
            category = error.category.value
            error_categories[category] = error_categories.get(category, 0) + 1
        
        return {
            "investigation_id": self.investigation_id,
            "total_executions": total_executions,
            "successful": completed,
            "failed": failed,
            "success_rate": success_rate,
            "average_duration_ms": avg_duration,
            "tool_usage": tool_usage,
            "error_categories": error_categories,
            "total_errors": len(self._error_history)
        }
    
    def _sanitize_args(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize tool arguments for logging."""
        if not args:
            return {}
        
        sanitized = {}
        sensitive_keys = ['password', 'token', 'key', 'secret', 'credential']
        
        for key, value in args.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            else:
                # Truncate long values
                str_value = str(value)
                if len(str_value) > 100:
                    sanitized[key] = str_value[:100] + "..."
                else:
                    sanitized[key] = value
        
        return sanitized
    
    def _create_args_summary(self, args: Dict[str, Any]) -> str:
        """Create a brief summary of tool arguments."""
        if not args:
            return "No arguments"
        
        key_args = []
        for key, value in args.items():
            if key.lower() in ['query', 'entity_id', 'entity_type', 'limit']:
                key_args.append(f"{key}={value}")
        
        if key_args:
            return ", ".join(key_args[:3])  # Show max 3 key arguments
        else:
            return f"{len(args)} arguments"
    
    def _analyze_result_quality(self, result: Any, tool_name: str) -> Dict[str, Any]:
        """Analyze the quality and completeness of tool results."""
        
        analysis = {
            "summary": "Empty result",
            "completeness_score": 0.0,
            "confidence_score": 0.5,  # Default neutral confidence
            "warnings": [],
            "has_warnings": False
        }
        
        if not result:
            analysis["warnings"].append("Tool returned empty result")
            analysis["has_warnings"] = True
            return analysis
        
        # Analyze different result types
        if isinstance(result, (list, tuple)):
            record_count = len(result)
            analysis["summary"] = f"{record_count} records"
            
            if record_count == 0:
                analysis["completeness_score"] = 0.0
                analysis["warnings"].append("No records returned")
            elif record_count < 5:
                analysis["completeness_score"] = 0.3
                analysis["warnings"].append("Very few records returned")
            elif record_count < 20:
                analysis["completeness_score"] = 0.7
            else:
                analysis["completeness_score"] = 1.0
                
            # Check for data quality indicators in results
            if result and isinstance(result[0], dict):
                sample_record = result[0]
                filled_fields = sum(1 for v in sample_record.values() if v is not None)
                total_fields = len(sample_record)
                field_completeness = filled_fields / total_fields if total_fields > 0 else 0.0
                analysis["confidence_score"] = field_completeness
                
                if field_completeness < 0.5:
                    analysis["warnings"].append("Many fields in results are empty")
        
        elif isinstance(result, dict):
            analysis["summary"] = f"Dict with {len(result)} keys"
            non_empty_values = sum(1 for v in result.values() if v is not None)
            analysis["completeness_score"] = non_empty_values / len(result) if result else 0.0
            
            if analysis["completeness_score"] < 0.5:
                analysis["warnings"].append("Many fields in result are empty")
        
        elif isinstance(result, str):
            analysis["summary"] = f"String ({len(result)} chars)"
            if len(result) == 0:
                analysis["completeness_score"] = 0.0
                analysis["warnings"].append("Empty string result")
            elif len(result) < 50:
                analysis["completeness_score"] = 0.5
                analysis["warnings"].append("Very short string result")
            else:
                analysis["completeness_score"] = 1.0
        
        # Tool-specific analysis
        if "snowflake" in tool_name.lower():
            if isinstance(result, list) and len(result) == 0:
                analysis["warnings"].append("Snowflake query returned no results - check query parameters")
        elif "threat" in tool_name.lower():
            if isinstance(result, dict) and not result.get("data"):
                analysis["warnings"].append("Threat intelligence API returned no threat data")
        
        analysis["has_warnings"] = len(analysis["warnings"]) > 0
        return analysis
    
    def _categorize_performance(self, duration_ms: Optional[int]) -> str:
        """Categorize performance based on execution time."""
        if not duration_ms:
            return "unknown"
        
        if duration_ms < 1000:
            return "excellent"
        elif duration_ms < 3000:
            return "good"
        elif duration_ms < 5000:
            return "acceptable"
        elif duration_ms < 15000:
            return "slow"
        else:
            return "very_slow"
    
    def _analyze_error_patterns(self, tool_name: str) -> Dict[str, Any]:
        """Analyze error patterns for a specific tool."""
        
        # Get recent errors for this tool (last 24 hours)
        recent_errors = [
            error for error in self._error_history
            if error.tool_name == tool_name and 
            (datetime.now() - datetime.fromisoformat(error.timestamp)).total_seconds() < 86400
        ]
        
        if not recent_errors:
            return {"should_warn": False, "error_rate": 0.0}
        
        # Calculate error rate
        total_executions = sum(1 for m in self._execution_metrics.values() 
                              if m.tool_name == tool_name)
        error_rate = len(recent_errors) / total_executions if total_executions > 0 else 0.0
        
        # Find most common error category
        category_counts = {}
        for error in recent_errors:
            category = error.category.value
            category_counts[category] = category_counts.get(category, 0) + 1
        
        most_common_category = max(category_counts.keys(), key=category_counts.get) if category_counts else "unknown"
        
        # Determine if we should warn
        should_warn = error_rate >= self.error_rate_warning_threshold
        
        # Generate recommendation
        recommendation = "Monitor tool performance"
        if error_rate >= self.error_rate_critical_threshold:
            recommendation = "Consider disabling tool or investigating root cause"
        elif error_rate >= self.error_rate_warning_threshold:
            recommendation = "Investigate recent failures and consider adjusting configuration"
        
        return {
            "should_warn": should_warn,
            "error_rate": error_rate,
            "most_common_category": most_common_category,
            "recommendation": recommendation,
            "recent_error_count": len(recent_errors)
        }
    
    def _log_investigation_impact(self, tool_name: str, state: HybridInvestigationState):
        """Log how the tool execution impacted the investigation."""
        
        ai_confidence = state.get("ai_confidence", 0.0)
        domains_completed = len(state.get("domains_completed", []))
        risk_score = state.get("risk_score", 0.0)
        
        logger.debug(f"   Investigation Impact:")
        logger.debug(f"     Current AI Confidence: {ai_confidence:.3f}")
        logger.debug(f"     Domains Completed: {domains_completed}/6")
        logger.debug(f"     Current Risk Score: {risk_score:.3f}")
        
        # Check if this tool significantly changed the investigation
        if ai_confidence > 0.8:
            logger.info(f"   🎯 High confidence investigation state achieved")
        elif domains_completed >= 4:
            logger.info(f"   📊 Substantial investigation coverage reached")
        elif risk_score > 0.7:
            logger.warning(f"   ⚠️ High risk score detected: {risk_score:.3f}")
    
    async def _emit_websocket_event(self, event_type: str, data: Dict[str, Any]):
        """Emit WebSocket event to registered handlers."""
        
        event = {
            "type": event_type,
            "timestamp": datetime.now().isoformat(),
            "investigation_id": self.investigation_id,
            "data": data
        }
        
        # Send to all registered handlers
        for handler in self._websocket_handlers:
            try:
                await handler(event)
            except Exception as e:
                logger.warning(f"WebSocket handler failed: {e}")
        
        # Try to send via global WebSocket system
        try:
            from app.router.handlers.websocket_handler import notify_websocket_connections
            await notify_websocket_connections(self.investigation_id, {
                "type": "enhanced_tool_event",
                "event": event
            })
        except (ImportError, Exception) as e:
            logger.debug(f"Global WebSocket emission skipped: {e}")


# Global logger instance
_global_tool_logger: Optional[EnhancedToolExecutionLogger] = None

def get_tool_execution_logger(investigation_id: Optional[str] = None) -> EnhancedToolExecutionLogger:
    """Get or create the global tool execution logger."""
    global _global_tool_logger
    
    if _global_tool_logger is None or _global_tool_logger.investigation_id != investigation_id:
        _global_tool_logger = EnhancedToolExecutionLogger(investigation_id)
    
    return _global_tool_logger


def reset_tool_execution_logger():
    """Reset the global tool execution logger (for testing)."""
    global _global_tool_logger
    _global_tool_logger = None