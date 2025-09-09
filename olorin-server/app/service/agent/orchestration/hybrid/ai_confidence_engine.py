"""
AI Confidence Engine for Hybrid Intelligence Graph

This module calculates AI confidence scores based on multiple evidence sources
and determines appropriate routing decisions for investigations.
"""

import asyncio
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json
import os

from .hybrid_state_schema import (
    HybridInvestigationState,
    AIRoutingDecision,
    AIConfidenceLevel,
    InvestigationStrategy,
    SafetyConcernType
)

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AIConfidenceEngine:
    """
    Multi-factor confidence calculation engine for investigation routing.
    
    Analyzes evidence quality, risk patterns, investigation completeness,
    and resource constraints to determine AI confidence and routing decisions.
    """
    
    def __init__(self):
        self.confidence_weights = {
            "snowflake_evidence": 0.35,      # Primary data source weight
            "tool_evidence": 0.25,           # Additional tool evidence weight
            "domain_evidence": 0.20,         # Domain analysis quality weight
            "pattern_recognition": 0.15,     # Risk pattern clarity weight
            "investigation_velocity": 0.05   # Investigation progress speed
        }
        
        self.strategy_confidence_thresholds = {
            InvestigationStrategy.CRITICAL_PATH: 0.9,    # Very high confidence needed
            InvestigationStrategy.FOCUSED: 0.7,          # High confidence needed
            InvestigationStrategy.ADAPTIVE: 0.5,         # Medium confidence needed
            InvestigationStrategy.COMPREHENSIVE: 0.3,    # Low confidence needed
            InvestigationStrategy.MINIMAL: 0.8          # High confidence for minimal approach
        }
        
    async def calculate_investigation_confidence(
        self,
        state: HybridInvestigationState
    ) -> AIRoutingDecision:
        """
        Calculate comprehensive confidence score and generate routing decision.
        
        Args:
            state: Current investigation state with all available evidence
            
        Returns:
            Complete AI routing decision with confidence, strategy, and reasoning
        """
        start_time = time.time()
        
        logger.debug(f"🧠 Starting Hybrid Intelligence AI confidence calculation")
        logger.debug(f"   Investigation: {state.get('entity_type')} - {state.get('entity_id')}")
        logger.debug(f"   Current phase: {state.get('current_phase', 'unknown')}")
        logger.debug(f"   Tools used: {len(state.get('tools_used', []))}")
        logger.debug(f"   Domains completed: {len(state.get('domains_completed', []))}")
        logger.debug(f"   Multi-factor analysis: Snowflake(35%) + Tool(25%) + Domain(20%) + Pattern(15%) + Velocity(5%)")
        
        try:
            # Calculate individual confidence factors
            snowflake_confidence = await self._assess_snowflake_evidence(state)
            tool_confidence = await self._assess_tool_evidence(state)
            domain_confidence = await self._assess_domain_evidence(state)
            pattern_confidence = await self._assess_risk_patterns(state)
            velocity_confidence = await self._assess_investigation_velocity(state)
            
            # Calculate weighted overall confidence
            overall_confidence = (
                snowflake_confidence * self.confidence_weights["snowflake_evidence"] +
                tool_confidence * self.confidence_weights["tool_evidence"] +
                domain_confidence * self.confidence_weights["domain_evidence"] +
                pattern_confidence * self.confidence_weights["pattern_recognition"] +
                velocity_confidence * self.confidence_weights["investigation_velocity"]
            )
            
            # Determine confidence level
            confidence_level = self._determine_confidence_level(overall_confidence)
            
            # Generate investigation strategy
            strategy = await self._determine_investigation_strategy(state, overall_confidence)
            
            # Determine next action based on current phase and confidence
            next_action = await self._determine_next_action(state, overall_confidence, strategy)
            
            # Generate agents to activate
            agents_to_activate = await self._determine_agents_to_activate(state, strategy, overall_confidence)
            
            # Generate tool recommendations
            tools_recommended = await self._determine_recommended_tools(state, strategy, overall_confidence)
            
            # Build reasoning chain
            reasoning = self._build_reasoning_chain(
                state, overall_confidence, strategy, next_action,
                snowflake_confidence, tool_confidence, domain_confidence,
                pattern_confidence, velocity_confidence
            )
            
            # Calculate evidence quality and completeness
            evidence_quality = await self._calculate_evidence_quality(state)
            completeness = await self._calculate_investigation_completeness(state)
            
            # Determine safety checks needed
            safety_checks = self._determine_safety_checks(state, overall_confidence)
            
            # Assess resource impact
            resource_impact = self._assess_resource_impact(state, strategy, agents_to_activate)
            
            # Estimate completion time
            estimated_time = self._estimate_completion_time(state, strategy, overall_confidence)
            
            calculation_time = int((time.time() - start_time) * 1000)
            
            decision = AIRoutingDecision(
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
                model_used="ai_confidence_engine_v1",
                calculation_time_ms=calculation_time
            )
            
            logger.info(f"🧠 AI confidence calculated: {overall_confidence:.3f} ({confidence_level.value})")
            logger.info(f"   Strategy: {strategy.value}")
            logger.info(f"   Next action: {next_action}")
            logger.info(f"   Agents to activate: {agents_to_activate}")
            logger.info(f"   Evidence quality: {evidence_quality:.3f}")
            logger.info(f"   Investigation completeness: {completeness:.3f}")
            logger.debug(f"   Calculation time: {calculation_time}ms")
            
            return decision
            
        except Exception as e:
            logger.error(f"❌ AI confidence calculation failed: {str(e)}")
            
            # Return safe fallback decision
            fallback_decision = AIRoutingDecision(
                confidence=0.3,  # Low confidence due to calculation failure
                confidence_level=AIConfidenceLevel.LOW,
                recommended_action="snowflake_analysis" if not state.get("snowflake_completed") else "summary",
                reasoning=[f"Confidence calculation failed: {str(e)}", "Falling back to safe sequential execution"],
                evidence_quality=0.0,
                investigation_completeness=0.0,
                strategy=InvestigationStrategy.COMPREHENSIVE,
                agents_to_activate=[],
                tools_recommended=[],
                required_safety_checks=["loop_prevention", "resource_monitoring", "error_recovery"],
                resource_impact="high",  # Conservative estimate
                estimated_completion_time=None,
                model_used="fallback_engine",
                calculation_time_ms=int((time.time() - start_time) * 1000)
            )
            
            return fallback_decision
    
    async def _assess_snowflake_evidence(self, state: HybridInvestigationState) -> float:
        """Assess quality and completeness of Snowflake evidence"""
        snowflake_data = state.get("snowflake_data", {})
        
        if not snowflake_data:
            logger.debug("   📊 Snowflake evidence: None available (0.0)")
            return 0.0
            
        # Check for key evidence indicators
        has_transaction_data = bool(snowflake_data.get("transactions"))
        has_user_behavior = bool(snowflake_data.get("user_behavior"))
        has_risk_indicators = bool(snowflake_data.get("risk_indicators"))
        has_temporal_patterns = bool(snowflake_data.get("temporal_analysis"))
        
        evidence_indicators = sum([has_transaction_data, has_user_behavior, has_risk_indicators, has_temporal_patterns])
        base_confidence = evidence_indicators / 4.0
        
        # Boost confidence if clear fraud patterns detected
        if has_risk_indicators and snowflake_data.get("risk_indicators", {}).get("fraud_probability", 0) > 0.7:
            base_confidence = min(1.0, base_confidence + 0.3)
        
        # Reduce confidence if data is sparse
        data_completeness = len(str(snowflake_data)) / 1000.0  # Rough measure of data richness
        completeness_factor = min(1.0, data_completeness)
        
        final_confidence = base_confidence * 0.8 + completeness_factor * 0.2
        
        logger.debug(f"   📊 Snowflake evidence confidence: {final_confidence:.3f}")
        logger.debug(f"      Indicators: {evidence_indicators}/4, Completeness: {completeness_factor:.3f}")
        
        return final_confidence
    
    async def _assess_tool_evidence(self, state: HybridInvestigationState) -> float:
        """Assess quality of additional tool evidence"""
        tools_used = state.get("tools_used", [])
        tool_results = state.get("tool_results", {})
        
        if not tools_used:
            logger.debug("   🔧 Tool evidence: No tools used (0.0)")
            return 0.0
        
        # Assess tool diversity and quality
        tool_categories = set()
        successful_tools = 0
        total_evidence_quality = 0.0
        
        for tool in tools_used:
            # Categorize tools
            if "virus" in tool.lower() or "abuse" in tool.lower():
                tool_categories.add("threat_intelligence")
            elif "splunk" in tool.lower() or "sumo" in tool.lower():
                tool_categories.add("siem")
            elif "geo" in tool.lower() or "location" in tool.lower():
                tool_categories.add("geolocation")
            else:
                tool_categories.add("other")
            
            # Check if tool produced useful results
            tool_result = tool_results.get(tool, {})
            if tool_result and isinstance(tool_result, dict):
                successful_tools += 1
                # Simple heuristic for result quality
                result_quality = min(1.0, len(str(tool_result)) / 500.0)
                total_evidence_quality += result_quality
        
        diversity_factor = len(tool_categories) / 4.0  # Up to 4 categories
        success_rate = successful_tools / len(tools_used) if tools_used else 0
        avg_quality = total_evidence_quality / len(tools_used) if tools_used else 0
        
        tool_confidence = (diversity_factor * 0.3 + success_rate * 0.4 + avg_quality * 0.3)
        
        logger.debug(f"   🔧 Tool evidence confidence: {tool_confidence:.3f}")
        logger.debug(f"      Tools used: {len(tools_used)}, Categories: {len(tool_categories)}, Success rate: {success_rate:.3f}")
        
        return tool_confidence
    
    async def _assess_domain_evidence(self, state: HybridInvestigationState) -> float:
        """Assess quality of domain agent analysis"""
        domains_completed = state.get("domains_completed", [])
        domain_findings = state.get("domain_findings", {})
        
        if not domains_completed:
            logger.debug("   🎯 Domain evidence: No domains completed (0.0)")
            return 0.0
        
        total_domains = 6  # network, device, location, logs, authentication, risk
        completion_ratio = len(domains_completed) / total_domains
        
        # Assess quality of domain findings
        high_confidence_domains = 0
        total_risk_score = 0.0
        
        for domain in domains_completed:
            findings = domain_findings.get(domain, {})
            if findings:
                # Check for strong risk indicators
                risk_score = findings.get("risk_score", 0.0)
                confidence = findings.get("confidence", 0.0)
                
                if confidence > 0.7:
                    high_confidence_domains += 1
                
                total_risk_score += risk_score
        
        quality_factor = high_confidence_domains / len(domains_completed) if domains_completed else 0
        avg_risk = total_risk_score / len(domains_completed) if domains_completed else 0
        
        domain_confidence = (completion_ratio * 0.4 + quality_factor * 0.4 + avg_risk * 0.2)
        
        logger.debug(f"   🎯 Domain evidence confidence: {domain_confidence:.3f}")
        logger.debug(f"      Completed: {len(domains_completed)}/{total_domains}, Quality: {quality_factor:.3f}")
        
        return domain_confidence
    
    async def _assess_risk_patterns(self, state: HybridInvestigationState) -> float:
        """Assess clarity of risk patterns in the evidence"""
        risk_indicators = state.get("risk_indicators", [])
        risk_score = state.get("risk_score", 0.0)
        
        # Pattern clarity based on consistent risk signals
        pattern_strength = 0.0
        
        if risk_indicators:
            # More risk indicators generally mean clearer patterns
            indicator_factor = min(1.0, len(risk_indicators) / 5.0)  # Up to 5 indicators
            
            # High risk score suggests clear fraud patterns
            risk_factor = min(1.0, risk_score)
            
            # Check for pattern consistency across sources
            consistency_factor = 0.5  # Default moderate consistency
            
            # Look for confirming evidence across different sources
            snowflake_risk = 0.5  # Default
            if state.get("snowflake_data", {}).get("risk_indicators"):
                snowflake_risk = state["snowflake_data"]["risk_indicators"].get("fraud_probability", 0.5)
            
            domain_risk = risk_score  # Domain analysis risk
            
            # Consistency bonus if sources agree
            if abs(snowflake_risk - domain_risk) < 0.2:
                consistency_factor = 0.8
            
            pattern_strength = (indicator_factor * 0.4 + risk_factor * 0.4 + consistency_factor * 0.2)
        
        logger.debug(f"   🎨 Pattern recognition confidence: {pattern_strength:.3f}")
        logger.debug(f"      Risk indicators: {len(risk_indicators)}, Risk score: {risk_score:.3f}")
        
        return pattern_strength
    
    async def _assess_investigation_velocity(self, state: HybridInvestigationState) -> float:
        """Assess how efficiently the investigation is progressing"""
        start_time = state.get("start_time")
        if not start_time:
            return 0.5  # Default moderate velocity
        
        try:
            from dateutil.parser import parse
            start_dt = parse(start_time)
            elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
            
            # Calculate progress metrics
            phases_completed = 0
            total_phases = 6  # initialization, snowflake, tools, domains, summary, complete
            
            current_phase = state.get("current_phase", "initialization")
            phase_order = ["initialization", "snowflake_analysis", "tool_execution", "domain_analysis", "summary", "complete"]
            
            try:
                phases_completed = phase_order.index(current_phase) + 1
            except ValueError:
                phases_completed = 1
            
            # Velocity = progress / time (with reasonable bounds)
            velocity = (phases_completed / total_phases) / max(1.0, elapsed_minutes / 10.0)
            velocity = min(1.0, max(0.1, velocity))  # Bound between 0.1 and 1.0
            
            logger.debug(f"   ⚡ Investigation velocity: {velocity:.3f}")
            logger.debug(f"      Elapsed: {elapsed_minutes:.1f} min, Progress: {phases_completed}/{total_phases}")
            
            return velocity
            
        except Exception as e:
            logger.debug(f"   ⚡ Velocity calculation failed: {e}, using default 0.5")
            return 0.5
    
    def _determine_confidence_level(self, confidence: float) -> AIConfidenceLevel:
        """Convert numeric confidence to confidence level enum"""
        if confidence >= 0.8:
            return AIConfidenceLevel.HIGH
        elif confidence >= 0.4:
            return AIConfidenceLevel.MEDIUM
        else:
            return AIConfidenceLevel.LOW
    
    async def _determine_investigation_strategy(
        self,
        state: HybridInvestigationState,
        confidence: float
    ) -> InvestigationStrategy:
        """Determine the best investigation strategy based on evidence and confidence"""
        
        # Get current evidence state
        snowflake_completed = state.get("snowflake_completed", False)
        risk_score = state.get("risk_score", 0.0)
        domains_completed = len(state.get("domains_completed", []))
        
        # High confidence and high risk -> Critical path
        if confidence >= 0.9 and risk_score >= 0.8:
            logger.debug(f"   🎯 Strategy: CRITICAL_PATH (high confidence + high risk)")
            return InvestigationStrategy.CRITICAL_PATH
        
        # High confidence and clear patterns -> Focused
        if confidence >= 0.7 and risk_score >= 0.6:
            logger.debug(f"   🎯 Strategy: FOCUSED (high confidence + clear patterns)")
            return InvestigationStrategy.FOCUSED
        
        # Low risk and high confidence -> Minimal
        if confidence >= 0.8 and risk_score <= 0.3:
            logger.debug(f"   🎯 Strategy: MINIMAL (low risk + high confidence)")
            return InvestigationStrategy.MINIMAL
        
        # Medium confidence -> Adaptive
        if 0.5 <= confidence < 0.8:
            logger.debug(f"   🎯 Strategy: ADAPTIVE (medium confidence)")
            return InvestigationStrategy.ADAPTIVE
        
        # Low confidence or uncertain -> Comprehensive
        logger.debug(f"   🎯 Strategy: COMPREHENSIVE (low confidence or uncertain)")
        return InvestigationStrategy.COMPREHENSIVE
    
    async def _determine_next_action(
        self,
        state: HybridInvestigationState,
        confidence: float,
        strategy: InvestigationStrategy
    ) -> str:
        """Determine the next node/action to execute"""
        
        current_phase = state.get("current_phase", "initialization")
        snowflake_completed = state.get("snowflake_completed", False)
        domains_completed = state.get("domains_completed", [])
        
        # Always do Snowflake first if not completed
        if not snowflake_completed:
            return "snowflake_analysis"
        
        # Strategy-specific routing
        if strategy == InvestigationStrategy.CRITICAL_PATH:
            # Go directly to risk assessment for critical path
            if "risk" not in domains_completed:
                return "risk_agent"
            else:
                return "summary"
        
        elif strategy == InvestigationStrategy.MINIMAL:
            # Just risk assessment for minimal strategy
            if "risk" not in domains_completed:
                return "risk_agent"
            else:
                return "summary"
        
        elif strategy == InvestigationStrategy.FOCUSED:
            # Focus on most relevant domains based on evidence
            priority_domains = await self._get_priority_domains(state)
            for domain in priority_domains:
                if domain not in domains_completed:
                    return f"{domain}_agent"
            return "summary"
        
        elif strategy == InvestigationStrategy.ADAPTIVE:
            # AI decides based on current evidence
            if current_phase == "tool_execution":
                # Continue with domains if tools are done
                return "domain_analysis"  # Let domain routing decide which agent
            elif current_phase == "domain_analysis":
                # Continue with next domain
                return "domain_analysis"
            else:
                return "tool_execution"
        
        else:  # COMPREHENSIVE
            # Sequential execution of all phases
            if current_phase == "snowflake_analysis":
                return "tool_execution"
            elif current_phase == "tool_execution":
                return "domain_analysis"
            elif current_phase == "domain_analysis":
                return "domain_analysis"  # Continue with domains
            else:
                return "summary"
    
    async def _get_priority_domains(self, state: HybridInvestigationState) -> List[str]:
        """Get priority domain order based on evidence"""
        snowflake_data = state.get("snowflake_data", {})
        
        priority_domains = ["risk"]  # Always include risk assessment
        
        # Add domains based on evidence
        if snowflake_data.get("network_anomalies"):
            priority_domains.insert(-1, "network")
        
        if snowflake_data.get("device_indicators"):
            priority_domains.insert(-1, "device")
        
        if snowflake_data.get("location_anomalies"):
            priority_domains.insert(-1, "location")
        
        if snowflake_data.get("authentication_issues"):
            priority_domains.insert(-1, "authentication")
        
        if snowflake_data.get("suspicious_activity"):
            priority_domains.insert(-1, "logs")
        
        logger.debug(f"   📋 Priority domains: {priority_domains}")
        return priority_domains
    
    async def _determine_agents_to_activate(
        self,
        state: HybridInvestigationState,
        strategy: InvestigationStrategy,
        confidence: float
    ) -> List[str]:
        """Determine which agents should be activated"""
        
        if strategy == InvestigationStrategy.CRITICAL_PATH:
            return ["risk_agent"]
        elif strategy == InvestigationStrategy.MINIMAL:
            return ["risk_agent"]
        elif strategy == InvestigationStrategy.FOCUSED:
            priority_domains = await self._get_priority_domains(state)
            return [f"{domain}_agent" for domain in priority_domains if domain != "risk"] + ["risk_agent"]
        else:  # ADAPTIVE or COMPREHENSIVE
            return ["network_agent", "device_agent", "location_agent", "logs_agent", "authentication_agent", "risk_agent"]
    
    async def _determine_recommended_tools(
        self,
        state: HybridInvestigationState,
        strategy: InvestigationStrategy,
        confidence: float
    ) -> List[str]:
        """Determine which additional tools should be used"""
        
        tools_used = set(state.get("tools_used", []))
        snowflake_data = state.get("snowflake_data", {})
        
        recommendations = []
        
        # High-value tools based on strategy
        if strategy in [InvestigationStrategy.CRITICAL_PATH, InvestigationStrategy.FOCUSED]:
            # Focus on highest-impact tools
            if "virustotal" not in tools_used and "abuseipdb" not in tools_used:
                recommendations.append("virustotal")  # Threat intelligence
            
            if snowflake_data.get("network_anomalies") and "splunk" not in tools_used:
                recommendations.append("splunk")  # Network analysis
        
        elif strategy == InvestigationStrategy.MINIMAL:
            # Only essential tools
            if "virustotal" not in tools_used:
                recommendations.append("virustotal")
        
        else:  # ADAPTIVE or COMPREHENSIVE
            # Broader tool selection
            recommended_tools = ["virustotal", "abuseipdb", "splunk", "sumologic"]
            for tool in recommended_tools:
                if tool not in tools_used and len(recommendations) < 3:
                    recommendations.append(tool)
        
        logger.debug(f"   🔧 Recommended tools: {recommendations}")
        return recommendations
    
    def _build_reasoning_chain(
        self,
        state: HybridInvestigationState,
        confidence: float,
        strategy: InvestigationStrategy,
        next_action: str,
        snowflake_conf: float,
        tool_conf: float,
        domain_conf: float,
        pattern_conf: float,
        velocity_conf: float
    ) -> List[str]:
        """Build human-readable reasoning chain for the decision"""
        
        reasoning = []
        
        # Overall confidence explanation
        reasoning.append(f"Overall confidence: {confidence:.3f} based on multi-factor analysis")
        
        # Factor breakdown
        reasoning.append(f"Evidence factors: Snowflake({snowflake_conf:.2f}), Tools({tool_conf:.2f}), Domains({domain_conf:.2f}), Patterns({pattern_conf:.2f}), Velocity({velocity_conf:.2f})")
        
        # Strategy rationale
        if strategy == InvestigationStrategy.CRITICAL_PATH:
            reasoning.append("Strategy: Critical path selected due to high confidence and clear fraud indicators")
        elif strategy == InvestigationStrategy.FOCUSED:
            reasoning.append("Strategy: Focused analysis on priority domains with strong evidence")
        elif strategy == InvestigationStrategy.MINIMAL:
            reasoning.append("Strategy: Minimal analysis due to low risk indicators")
        elif strategy == InvestigationStrategy.ADAPTIVE:
            reasoning.append("Strategy: Adaptive approach for balanced investigation")
        else:
            reasoning.append("Strategy: Comprehensive analysis for thorough investigation")
        
        # Next action rationale
        reasoning.append(f"Next action: {next_action} - {'High priority based on evidence' if confidence > 0.7 else 'Standard progression'}")
        
        # Risk assessment
        risk_score = state.get("risk_score", 0.0)
        if risk_score > 0.7:
            reasoning.append("High fraud risk detected - prioritizing critical analysis")
        elif risk_score > 0.4:
            reasoning.append("Moderate fraud risk - balanced investigation approach")
        else:
            reasoning.append("Low fraud risk - efficient analysis with safety checks")
        
        return reasoning
    
    async def _calculate_evidence_quality(self, state: HybridInvestigationState) -> float:
        """Calculate overall quality of available evidence"""
        
        # Combine evidence from all sources
        snowflake_quality = 0.5  # Default
        if state.get("snowflake_data"):
            data_richness = len(str(state["snowflake_data"])) / 2000.0
            snowflake_quality = min(1.0, data_richness)
        
        tool_quality = 0.0
        if state.get("tool_results"):
            successful_results = sum(1 for result in state["tool_results"].values() if result)
            total_results = len(state["tool_results"])
            tool_quality = successful_results / total_results if total_results > 0 else 0
        
        domain_quality = 0.0
        if state.get("domain_findings"):
            high_quality_findings = sum(
                1 for findings in state["domain_findings"].values()
                if findings.get("confidence", 0) > 0.6
            )
            total_findings = len(state["domain_findings"])
            domain_quality = high_quality_findings / total_findings if total_findings > 0 else 0
        
        overall_quality = (snowflake_quality * 0.5 + tool_quality * 0.3 + domain_quality * 0.2)
        return overall_quality
    
    async def _calculate_investigation_completeness(self, state: HybridInvestigationState) -> float:
        """Calculate how complete the investigation is"""
        
        # Phase completion
        current_phase = state.get("current_phase", "initialization")
        phase_weights = {
            "initialization": 0.1,
            "snowflake_analysis": 0.3,
            "tool_execution": 0.5,
            "domain_analysis": 0.8,
            "summary": 0.95,
            "complete": 1.0
        }
        
        phase_completion = phase_weights.get(current_phase, 0.1)
        
        # Domain completion
        domains_completed = len(state.get("domains_completed", []))
        total_domains = 6
        domain_completion = domains_completed / total_domains
        
        # Overall completeness
        completeness = (phase_completion * 0.6 + domain_completion * 0.4)
        return min(1.0, completeness)
    
    def _determine_safety_checks(self, state: HybridInvestigationState, confidence: float) -> List[str]:
        """Determine what safety checks are needed"""
        
        safety_checks = ["loop_prevention"]  # Always check for loops
        
        if confidence < 0.6:
            safety_checks.append("resource_monitoring")
        
        if state.get("orchestrator_loops", 0) > 3:
            safety_checks.append("loop_escalation")
        
        if len(state.get("tools_used", [])) > 8:
            safety_checks.append("tool_limit_monitoring")
        
        safety_checks.append("progress_validation")
        
        return safety_checks
    
    def _assess_resource_impact(self, state: HybridInvestigationState, strategy: InvestigationStrategy, agents: List[str]) -> str:
        """Assess resource impact of the recommended strategy"""
        
        if strategy == InvestigationStrategy.MINIMAL:
            return "low"
        elif strategy == InvestigationStrategy.CRITICAL_PATH:
            return "low"
        elif strategy == InvestigationStrategy.FOCUSED:
            return "medium"
        elif len(agents) > 4:
            return "high"
        else:
            return "medium"
    
    def _estimate_completion_time(self, state: HybridInvestigationState, strategy: InvestigationStrategy, confidence: float) -> Optional[int]:
        """Estimate time to completion in minutes"""
        
        if strategy == InvestigationStrategy.MINIMAL:
            return 2
        elif strategy == InvestigationStrategy.CRITICAL_PATH:
            return 3
        elif strategy == InvestigationStrategy.FOCUSED:
            return 5
        elif confidence > 0.7:
            return 8
        else:
            return 12  # Comprehensive or uncertain cases take longer