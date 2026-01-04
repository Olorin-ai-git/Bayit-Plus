"""
Enhanced WebSocket Events for Autonomous Investigation Orchestrator

Real-time orchestrator decision events, agent coordination notifications,
investigation milestone tracking, and strategy adaptation notifications
for comprehensive investigation monitoring.

Phase 4.1: Enhanced WebSocket Events Implementation
"""

import asyncio
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.service.agent.agent_coordination import (
    AgentType,
    HandoffContext,
    HandoffTrigger,
)
from app.service.agent.autonomous_orchestrator import OrchestrationStrategy
from app.service.agent.orchestrator_state import (
    StateTransition,
    get_orchestrator_state_manager,
)
from app.service.logging import get_bridge_logger
from app.service.websocket_manager import AgentPhase, websocket_manager

logger = get_bridge_logger(__name__)

router = APIRouter()


class OrchestratorEventType(Enum):
    """Types of orchestrator WebSocket events"""

    DECISION_MADE = "decision_made"  # AI decision with reasoning
    STRATEGY_SELECTED = "strategy_selected"  # Investigation strategy chosen
    STRATEGY_ADAPTED = "strategy_adapted"  # Strategy changed mid-investigation
    AGENT_HANDOFF = "agent_handoff"  # Agent coordination handoff
    MILESTONE_REACHED = "milestone_reached"  # Investigation milestone
    PROGRESS_UPDATE = "progress_update"  # Progress percentage update
    PERFORMANCE_ALERT = "performance_alert"  # Performance issue detected
    QUALITY_ASSESSMENT = "quality_assessment"  # Quality check results
    ERROR_RECOVERY = "error_recovery"  # Error recovery in progress
    INVESTIGATION_COMPLETE = "investigation_complete"  # Investigation finished


class MilestoneType(Enum):
    """Investigation milestone types"""

    INVESTIGATION_STARTED = "investigation_started"
    ORCHESTRATION_COMPLETE = "orchestration_complete"
    AGENTS_DEPLOYED = "agents_deployed"
    FIRST_AGENT_COMPLETE = "first_agent_complete"
    MAJORITY_AGENTS_COMPLETE = "majority_agents_complete"
    ALL_AGENTS_COMPLETE = "all_agents_complete"
    RISK_ASSESSMENT_COMPLETE = "risk_assessment_complete"
    QUALITY_VALIDATION_COMPLETE = "quality_validation_complete"
    INVESTIGATION_FINALIZED = "investigation_finalized"


@dataclass
class OrchestratorEvent:
    """Enhanced orchestrator WebSocket event"""

    event_id: str
    investigation_id: str
    event_type: OrchestratorEventType
    timestamp: datetime
    event_data: Dict[str, Any]
    reasoning: Optional[str] = None
    confidence_score: Optional[float] = None
    impact_level: str = "medium"  # low, medium, high, critical
    metadata: Dict[str, Any] = None


@dataclass
class DecisionEvent:
    """Orchestrator decision event with transparency"""

    decision_id: str
    investigation_id: str
    decision_type: str
    decision_description: str
    reasoning: str
    confidence_score: float
    alternatives_considered: List[Dict[str, Any]]
    expected_outcome: str
    decision_factors: Dict[str, Any]
    timestamp: datetime


@dataclass
class HandoffEvent:
    """Agent handoff event with coordination details"""

    handoff_id: str
    investigation_id: str
    from_agent: str
    to_agent: str
    handoff_trigger: str
    context_data_size: int
    estimated_duration: int
    success_probability: float
    coordination_mode: str
    timestamp: datetime


@dataclass
class MilestoneEvent:
    """Investigation milestone event"""

    milestone_id: str
    investigation_id: str
    milestone_type: MilestoneType
    milestone_description: str
    progress_percentage: float
    agents_status: Dict[str, str]
    performance_metrics: Dict[str, Any]
    next_milestones: List[str]
    timestamp: datetime


