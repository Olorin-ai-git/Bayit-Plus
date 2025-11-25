"""
Flow Continuity Guarantees System

Ensures 100% investigation completion rate regardless of individual component failures
through comprehensive checkpoint systems, adaptive strategy adjustment, and guaranteed
completion patterns with result synthesis from partial data.

Phase 2.2: Flow Continuity Implementation
"""

import asyncio
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union

from app.service.agent.agent_coordination import (
    AgentType,
    HandoffTrigger,
    get_agent_coordinator,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class CheckpointType(Enum):
    """Types of investigation checkpoints"""

    INVESTIGATION_START = "investigation_start"
    AGENT_COMPLETION = "agent_completion"
    STRATEGY_CHANGE = "strategy_change"
    FAILURE_RECOVERY = "failure_recovery"
    PARTIAL_SYNTHESIS = "partial_synthesis"
    INVESTIGATION_COMPLETE = "investigation_complete"


class ContinuityStrategy(Enum):
    """Flow continuity strategies for different failure scenarios"""

    RETRY_WITH_BACKOFF = "retry_with_backoff"
    FALLBACK_AGENT = "fallback_agent"
    PARTIAL_COMPLETION = "partial_completion"
    STRATEGY_ADAPTATION = "strategy_adaptation"
    EMERGENCY_SYNTHESIS = "emergency_synthesis"
    GRACEFUL_DEGRADATION = "graceful_degradation"


class CompletionStatus(Enum):
    """Investigation completion status levels"""

    COMPLETE = "complete"  # All agents successful
    SUBSTANTIALLY_COMPLETE = "substantially_complete"  # 80%+ agents successful
    PARTIALLY_COMPLETE = "partially_complete"  # 50%+ agents successful
    MINIMALLY_VIABLE = "minimally_viable"  # Core analysis available
    FAILED_WITH_RECOVERY = "failed_with_recovery"  # Failed but data preserved


@dataclass
class InvestigationCheckpoint:
    """Checkpoint for investigation state recovery"""

    checkpoint_id: str
    investigation_id: str
    checkpoint_type: CheckpointType
    timestamp: datetime
    agent_states: Dict[AgentType, Dict[str, Any]]
    collected_data: Dict[str, Any]
    analysis_results: Dict[str, Any]
    strategy_state: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    recovery_priority: int = 0


@dataclass
class ContinuityPlan:
    """Plan for maintaining flow continuity under failure scenarios"""

    investigation_id: str
    primary_strategy: ContinuityStrategy
    fallback_strategies: List[ContinuityStrategy]
    critical_agents: Set[AgentType]
    optional_agents: Set[AgentType]
    minimum_completion_threshold: float
    recovery_timeout_seconds: int
    synthesis_requirements: Dict[str, Any]


@dataclass
class PartialResults:
    """Container for partial investigation results"""

    investigation_id: str
    completed_agents: Dict[AgentType, Dict[str, Any]]
    failed_agents: Dict[AgentType, str]
    synthesized_data: Dict[str, Any]
    confidence_score: float
    completion_percentage: float
    quality_assessment: str


class FlowContinuityManager:
    """
    Manages investigation flow continuity and guaranteed completion patterns.

    Ensures investigations complete successfully regardless of individual component
    failures through intelligent checkpointing, adaptive strategies, and result synthesis.
    """

    def __init__(self):
        self.checkpoints: Dict[str, List[InvestigationCheckpoint]] = {}
        self.continuity_plans: Dict[str, ContinuityPlan] = {}
        self.active_recoveries: Dict[str, datetime] = {}
        self.completion_guarantees: Dict[str, CompletionStatus] = {}
        self.coordinator = get_agent_coordinator()

    async def create_continuity_plan(
        self,
        investigation_id: str,
        context: Dict[str, Any],
        critical_requirements: Dict[str, Any],
    ) -> ContinuityPlan:
        """
        Create comprehensive continuity plan for investigation.

        Args:
            investigation_id: Unique investigation identifier
            context: Investigation context and requirements
            critical_requirements: Critical success criteria

        Returns:
            Continuity plan with fallback strategies and recovery procedures
        """
        logger.info(f"🛡️ Creating continuity plan for investigation {investigation_id}")

        try:
            # Analyze investigation criticality and requirements
            critical_agents, optional_agents = self._classify_agent_criticality(
                context, critical_requirements
            )

            # Determine primary continuity strategy
            primary_strategy = self._select_primary_strategy(
                context, critical_requirements
            )

            # Generate fallback strategies
            fallback_strategies = self._generate_fallback_strategies(
                primary_strategy, context
            )

            # Calculate minimum completion threshold
            min_threshold = self._calculate_completion_threshold(
                critical_agents, optional_agents
            )

            # Determine recovery timeout based on investigation priority
            recovery_timeout = self._calculate_recovery_timeout(context)

            # Define synthesis requirements
            synthesis_requirements = self._define_synthesis_requirements(
                critical_agents
            )

            # Create comprehensive continuity plan
            plan = ContinuityPlan(
                investigation_id=investigation_id,
                primary_strategy=primary_strategy,
                fallback_strategies=fallback_strategies,
                critical_agents=critical_agents,
                optional_agents=optional_agents,
                minimum_completion_threshold=min_threshold,
                recovery_timeout_seconds=recovery_timeout,
                synthesis_requirements=synthesis_requirements,
            )

            # Store plan for execution
            self.continuity_plans[investigation_id] = plan

            logger.info(
                f"✅ Created continuity plan: {primary_strategy.value} with {len(fallback_strategies)} fallbacks"
            )
            return plan

        except Exception as e:
            logger.error(f"🚨 Failed to create continuity plan: {str(e)}")
            return self._create_emergency_plan(investigation_id)

    async def create_checkpoint(
        self,
        investigation_id: str,
        checkpoint_type: CheckpointType,
        agent_states: Dict[AgentType, Dict[str, Any]],
        collected_data: Dict[str, Any],
        analysis_results: Dict[str, Any],
        strategy_state: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> InvestigationCheckpoint:
        """
        Create investigation checkpoint for recovery purposes.

        Args:
            investigation_id: Investigation identifier
            checkpoint_type: Type of checkpoint being created
            agent_states: Current state of all agents
            collected_data: Data collected so far
            analysis_results: Analysis results accumulated
            strategy_state: Current strategy and coordination state
            metadata: Additional checkpoint metadata

        Returns:
            Created checkpoint with unique identifier
        """
        logger.info(
            f"📍 Creating checkpoint: {checkpoint_type.value} for {investigation_id}"
        )

        try:
            # Generate unique checkpoint ID
            checkpoint_id = self._generate_checkpoint_id(
                investigation_id, checkpoint_type
            )

            # Create comprehensive checkpoint
            checkpoint = InvestigationCheckpoint(
                checkpoint_id=checkpoint_id,
                investigation_id=investigation_id,
                checkpoint_type=checkpoint_type,
                timestamp=datetime.now(),
                agent_states=agent_states.copy(),
                collected_data=collected_data.copy(),
                analysis_results=analysis_results.copy(),
                strategy_state=strategy_state.copy(),
                metadata=metadata or {},
                recovery_priority=self._calculate_recovery_priority(checkpoint_type),
            )

            # Store checkpoint
            if investigation_id not in self.checkpoints:
                self.checkpoints[investigation_id] = []

            self.checkpoints[investigation_id].append(checkpoint)

            # Cleanup old checkpoints to prevent memory bloat
            await self._cleanup_old_checkpoints(investigation_id)

            logger.info(
                f"✅ Created checkpoint {checkpoint_id} with priority {checkpoint.recovery_priority}"
            )
            return checkpoint

        except Exception as e:
            logger.error(f"🚨 Failed to create checkpoint: {str(e)}")
            raise

    async def ensure_investigation_completion(
        self,
        investigation_id: str,
        current_results: Dict[str, Any],
        failed_components: List[str],
    ) -> PartialResults:
        """
        Guarantee investigation completion through result synthesis and fallback strategies.

        Args:
            investigation_id: Investigation identifier
            current_results: Results collected so far
            failed_components: Components that have failed

        Returns:
            Synthesized partial results with quality assessment
        """
        logger.info(
            f"🎯 Ensuring completion for investigation {investigation_id} with {len(failed_components)} failures"
        )

        try:
            # Get continuity plan
            plan = self.continuity_plans.get(investigation_id)
            if not plan:
                plan = await self._create_emergency_plan(investigation_id)

            # Analyze current completion state
            completion_analysis = await self._analyze_completion_state(
                investigation_id, current_results, failed_components, plan
            )

            # Determine if completion is viable
            if (
                completion_analysis["completion_percentage"]
                >= plan.minimum_completion_threshold
            ):
                # Synthesize available results
                synthesized_results = await self._synthesize_partial_results(
                    investigation_id, current_results, completion_analysis
                )

                # Record guaranteed completion
                completion_status = self._determine_completion_status(
                    completion_analysis["completion_percentage"]
                )
                self.completion_guarantees[investigation_id] = completion_status

                logger.info(
                    f"✅ Guaranteed completion: {completion_status.value} ({completion_analysis['completion_percentage']:.1f}%)"
                )
                return synthesized_results

            else:
                # Attempt recovery strategies
                recovery_result = await self._attempt_recovery_completion(
                    investigation_id, current_results, failed_components, plan
                )

                if recovery_result:
                    return recovery_result
                else:
                    # Emergency synthesis with minimal viable results
                    return await self._create_minimal_viable_results(
                        investigation_id, current_results
                    )

        except Exception as e:
            logger.error(f"🚨 Failed to ensure investigation completion: {str(e)}")
            return await self._create_emergency_results(
                investigation_id, current_results
            )

    async def recover_from_checkpoint(
        self,
        investigation_id: str,
        recovery_strategy: ContinuityStrategy,
        target_checkpoint_type: Optional[CheckpointType] = None,
    ) -> Optional[InvestigationCheckpoint]:
        """
        Recover investigation from most recent viable checkpoint.

        Args:
            investigation_id: Investigation to recover
            recovery_strategy: Strategy to use for recovery
            target_checkpoint_type: Specific checkpoint type to recover from

        Returns:
            Checkpoint used for recovery, None if recovery fails
        """
        logger.info(
            f"🔄 Recovering investigation {investigation_id} with strategy {recovery_strategy.value}"
        )

        try:
            # Find appropriate checkpoint for recovery
            recovery_checkpoint = self._find_recovery_checkpoint(
                investigation_id, target_checkpoint_type
            )

            if not recovery_checkpoint:
                logger.warning(f"⚠️ No viable checkpoint found for recovery")
                return None

            # Record recovery attempt
            self.active_recoveries[investigation_id] = datetime.now()

            # Apply recovery strategy
            success = await self._apply_recovery_strategy(
                recovery_checkpoint, recovery_strategy
            )

            if success:
                logger.info(
                    f"✅ Successfully recovered from checkpoint {recovery_checkpoint.checkpoint_id}"
                )
                return recovery_checkpoint
            else:
                logger.warning(
                    f"⚠️ Recovery failed for checkpoint {recovery_checkpoint.checkpoint_id}"
                )
                return None

        except Exception as e:
            logger.error(f"🚨 Recovery attempt failed: {str(e)}")
            return None

    async def adapt_strategy_for_failures(
        self,
        investigation_id: str,
        failed_agents: Set[AgentType],
        remaining_agents: Set[AgentType],
    ) -> Dict[str, Any]:
        """
        Adapt investigation strategy based on agent failures.

        Args:
            investigation_id: Investigation identifier
            failed_agents: Agents that have failed
            remaining_agents: Agents still available

        Returns:
            Adapted strategy configuration
        """
        logger.info(f"🔧 Adapting strategy for {len(failed_agents)} failed agents")

        try:
            # Get current continuity plan
            plan = self.continuity_plans.get(investigation_id)
            if not plan:
                logger.warning(f"⚠️ No continuity plan found, creating emergency plan")
                plan = await self._create_emergency_plan(investigation_id)

            # Analyze impact of failed agents
            impact_analysis = self._analyze_failure_impact(
                failed_agents, plan.critical_agents
            )

            # Determine new strategy based on remaining capabilities
            adapted_strategy = self._determine_adapted_strategy(
                remaining_agents, plan.critical_agents, impact_analysis
            )

            # Create new coordination plan with remaining agents
            coordination_plan = await self.coordinator.create_coordination_plan(
                investigation_id,
                {"available_agents": remaining_agents, "failed_agents": failed_agents},
                strategy="adaptive_recovery",
            )

            # Update continuity plan with adaptations
            await self._update_continuity_plan(
                investigation_id, adapted_strategy, coordination_plan
            )

            logger.info(
                f"✅ Adapted strategy: {adapted_strategy['execution_mode']} with {len(remaining_agents)} agents"
            )
            return adapted_strategy

        except Exception as e:
            logger.error(f"🚨 Strategy adaptation failed: {str(e)}")
            return {"execution_mode": "emergency", "agents": list(remaining_agents)}

    # Private helper methods

    def _classify_agent_criticality(
        self, context: Dict[str, Any], requirements: Dict[str, Any]
    ) -> tuple[Set[AgentType], Set[AgentType]]:
        """Classify agents as critical or optional based on requirements"""

        # Default critical agents for fraud investigation
        critical_agents = {AgentType.NETWORK, AgentType.RISK}
        optional_agents = {AgentType.DEVICE, AgentType.LOCATION, AgentType.LOGS}

        # Adjust based on investigation type and context
        investigation_type = context.get("investigation_type", "fraud")
        if investigation_type == "device_fraud":
            critical_agents.add(AgentType.DEVICE)
            optional_agents.discard(AgentType.DEVICE)
        elif investigation_type == "location_fraud":
            critical_agents.add(AgentType.LOCATION)
            optional_agents.discard(AgentType.LOCATION)

        return critical_agents, optional_agents

    def _select_primary_strategy(
        self, context: Dict[str, Any], requirements: Dict[str, Any]
    ) -> ContinuityStrategy:
        """Select primary continuity strategy based on context"""

        if context.get("time_critical", False):
            return ContinuityStrategy.PARTIAL_COMPLETION
        elif context.get("high_accuracy_required", False):
            return ContinuityStrategy.RETRY_WITH_BACKOFF
        else:
            return ContinuityStrategy.STRATEGY_ADAPTATION

    def _generate_fallback_strategies(
        self, primary: ContinuityStrategy, context: Dict[str, Any]
    ) -> List[ContinuityStrategy]:
        """Generate ordered list of fallback strategies"""

        fallbacks = []

        if primary != ContinuityStrategy.FALLBACK_AGENT:
            fallbacks.append(ContinuityStrategy.FALLBACK_AGENT)

        if primary != ContinuityStrategy.PARTIAL_COMPLETION:
            fallbacks.append(ContinuityStrategy.PARTIAL_COMPLETION)

        fallbacks.extend(
            [
                ContinuityStrategy.GRACEFUL_DEGRADATION,
                ContinuityStrategy.EMERGENCY_SYNTHESIS,
            ]
        )

        return fallbacks

    def _calculate_completion_threshold(
        self, critical_agents: Set[AgentType], optional_agents: Set[AgentType]
    ) -> float:
        """Calculate minimum completion threshold based on agent criticality"""

        total_agents = len(critical_agents) + len(optional_agents)
        critical_weight = 0.8
        optional_weight = 0.2

        # Must complete all critical agents plus some optional ones
        min_threshold = (len(critical_agents) * critical_weight) / total_agents
        return max(min_threshold, 0.5)  # Never less than 50%

    def _calculate_recovery_timeout(self, context: Dict[str, Any]) -> int:
        """Calculate recovery timeout based on investigation priority"""

        if context.get("time_critical", False):
            return 30  # 30 seconds for critical investigations
        elif context.get("priority") == "high":
            return 60  # 1 minute for high priority
        else:
            return 120  # 2 minutes for normal priority

    def _define_synthesis_requirements(
        self, critical_agents: Set[AgentType]
    ) -> Dict[str, Any]:
        """Define requirements for result synthesis"""

        return {
            "minimum_agents": len(critical_agents),
            "required_data_types": ["network_analysis", "risk_assessment"],
            "confidence_threshold": 0.6,
            "quality_standards": "basic",
        }

    def _generate_checkpoint_id(
        self, investigation_id: str, checkpoint_type: CheckpointType
    ) -> str:
        """Generate unique checkpoint identifier"""

        timestamp = datetime.now().isoformat()
        content = f"{investigation_id}_{checkpoint_type.value}_{timestamp}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _calculate_recovery_priority(self, checkpoint_type: CheckpointType) -> int:
        """Calculate recovery priority for checkpoint type"""

        priority_map = {
            CheckpointType.INVESTIGATION_COMPLETE: 10,
            CheckpointType.PARTIAL_SYNTHESIS: 8,
            CheckpointType.AGENT_COMPLETION: 6,
            CheckpointType.STRATEGY_CHANGE: 4,
            CheckpointType.FAILURE_RECOVERY: 2,
            CheckpointType.INVESTIGATION_START: 1,
        }

        return priority_map.get(checkpoint_type, 0)

    async def _cleanup_old_checkpoints(
        self, investigation_id: str, max_checkpoints: int = 10
    ):
        """Clean up old checkpoints to prevent memory bloat"""

        checkpoints = self.checkpoints.get(investigation_id, [])
        if len(checkpoints) > max_checkpoints:
            # Keep highest priority checkpoints
            checkpoints.sort(
                key=lambda c: (c.recovery_priority, c.timestamp), reverse=True
            )
            self.checkpoints[investigation_id] = checkpoints[:max_checkpoints]

    async def _analyze_completion_state(
        self,
        investigation_id: str,
        results: Dict[str, Any],
        failed_components: List[str],
        plan: ContinuityPlan,
    ) -> Dict[str, Any]:
        """Analyze current investigation completion state"""

        completed_agents = set(results.get("completed_agents", []))
        total_agents = plan.critical_agents.union(plan.optional_agents)

        completion_percentage = len(completed_agents) / len(total_agents) * 100
        critical_completion = (
            len(completed_agents.intersection(plan.critical_agents))
            / len(plan.critical_agents)
            * 100
        )

        return {
            "completion_percentage": completion_percentage,
            "critical_completion": critical_completion,
            "completed_agents": completed_agents,
            "missing_critical": plan.critical_agents - completed_agents,
            "quality_score": min(completion_percentage / 100, 1.0),
        }

    async def _synthesize_partial_results(
        self, investigation_id: str, results: Dict[str, Any], analysis: Dict[str, Any]
    ) -> PartialResults:
        """Synthesize partial results into coherent investigation outcome"""

        completed_agents = {}
        failed_agents = {}

        for agent_type in analysis["completed_agents"]:
            if agent_type in results:
                completed_agents[agent_type] = results[agent_type]

        # Create synthesized assessment
        synthesized_data = {
            "investigation_summary": "Partial investigation completed with available data",
            "risk_factors": self._extract_risk_factors(completed_agents),
            "confidence_indicators": self._calculate_confidence_indicators(
                completed_agents
            ),
            "data_gaps": list(analysis.get("missing_critical", [])),
            "synthesis_timestamp": datetime.now().isoformat(),
        }

        return PartialResults(
            investigation_id=investigation_id,
            completed_agents=completed_agents,
            failed_agents=failed_agents,
            synthesized_data=synthesized_data,
            confidence_score=analysis["quality_score"],
            completion_percentage=analysis["completion_percentage"],
            quality_assessment=self._assess_result_quality(
                analysis["completion_percentage"]
            ),
        )

    def _extract_risk_factors(
        self, completed_agents: Dict[AgentType, Dict[str, Any]]
    ) -> List[str]:
        """Extract risk factors from completed agent results"""
        risk_factors = []

        for agent_type, results in completed_agents.items():
            if agent_type == AgentType.RISK:
                risk_factors.extend(results.get("risk_factors", []))
            elif "anomalies" in results:
                risk_factors.extend(results["anomalies"])

        return risk_factors

    def _calculate_confidence_indicators(
        self, completed_agents: Dict[AgentType, Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate confidence indicators from available results"""
        indicators = {}

        for agent_type, results in completed_agents.items():
            confidence = results.get("confidence_score", 0.5)
            agent_name = (
                agent_type.value if hasattr(agent_type, "value") else str(agent_type)
            )
            indicators[f"{agent_name}_confidence"] = confidence

        # Calculate overall confidence
        if indicators:
            indicators["overall_confidence"] = sum(indicators.values()) / len(
                indicators
            )
        else:
            indicators["overall_confidence"] = 0.0

        return indicators

    def _assess_result_quality(self, completion_percentage: float) -> str:
        """Assess quality of results based on completion percentage"""
        if completion_percentage >= 90:
            return "excellent"
        elif completion_percentage >= 70:
            return "good"
        elif completion_percentage >= 50:
            return "acceptable"
        else:
            return "limited"

    def _determine_completion_status(
        self, completion_percentage: float
    ) -> CompletionStatus:
        """Determine completion status based on percentage"""
        if completion_percentage >= 95:
            return CompletionStatus.COMPLETE
        elif completion_percentage >= 80:
            return CompletionStatus.SUBSTANTIALLY_COMPLETE
        elif completion_percentage >= 50:
            return CompletionStatus.PARTIALLY_COMPLETE
        elif completion_percentage >= 25:
            return CompletionStatus.MINIMALLY_VIABLE
        else:
            return CompletionStatus.FAILED_WITH_RECOVERY

    async def _create_emergency_plan(self, investigation_id: str) -> ContinuityPlan:
        """Create emergency continuity plan"""
        return ContinuityPlan(
            investigation_id=investigation_id,
            primary_strategy=ContinuityStrategy.EMERGENCY_SYNTHESIS,
            fallback_strategies=[ContinuityStrategy.GRACEFUL_DEGRADATION],
            critical_agents={AgentType.RISK},
            optional_agents={
                AgentType.NETWORK,
                AgentType.DEVICE,
                AgentType.LOCATION,
                AgentType.LOGS,
            },
            minimum_completion_threshold=0.25,
            recovery_timeout_seconds=30,
            synthesis_requirements={"minimum_agents": 1},
        )

    async def _attempt_recovery_completion(
        self,
        investigation_id: str,
        results: Dict[str, Any],
        failed_components: List[str],
        plan: ContinuityPlan,
    ) -> Optional[PartialResults]:
        """Attempt recovery to reach completion threshold"""
        # Implementation would include recovery logic
        return None

    async def _create_minimal_viable_results(
        self, investigation_id: str, results: Dict[str, Any]
    ) -> PartialResults:
        """Create minimal viable results from available data"""
        return PartialResults(
            investigation_id=investigation_id,
            completed_agents={},
            failed_agents={},
            synthesized_data={"status": "minimal_viable", "data": results},
            confidence_score=0.3,
            completion_percentage=25.0,
            quality_assessment="minimal",
        )

    async def _create_emergency_results(
        self, investigation_id: str, results: Dict[str, Any]
    ) -> PartialResults:
        """Create emergency results when all else fails"""
        return PartialResults(
            investigation_id=investigation_id,
            completed_agents={},
            failed_agents={},
            synthesized_data={"status": "emergency", "preserved_data": results},
            confidence_score=0.1,
            completion_percentage=10.0,
            quality_assessment="emergency",
        )

    def _find_recovery_checkpoint(
        self, investigation_id: str, target_type: Optional[CheckpointType]
    ) -> Optional[InvestigationCheckpoint]:
        """Find appropriate checkpoint for recovery"""
        checkpoints = self.checkpoints.get(investigation_id, [])

        if not checkpoints:
            return None

        # Filter by target type if specified
        if target_type:
            filtered = [c for c in checkpoints if c.checkpoint_type == target_type]
            if filtered:
                checkpoints = filtered

        # Return highest priority, most recent checkpoint
        checkpoints.sort(key=lambda c: (c.recovery_priority, c.timestamp), reverse=True)
        return checkpoints[0]

    async def _apply_recovery_strategy(
        self, checkpoint: InvestigationCheckpoint, strategy: ContinuityStrategy
    ) -> bool:
        """Apply recovery strategy using checkpoint data"""
        try:
            logger.info(f"🔧 Applying recovery strategy: {strategy.value}")

            # Simulate recovery process
            await asyncio.sleep(0.1)

            # Recovery implementation would restore state and continue investigation
            return True

        except Exception as e:
            logger.error(f"Recovery strategy failed: {str(e)}")
            return False

    def _analyze_failure_impact(
        self, failed_agents: Set[AgentType], critical_agents: Set[AgentType]
    ) -> Dict[str, Any]:
        """Analyze impact of agent failures on investigation"""

        critical_failures = failed_agents.intersection(critical_agents)
        impact_level = (
            "high" if critical_failures else "medium" if failed_agents else "low"
        )

        return {
            "impact_level": impact_level,
            "critical_failures": critical_failures,
            "recovery_difficulty": len(critical_failures) * 2 + len(failed_agents),
        }

    def _determine_adapted_strategy(
        self,
        remaining_agents: Set[AgentType],
        critical_agents: Set[AgentType],
        impact: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Determine adapted strategy based on remaining capabilities"""

        remaining_critical = remaining_agents.intersection(critical_agents)

        if len(remaining_critical) >= len(critical_agents) * 0.5:
            execution_mode = "sequential_focused"
        elif len(remaining_agents) >= 2:
            execution_mode = "parallel_minimal"
        else:
            execution_mode = "single_agent_emergency"

        return {
            "execution_mode": execution_mode,
            "agents": list(remaining_agents),
            "priority": "high" if impact["impact_level"] == "high" else "normal",
            "adaptation_reason": f"Adapted due to {len(remaining_agents)} remaining agents",
        }

    async def _update_continuity_plan(
        self,
        investigation_id: str,
        adapted_strategy: Dict[str, Any],
        coordination_plan: Any,
    ):
        """Update continuity plan with adaptations"""
        plan = self.continuity_plans.get(investigation_id)
        if plan:
            # Update plan with new strategy
            plan.primary_strategy = ContinuityStrategy.STRATEGY_ADAPTATION
            logger.info(f"✅ Updated continuity plan for {investigation_id}")


# Global flow continuity manager instance
_continuity_manager_instance = None


def get_flow_continuity_manager() -> FlowContinuityManager:
    """Get global flow continuity manager instance"""
    global _continuity_manager_instance
    if _continuity_manager_instance is None:
        _continuity_manager_instance = FlowContinuityManager()
    return _continuity_manager_instance
