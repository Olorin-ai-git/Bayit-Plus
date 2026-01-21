"""
Enhanced Streaming - Real-time investigation updates with LangGraph streaming.

This module implements Phase 2 of the LangGraph enhancement plan, providing:
- Real-time investigation progress streaming
- Agent coordination streaming
- Performance metrics streaming
- WebSocket integration removed per spec 005 - using polling instead
"""

import asyncio
import json
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointer
from langgraph.graph import CompiledGraph

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class StreamEventType(Enum):
    """Types of stream events."""

    INVESTIGATION_START = "investigation_start"
    AGENT_START = "agent_start"
    AGENT_PROGRESS = "agent_progress"
    AGENT_COMPLETE = "agent_complete"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    RISK_UPDATE = "risk_update"
    FINDING = "finding"
    ERROR = "error"
    INVESTIGATION_COMPLETE = "investigation_complete"
    PERFORMANCE_METRIC = "performance_metric"


@dataclass
class StreamEvent:
    """Stream event data structure."""

    event_type: StreamEventType
    timestamp: str
    agent_name: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_type": self.event_type.value,
            "timestamp": self.timestamp,
            "agent_name": self.agent_name,
            "data": self.data,
            "metadata": self.metadata,
        }


class InvestigationStreamer:
    """Manages streaming of investigation updates."""

    def __init__(
        self, graph: CompiledGraph, checkpointer: Optional[BaseCheckpointer] = None
    ):
        """
        Initialize investigation streamer.

        Args:
            graph: Compiled LangGraph instance
            checkpointer: Optional checkpointer for state persistence
        """
        self.graph = graph
        self.checkpointer = checkpointer
        self.active_streams: Dict[str, asyncio.Queue] = {}
        self.performance_tracker = PerformanceTracker()

    async def stream_investigation(
        self, input_data: Dict[str, Any], config: RunnableConfig, investigation_id: str
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream investigation updates in real-time.

        Args:
            input_data: Investigation input data
            config: Runtime configuration
            investigation_id: Unique investigation ID

        Yields:
            Stream events as they occur
        """
        # Create event queue for this investigation
        event_queue = asyncio.Queue()
        self.active_streams[investigation_id] = event_queue

        try:
            # Start investigation
            start_event = StreamEvent(
                event_type=StreamEventType.INVESTIGATION_START,
                timestamp=datetime.now().isoformat(),
                data={"investigation_id": investigation_id, "input": input_data},
            )
            yield start_event

            # Start performance tracking
            self.performance_tracker.start_investigation(investigation_id)

            # Stream graph execution events
            async for chunk in self.graph.astream_events(
                input_data, config=config, version="v2"
            ):
                # Process and yield stream events
                stream_event = await self._process_chunk(chunk, investigation_id)
                if stream_event:
                    yield stream_event

                    # Track performance
                    if stream_event.event_type == StreamEventType.PERFORMANCE_METRIC:
                        self.performance_tracker.record_metric(
                            investigation_id, stream_event.data
                        )

            # Complete investigation
            completion_metrics = self.performance_tracker.get_investigation_metrics(
                investigation_id
            )
            completion_event = StreamEvent(
                event_type=StreamEventType.INVESTIGATION_COMPLETE,
                timestamp=datetime.now().isoformat(),
                data={
                    "investigation_id": investigation_id,
                    "duration": completion_metrics.get("total_duration", 0),
                    "agents_executed": completion_metrics.get("agents_executed", 0),
                },
            )
            yield completion_event

        except Exception as e:
            logger.error(f"Streaming error for investigation {investigation_id}: {e}")
            error_event = StreamEvent(
                event_type=StreamEventType.ERROR,
                timestamp=datetime.now().isoformat(),
                data={"error": str(e), "investigation_id": investigation_id},
            )
            yield error_event

        finally:
            # Cleanup
            if investigation_id in self.active_streams:
                del self.active_streams[investigation_id]
            self.performance_tracker.end_investigation(investigation_id)

    async def _process_chunk(
        self, chunk: Dict[str, Any], investigation_id: str
    ) -> Optional[StreamEvent]:
        """
        Process a stream chunk into a stream event.

        Args:
            chunk: Raw stream chunk from LangGraph
            investigation_id: Investigation ID

        Returns:
            Processed stream event or None
        """
        try:
            event = chunk.get("event", "")
            name = chunk.get("name", "")
            data = chunk.get("data", {})

            # Map LangGraph events to our stream events
            if event == "on_chain_start":
                if "agent" in name.lower():
                    return StreamEvent(
                        event_type=StreamEventType.AGENT_START,
                        timestamp=datetime.now().isoformat(),
                        agent_name=name,
                        data={"investigation_id": investigation_id},
                    )

            elif event == "on_chain_end":
                if "agent" in name.lower():
                    return StreamEvent(
                        event_type=StreamEventType.AGENT_COMPLETE,
                        timestamp=datetime.now().isoformat(),
                        agent_name=name,
                        data={
                            "investigation_id": investigation_id,
                            "output": data.get("output"),
                        },
                    )

            elif event == "on_tool_start":
                return StreamEvent(
                    event_type=StreamEventType.TOOL_CALL,
                    timestamp=datetime.now().isoformat(),
                    agent_name=chunk.get("tags", [None])[0],
                    data={
                        "tool": name,
                        "args": data.get("input"),
                        "investigation_id": investigation_id,
                    },
                )

            elif event == "on_tool_end":
                return StreamEvent(
                    event_type=StreamEventType.TOOL_RESULT,
                    timestamp=datetime.now().isoformat(),
                    agent_name=chunk.get("tags", [None])[0],
                    data={
                        "tool": name,
                        "result": data.get("output"),
                        "investigation_id": investigation_id,
                    },
                )

            elif event == "on_chain_stream":
                # Check for risk updates or findings
                if "risk" in str(data).lower():
                    return StreamEvent(
                        event_type=StreamEventType.RISK_UPDATE,
                        timestamp=datetime.now().isoformat(),
                        data={"investigation_id": investigation_id, "update": data},
                    )
                elif "finding" in str(data).lower():
                    return StreamEvent(
                        event_type=StreamEventType.FINDING,
                        timestamp=datetime.now().isoformat(),
                        data={"investigation_id": investigation_id, "finding": data},
                    )

            # Performance metrics
            if "latency" in data or "duration" in data:
                return StreamEvent(
                    event_type=StreamEventType.PERFORMANCE_METRIC,
                    timestamp=datetime.now().isoformat(),
                    data={"investigation_id": investigation_id, "metrics": data},
                )

        except Exception as e:
            logger.error(f"Error processing chunk: {e}")

        return None

    async def broadcast_event(self, investigation_id: str, event: StreamEvent):
        """
        Broadcast an event to all listeners for an investigation.

        Args:
            investigation_id: Investigation ID
            event: Event to broadcast
        """
        if investigation_id in self.active_streams:
            queue = self.active_streams[investigation_id]
            await queue.put(event)

    def get_active_investigations(self) -> List[str]:
        """Get list of active investigation IDs."""
        return list(self.active_streams.keys())


class PerformanceTracker:
    """Tracks performance metrics for investigations."""

    def __init__(self):
        """Initialize performance tracker."""
        self.investigations: Dict[str, Dict[str, Any]] = {}

    def start_investigation(self, investigation_id: str):
        """Start tracking an investigation."""
        self.investigations[investigation_id] = {
            "start_time": time.time(),
            "agents": {},
            "tools": {},
            "events": [],
        }

    def record_metric(self, investigation_id: str, metric_data: Dict[str, Any]):
        """Record a performance metric."""
        if investigation_id not in self.investigations:
            return

        investigation = self.investigations[investigation_id]
        investigation["events"].append({"timestamp": time.time(), "data": metric_data})

        # Track agent performance
        if "agent" in metric_data:
            agent_name = metric_data["agent"]
            if agent_name not in investigation["agents"]:
                investigation["agents"][agent_name] = {
                    "executions": 0,
                    "total_duration": 0,
                }
            investigation["agents"][agent_name]["executions"] += 1
            if "duration" in metric_data:
                investigation["agents"][agent_name]["total_duration"] += metric_data[
                    "duration"
                ]

        # Track tool performance
        if "tool" in metric_data:
            tool_name = metric_data["tool"]
            if tool_name not in investigation["tools"]:
                investigation["tools"][tool_name] = {"calls": 0, "total_duration": 0}
            investigation["tools"][tool_name]["calls"] += 1
            if "duration" in metric_data:
                investigation["tools"][tool_name]["total_duration"] += metric_data[
                    "duration"
                ]

    def end_investigation(self, investigation_id: str):
        """End tracking for an investigation."""
        if investigation_id in self.investigations:
            investigation = self.investigations[investigation_id]
            investigation["end_time"] = time.time()
            investigation["total_duration"] = (
                investigation["end_time"] - investigation["start_time"]
            )

    def get_investigation_metrics(self, investigation_id: str) -> Dict[str, Any]:
        """Get metrics for an investigation."""
        if investigation_id not in self.investigations:
            return {}

        investigation = self.investigations[investigation_id]

        return {
            "total_duration": investigation.get(
                "total_duration", time.time() - investigation["start_time"]
            ),
            "agents_executed": len(investigation["agents"]),
            "tools_called": sum(
                tool["calls"] for tool in investigation["tools"].values()
            ),
            "agent_metrics": investigation["agents"],
            "tool_metrics": investigation["tools"],
        }


# WebSocketStreamAdapter class removed per spec 005 - using polling-based updates instead
# class WebSocketStreamAdapter:
#     """Adapts stream events for WebSocket transmission."""
#
#     def __init__(self, websocket_manager):
#         """
#         Initialize WebSocket adapter.
#
#         Args:
#             websocket_manager: WebSocket connection manager
#         """
#         self.websocket_manager = websocket_manager
#
#     async def stream_to_websocket(
#         self,
#         streamer: InvestigationStreamer,
#         input_data: Dict[str, Any],
#         config: RunnableConfig,
#         investigation_id: str,
#         connection_id: str
#     ):
#         """
#         Stream investigation updates to WebSocket.
#
#         Args:
#             streamer: Investigation streamer
#             input_data: Investigation input
#             config: Runtime configuration
#             investigation_id: Investigation ID
#             connection_id: WebSocket connection ID
#         """
#         try:
#             async for event in streamer.stream_investigation(
#                 input_data,
#                 config,
#                 investigation_id
#             ):
#                 # Convert event to JSON
#                 event_json = json.dumps(event.to_dict())
#
#                 # Send to WebSocket
#                 await self.websocket_manager.send_message(
#                     connection_id,
#                     event_json
#                 )
#
#                 # Log progress
#                 if event.event_type in [
#                     StreamEventType.AGENT_COMPLETE,
#                     StreamEventType.RISK_UPDATE
#                 ]:
#                     logger.info(f"Streamed {event.event_type.value} for {investigation_id}")
#
#         except Exception as e:
#             logger.error(f"WebSocket streaming error: {e}")
#             error_event = StreamEvent(
#                 event_type=StreamEventType.ERROR,
#                 timestamp=datetime.now().isoformat(),
#                 data={"error": str(e)}
#             )
#             await self.websocket_manager.send_message(
#                 connection_id,
#                 json.dumps(error_event.to_dict())
#             )


async def stream_investigation_updates(
    graph: CompiledGraph,
    config: RunnableConfig,
    input_data: Dict[str, Any],
    investigation_id: str,
) -> AsyncIterator[Dict[str, Any]]:
    """
    Convenience function to stream investigation updates.

    Args:
        graph: Compiled LangGraph
        config: Runtime configuration
        input_data: Investigation input
        investigation_id: Investigation ID

    Yields:
        Stream events as dictionaries
    """
    streamer = InvestigationStreamer(graph)

    async for event in streamer.stream_investigation(
        input_data, config, investigation_id
    ):
        yield event.to_dict()
