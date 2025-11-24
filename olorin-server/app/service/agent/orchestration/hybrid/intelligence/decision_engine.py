"""
AI Confidence Decision Engine

Main orchestrator for the modular AI confidence calculation system.
Coordinates all specialized components to provide comprehensive routing decisions.

CRITICAL: In LIVE mode, uses real LLM for intelligent routing decisions.
         In DEMO mode, uses rule-based heuristics (no API costs).
"""

import asyncio
import time
import os
import json
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

from ..state import HybridInvestigationState, AIRoutingDecision, AIConfidenceLevel, SafetyConcernType, InvestigationStrategy

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DecisionEngine:
    """
    Modular AI confidence decision engine orchestrator.

    Coordinates specialized assessors, strategy components, and reasoning builders
    to provide comprehensive AI routing decisions with full backward compatibility.

    CRITICAL: Uses real LLM in LIVE mode for intelligent decisions.
             Falls back to heuristics in DEMO mode (no API costs).
    """

    def __init__(self, llm=None):
        """
        Initialize decision engine with optional LLM.

        Args:
            llm: Language model instance for intelligent routing (LIVE mode)
                 If None, uses rule-based heuristics (DEMO mode)
        """
        # Store LLM instance for LIVE mode
        self.llm = llm

        # Check TEST_MODE to determine routing approach
        self.test_mode = os.getenv("TEST_MODE", "").lower()
        self.use_llm_routing = (llm is not None) and (self.test_mode != "demo")

        if self.use_llm_routing:
            logger.info("🧠 LIVE MODE: Using real LLM for intelligent routing decisions")
        else:
            logger.info("🎭 DEMO MODE: Using rule-based heuristics (no API costs)")

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
        
        # CRITICAL FIX: Handle None values from assessors - use 0.0 as default
        async def safe_assess(assessor, name: str) -> float:
            try:
                score = await assessor.assess_evidence(state)
                if score is None:
                    logger.warning(f"     ⚠️  {name} assessor returned None, using 0.0")
                    return 0.0
                if not isinstance(score, (int, float)):
                    logger.warning(f"     ⚠️  {name} assessor returned {type(score).__name__}, using 0.0")
                    return 0.0
                return float(score)
            except Exception as e:
                logger.warning(f"     ⚠️  {name} assessor failed: {str(e)}, using 0.0")
                return 0.0
        
        # Calculate each factor with individual logging and None handling
        snowflake_score = await safe_assess(self.snowflake_assessor, "Snowflake")
        logger.debug(f"     Snowflake Evidence (35% weight): {snowflake_score:.3f}")
        
        tool_score = await safe_assess(self.tool_assessor, "Tool")
        logger.debug(f"     Tool Evidence (25% weight): {tool_score:.3f}")
        
        domain_score = await safe_assess(self.domain_assessor, "Domain")
        logger.debug(f"     Domain Evidence (20% weight): {domain_score:.3f}")
        
        pattern_score = await safe_assess(self.pattern_assessor, "Pattern")
        logger.debug(f"     Pattern Recognition (15% weight): {pattern_score:.3f}")
        
        velocity_score = await safe_assess(self.velocity_assessor, "Velocity")
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
        
        # CRITICAL FIX: Handle None values from assessors - use 0.0 as default
        def safe_score(key: str) -> float:
            score = confidence_scores.get(key)
            if score is None:
                logger.warning(f"   ⚠️  {key} assessor returned None, using 0.0")
                return 0.0
            if not isinstance(score, (int, float)):
                logger.warning(f"   ⚠️  {key} assessor returned {type(score).__name__}, using 0.0")
                return 0.0
            return float(score)
        
        # Get safe scores (None -> 0.0)
        snowflake_score = safe_score("snowflake")
        tool_score = safe_score("tool")
        domain_score = safe_score("domain")
        pattern_score = safe_score("pattern")
        velocity_score = safe_score("velocity")
        
        # Calculate each weighted component
        snowflake_weighted = snowflake_score * self.confidence_weights["snowflake_evidence"]
        tool_weighted = tool_score * self.confidence_weights["tool_evidence"]
        domain_weighted = domain_score * self.confidence_weights["domain_evidence"]
        pattern_weighted = pattern_score * self.confidence_weights["pattern_recognition"]
        velocity_weighted = velocity_score * self.confidence_weights["investigation_velocity"]
        
        logger.debug(f"     Snowflake: {snowflake_score:.3f} × 0.35 = {snowflake_weighted:.3f}")
        logger.debug(f"     Tool: {tool_score:.3f} × 0.25 = {tool_weighted:.3f}")
        logger.debug(f"     Domain: {domain_score:.3f} × 0.20 = {domain_weighted:.3f}")
        logger.debug(f"     Pattern: {pattern_score:.3f} × 0.15 = {pattern_weighted:.3f}")
        logger.debug(f"     Velocity: {velocity_score:.3f} × 0.05 = {velocity_weighted:.3f}")
        
        overall = snowflake_weighted + tool_weighted + domain_weighted + pattern_weighted + velocity_weighted
        logger.debug(f"   ✅ TOTAL WEIGHTED CONFIDENCE: {overall:.3f}")
        
        return overall
    
    async def _generate_routing_decision(
        self,
        state: HybridInvestigationState,
        overall_confidence: float,
        confidence_scores: Dict[str, float]
    ) -> AIRoutingDecision:
        """Generate complete routing decision using specialized strategy components or LLM."""

        # LIVE MODE: Use real LLM for intelligent routing decisions
        if self.use_llm_routing:
            logger.info("🧠 LIVE MODE: Calling real LLM for intelligent routing decision")
            return await self._generate_llm_routing_decision(state, overall_confidence, confidence_scores)

        # DEMO MODE: Use heuristic-based strategy components (no API costs)
        logger.debug("🎭 DEMO MODE: Using heuristic-based routing components")

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
            model_used="heuristic_engine_demo",
            calculation_time_ms=0  # Will be set by caller
        )
    
    async def _generate_llm_routing_decision(
        self,
        state: HybridInvestigationState,
        overall_confidence: float,
        confidence_scores: Dict[str, float]
    ) -> AIRoutingDecision:
        """Generate routing decision using real LLM (LIVE mode only)."""

        try:
            # Prepare investigation context for LLM
            investigation_context = self._build_investigation_context(state, confidence_scores)

            # Build LLM prompt for routing decision
            routing_prompt = f"""You are an AI fraud detection expert analyzing an investigation and making routing decisions.

INVESTIGATION CONTEXT:
{investigation_context}

CONFIDENCE ANALYSIS:
- Overall Confidence: {overall_confidence:.3f}
- Snowflake Evidence: {confidence_scores['snowflake']:.3f} (35% weight)
- Tool Evidence: {confidence_scores['tool']:.3f} (25% weight)
- Domain Evidence: {confidence_scores['domain']:.3f} (20% weight)
- Pattern Recognition: {confidence_scores['pattern']:.3f} (15% weight)
- Investigation Velocity: {confidence_scores['velocity']:.3f} (5% weight)

Based on this investigation state and confidence analysis, provide intelligent routing recommendations:

1. INVESTIGATION STRATEGY: Choose one of: minimal, critical_path, focused, comprehensive, parallel_deep_dive
2. NEXT ACTION: What should the investigation do next? (e.g., "snowflake_analysis", "device_analysis", "location_analysis", "network_analysis", "logs_analysis", "summary", "terminate")
3. AGENTS TO ACTIVATE: Which agents should run? List agent names (e.g., ["device_agent", "location_agent"])
4. TOOLS RECOMMENDED: Which tools should be used? List tool names
5. REASONING: Explain your decision in 2-3 bullet points
6. EVIDENCE QUALITY: Rate 0.0-1.0 based on data quality and completeness
7. INVESTIGATION COMPLETENESS: Rate 0.0-1.0 based on investigation coverage
8. SAFETY CONCERNS: Any safety issues? (loop_risk, resource_risk, evidence_quality_risk, or none)
9. RESOURCE IMPACT: low, medium, or high
10. ESTIMATED TIME: Minutes to complete (integer)

Respond in JSON format:
{{
    "strategy": "...",
    "next_action": "...",
    "agents_to_activate": [...],
    "tools_recommended": [...],
    "reasoning": ["...", "...", "..."],
    "evidence_quality": 0.0-1.0,
    "investigation_completeness": 0.0-1.0,
    "safety_concerns": [...],
    "resource_impact": "...",
    "estimated_time_minutes": int
}}"""

            logger.debug(f"   🤖 Calling LLM with routing prompt ({len(routing_prompt)} chars)")

            # Call LLM
            llm_response = await self.llm.ainvoke(routing_prompt)

            # Extract JSON from response
            llm_text = llm_response.content if hasattr(llm_response, 'content') else str(llm_response)
            logger.debug(f"   🤖 LLM response received ({len(llm_text)} chars)")

            # Parse LLM JSON response
            routing_data = self._parse_llm_routing_response(llm_text)

            # Convert to AIRoutingDecision
            return self._build_decision_from_llm(state, overall_confidence, routing_data)

        except Exception as e:
            logger.error(f"❌ LLM routing decision failed: {str(e)}")
            logger.warning("   ⚠️  Falling back to heuristic routing")

            # Fallback to heuristic routing if LLM fails
            return await self._generate_heuristic_routing_decision(state, overall_confidence, confidence_scores)

    async def _generate_heuristic_routing_decision(
        self,
        state: HybridInvestigationState,
        overall_confidence: float,
        confidence_scores: Dict[str, float]
    ) -> AIRoutingDecision:
        """Fallback heuristic routing when LLM is unavailable."""

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

        # Additional assessments
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
            model_used="heuristic_fallback",
            calculation_time_ms=0
        )

    def _build_investigation_context(self, state: HybridInvestigationState, confidence_scores: Dict[str, float]) -> str:
        """Build investigation context summary for LLM prompt."""

        entity_type = state.get('entity_type', 'unknown')
        entity_id = state.get('entity_id', 'unknown')
        current_phase = state.get('current_phase', 'unknown')

        snowflake_completed = state.get('snowflake_completed', False)
        domains_completed = state.get('domains_completed', [])
        tools_used = state.get('tools_used', [])
        risk_score = state.get('risk_score', 0.0)

        context = f"""
Entity: {entity_type} - {entity_id}
Current Phase: {current_phase}
Risk Score: {risk_score:.2f}

Completed Work:
- Snowflake Analysis: {'✓ Complete' if snowflake_completed else '✗ Not started'}
- Domains Completed: {', '.join(domains_completed) if domains_completed else 'None'}
- Tools Used: {len(tools_used)} tools ({', '.join(tools_used[:5])}{'...' if len(tools_used) > 5 else ''})

Investigation Progress:
- Orchestrator Loops: {state.get('orchestrator_loops', 0)}
- Tool Execution Attempts: {state.get('tool_execution_attempts', 0)}
- Errors: {len(state.get('errors', []))}
"""
        return context.strip()

    def _parse_llm_routing_response(self, llm_text: str) -> Dict[str, Any]:
        """Parse LLM routing response JSON."""

        # Extract JSON from markdown code blocks if present
        if "```json" in llm_text:
            json_start = llm_text.find("```json") + 7
            json_end = llm_text.find("```", json_start)
            llm_text = llm_text[json_start:json_end].strip()
        elif "```" in llm_text:
            json_start = llm_text.find("```") + 3
            json_end = llm_text.find("```", json_start)
            llm_text = llm_text[json_start:json_end].strip()

        # Parse JSON
        try:
            routing_data = json.loads(llm_text)
            logger.debug(f"   ✅ Successfully parsed LLM routing JSON")
            return routing_data
        except json.JSONDecodeError as e:
            logger.error(f"   ❌ Failed to parse LLM JSON: {str(e)}")
            logger.debug(f"   Raw LLM text: {llm_text[:200]}...")
            raise

    def _build_decision_from_llm(
        self,
        state: HybridInvestigationState,
        overall_confidence: float,
        routing_data: Dict[str, Any]
    ) -> AIRoutingDecision:
        """Build AIRoutingDecision from LLM routing data."""

        # Parse strategy enum
        strategy_str = routing_data.get('strategy', 'focused')
        try:
            strategy = InvestigationStrategy(strategy_str)
        except ValueError:
            logger.warning(f"   ⚠️  Invalid strategy '{strategy_str}', defaulting to FOCUSED")
            strategy = InvestigationStrategy.FOCUSED

        # Parse confidence level
        confidence_level = self._determine_confidence_level(overall_confidence)

        # Parse safety checks
        safety_concerns = routing_data.get('safety_concerns', [])
        safety_checks = ["loop_prevention", "progress_validation"]
        if 'resource_risk' in safety_concerns:
            safety_checks.append("resource_monitoring")
        if 'loop_risk' in safety_concerns:
            safety_checks.append("loop_escalation")

        return AIRoutingDecision(
            confidence=overall_confidence,
            confidence_level=confidence_level,
            recommended_action=routing_data.get('next_action', 'summary'),
            reasoning=routing_data.get('reasoning', ["LLM routing decision"]),
            evidence_quality=routing_data.get('evidence_quality', 0.5),
            investigation_completeness=routing_data.get('investigation_completeness', 0.5),
            strategy=strategy,
            agents_to_activate=routing_data.get('agents_to_activate', []),
            tools_recommended=routing_data.get('tools_recommended', []),
            required_safety_checks=safety_checks,
            resource_impact=routing_data.get('resource_impact', 'medium'),
            estimated_completion_time=routing_data.get('estimated_time_minutes'),
            model_used="llm_intelligent_routing",
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