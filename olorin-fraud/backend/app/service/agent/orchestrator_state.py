"""
Enhanced Orchestrator State Management

Comprehensive investigation state tracking with orchestrator decision history,
agent coordination metadata, performance metrics, and recovery state management
for interrupted investigations.

Phase 2.3: State Management Enhancement Implementation
"""

import asyncio
import hashlib
import json
import threading
from collections import defaultdict, deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union

from app.service.agent.agent_coordination import (
    AgentType,
    CoordinationPlan,
    HandoffContext,
    HandoffTrigger,
)
from app.service.agent.flow_continuity import (
    CheckpointType,
    CompletionStatus,
    ContinuityStrategy,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class StateTransition(Enum):
    """Investigation state transitions"""

    INITIALIZED = "initialized"
    ORCHESTRATION_STARTED = "orchestration_started"
    AGENT_ACTIVATED = "agent_activated"
    AGENT_COMPLETED = "agent_completed"
    AGENT_FAILED = "agent_failed"
    HANDOFF_INITIATED = "handoff_initiated"
    HANDOFF_COMPLETED = "handoff_completed"
    STRATEGY_ADAPTED = "strategy_adapted"
    CHECKPOINT_CREATED = "checkpoint_created"
    RECOVERY_INITIATED = "recovery_initiated"
    INVESTIGATION_COMPLETED = "investigation_completed"
    INVESTIGATION_FAILED = "investigation_failed"


class MetricType(Enum):
    """Performance metric types"""

    EXECUTION_TIME = "execution_time"
    CONFIDENCE_SCORE = "confidence_score"
    SUCCESS_RATE = "success_rate"
    HANDOFF_EFFICIENCY = "handoff_efficiency"
    RECOVERY_TIME = "recovery_time"
    RESOURCE_UTILIZATION = "resource_utilization"
    QUALITY_SCORE = "quality_score"


@dataclass
class StateSnapshot:
    """Point-in-time snapshot of investigation state"""

    snapshot_id: str
    investigation_id: str
    timestamp: datetime
    transition: StateTransition
    orchestration_state: Dict[str, Any]
    agent_states: Dict[AgentType, Dict[str, Any]]
    coordination_metadata: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    decision_history: List[Dict[str, Any]]
    recovery_data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DecisionRecord:
    """Record of orchestrator decision with full context"""

    decision_id: str
    investigation_id: str
    timestamp: datetime
    decision_type: str
    context: Dict[str, Any]
    reasoning: str
    confidence_score: float
    alternatives_considered: List[Dict[str, Any]]
    outcome: Optional[Dict[str, Any]] = None
    impact_assessment: Optional[Dict[str, Any]] = None
    lessons_learned: List[str] = field(default_factory=list)


@dataclass
class PerformanceMetric:
    """Performance metric with historical tracking"""

    metric_id: str
    investigation_id: str
    metric_type: MetricType
    agent_type: Optional[AgentType]
    timestamp: datetime
    value: float
    context: Dict[str, Any]
    baseline_value: Optional[float] = None
    trend: Optional[str] = None  # "improving", "declining", "stable"


@dataclass
class RecoveryState:
    """State information for investigation recovery"""

    recovery_id: str
    investigation_id: str
    created_timestamp: datetime
    last_known_good_state: StateSnapshot
    failure_context: Dict[str, Any]
    recovery_strategy: ContinuityStrategy
    recovery_attempts: List[Dict[str, Any]]
    is_recoverable: bool
    priority_level: int


class OrchestratorStateManager:
    """
    Enhanced State Management System for structured investigation orchestration.

    Provides comprehensive state tracking, decision history, performance metrics,
    and recovery capabilities for interrupted investigations.
    """

    def __init__(self):
        self.state_snapshots: Dict[str, List[StateSnapshot]] = defaultdict(list)
        self.decision_history: Dict[str, List[DecisionRecord]] = defaultdict(list)
        self.performance_metrics: Dict[str, List[PerformanceMetric]] = defaultdict(list)
        self.recovery_states: Dict[str, RecoveryState] = {}
        self.active_investigations: Dict[str, Dict[str, Any]] = {}
        self.coordination_metadata: Dict[str, Dict[str, Any]] = defaultdict(dict)

        # Thread-safe access
        self._state_lock = threading.RLock()

        # Performance tracking
        self.metric_aggregations: Dict[str, Dict[str, deque]] = defaultdict(
            lambda: defaultdict(lambda: deque(maxlen=100))
        )

        # Recovery tracking
        self.recovery_success_rate: Dict[str, float] = defaultdict(float)

    async def initialize_investigation_state(
        self,
        investigation_id: str,
        initial_context: Dict[str, Any],
        coordination_plan: CoordinationPlan,
    ) -> StateSnapshot:
        """
        Initialize comprehensive state tracking for new investigation.

        Args:
            investigation_id: Unique investigation identifier
            initial_context: Initial investigation context and parameters
            coordination_plan: Orchestrator coordination plan

        Returns:
            Initial state snapshot
        """
        logger.info(
            f"🚀 Initializing state tracking for investigation {investigation_id}"
        )

        with self._state_lock:
            try:
                # Create initial state snapshot
                snapshot = await self._create_state_snapshot(
                    investigation_id=investigation_id,
                    transition=StateTransition.INITIALIZED,
                    orchestration_state={
                        "coordination_plan": asdict(coordination_plan),
                        "strategy": coordination_plan.execution_mode.value,
                        "status": "initialized",
                        "start_time": datetime.now().isoformat(),
                    },
                    agent_states={
                        agent: {
                            "status": "pending",
                            "assigned_at": datetime.now().isoformat(),
                        }
                        for agent in coordination_plan.agent_sequence
                    },
                    coordination_metadata={
                        "execution_mode": coordination_plan.execution_mode.value,
                        "agent_sequence": [
                            agent.value for agent in coordination_plan.agent_sequence
                        ],
                        "estimated_duration": coordination_plan.estimated_duration,
                        "risk_assessment": coordination_plan.risk_assessment,
                    },
                    context=initial_context,
                )

                # Initialize active investigation tracking
                self.active_investigations[investigation_id] = {
                    "start_time": datetime.now(),
                    "status": "active",
                    "current_agents": set(),
                    "completed_agents": set(),
                    "failed_agents": set(),
                    "handoff_count": 0,
                    "checkpoint_count": 0,
                    "recovery_count": 0,
                }

                # Initialize coordination metadata
                self.coordination_metadata[investigation_id] = {
                    "orchestration_decisions": 0,
                    "agent_handoffs": 0,
                    "strategy_adaptations": 0,
                    "checkpoints_created": 0,
                    "recovery_attempts": 0,
                }

                logger.info(
                    f"✅ Initialized state tracking with {len(coordination_plan.agent_sequence)} agents"
                )
                return snapshot

            except Exception as e:
                logger.error(f"🚨 Failed to initialize investigation state: {str(e)}")
                raise

    async def record_orchestration_decision(
        self,
        investigation_id: str,
        decision_type: str,
        context: Dict[str, Any],
        reasoning: str,
        confidence_score: float,
        alternatives: List[Dict[str, Any]] = None,
    ) -> DecisionRecord:
        """
        Record orchestrator decision with full context and reasoning.

        Args:
            investigation_id: Investigation identifier
            decision_type: Type of decision made
            context: Decision context and input data
            reasoning: AI reasoning for the decision
            confidence_score: Confidence in the decision
            alternatives: Alternative options considered

        Returns:
            Created decision record
        """
        logger.info(
            f"📝 Recording orchestration decision: {decision_type} for {investigation_id}"
        )

        with self._state_lock:
            try:
                # Generate unique decision ID
                decision_id = self._generate_decision_id(
                    investigation_id, decision_type
                )

                # Create comprehensive decision record
                decision_record = DecisionRecord(
                    decision_id=decision_id,
                    investigation_id=investigation_id,
                    timestamp=datetime.now(),
                    decision_type=decision_type,
                    context=context.copy(),
                    reasoning=reasoning,
                    confidence_score=confidence_score,
                    alternatives_considered=alternatives or [],
                )

                # Store decision record
                self.decision_history[investigation_id].append(decision_record)

                # Update coordination metadata
                self.coordination_metadata[investigation_id][
                    "orchestration_decisions"
                ] += 1

                # Create state snapshot for decision
                await self._create_state_snapshot(
                    investigation_id=investigation_id,
                    transition=StateTransition.ORCHESTRATION_STARTED,
                    orchestration_state={"latest_decision": asdict(decision_record)},
                    context={"decision_recorded": True},
                )

                logger.info(
                    f"✅ Recorded decision {decision_id} with confidence {confidence_score:.2f}"
                )
                return decision_record

            except Exception as e:
                logger.error(f"🚨 Failed to record orchestration decision: {str(e)}")
                raise

    async def track_agent_execution(
        self,
        investigation_id: str,
        agent_type: AgentType,
        execution_state: str,
        results: Dict[str, Any] = None,
        performance_data: Dict[str, Any] = None,
    ) -> StateSnapshot:
        """
        Track agent execution state and performance.

        Args:
            investigation_id: Investigation identifier
            agent_type: Type of agent being tracked
            execution_state: Current execution state
            results: Agent execution results
            performance_data: Performance metrics and timing data

        Returns:
            State snapshot with updated agent tracking
        """
        logger.info(
            f"🔍 Tracking agent execution: {agent_type.value} -> {execution_state}"
        )

        with self._state_lock:
            try:
                # Update active investigation tracking
                active_inv = self.active_investigations.get(investigation_id, {})

                if execution_state == "started":
                    active_inv.setdefault("current_agents", set()).add(agent_type)
                    transition = StateTransition.AGENT_ACTIVATED
                elif execution_state == "completed":
                    active_inv.setdefault("current_agents", set()).discard(agent_type)
                    active_inv.setdefault("completed_agents", set()).add(agent_type)
                    transition = StateTransition.AGENT_COMPLETED
                elif execution_state == "failed":
                    active_inv.setdefault("current_agents", set()).discard(agent_type)
                    active_inv.setdefault("failed_agents", set()).add(agent_type)
                    transition = StateTransition.AGENT_FAILED
                else:
                    transition = StateTransition.AGENT_ACTIVATED

                # Create agent state data
                agent_state = {
                    "status": execution_state,
                    "timestamp": datetime.now().isoformat(),
                    "results": results or {},
                    "performance": performance_data or {},
                }

                # Record performance metrics if available
                if performance_data:
                    await self._record_performance_metrics(
                        investigation_id, agent_type, performance_data
                    )

                # Create state snapshot
                snapshot = await self._create_state_snapshot(
                    investigation_id=investigation_id,
                    transition=transition,
                    orchestration_state={
                        "active_agents": len(active_inv.get("current_agents", []))
                    },
                    agent_states={agent_type: agent_state},
                    context={
                        "agent": agent_type.value,
                        "execution_state": execution_state,
                    },
                )

                logger.info(
                    f"✅ Tracked {agent_type.value} execution: {execution_state}"
                )
                return snapshot

            except Exception as e:
                logger.error(f"🚨 Failed to track agent execution: {str(e)}")
                raise

    async def record_handoff_completion(
        self,
        investigation_id: str,
        handoff_context: HandoffContext,
        success: bool,
        performance_data: Dict[str, Any] = None,
    ) -> StateSnapshot:
        """
        Record agent handoff completion with performance tracking.

        Args:
            investigation_id: Investigation identifier
            handoff_context: Handoff context and metadata
            success: Whether handoff was successful
            performance_data: Handoff performance metrics

        Returns:
            State snapshot with handoff tracking
        """
        logger.info(
            f"🔄 Recording handoff completion: {handoff_context.from_agent.value} -> {handoff_context.to_agent.value}"
        )

        with self._state_lock:
            try:
                # Update coordination metadata
                self.coordination_metadata[investigation_id]["agent_handoffs"] += 1

                # Update active investigation tracking
                active_inv = self.active_investigations.get(investigation_id, {})
                active_inv["handoff_count"] = active_inv.get("handoff_count", 0) + 1

                # Create handoff state data
                handoff_state = {
                    "from_agent": handoff_context.from_agent.value,
                    "to_agent": handoff_context.to_agent.value,
                    "trigger": handoff_context.trigger.value,
                    "success": success,
                    "confidence_score": handoff_context.confidence_score,
                    "reasoning": handoff_context.reasoning,
                    "timestamp": handoff_context.timestamp.isoformat(),
                    "performance": performance_data or {},
                }

                # Record handoff efficiency metric
                if performance_data and "duration_ms" in performance_data:
                    duration_ms = performance_data["duration_ms"]
                    # Guard against None or zero duration
                    if duration_ms and duration_ms > 0:
                        await self._record_performance_metric(
                            investigation_id=investigation_id,
                            metric_type=MetricType.HANDOFF_EFFICIENCY,
                            value=1.0
                            / (duration_ms / 1000.0),  # Inverse of duration in seconds
                            agent_type=handoff_context.to_agent,
                            context={"handoff_type": handoff_context.trigger.value},
                        )

                # Create state snapshot
                transition = (
                    StateTransition.HANDOFF_COMPLETED
                    if success
                    else StateTransition.HANDOFF_INITIATED
                )
                snapshot = await self._create_state_snapshot(
                    investigation_id=investigation_id,
                    transition=transition,
                    orchestration_state={"handoff_count": active_inv["handoff_count"]},
                    coordination_metadata={"latest_handoff": handoff_state},
                    context={"handoff_success": success},
                )

                logger.info(f"✅ Recorded handoff completion: success={success}")
                return snapshot

            except Exception as e:
                logger.error(f"🚨 Failed to record handoff completion: {str(e)}")
                raise

    async def create_recovery_state(
        self,
        investigation_id: str,
        failure_context: Dict[str, Any],
        recovery_strategy: ContinuityStrategy,
    ) -> RecoveryState:
        """
        Create recovery state for failed investigation.

        Args:
            investigation_id: Investigation identifier
            failure_context: Context and details of the failure
            recovery_strategy: Strategy to use for recovery

        Returns:
            Created recovery state
        """
        logger.info(f"🆘 Creating recovery state for investigation {investigation_id}")

        with self._state_lock:
            try:
                # Get last known good state
                snapshots = self.state_snapshots.get(investigation_id, [])
                last_good_snapshot = None

                # Find most recent successful state
                for snapshot in reversed(snapshots):
                    if snapshot.transition not in [
                        StateTransition.AGENT_FAILED,
                        StateTransition.INVESTIGATION_FAILED,
                    ]:
                        last_good_snapshot = snapshot
                        break

                if not last_good_snapshot and snapshots:
                    last_good_snapshot = snapshots[0]  # Use initial state as fallback

                # Generate recovery ID
                recovery_id = self._generate_recovery_id(investigation_id)

                # Create recovery state
                recovery_state = RecoveryState(
                    recovery_id=recovery_id,
                    investigation_id=investigation_id,
                    created_timestamp=datetime.now(),
                    last_known_good_state=last_good_snapshot,
                    failure_context=failure_context.copy(),
                    recovery_strategy=recovery_strategy,
                    recovery_attempts=[],
                    is_recoverable=self._assess_recoverability(failure_context),
                    priority_level=self._calculate_recovery_priority(failure_context),
                )

                # Store recovery state
                self.recovery_states[investigation_id] = recovery_state

                # Update investigation tracking
                active_inv = self.active_investigations.get(investigation_id, {})
                active_inv["recovery_count"] = active_inv.get("recovery_count", 0) + 1

                # Update coordination metadata
                self.coordination_metadata[investigation_id]["recovery_attempts"] += 1

                # Create state snapshot for recovery initiation
                await self._create_state_snapshot(
                    investigation_id=investigation_id,
                    transition=StateTransition.RECOVERY_INITIATED,
                    orchestration_state={
                        "recovery_id": recovery_id,
                        "recovery_strategy": recovery_strategy.value,
                    },
                    recovery_data={"recovery_state": asdict(recovery_state)},
                    context=failure_context,
                )

                logger.info(
                    f"✅ Created recovery state {recovery_id} with strategy {recovery_strategy.value}"
                )
                return recovery_state

            except Exception as e:
                logger.error(f"🚨 Failed to create recovery state: {str(e)}")
                raise

    async def get_investigation_summary(self, investigation_id: str) -> Dict[str, Any]:
        """
        Get comprehensive investigation state summary.

        Args:
            investigation_id: Investigation identifier

        Returns:
            Complete investigation state summary
        """
        with self._state_lock:
            try:
                # Get basic tracking data
                active_inv = self.active_investigations.get(investigation_id, {})
                snapshots = self.state_snapshots.get(investigation_id, [])
                decisions = self.decision_history.get(investigation_id, [])
                metrics = self.performance_metrics.get(investigation_id, [])
                coordination_meta = self.coordination_metadata.get(investigation_id, {})
                recovery_state = self.recovery_states.get(investigation_id)

                # Calculate summary statistics
                duration = None
                if active_inv.get("start_time"):
                    duration = (
                        datetime.now() - active_inv["start_time"]
                    ).total_seconds()

                # Agent completion statistics
                total_agents = (
                    len(active_inv.get("completed_agents", []))
                    + len(active_inv.get("failed_agents", []))
                    + len(active_inv.get("current_agents", []))
                )
                completion_rate = (
                    len(active_inv.get("completed_agents", [])) / total_agents
                    if total_agents > 0
                    else 0
                )

                # Performance summary
                avg_confidence = (
                    sum(d.confidence_score for d in decisions) / len(decisions)
                    if decisions
                    else 0
                )

                # Create comprehensive summary
                summary = {
                    "investigation_id": investigation_id,
                    "status": active_inv.get("status", "unknown"),
                    "duration_seconds": duration,
                    "agent_summary": {
                        "total_agents": total_agents,
                        "completed": len(active_inv.get("completed_agents", [])),
                        "failed": len(active_inv.get("failed_agents", [])),
                        "active": len(active_inv.get("current_agents", [])),
                        "completion_rate": completion_rate,
                    },
                    "orchestration_summary": {
                        "decisions_made": len(decisions),
                        "handoffs_executed": active_inv.get("handoff_count", 0),
                        "checkpoints_created": active_inv.get("checkpoint_count", 0),
                        "recovery_attempts": active_inv.get("recovery_count", 0),
                        "avg_decision_confidence": avg_confidence,
                    },
                    "performance_summary": {
                        "metrics_recorded": len(metrics),
                        "state_snapshots": len(snapshots),
                        "coordination_metadata": coordination_meta,
                    },
                    "recovery_status": {
                        "has_recovery_state": recovery_state is not None,
                        "is_recoverable": (
                            recovery_state.is_recoverable if recovery_state else None
                        ),
                        "recovery_priority": (
                            recovery_state.priority_level if recovery_state else None
                        ),
                    },
                    "timeline": [
                        {
                            "timestamp": s.timestamp.isoformat(),
                            "transition": s.transition.value,
                            "details": s.metadata.get("summary", "State transition"),
                        }
                        for s in snapshots[-10:]  # Last 10 transitions
                    ],
                }

                return summary

            except Exception as e:
                logger.error(f"🚨 Failed to get investigation summary: {str(e)}")
                return {"investigation_id": investigation_id, "error": str(e)}

    # Private helper methods

    async def _create_state_snapshot(
        self,
        investigation_id: str,
        transition: StateTransition,
        orchestration_state: Dict[str, Any] = None,
        agent_states: Dict[AgentType, Dict[str, Any]] = None,
        coordination_metadata: Dict[str, Any] = None,
        performance_metrics: Dict[str, Any] = None,
        decision_history: List[Dict[str, Any]] = None,
        recovery_data: Dict[str, Any] = None,
        context: Dict[str, Any] = None,
    ) -> StateSnapshot:
        """Create comprehensive state snapshot"""

        snapshot_id = self._generate_snapshot_id(investigation_id, transition)

        snapshot = StateSnapshot(
            snapshot_id=snapshot_id,
            investigation_id=investigation_id,
            timestamp=datetime.now(),
            transition=transition,
            orchestration_state=orchestration_state or {},
            agent_states=agent_states or {},
            coordination_metadata=coordination_metadata or {},
            performance_metrics=performance_metrics or {},
            decision_history=decision_history or [],
            recovery_data=recovery_data or {},
            metadata=context or {},
        )

        # Store snapshot
        self.state_snapshots[investigation_id].append(snapshot)

        # Cleanup old snapshots
        await self._cleanup_old_snapshots(investigation_id)

        return snapshot

    async def _record_performance_metrics(
        self,
        investigation_id: str,
        agent_type: AgentType,
        performance_data: Dict[str, Any],
    ):
        """Record performance metrics from agent execution"""

        for key, value in performance_data.items():
            if isinstance(value, (int, float)):
                metric_type = self._map_metric_type(key)
                if metric_type:
                    await self._record_performance_metric(
                        investigation_id=investigation_id,
                        metric_type=metric_type,
                        value=float(value),
                        agent_type=agent_type,
                        context={"source": "agent_execution"},
                    )

    async def _record_performance_metric(
        self,
        investigation_id: str,
        metric_type: MetricType,
        value: float,
        agent_type: Optional[AgentType] = None,
        context: Dict[str, Any] = None,
    ):
        """Record individual performance metric"""

        metric_id = self._generate_metric_id(investigation_id, metric_type, agent_type)

        metric = PerformanceMetric(
            metric_id=metric_id,
            investigation_id=investigation_id,
            metric_type=metric_type,
            agent_type=agent_type,
            timestamp=datetime.now(),
            value=value,
            context=context or {},
        )

        self.performance_metrics[investigation_id].append(metric)

        # Update aggregations for trend analysis
        key = f"{agent_type.value if agent_type else 'global'}_{metric_type.value}"
        self.metric_aggregations[investigation_id][key].append(value)

    def _generate_decision_id(self, investigation_id: str, decision_type: str) -> str:
        """Generate unique decision ID"""
        content = f"{investigation_id}_{decision_type}_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _generate_snapshot_id(
        self, investigation_id: str, transition: StateTransition
    ) -> str:
        """Generate unique snapshot ID"""
        content = f"{investigation_id}_{transition.value}_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _generate_metric_id(
        self,
        investigation_id: str,
        metric_type: MetricType,
        agent_type: Optional[AgentType],
    ) -> str:
        """Generate unique metric ID"""
        agent_str = agent_type.value if agent_type else "global"
        content = f"{investigation_id}_{metric_type.value}_{agent_str}_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _generate_recovery_id(self, investigation_id: str) -> str:
        """Generate unique recovery ID"""
        content = f"{investigation_id}_recovery_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _map_metric_type(self, key: str) -> Optional[MetricType]:
        """Map performance data key to metric type"""
        mapping = {
            "execution_time": MetricType.EXECUTION_TIME,
            "duration_ms": MetricType.EXECUTION_TIME,
            "confidence_score": MetricType.CONFIDENCE_SCORE,
            "confidence": MetricType.CONFIDENCE_SCORE,
            "success_rate": MetricType.SUCCESS_RATE,
            "quality_score": MetricType.QUALITY_SCORE,
            "resource_usage": MetricType.RESOURCE_UTILIZATION,
        }
        return mapping.get(key.lower())

    def _assess_recoverability(self, failure_context: Dict[str, Any]) -> bool:
        """Assess if investigation is recoverable based on failure context"""

        # Check critical failure indicators
        critical_failures = failure_context.get("critical_failures", [])
        if len(critical_failures) > 2:
            return False

        # Check if we have any successful partial results
        partial_results = failure_context.get("partial_results", {})
        if len(partial_results) > 0:
            return True

        # Check failure type severity
        failure_type = failure_context.get("failure_type", "unknown")
        if failure_type in ["catastrophic", "system_failure"]:
            return False

        return True  # Default to recoverable

    def _calculate_recovery_priority(self, failure_context: Dict[str, Any]) -> int:
        """Calculate recovery priority (1-10, higher is more urgent)"""

        priority = 5  # Base priority

        # Adjust based on investigation criticality
        if failure_context.get("time_critical", False):
            priority += 3

        if failure_context.get("high_value_investigation", False):
            priority += 2

        # Adjust based on completion state
        completion_rate = failure_context.get("completion_rate", 0)
        if completion_rate > 0.8:
            priority += 2  # High completion rate = high recovery value

        # Adjust based on failure type
        failure_type = failure_context.get("failure_type", "unknown")
        if failure_type == "transient":
            priority += 1
        elif failure_type == "catastrophic":
            priority -= 2

        return max(1, min(10, priority))

    async def _cleanup_old_snapshots(
        self, investigation_id: str, max_snapshots: int = 50
    ):
        """Cleanup old snapshots to prevent memory bloat"""

        snapshots = self.state_snapshots.get(investigation_id, [])
        if len(snapshots) > max_snapshots:
            # Keep most recent snapshots
            snapshots.sort(key=lambda s: s.timestamp, reverse=True)
            self.state_snapshots[investigation_id] = snapshots[:max_snapshots]


# Global state manager instance
_state_manager_instance = None


def get_orchestrator_state_manager() -> OrchestratorStateManager:
    """Get global orchestrator state manager instance"""
    global _state_manager_instance
    if _state_manager_instance is None:
        _state_manager_instance = OrchestratorStateManager()
    return _state_manager_instance