class OrchestratorWebSocketHandler:
    """
    Enhanced WebSocket Handler for Autonomous Investigation Orchestrator.

    Provides real-time visibility into orchestrator decisions, agent coordination,
    investigation progress, and system performance with comprehensive event streaming.
    """

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.event_buffer: Dict[str, List[OrchestratorEvent]] = {}
        self.state_manager = get_orchestrator_state_manager()
        self.milestone_tracker: Dict[str, List[MilestoneType]] = {}

        # Event counters for analytics
        self.event_stats = {
            "total_events": 0,
            "events_by_type": {},
            "investigations_tracked": set(),
            "active_connections_count": 0,
        }

    async def handle_websocket_connection(
        self, websocket: WebSocket, investigation_id: str
    ):
        """
        Handle WebSocket connection for investigation monitoring.

        Args:
            websocket: WebSocket connection
            investigation_id: Investigation to monitor
        """
        try:
            await websocket.accept()

            # Add connection to active connections
            if investigation_id not in self.active_connections:
                self.active_connections[investigation_id] = set()
            self.active_connections[investigation_id].add(websocket)

            self.event_stats["active_connections_count"] = sum(
                len(connections) for connections in self.active_connections.values()
            )

            logger.info(f"🔗 WebSocket connected for investigation {investigation_id}")

            # Send initial state and buffered events
            await self._send_initial_state(websocket, investigation_id)
            await self._send_buffered_events(websocket, investigation_id)

            # Send connection confirmation
            await self._send_orchestrator_event(
                websocket=websocket,
                event_type=OrchestratorEventType.PROGRESS_UPDATE,
                investigation_id=investigation_id,
                event_data={
                    "message": "Connected to orchestrator events",
                    "connection_time": datetime.now().isoformat(),
                    "buffer_size": len(self.event_buffer.get(investigation_id, [])),
                },
                reasoning="WebSocket connection established successfully",
            )

            # Keep connection alive and handle incoming messages
            while True:
                try:
                    # Wait for incoming messages (ping/pong, filters, etc.)
                    message = await websocket.receive_text()
                    await self._handle_websocket_message(
                        websocket, investigation_id, message
                    )

                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.warning(f"WebSocket message handling error: {str(e)}")
                    break

        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"🚨 WebSocket connection error: {str(e)}")
        finally:
            # Clean up connection
            await self._cleanup_connection(websocket, investigation_id)

    async def broadcast_orchestrator_decision(
        self,
        investigation_id: str,
        decision_id: str,
        decision_type: str,
        reasoning: str,
        confidence_score: float,
        alternatives: List[Dict[str, Any]],
        decision_factors: Dict[str, Any],
    ):
        """
        Broadcast orchestrator decision with full transparency.

        Args:
            investigation_id: Investigation identifier
            decision_id: Unique decision identifier
            decision_type: Type of decision made
            reasoning: AI reasoning for the decision
            confidence_score: Decision confidence
            alternatives: Alternative options considered
            decision_factors: Factors influencing the decision
        """
        logger.info(
            f"📡 Broadcasting orchestrator decision: {decision_type} for {investigation_id}"
        )

        try:
            # Create decision event
            decision_event = DecisionEvent(
                decision_id=decision_id,
                investigation_id=investigation_id,
                decision_type=decision_type,
                decision_description=f"Orchestrator made {decision_type} decision",
                reasoning=reasoning,
                confidence_score=confidence_score,
                alternatives_considered=alternatives,
                expected_outcome=self._predict_decision_outcome(
                    decision_type, decision_factors
                ),
                decision_factors=decision_factors,
                timestamp=datetime.now(),
            )

            # Create orchestrator event
            orchestrator_event = OrchestratorEvent(
                event_id=f"decision_{decision_id}",
                investigation_id=investigation_id,
                event_type=OrchestratorEventType.DECISION_MADE,
                timestamp=datetime.now(),
                event_data=asdict(decision_event),
                reasoning=reasoning,
                confidence_score=confidence_score,
                impact_level=self._assess_decision_impact(
                    decision_type, confidence_score
                ),
                metadata={"decision_factors_count": len(decision_factors)},
            )

            # Broadcast to all connections
            await self._broadcast_event(investigation_id, orchestrator_event)

            # Update statistics
            self._update_event_stats(OrchestratorEventType.DECISION_MADE)

        except Exception as e:
            logger.error(f"🚨 Failed to broadcast orchestrator decision: {str(e)}")

    async def broadcast_agent_handoff(
        self,
        investigation_id: str,
        handoff_context: HandoffContext,
        coordination_mode: str,
        estimated_duration: int,
    ):
        """
        Broadcast agent handoff event with coordination details.

        Args:
            investigation_id: Investigation identifier
            handoff_context: Agent handoff context
            coordination_mode: Coordination mode being used
            estimated_duration: Estimated handoff duration
        """
        logger.info(
            f"🔄 Broadcasting agent handoff: {handoff_context.from_agent.value} → {handoff_context.to_agent.value}"
        )

        try:
            # Create handoff event
            handoff_event = HandoffEvent(
                handoff_id=f"handoff_{handoff_context.from_agent.value}_{handoff_context.to_agent.value}",
                investigation_id=investigation_id,
                from_agent=handoff_context.from_agent.value,
                to_agent=handoff_context.to_agent.value,
                handoff_trigger=handoff_context.trigger.value,
                context_data_size=len(handoff_context.shared_data),
                estimated_duration=estimated_duration,
                success_probability=handoff_context.confidence_score,
                coordination_mode=coordination_mode,
                timestamp=handoff_context.timestamp,
            )

            # Create orchestrator event
            orchestrator_event = OrchestratorEvent(
                event_id=f"handoff_{handoff_event.handoff_id}",
                investigation_id=investigation_id,
                event_type=OrchestratorEventType.AGENT_HANDOFF,
                timestamp=datetime.now(),
                event_data=asdict(handoff_event),
                reasoning=handoff_context.reasoning,
                confidence_score=handoff_context.confidence_score,
                impact_level=self._assess_handoff_impact(handoff_context.trigger),
                metadata={
                    "expected_outcomes": handoff_context.expected_outcomes,
                    "coordination_mode": coordination_mode,
                },
            )

            # Broadcast to all connections
            await self._broadcast_event(investigation_id, orchestrator_event)

            # Update statistics
            self._update_event_stats(OrchestratorEventType.AGENT_HANDOFF)

        except Exception as e:
            logger.error(f"🚨 Failed to broadcast agent handoff: {str(e)}")

    async def broadcast_investigation_milestone(
        self,
        investigation_id: str,
        milestone_type: MilestoneType,
        progress_percentage: float,
        agents_status: Dict[str, str],
        performance_metrics: Dict[str, Any],
    ):
        """
        Broadcast investigation milestone achievement.

        Args:
            investigation_id: Investigation identifier
            milestone_type: Type of milestone reached
            progress_percentage: Current progress percentage
            agents_status: Status of all agents
            performance_metrics: Current performance metrics
        """
        logger.info(
            f"🎯 Broadcasting investigation milestone: {milestone_type.value} ({progress_percentage:.1f}%)"
        )

        try:
            # Track milestone
            if investigation_id not in self.milestone_tracker:
                self.milestone_tracker[investigation_id] = []
            self.milestone_tracker[investigation_id].append(milestone_type)

            # Predict next milestones
            next_milestones = self._predict_next_milestones(
                milestone_type, agents_status
            )

            # Create milestone event
            milestone_event = MilestoneEvent(
                milestone_id=f"milestone_{milestone_type.value}_{investigation_id}",
                investigation_id=investigation_id,
                milestone_type=milestone_type,
                milestone_description=self._get_milestone_description(milestone_type),
                progress_percentage=progress_percentage,
                agents_status=agents_status,
                performance_metrics=performance_metrics,
                next_milestones=next_milestones,
                timestamp=datetime.now(),
            )

            # Create orchestrator event
            orchestrator_event = OrchestratorEvent(
                event_id=f"milestone_{milestone_event.milestone_id}",
                investigation_id=investigation_id,
                event_type=OrchestratorEventType.MILESTONE_REACHED,
                timestamp=datetime.now(),
                event_data=asdict(milestone_event),
                reasoning=f"Investigation reached {milestone_type.value} milestone",
                confidence_score=self._calculate_milestone_confidence(
                    progress_percentage, agents_status
                ),
                impact_level=self._assess_milestone_impact(milestone_type),
                metadata={
                    "total_milestones_reached": len(
                        self.milestone_tracker.get(investigation_id, [])
                    ),
                    "agents_active": len(
                        [s for s in agents_status.values() if s == "active"]
                    ),
                },
            )

            # Broadcast to all connections
            await self._broadcast_event(investigation_id, orchestrator_event)

            # Update statistics
            self._update_event_stats(OrchestratorEventType.MILESTONE_REACHED)

        except Exception as e:
            logger.error(f"🚨 Failed to broadcast investigation milestone: {str(e)}")

    async def broadcast_strategy_adaptation(
        self,
        investigation_id: str,
        old_strategy: str,
        new_strategy: str,
        adaptation_reason: str,
        confidence_impact: float,
    ):
        """
        Broadcast real-time strategy adaptation.

        Args:
            investigation_id: Investigation identifier
            old_strategy: Previous strategy
            new_strategy: New adapted strategy
            adaptation_reason: Reason for adaptation
            confidence_impact: Impact on overall confidence
        """
        logger.info(
            f"🔧 Broadcasting strategy adaptation: {old_strategy} → {new_strategy}"
        )

        try:
            # Create orchestrator event
            orchestrator_event = OrchestratorEvent(
                event_id=f"strategy_adapt_{investigation_id}_{int(datetime.now().timestamp())}",
                investigation_id=investigation_id,
                event_type=OrchestratorEventType.STRATEGY_ADAPTED,
                timestamp=datetime.now(),
                event_data={
                    "old_strategy": old_strategy,
                    "new_strategy": new_strategy,
                    "adaptation_reason": adaptation_reason,
                    "confidence_impact": confidence_impact,
                    "adaptation_time": datetime.now().isoformat(),
                    "strategy_effectiveness": self._assess_strategy_effectiveness(
                        new_strategy
                    ),
                },
                reasoning=f"Strategy adapted due to: {adaptation_reason}",
                confidence_score=max(0.1, 0.8 + confidence_impact),
                impact_level=self._assess_adaptation_impact(confidence_impact),
                metadata={
                    "adaptation_trigger": adaptation_reason,
                    "strategy_change_count": self._get_strategy_change_count(
                        investigation_id
                    ),
                },
            )

            # Broadcast to all connections
            await self._broadcast_event(investigation_id, orchestrator_event)

            # Update statistics
            self._update_event_stats(OrchestratorEventType.STRATEGY_ADAPTED)

        except Exception as e:
            logger.error(f"🚨 Failed to broadcast strategy adaptation: {str(e)}")

    async def broadcast_progress_update(
        self,
        investigation_id: str,
        progress_percentage: float,
        current_phase: str,
        active_agents: List[str],
        estimated_completion: Optional[datetime] = None,
    ):
        """
        Broadcast investigation progress update.

        Args:
            investigation_id: Investigation identifier
            progress_percentage: Current progress percentage
            current_phase: Current investigation phase
            active_agents: Currently active agents
            estimated_completion: Estimated completion time
        """
        try:
            # Create orchestrator event
            orchestrator_event = OrchestratorEvent(
                event_id=f"progress_{investigation_id}_{int(progress_percentage)}",
                investigation_id=investigation_id,
                event_type=OrchestratorEventType.PROGRESS_UPDATE,
                timestamp=datetime.now(),
                event_data={
                    "progress_percentage": progress_percentage,
                    "current_phase": current_phase,
                    "active_agents": active_agents,
                    "estimated_completion": (
                        estimated_completion.isoformat()
                        if estimated_completion
                        else None
                    ),
                    "progress_velocity": self._calculate_progress_velocity(
                        investigation_id, progress_percentage
                    ),
                    "bottlenecks": self._identify_progress_bottlenecks(active_agents),
                },
                reasoning=f"Investigation {progress_percentage:.1f}% complete in {current_phase} phase",
                confidence_score=self._calculate_progress_confidence(
                    progress_percentage, active_agents
                ),
                impact_level="medium",
                metadata={"agents_count": len(active_agents), "phase": current_phase},
            )

            # Broadcast to all connections
            await self._broadcast_event(investigation_id, orchestrator_event)

            # Update statistics
            self._update_event_stats(OrchestratorEventType.PROGRESS_UPDATE)

        except Exception as e:
            logger.error(f"🚨 Failed to broadcast progress update: {str(e)}")

    # Private helper methods

    async def _send_initial_state(self, websocket: WebSocket, investigation_id: str):
        """Send initial investigation state to new connection"""
        try:
            # Get current investigation summary
            summary = await self.state_manager.get_investigation_summary(
                investigation_id
            )

            # Send initial state event
            await self._send_orchestrator_event(
                websocket=websocket,
                event_type=OrchestratorEventType.PROGRESS_UPDATE,
                investigation_id=investigation_id,
                event_data={
                    "initial_state": True,
                    "investigation_summary": summary,
                    "connection_established": datetime.now().isoformat(),
                },
                reasoning="Initial state provided to new WebSocket connection",
            )

        except Exception as e:
            logger.warning(f"Failed to send initial state: {str(e)}")

    async def _send_buffered_events(self, websocket: WebSocket, investigation_id: str):
        """Send buffered events to new connection"""
        try:
            buffered_events = self.event_buffer.get(investigation_id, [])

            for event in buffered_events[-10:]:  # Send last 10 events
                await self._send_orchestrator_event(
                    websocket=websocket,
                    event_type=event.event_type,
                    investigation_id=event.investigation_id,
                    event_data=event.event_data,
                    reasoning=event.reasoning,
                    confidence_score=event.confidence_score,
                )

                # Small delay to prevent overwhelming
                await asyncio.sleep(0.1)

        except Exception as e:
            logger.warning(f"Failed to send buffered events: {str(e)}")

    async def _handle_websocket_message(
        self, websocket: WebSocket, investigation_id: str, message: str
    ):
        """Handle incoming WebSocket messages (filters, commands, etc.)"""
        try:
            data = json.loads(message)
            message_type = data.get("type")

            if message_type == "ping":
                await websocket.send_text(
                    json.dumps(
                        {"type": "pong", "timestamp": datetime.now().isoformat()}
                    )
                )

            elif message_type == "filter":
                # Handle event filtering (implementation would store filters per connection)
                filters = data.get("filters", [])
                logger.info(f"WebSocket filters updated: {filters}")

            elif message_type == "request_summary":
                # Send current investigation summary
                summary = await self.state_manager.get_investigation_summary(
                    investigation_id
                )
                await websocket.send_text(
                    json.dumps({"type": "summary_response", "data": summary})
                )

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON message received: {message}")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {str(e)}")

    async def _cleanup_connection(self, websocket: WebSocket, investigation_id: str):
        """Clean up WebSocket connection"""
        try:
            if investigation_id in self.active_connections:
                self.active_connections[investigation_id].discard(websocket)

                # Remove empty connection sets
                if not self.active_connections[investigation_id]:
                    del self.active_connections[investigation_id]

            self.event_stats["active_connections_count"] = sum(
                len(connections) for connections in self.active_connections.values()
            )

            logger.info(
                f"🔗 WebSocket disconnected for investigation {investigation_id}"
            )

        except Exception as e:
            logger.warning(f"Error during WebSocket cleanup: {str(e)}")

    async def _broadcast_event(self, investigation_id: str, event: OrchestratorEvent):
        """Broadcast event to all active connections for investigation"""
        if investigation_id not in self.active_connections:
            # Buffer the event for future connections
            self._buffer_event(investigation_id, event)
            return

        connections = self.active_connections[investigation_id].copy()

        for websocket in connections:
            try:
                await self._send_orchestrator_event(
                    websocket=websocket,
                    event_type=event.event_type,
                    investigation_id=event.investigation_id,
                    event_data=event.event_data,
                    reasoning=event.reasoning,
                    confidence_score=event.confidence_score,
                )

            except Exception as e:
                logger.warning(f"Failed to send event to WebSocket: {str(e)}")
                # Remove failed connection
                self.active_connections[investigation_id].discard(websocket)

        # Buffer the event
        self._buffer_event(investigation_id, event)

    async def _send_orchestrator_event(
        self,
        websocket: WebSocket,
        event_type: OrchestratorEventType,
        investigation_id: str,
        event_data: Dict[str, Any],
        reasoning: Optional[str] = None,
        confidence_score: Optional[float] = None,
    ):
        """Send orchestrator event to specific WebSocket"""
        try:
            message = {
                "type": "orchestrator_event",
                "event_type": event_type.value,
                "investigation_id": investigation_id,
                "timestamp": datetime.now().isoformat(),
                "data": event_data,
                "reasoning": reasoning,
                "confidence_score": confidence_score,
            }

            await websocket.send_text(json.dumps(message))

        except Exception as e:
            logger.warning(f"Failed to send WebSocket event: {str(e)}")
            raise

    def _buffer_event(self, investigation_id: str, event: OrchestratorEvent):
        """Buffer event for investigation"""
        if investigation_id not in self.event_buffer:
            self.event_buffer[investigation_id] = []

        self.event_buffer[investigation_id].append(event)

        # Keep only last 50 events per investigation
        if len(self.event_buffer[investigation_id]) > 50:
            self.event_buffer[investigation_id] = self.event_buffer[investigation_id][
                -50:
            ]

    def _update_event_stats(self, event_type: OrchestratorEventType):
        """Update event statistics"""
        self.event_stats["total_events"] += 1

        if event_type.value not in self.event_stats["events_by_type"]:
            self.event_stats["events_by_type"][event_type.value] = 0
        self.event_stats["events_by_type"][event_type.value] += 1

    # Utility methods for event processing

    def _predict_decision_outcome(
        self, decision_type: str, factors: Dict[str, Any]
    ) -> str:
        """Predict outcome of orchestrator decision"""
        if decision_type in ["strategy_selection", "coordination_mode"]:
            return "Improved investigation efficiency expected"
        elif decision_type == "agent_handoff":
            return "Specialized analysis with higher accuracy"
        else:
            return "Enhanced investigation capabilities"

    def _assess_decision_impact(self, decision_type: str, confidence: float) -> str:
        """Assess impact level of decision"""
        if confidence > 0.8 and decision_type in [
            "strategy_selection",
            "critical_handoff",
        ]:
            return "high"
        elif confidence > 0.6:
            return "medium"
        else:
            return "low"

    def _assess_handoff_impact(self, trigger: HandoffTrigger) -> str:
        """Assess impact level of agent handoff"""
        if trigger in [HandoffTrigger.FAILURE_RECOVERY, HandoffTrigger.STRATEGY_CHANGE]:
            return "high"
        elif trigger == HandoffTrigger.EXPERTISE_NEEDED:
            return "medium"
        else:
            return "low"

    def _predict_next_milestones(
        self, current_milestone: MilestoneType, agents_status: Dict[str, str]
    ) -> List[str]:
        """Predict next investigation milestones"""
        active_agents = sum(
            1 for status in agents_status.values() if status == "active"
        )
        completed_agents = sum(
            1 for status in agents_status.values() if status == "completed"
        )

        if current_milestone == MilestoneType.AGENTS_DEPLOYED:
            return ["first_agent_complete", "majority_agents_complete"]
        elif current_milestone == MilestoneType.FIRST_AGENT_COMPLETE:
            return ["majority_agents_complete", "all_agents_complete"]
        elif current_milestone == MilestoneType.MAJORITY_AGENTS_COMPLETE:
            return ["all_agents_complete", "risk_assessment_complete"]
        else:
            return ["investigation_finalized"]

    def _get_milestone_description(self, milestone_type: MilestoneType) -> str:
        """Get human-readable milestone description"""
        descriptions = {
            MilestoneType.INVESTIGATION_STARTED: "Investigation has been initiated",
            MilestoneType.ORCHESTRATION_COMPLETE: "Orchestrator has completed initial analysis",
            MilestoneType.AGENTS_DEPLOYED: "All agents have been deployed for analysis",
            MilestoneType.FIRST_AGENT_COMPLETE: "First agent has completed its analysis",
            MilestoneType.MAJORITY_AGENTS_COMPLETE: "Majority of agents have completed analysis",
            MilestoneType.ALL_AGENTS_COMPLETE: "All agents have completed their analysis",
            MilestoneType.RISK_ASSESSMENT_COMPLETE: "Final risk assessment has been completed",
            MilestoneType.QUALITY_VALIDATION_COMPLETE: "Quality validation has been completed",
            MilestoneType.INVESTIGATION_FINALIZED: "Investigation has been finalized",
        }
        return descriptions.get(milestone_type, "Investigation milestone reached")

    def _calculate_milestone_confidence(
        self, progress: float, agents_status: Dict[str, str]
    ) -> float:
        """Calculate confidence score for milestone"""
        base_confidence = progress / 100.0

        # Boost confidence if agents are performing well
        successful_agents = sum(
            1 for status in agents_status.values() if status in ["completed", "active"]
        )
        total_agents = len(agents_status) if agents_status else 1
        agent_success_rate = successful_agents / total_agents

        return min(1.0, base_confidence * 0.7 + agent_success_rate * 0.3)

    def _assess_milestone_impact(self, milestone_type: MilestoneType) -> str:
        """Assess impact level of milestone"""
        high_impact = [
            MilestoneType.INVESTIGATION_STARTED,
            MilestoneType.ALL_AGENTS_COMPLETE,
            MilestoneType.INVESTIGATION_FINALIZED,
        ]
        if milestone_type in high_impact:
            return "high"
        else:
            return "medium"

    def _assess_strategy_effectiveness(self, strategy: str) -> Dict[str, Any]:
        """Assess effectiveness of investigation strategy"""
        return {
            "expected_accuracy": 0.85,
            "expected_completion_time": 300,
            "resource_efficiency": 0.8,
            "strategy_confidence": 0.75,
        }

    def _assess_adaptation_impact(self, confidence_impact: float) -> str:
        """Assess impact of strategy adaptation"""
        if abs(confidence_impact) > 0.2:
            return "high"
        elif abs(confidence_impact) > 0.1:
            return "medium"
        else:
            return "low"

    def _get_strategy_change_count(self, investigation_id: str) -> int:
        """Get number of strategy changes for investigation"""
        events = self.event_buffer.get(investigation_id, [])
        return sum(
            1
            for event in events
            if event.event_type == OrchestratorEventType.STRATEGY_ADAPTED
        )

    def _calculate_progress_velocity(
        self, investigation_id: str, current_progress: float
    ) -> float:
        """Calculate investigation progress velocity"""
        # Simplified implementation - would track progress over time
        return 2.5  # Progress points per minute

    def _identify_progress_bottlenecks(self, active_agents: List[str]) -> List[str]:
        """Identify progress bottlenecks"""
        bottlenecks = []

        if len(active_agents) > 3:
            bottlenecks.append("Too many concurrent agents")
        elif len(active_agents) == 0:
            bottlenecks.append("No active agents")

        return bottlenecks

    def _calculate_progress_confidence(
        self, progress: float, active_agents: List[str]
    ) -> float:
        """Calculate confidence in progress measurement"""
        base_confidence = min(progress / 100.0, 1.0)

        # Adjust based on agent activity
        if len(active_agents) > 0:
            base_confidence = min(1.0, base_confidence + 0.1)

        return base_confidence


# Global WebSocket handler instance
_websocket_handler_instance = None


def get_orchestrator_websocket_handler() -> OrchestratorWebSocketHandler:
    """Get global orchestrator WebSocket handler instance"""
    global _websocket_handler_instance
    if _websocket_handler_instance is None:
        _websocket_handler_instance = OrchestratorWebSocketHandler()
    return _websocket_handler_instance


# FastAPI WebSocket endpoint
@router.websocket("/ws/orchestrator/{investigation_id}")
async def orchestrator_websocket(websocket: WebSocket, investigation_id: str):
    """
    WebSocket endpoint for real-time orchestrator events.

    Provides real-time visibility into:
    - Orchestrator decisions with reasoning
    - Agent coordination and handoffs
    - Investigation milestones and progress
    - Strategy adaptations
    - Performance alerts and quality assessments
    """
    handler = get_orchestrator_websocket_handler()
    await handler.handle_websocket_connection(websocket, investigation_id)
