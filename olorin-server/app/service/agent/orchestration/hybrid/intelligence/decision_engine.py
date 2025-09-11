"""
AI Confidence Decision Engine

Main orchestrator for the modular AI confidence calculation system.
Coordinates all specialized components to provide comprehensive routing decisions.
"""

import asyncio
import time
from typing import Dict, List, Any, Optional
from datetime import datetime

from .confidence_factors import (
    SnowflakeAssessor, ToolAssessor, DomainAssessor,
    PatternAssessor, VelocityAssessor
)
from .strategy import (
    StrategySelector, ActionPlanner, AgentSelector, ToolRecommender
)
from .reasoning import (
    ReasoningBuilder, EvidenceAnalyzer, CompletenessTracker
)

from ..state import HybridInvestigationState, AIRoutingDecision, AIConfidenceLevel, SafetyConcernType

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DecisionEngine:
    """
    Modular AI confidence decision engine orchestrator.
    
    Coordinates specialized assessors, strategy components, and reasoning builders
    to provide comprehensive AI routing decisions with full backward compatibility.
    """
    
    def __init__(self):
        # Initialize all component modules
        self.snowflake_assessor = SnowflakeAssessor()
        self.tool_assessor = ToolAssessor()
        self.domain_assessor = DomainAssessor()
        self.pattern_assessor = PatternAssessor()
        self.velocity_assessor = VelocityAssessor()
        
        self.strategy_selector = StrategySelector()
        self.action_planner = ActionPlanner()
        self.agent_selector = AgentSelector()
        self.tool_recommender = ToolRecommender()
        
        self.reasoning_builder = ReasoningBuilder()
        self.evidence_analyzer = EvidenceAnalyzer()
        self.completeness_tracker = CompletenessTracker()
        
        # Confidence weights (preserved from original)
        self.confidence_weights = {
            "snowflake_evidence": 0.35,
            "tool_evidence": 0.25,
            "domain_evidence": 0.20,
            "pattern_recognition": 0.15,
            "investigation_velocity": 0.05
        }
        
    async def calculate_investigation_confidence(
        self,
        state: HybridInvestigationState
    ) -> AIRoutingDecision:
        """
        Calculate comprehensive confidence score and generate routing decision.
        
        Maintains full backward compatibility with original AIConfidenceEngine interface.
        
        Args:
            state: Current investigation state with all available evidence
            
        Returns:
            Complete AI routing decision with confidence, strategy, and reasoning
        """
        start_time = time.time()
        
        logger.debug(f"🧠 Starting Hybrid Intelligence AI confidence calculation")
        logger.debug(f"   Investigation: {state.get('entity_type')} - {state.get('entity_id')}")
        logger.debug(f"   Multi-factor analysis: Snowflake(35%) + Tool(25%) + Domain(20%) + Pattern(15%) + Velocity(5%)")
        
        try:
            # Calculate individual confidence factors using specialized assessors
            confidence_scores = await self._calculate_confidence_factors(state)
            
            # Calculate weighted overall confidence
            overall_confidence = self._calculate_weighted_confidence(confidence_scores)
            
            # Generate strategic decisions using specialized components
            routing_decision = await self._generate_routing_decision(state, overall_confidence, confidence_scores)
            
            # Add timing and metadata
            calculation_time = int((time.time() - start_time) * 1000)
            routing_decision.calculation_time_ms = calculation_time
            routing_decision.model_used = "modular_decision_engine_v2"
            
            logger.info(f"🧠 AI confidence calculated: {overall_confidence:.3f} ({routing_decision.confidence_level.value})")
            logger.info(f"   Strategy: {routing_decision.strategy.value}")
            logger.info(f"   Next action: {routing_decision.recommended_action}")
            logger.debug(f"   Calculation time: {calculation_time}ms")
            
            logger.debug(f"   🎯 FINAL AI DECISION SUMMARY:")
            logger.debug(f"     Complete routing decision object prepared")
            logger.debug(f"     All specialized assessments integrated")
            logger.debug(f"     Strategic recommendations generated")
            logger.debug(f"     Reasoning chain constructed")
            logger.debug(f"     Ready for hybrid routing integration")
            
            return routing_decision
            
        except Exception as e:
            logger.error(f"❌ AI confidence calculation failed: {str(e)}")
            logger.debug(f"   💥 ERROR DETAILS:")
            logger.debug(f"     Exception Type: {type(e).__name__}")
            logger.debug(f"     Exception Message: {str(e)}")
            logger.debug(f"     State context: {state.get('investigation_id', 'N/A')} - {state.get('current_phase', 'N/A')}")
            logger.debug(f"     Creating fallback decision...")
            return self._create_fallback_decision(state, start_time, str(e))
    
    async def _calculate_confidence_factors(self, state: HybridInvestigationState) -> Dict[str, float]:
        """Calculate all confidence factors using specialized assessors."""
        logger.debug(f"   🔬 SPECIALIZED ASSESSOR CALCULATIONS:")
        
        # Calculate each factor with individual logging
        snowflake_score = await self.snowflake_assessor.assess_evidence(state)
        logger.debug(f"     Snowflake Evidence (35% weight): {snowflake_score:.3f}")
        
        tool_score = await self.tool_assessor.assess_evidence(state)
        logger.debug(f"     Tool Evidence (25% weight): {tool_score:.3f}")
        
        domain_score = await self.domain_assessor.assess_evidence(state)
        logger.debug(f"     Domain Evidence (20% weight): {domain_score:.3f}")
        
        pattern_score = await self.pattern_assessor.assess_evidence(state)
        logger.debug(f"     Pattern Recognition (15% weight): {pattern_score:.3f}")
        
        velocity_score = await self.velocity_assessor.assess_evidence(state)
        logger.debug(f"     Investigation Velocity (5% weight): {velocity_score:.3f}")
        
        factors = {
            "snowflake": snowflake_score,
            "tool": tool_score,
            "domain": domain_score,
            "pattern": pattern_score,
            "velocity": velocity_score
        }
        
        logger.debug(f"   ✅ ALL CONFIDENCE FACTORS: {factors}")
        return factors
    
    def _calculate_weighted_confidence(self, confidence_scores: Dict[str, float]) -> float:
        """Calculate weighted overall confidence score."""
        logger.debug(f"   📊 WEIGHTED CONFIDENCE CALCULATION:")
        
        # Calculate each weighted component
        snowflake_weighted = confidence_scores["snowflake"] * self.confidence_weights["snowflake_evidence"]
        tool_weighted = confidence_scores["tool"] * self.confidence_weights["tool_evidence"]
        domain_weighted = confidence_scores["domain"] * self.confidence_weights["domain_evidence"]
        pattern_weighted = confidence_scores["pattern"] * self.confidence_weights["pattern_recognition"]
        velocity_weighted = confidence_scores["velocity"] * self.confidence_weights["investigation_velocity"]
        
        logger.debug(f"     Snowflake: {confidence_scores['snowflake']:.3f} × 0.35 = {snowflake_weighted:.3f}")
        logger.debug(f"     Tool: {confidence_scores['tool']:.3f} × 0.25 = {tool_weighted:.3f}")
        logger.debug(f"     Domain: {confidence_scores['domain']:.3f} × 0.20 = {domain_weighted:.3f}")
        logger.debug(f"     Pattern: {confidence_scores['pattern']:.3f} × 0.15 = {pattern_weighted:.3f}")
        logger.debug(f"     Velocity: {confidence_scores['velocity']:.3f} × 0.05 = {velocity_weighted:.3f}")
        
        overall = snowflake_weighted + tool_weighted + domain_weighted + pattern_weighted + velocity_weighted
        logger.debug(f"   ✅ TOTAL WEIGHTED CONFIDENCE: {overall:.3f}")
        
        return overall
    
    async def _generate_routing_decision(
        self,
        state: HybridInvestigationState,
        overall_confidence: float,
        confidence_scores: Dict[str, float]
    ) -> AIRoutingDecision:
        """Generate complete routing decision using specialized strategy components."""
        
        # Strategic decisions
        strategy = await self.strategy_selector.determine_strategy(state, overall_confidence)
        next_action = await self.action_planner.determine_next_action(state, overall_confidence, strategy)
        agents_to_activate = await self.agent_selector.determine_agents_to_activate(state, strategy, overall_confidence)
        tools_recommended = await self.tool_recommender.determine_recommended_tools(state, strategy, overall_confidence)
        
        # Analysis and reasoning
        reasoning = self.reasoning_builder.build_reasoning_chain(
            state, overall_confidence, strategy, next_action,
            confidence_scores["snowflake"], confidence_scores["tool"],
            confidence_scores["domain"], confidence_scores["pattern"], confidence_scores["velocity"]
        )
        evidence_quality = await self.evidence_analyzer.calculate_evidence_quality(state)
        completeness = await self.completeness_tracker.calculate_investigation_completeness(state)
        
        # Additional assessments (preserved from original)
        confidence_level = self._determine_confidence_level(overall_confidence)
        safety_checks = self._determine_safety_checks(state, overall_confidence)
        resource_impact = self._assess_resource_impact(state, strategy, agents_to_activate)
        estimated_time = self._estimate_completion_time(state, strategy, overall_confidence)
        
        return AIRoutingDecision(
            confidence=overall_confidence,
            confidence_level=confidence_level,
            recommended_action=next_action,
            reasoning=reasoning,
            evidence_quality=evidence_quality,
            investigation_completeness=completeness,
            strategy=strategy,
            agents_to_activate=agents_to_activate,
            tools_recommended=tools_recommended,
            required_safety_checks=safety_checks,
            resource_impact=resource_impact,
            estimated_completion_time=estimated_time,
            model_used="modular_decision_engine_v2",
            calculation_time_ms=0  # Will be set by caller
        )
    
    def _determine_confidence_level(self, confidence: float) -> AIConfidenceLevel:
        """Convert numeric confidence to confidence level enum."""
        if confidence >= 0.8:
            return AIConfidenceLevel.HIGH
        elif confidence >= 0.4:
            return AIConfidenceLevel.MEDIUM
        else:
            return AIConfidenceLevel.LOW
    
    def _determine_safety_checks(self, state: HybridInvestigationState, confidence: float) -> List[str]:
        """Determine required safety checks."""
        safety_checks = ["loop_prevention"]
        
        if confidence < 0.6:
            safety_checks.append("resource_monitoring")
        
        if state.get("orchestrator_loops", 0) > 3:
            safety_checks.append("loop_escalation")
        
        if len(state.get("tools_used", [])) > 8:
            safety_checks.append("tool_limit_monitoring")
        
        safety_checks.append("progress_validation")
        return safety_checks
    
    def _assess_resource_impact(self, state: HybridInvestigationState, strategy, agents: List[str]) -> str:
        """Assess resource impact of the recommended strategy."""
        if strategy.value in ["minimal", "critical_path"]:
            return "low"
        elif strategy.value == "focused":
            return "medium"
        elif len(agents) > 4:
            return "high"
        else:
            return "medium"
    
    def _estimate_completion_time(self, state: HybridInvestigationState, strategy, confidence: float) -> Optional[int]:
        """Estimate time to completion in minutes."""
        strategy_times = {
            "minimal": 2,
            "critical_path": 3,
            "focused": 5
        }
        
        base_time = strategy_times.get(strategy.value, 12 if confidence <= 0.7 else 8)
        return base_time
    
    def _create_fallback_decision(self, state: HybridInvestigationState, start_time: float, error_msg: str) -> AIRoutingDecision:
        """Create safe fallback decision when calculation fails."""
        return AIRoutingDecision(
            confidence=0.3,
            confidence_level=AIConfidenceLevel.LOW,
            recommended_action="snowflake_analysis" if not state.get("snowflake_completed") else "summary",
            reasoning=[f"Confidence calculation failed: {error_msg}", "Falling back to safe sequential execution"],
            evidence_quality=0.0,
            investigation_completeness=0.0,
            strategy=self.strategy_selector.strategy_confidence_thresholds.get("comprehensive", "comprehensive"),
            agents_to_activate=[],
            tools_recommended=[],
            required_safety_checks=["loop_prevention", "resource_monitoring", "error_recovery"],
            resource_impact="high",
            estimated_completion_time=None,
            model_used="fallback_engine",
            calculation_time_ms=int((time.time() - start_time) * 1000)
        )