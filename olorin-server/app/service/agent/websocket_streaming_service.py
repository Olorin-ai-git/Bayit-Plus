"""
WebSocket Streaming Service

Real-time streaming of agent thoughts, tool executions, and pattern events.
Provides rich real-time feedback for investigation progress visualization.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class StreamEventType(Enum):
    """Types of streaming events"""
    
    # Agent thoughts and reasoning
    AGENT_THOUGHT = "agent_thought"
    REASONING_START = "reasoning_start"
    REASONING_COMPLETE = "reasoning_complete"
    
    # Tool execution events
    TOOL_EXECUTION = "tool_execution"
    TOOL_RESULT = "tool_result"
    TOOL_ERROR = "tool_error"
    
    # Pattern-specific events
    CHAIN_START = "chain_start"
    CHAIN_COMPLETE = "chain_complete"
    STEP_START = "step_start"
    STEP_COMPLETE = "step_complete"
    
    ROUTE_CLASSIFICATION = "route_classification"
    ROUTE_EXECUTION = "route_execution"
    
    PARALLEL_START = "parallel_start"
    PARALLEL_COMPLETE = "parallel_complete"
    TASK_START = "task_start"
    TASK_COMPLETE = "task_complete"
    
    ORCHESTRATION_START = "orchestration_start"
    ORCHESTRATION_COMPLETE = "orchestration_complete"
    WORKER_ASSIGNMENT = "worker_assignment"
    WORKER_COMPLETE = "worker_complete"
    
    OPTIMIZATION_START = "optimization_start"
    OPTIMIZATION_CYCLE = "optimization_cycle"
    OPTIMIZATION_COMPLETE = "optimization_complete"
    
    # General events
    INVESTIGATION_START = "investigation_start"
    INVESTIGATION_COMPLETE = "investigation_complete"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class StreamPriority(Enum):
    """Priority levels for streaming events"""
    
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


class WebSocketStreamingService:
    """
    Service for streaming real-time investigation updates via WebSocket.
    
    Provides rich feedback including:
    - Agent reasoning processes
    - Tool execution status
    - Pattern-specific events
    - Progress indicators
    - Error notifications
    """
    
    def __init__(
        self,
        investigation_id: str,
        websocket_manager: Optional[Any] = None,
        entity_context: Optional[Dict[str, Any]] = None
    ):
        """Initialize the streaming service"""
        self.investigation_id = investigation_id
        self.websocket_manager = websocket_manager
        self.entity_context = entity_context or {}
        
        # Event filtering and batching
        self.event_filters: List[StreamEventType] = []
        self.batch_events = False
        self.batch_size = 10
        self.batch_timeout = 5  # seconds
        self._event_batch: List[Dict[str, Any]] = []
        
        # Performance tracking
        self.events_sent = 0
        self.last_event_time = datetime.now()
        self.start_time = datetime.now()
    
    async def send_agent_thought(self, thought_data: Dict[str, Any]) -> None:
        """Send agent thought/reasoning event"""
        
        event = self._create_base_event(StreamEventType.AGENT_THOUGHT, StreamPriority.NORMAL)
        event.update({
            "thought": thought_data.get("message", ""),
            "pattern": thought_data.get("pattern", "unknown"),
            "confidence": thought_data.get("confidence", 0.0),
            "reasoning_stage": thought_data.get("type", "general"),
            "metadata": {k: v for k, v in thought_data.items() if k not in ["message", "pattern", "confidence", "type"]}
        })
        
        await self._send_event(event)
    
    async def send_tool_execution(self, tool_data: Dict[str, Any]) -> None:
        """Send tool execution event"""
        
        event = self._create_base_event(StreamEventType.TOOL_EXECUTION, StreamPriority.HIGH)
        event.update({
            "tool_name": tool_data.get("tool_name", "unknown"),
            "tool_args": tool_data.get("args", {}),
            "execution_stage": tool_data.get("stage", "start"),
            "expected_duration": tool_data.get("expected_duration", 30),
            "metadata": tool_data.get("metadata", {})
        })
        
        await self._send_event(event)
    
    async def send_tool_result(self, tool_name: str, result: Any, success: bool = True) -> None:
        """Send tool execution result"""
        
        event = self._create_base_event(StreamEventType.TOOL_RESULT, StreamPriority.HIGH)
        event.update({
            "tool_name": tool_name,
            "success": success,
            "result_summary": str(result)[:200] + "..." if len(str(result)) > 200 else str(result),
            "result_type": type(result).__name__,
            "execution_time": self._calculate_execution_time()
        })
        
        await self._send_event(event)
    
    async def send_tool_error(self, tool_name: str, error_message: str) -> None:
        """Send tool execution error"""
        
        event = self._create_base_event(StreamEventType.TOOL_ERROR, StreamPriority.CRITICAL)
        event.update({
            "tool_name": tool_name,
            "error_message": error_message,
            "error_type": "tool_execution_error",
            "retry_suggested": True
        })
        
        await self._send_event(event)
    
    # Pattern-specific streaming methods
    
    async def send_chain_start(self, chain_type: str, steps: List[str]) -> None:
        """Send prompt chain start event"""
        
        event = self._create_base_event(StreamEventType.CHAIN_START, StreamPriority.NORMAL)
        event.update({
            "chain_type": chain_type,
            "total_steps": len(steps),
            "step_names": steps,
            "estimated_duration": len(steps) * 30  # 30s per step estimate
        })
        
        await self._send_event(event)
    
    async def send_chain_complete(self, chain_type: str, success: bool, results: Dict[str, Any]) -> None:
        """Send prompt chain completion event"""
        
        event = self._create_base_event(StreamEventType.CHAIN_COMPLETE, StreamPriority.NORMAL)
        event.update({
            "chain_type": chain_type,
            "success": success,
            "steps_completed": results.get("steps_completed", 0),
            "total_steps": results.get("total_steps", 0),
            "overall_confidence": results.get("confidence", 0.0),
            "execution_time": self._calculate_execution_time()
        })
        
        await self._send_event(event)
    
    async def send_step_progress(self, step_name: str, step_number: int, total_steps: int) -> None:
        """Send step progress update"""
        
        event = self._create_base_event(StreamEventType.STEP_START, StreamPriority.LOW)
        event.update({
            "step_name": step_name,
            "step_number": step_number,
            "total_steps": total_steps,
            "progress_percentage": (step_number / total_steps) * 100 if total_steps > 0 else 0
        })
        
        await self._send_event(event)
    
    async def send_route_classification(self, route: str, confidence: float, reasoning: str) -> None:
        """Send routing classification result"""
        
        event = self._create_base_event(StreamEventType.ROUTE_CLASSIFICATION, StreamPriority.NORMAL)
        event.update({
            "selected_route": route,
            "confidence": confidence,
            "reasoning": reasoning,
            "classification_time": self._calculate_execution_time()
        })
        
        await self._send_event(event)
    
    async def send_parallel_start(self, task_count: int, strategy: str) -> None:
        """Send parallelization start event"""
        
        event = self._create_base_event(StreamEventType.PARALLEL_START, StreamPriority.NORMAL)
        event.update({
            "parallel_tasks": task_count,
            "strategy": strategy,
            "estimated_duration": task_count * 20  # Parallel execution estimate
        })
        
        await self._send_event(event)
    
    async def send_parallel_progress(self, completed_tasks: int, total_tasks: int, current_task: str) -> None:
        """Send parallel execution progress"""
        
        event = self._create_base_event(StreamEventType.TASK_START, StreamPriority.LOW)
        event.update({
            "completed_tasks": completed_tasks,
            "total_tasks": total_tasks,
            "current_task": current_task,
            "progress_percentage": (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0
        })
        
        await self._send_event(event)
    
    async def send_orchestration_start(self, worker_count: int, task_breakdown: List[Dict[str, Any]]) -> None:
        """Send orchestration start event"""
        
        event = self._create_base_event(StreamEventType.ORCHESTRATION_START, StreamPriority.NORMAL)
        event.update({
            "worker_count": worker_count,
            "total_tasks": len(task_breakdown),
            "task_breakdown": task_breakdown,
            "estimated_duration": len(task_breakdown) * 45  # Orchestrated task estimate
        })
        
        await self._send_event(event)
    
    async def send_worker_assignment(self, worker_name: str, task_name: str, specialization: str) -> None:
        """Send worker task assignment event"""
        
        event = self._create_base_event(StreamEventType.WORKER_ASSIGNMENT, StreamPriority.LOW)
        event.update({
            "worker_name": worker_name,
            "task_name": task_name,
            "specialization": specialization,
            "assignment_time": datetime.now().isoformat()
        })
        
        await self._send_event(event)
    
    async def send_optimization_cycle(self, cycle: int, quality_score: float, improvements: List[str]) -> None:
        """Send optimization cycle event"""
        
        event = self._create_base_event(StreamEventType.OPTIMIZATION_CYCLE, StreamPriority.NORMAL)
        event.update({
            "cycle_number": cycle,
            "quality_score": quality_score,
            "improvements_identified": improvements,
            "optimization_progress": f"Cycle {cycle} quality assessment"
        })
        
        await self._send_event(event)
    
    # General events
    
    async def send_investigation_start(self, investigation_type: str, entity_details: Dict[str, Any]) -> None:
        """Send investigation start event"""
        
        event = self._create_base_event(StreamEventType.INVESTIGATION_START, StreamPriority.HIGH)
        event.update({
            "investigation_type": investigation_type,
            "entity_id": entity_details.get("entity_id", "unknown"),
            "entity_type": entity_details.get("entity_type", "unknown"),
            "priority": entity_details.get("priority", "medium"),
            "estimated_completion": entity_details.get("estimated_completion", "5-10 minutes")
        })
        
        await self._send_event(event)
    
    async def send_investigation_complete(
        self,
        success: bool,
        results: Dict[str, Any],
        execution_summary: Dict[str, Any]
    ) -> None:
        """Send investigation completion event"""
        
        event = self._create_base_event(StreamEventType.INVESTIGATION_COMPLETE, StreamPriority.HIGH)
        event.update({
            "success": success,
            "final_confidence": results.get("confidence", 0.0),
            "risk_score": results.get("risk_score", "unknown"),
            "recommendations_count": len(results.get("recommendations", [])),
            "execution_summary": execution_summary,
            "total_execution_time": self._calculate_total_execution_time(),
            "events_streamed": self.events_sent
        })
        
        await self._send_event(event)
    
    async def send_error(self, error_message: str, error_context: Dict[str, Any]) -> None:
        """Send error event"""
        
        event = self._create_base_event(StreamEventType.ERROR, StreamPriority.CRITICAL)
        event.update({
            "error_message": error_message,
            "error_context": error_context,
            "timestamp": datetime.now().isoformat(),
            "investigation_state": "error_occurred"
        })
        
        await self._send_event(event)
    
    async def send_warning(self, warning_message: str, context: Dict[str, Any] = None) -> None:
        """Send warning event"""
        
        event = self._create_base_event(StreamEventType.WARNING, StreamPriority.NORMAL)
        event.update({
            "warning_message": warning_message,
            "context": context or {},
            "timestamp": datetime.now().isoformat()
        })
        
        await self._send_event(event)
    
    async def send_info(self, info_message: str, details: Dict[str, Any] = None) -> None:
        """Send informational event"""
        
        event = self._create_base_event(StreamEventType.INFO, StreamPriority.LOW)
        event.update({
            "info_message": info_message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        })
        
        await self._send_event(event)
    
    # Utility methods
    
    def _create_base_event(self, event_type: StreamEventType, priority: StreamPriority) -> Dict[str, Any]:
        """Create base event structure"""
        
        return {
            "event_id": f"{self.investigation_id}_{self.events_sent}_{datetime.now().timestamp()}",
            "event_type": event_type.value,
            "priority": priority.value,
            "investigation_id": self.investigation_id,
            "timestamp": datetime.now().isoformat(),
            "entity_context": self.entity_context,
            "sequence_number": self.events_sent
        }
    
    async def _send_event(self, event: Dict[str, Any]) -> None:
        """Send event via WebSocket or batch for later sending"""
        
        # Apply event filters
        event_type = StreamEventType(event["event_type"])
        if self.event_filters and event_type not in self.event_filters:
            return
        
        self.events_sent += 1
        self.last_event_time = datetime.now()
        
        if self.batch_events:
            self._event_batch.append(event)
            
            if len(self._event_batch) >= self.batch_size:
                await self._flush_batch()
        else:
            await self._send_single_event(event)
    
    async def _send_single_event(self, event: Dict[str, Any]) -> None:
        """Send a single event via WebSocket"""
        
        if self.websocket_manager:
            try:
                # Format event for WebSocket transmission
                ws_message = {
                    "type": "investigation_update",
                    "data": event
                }
                
                # Send via WebSocket manager
                await self.websocket_manager.send_to_investigation(
                    self.investigation_id,
                    json.dumps(ws_message)
                )
                
            except Exception as e:
                logger.error(f"Failed to send WebSocket event: {str(e)}")
        else:
            # Log event if no WebSocket available
            logger.info(f"Stream event: {event['event_type']} - {event.get('thought', event.get('info_message', 'Event'))}")
    
    async def _flush_batch(self) -> None:
        """Flush batched events"""
        
        if not self._event_batch:
            return
        
        batch_message = {
            "type": "investigation_batch_update",
            "data": {
                "events": self._event_batch,
                "batch_size": len(self._event_batch),
                "investigation_id": self.investigation_id
            }
        }
        
        if self.websocket_manager:
            try:
                await self.websocket_manager.send_to_investigation(
                    self.investigation_id,
                    json.dumps(batch_message)
                )
            except Exception as e:
                logger.error(f"Failed to send WebSocket batch: {str(e)}")
        
        self._event_batch.clear()
    
    def _calculate_execution_time(self) -> float:
        """Calculate time since last event"""
        return (datetime.now() - self.last_event_time).total_seconds()
    
    def _calculate_total_execution_time(self) -> float:
        """Calculate total execution time since service start"""
        return (datetime.now() - self.start_time).total_seconds()
    
    def set_event_filters(self, filters: List[StreamEventType]) -> None:
        """Set event type filters"""
        self.event_filters = filters
    
    def enable_batching(self, batch_size: int = 10, timeout: int = 5) -> None:
        """Enable event batching"""
        self.batch_events = True
        self.batch_size = batch_size
        self.batch_timeout = timeout
    
    def disable_batching(self) -> None:
        """Disable event batching"""
        self.batch_events = False
    
    async def close(self) -> None:
        """Close the streaming service and flush any pending events"""
        
        if self.batch_events and self._event_batch:
            await self._flush_batch()
        
        # Send final statistics
        await self.send_info("Streaming service closed", {
            "total_events_sent": self.events_sent,
            "total_execution_time": self._calculate_total_execution_time(),
            "average_event_rate": self.events_sent / self._calculate_total_execution_time() if self._calculate_total_execution_time() > 0 else 0
        })