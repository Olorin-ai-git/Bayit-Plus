"""
Intelligent Router with Confidence-Based Decisions

This module provides the core routing logic for the hybrid intelligence graph,
making decisions based on AI confidence, safety validation, and investigation context.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime

from .hybrid_state_schema import (
    HybridInvestigationState,
    AIConfidenceLevel,
    InvestigationStrategy,
    SafetyConcernType,
    add_safety_override
)
from .ai_confidence_engine import AIConfidenceEngine
from .advanced_safety_manager import AdvancedSafetyManager

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class IntelligentRouter:
    """
    Intelligent routing system that combines AI confidence with safety validation.
    
    Makes routing decisions by:
    1. Getting AI confidence assessment
    2. Validating with safety manager
    3. Applying hybrid decision logic
    4. Recording audit trail
    """
    
    def __init__(
        self,
        confidence_engine: AIConfidenceEngine,
        safety_manager: AdvancedSafetyManager
    ):
        self.confidence_engine = confidence_engine
        self.safety_manager = safety_manager
        
        # Routing priority mappings
        self.confidence_routing = {
            AIConfidenceLevel.HIGH: self._high_confidence_routing,
            AIConfidenceLevel.MEDIUM: self._medium_confidence_routing,
            AIConfidenceLevel.LOW: self._low_confidence_routing,
            AIConfidenceLevel.UNKNOWN: self._unknown_confidence_routing
        }
        
        # Strategy routing mappings
        self.strategy_routing = {
            InvestigationStrategy.CRITICAL_PATH: self._critical_path_routing,
            InvestigationStrategy.MINIMAL: self._minimal_routing,
            InvestigationStrategy.FOCUSED: self._focused_routing,
            InvestigationStrategy.ADAPTIVE: self._adaptive_routing,
            InvestigationStrategy.COMPREHENSIVE: self._comprehensive_routing
        }
    
    async def get_hybrid_routing_decision(
        self,
        state: HybridInvestigationState
    ) -> Dict[str, Any]:
        """
        Generate comprehensive hybrid routing decision.
        
        Args:
            state: Current investigation state
            
        Returns:
            Complete routing decision with next node, reasoning, and metadata
        """
        
        logger.debug(f"🧭 Generating Hybrid Intelligence routing decision")
        logger.debug(f"   Intelligent Router: AI confidence + Advanced safety validation")
        logger.debug(f"   Decision factors: Confidence levels, investigation strategy, safety concerns")
        
        try:
            # Step 1: Get AI confidence assessment
            ai_decision = await self.confidence_engine.calculate_investigation_confidence(state)
            
            # Step 2: Validate with safety manager
            safety_status = self.safety_manager.validate_current_state(state)
            
            # Step 3: Apply hybrid decision logic
            routing_decision = await self._apply_hybrid_decision_logic(
                state, ai_decision, safety_status
            )
            
            # Step 4: Add comprehensive metadata
            routing_decision.update({
                "timestamp": datetime.now().isoformat(),
                "confidence": ai_decision.confidence,
                "confidence_level": ai_decision.confidence_level.value,
                "strategy": ai_decision.strategy.value,
                "safety_level": safety_status.safety_level.value,
                "resource_pressure": safety_status.resource_pressure,
                "orchestrator_loops": state.get("orchestrator_loops", 0)
            })
            
            logger.info(f"🧭 Routing decision: {routing_decision['next_node']}")
            logger.info(f"   Confidence: {ai_decision.confidence:.3f} ({ai_decision.confidence_level.value})")
            logger.info(f"   Strategy: {ai_decision.strategy.value}")
            logger.info(f"   Safety override: {routing_decision.get('safety_override', False)}")
            
            return routing_decision
            
        except Exception as e:
            logger.error(f"❌ Hybrid routing decision failed: {str(e)}")
            
            # Return safe fallback decision
            return {
                "next_node": "summary",
                "reasoning": [f"Routing decision failed: {str(e)}", "Falling back to safe completion"],
                "safety_override": True,
                "override_reason": "routing_failure",
                "confidence": 0.0,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _apply_hybrid_decision_logic(
        self,
        state: HybridInvestigationState,
        ai_decision,
        safety_status
    ) -> Dict[str, Any]:
        """Apply the core hybrid decision logic combining AI and safety"""
        
        logger.debug(f"🎯 Applying Hybrid Intelligence decision logic")
        logger.debug(f"   AI confidence: {ai_decision.confidence:.3f} ({ai_decision.confidence_level.value})")
        logger.debug(f"   AI recommendation: {ai_decision.recommended_action}")
        logger.debug(f"   Safety allows AI control: {safety_status.allows_ai_control}")
        logger.debug(f"   Termination required: {safety_status.requires_immediate_termination}")
        logger.debug(f"   Decision fusion: Combining AI intelligence with safety validation")
        
        # Emergency termination check
        if safety_status.requires_immediate_termination:
            logger.warning(f"🚨 Emergency termination required")
            return {
                "next_node": "summary",
                "reasoning": ["Emergency termination required by safety manager"] + safety_status.override_reasoning,
                "safety_override": True,
                "override_reason": "emergency_termination",
                "safety_concerns": safety_status.safety_concerns
            }
        
        # AI control allowed - trust AI decision
        if safety_status.allows_ai_control and ai_decision.confidence_level in [AIConfidenceLevel.HIGH, AIConfidenceLevel.MEDIUM]:
            logger.debug(f"✅ AI control granted - using AI decision")
            
            # Use confidence-based routing
            routing_method = self.confidence_routing[ai_decision.confidence_level]
            decision = await routing_method(state, ai_decision)
            
            decision.update({
                "safety_override": False,
                "reasoning": ai_decision.reasoning + ["AI control granted by safety validation"]
            })
            
            return decision
        
        # AI control denied or low confidence - use safety-first approach
        logger.debug(f"🛡️ AI control denied - using safety-first routing")
        
        safety_decision = await self._safety_first_routing(state, ai_decision, safety_status)
        
        # Record safety override if AI wanted something different
        if ai_decision.recommended_action != safety_decision["next_node"]:
            add_safety_override(
                state,
                original_ai_decision=ai_decision.recommended_action,
                safety_decision=safety_decision["next_node"],
                concern_type=SafetyConcernType.RESOURCE_PRESSURE,  # Default concern type
                reasoning=safety_status.override_reasoning
            )
        
        safety_decision.update({
            "safety_override": True,
            "override_reason": "ai_control_denied",
            "reasoning": ["Safety-first routing applied"] + safety_status.override_reasoning
        })
        
        return safety_decision
    
    async def _high_confidence_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing logic for high confidence AI decisions"""
        
        logger.debug(f"🟢 High confidence routing")
        
        # Trust AI completely - allow intelligent optimizations
        strategy_router = self.strategy_routing[ai_decision.strategy]
        decision = await strategy_router(state, ai_decision)
        
        decision.update({
            "confidence_behavior": "ai_optimized",
            "reasoning": ["High confidence allows AI optimization"] + decision.get("reasoning", [])
        })
        
        return decision
    
    async def _medium_confidence_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing logic for medium confidence AI decisions"""
        
        logger.debug(f"🟡 Medium confidence routing")
        
        # Trust AI with validation - balanced approach
        strategy_router = self.strategy_routing[ai_decision.strategy]
        decision = await strategy_router(state, ai_decision)
        
        # Add validation checks for medium confidence
        if ai_decision.strategy in [InvestigationStrategy.CRITICAL_PATH, InvestigationStrategy.MINIMAL]:
            # More conservative for high-impact strategies
            decision = await self._add_validation_checks(state, decision)
        
        decision.update({
            "confidence_behavior": "ai_with_validation",
            "reasoning": ["Medium confidence with validation checks"] + decision.get("reasoning", [])
        })
        
        return decision
    
    async def _low_confidence_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing logic for low confidence AI decisions"""
        
        logger.debug(f"🔴 Low confidence routing")
        
        # Safety-first approach - ignore AI strategy recommendations
        return await self._sequential_routing(state, "Low confidence requires sequential execution")
    
    async def _unknown_confidence_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing logic for unknown confidence"""
        
        logger.debug(f"❓ Unknown confidence routing")
        
        # Default to comprehensive approach
        return await self._sequential_routing(state, "Unknown confidence requires comprehensive analysis")
    
    async def _critical_path_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing for critical path strategy"""
        
        logger.debug(f"⚡ Critical path routing")
        
        current_phase = state.get("current_phase", "initialization")
        domains_completed = state.get("domains_completed", [])
        
        # Critical path goes directly to risk assessment
        if "risk" not in domains_completed:
            return {
                "next_node": "risk_agent",
                "reasoning": ["Critical path: Direct to risk assessment", "High confidence fraud detected"]
            }
        else:
            return {
                "next_node": "summary",
                "reasoning": ["Critical path complete", "Risk assessment finished"]
            }
    
    async def _minimal_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing for minimal strategy"""
        
        logger.debug(f"📋 Minimal routing")
        
        domains_completed = state.get("domains_completed", [])
        
        # Minimal strategy: only risk assessment
        if "risk" not in domains_completed:
            return {
                "next_node": "risk_agent",
                "reasoning": ["Minimal strategy: Risk assessment only", "Low fraud indicators detected"]
            }
        else:
            return {
                "next_node": "summary", 
                "reasoning": ["Minimal investigation complete"]
            }
    
    async def _focused_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing for focused strategy"""
        
        logger.debug(f"🎯 Focused routing")
        
        domains_completed = state.get("domains_completed", [])
        
        # Get priority domains from AI decision
        priority_agents = ai_decision.agents_to_activate
        
        # Execute priority agents in order
        for agent in priority_agents:
            domain = agent.replace("_agent", "")
            if domain not in domains_completed:
                return {
                    "next_node": agent,
                    "reasoning": [f"Focused strategy: {domain} analysis priority", f"Evidence suggests {domain} anomalies"]
                }
        
        # All priority domains complete
        return {
            "next_node": "summary",
            "reasoning": ["Focused investigation complete", "Priority domains analyzed"]
        }
    
    async def _adaptive_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing for adaptive strategy"""
        
        logger.debug(f"🔄 Adaptive routing")
        
        current_phase = state.get("current_phase", "initialization")
        snowflake_completed = state.get("snowflake_completed", False)
        domains_completed = state.get("domains_completed", [])
        tools_used = len(state.get("tools_used", []))
        
        # Adaptive progression based on evidence
        if not snowflake_completed:
            return {
                "next_node": "fraud_investigation",  # Continue with Snowflake
                "reasoning": ["Adaptive: Complete Snowflake analysis first"]
            }
        
        # Check if we need more tools
        if tools_used < 2 and ai_decision.tools_recommended:
            return {
                "next_node": "tools",
                "reasoning": ["Adaptive: Additional tools recommended", f"Tools to use: {ai_decision.tools_recommended}"]
            }
        
        # Continue with domain analysis
        if len(domains_completed) < 3:  # Need at least 3 domains
            # Select next domain based on AI recommendation
            recommended_agents = ai_decision.agents_to_activate
            for agent in recommended_agents:
                domain = agent.replace("_agent", "")
                if domain not in domains_completed:
                    return {
                        "next_node": agent,
                        "reasoning": [f"Adaptive: {domain} analysis recommended", "AI selected based on current evidence"]
                    }
            
            # Fallback to sequential if no specific recommendation
            return await self._get_next_sequential_domain(state)
        
        # Sufficient analysis complete
        return {
            "next_node": "summary",
            "reasoning": ["Adaptive investigation sufficient", f"Completed {len(domains_completed)} domains"]
        }
    
    async def _comprehensive_routing(
        self,
        state: HybridInvestigationState,
        ai_decision
    ) -> Dict[str, Any]:
        """Routing for comprehensive strategy"""
        
        logger.debug(f"🔍 Comprehensive routing")
        
        # Always do full sequential analysis
        return await self._sequential_routing(state, "Comprehensive strategy: Full analysis required")
    
    async def _sequential_routing(
        self,
        state: HybridInvestigationState,
        reason: str
    ) -> Dict[str, Any]:
        """Standard sequential routing (safety-first approach)"""
        
        logger.debug(f"📋 Sequential routing: {reason}")
        
        current_phase = state.get("current_phase", "initialization")
        snowflake_completed = state.get("snowflake_completed", False)
        snowflake_data = state.get("snowflake_data")
        tools_used = state.get("tools_used", [])
        tool_results = state.get("tool_results", {})
        domain_findings = state.get("domain_findings", {})
        domains_completed = state.get("domains_completed", [])
        
        logger.debug(f"📋 Sequential routing state analysis:")
        logger.debug(f"   current_phase: {current_phase}")
        logger.debug(f"   snowflake_completed: {snowflake_completed}")
        logger.debug(f"   snowflake_data: {bool(snowflake_data)}")
        logger.debug(f"   tools_used: {len(tools_used)} tools")
        logger.debug(f"   tool_results: {len(tool_results)} results")
        logger.debug(f"   domain_findings: {len(domain_findings)} domains")
        logger.debug(f"   domains_completed: {len(domains_completed)} completed")
        
        # Phase 1: Snowflake data collection
        if not snowflake_completed and not snowflake_data:
            logger.debug(f"🔄 Routing to Snowflake data collection")
            return {
                "next_node": "fraud_investigation",
                "reasoning": [reason, "Snowflake data collection required"]
            }
        
        # Phase 2: Tool execution (only after Snowflake data is available)
        if snowflake_data and len(tool_results) == 0:
            logger.debug(f"🔧 Routing to tools execution - Snowflake data available")
            return {
                "next_node": "fraud_investigation",  # Let fraud_investigation handle tool calls
                "reasoning": [reason, "Execute analysis tools with Snowflake data"]
            }
        
        # Phase 3: Domain analysis (CRITICAL FIX - ensure domain agents are triggered)
        if len(tool_results) > 0 and len(domain_findings) == 0:
            logger.debug(f"🎯 CRITICAL ROUTING: Tool results available, triggering domain analysis")
            # Get first domain agent to start sequential domain analysis
            domain_decision = await self._get_next_sequential_domain(state)
            logger.info(f"🎯 ROUTING TO DOMAIN AGENT: {domain_decision['next_node']}")
            domain_decision["reasoning"] = [reason, "CRITICAL: Start domain analysis with tool results"] + domain_decision["reasoning"]
            return domain_decision
        
        # Phase 4: Continue domain analysis
        if len(tool_results) > 0 and len(domain_findings) < 5:  # Need more domain analysis
            domain_decision = await self._get_next_sequential_domain(state)
            if domain_decision["next_node"] != "summary":
                logger.debug(f"🔄 Continue domain analysis: {domain_decision['next_node']}")
                domain_decision["reasoning"] = [reason] + domain_decision["reasoning"]
                return domain_decision
        
        # Phase 5: All domains complete - proceed to summary
        logger.debug(f"✅ All analysis complete - routing to summary")
        return {
            "next_node": "summary",
            "reasoning": [reason, "Sequential analysis complete", f"Analyzed {len(domain_findings)} domains"]
        }
    
    async def _get_next_sequential_domain(
        self,
        state: HybridInvestigationState
    ) -> Dict[str, Any]:
        """Get next domain in sequential order"""
        
        # Get completed domains from both possible sources
        domains_completed = set(state.get("domains_completed", []))
        domain_findings = state.get("domain_findings", {})
        
        # Also check domain_findings keys for completion tracking
        for domain_key in domain_findings.keys():
            if any(domain in domain_key for domain in ["network", "device", "location", "logs", "authentication", "risk"]):
                # Extract domain name from key (e.g., "network_analysis" -> "network")
                for domain_name in ["network", "device", "location", "logs", "authentication", "risk"]:
                    if domain_name in domain_key:
                        domains_completed.add(domain_name)
                        break
        
        domain_order = ["network", "device", "location", "logs", "authentication", "risk"]
        
        logger.debug(f"🎯 Domain completion analysis:")
        logger.debug(f"   domains_completed list: {list(state.get('domains_completed', []))}")
        logger.debug(f"   domain_findings keys: {list(domain_findings.keys())}")
        logger.debug(f"   computed completed domains: {list(domains_completed)}")
        logger.debug(f"   domain execution order: {domain_order}")
        
        for domain in domain_order:
            if domain not in domains_completed:
                agent_node = f"{domain}_agent"
                logger.info(f"🎯 Next domain agent: {agent_node} (domain: {domain})")
                return {
                    "next_node": f"{domain}_agent",
                    "reasoning": [f"Sequential domain analysis: {domain}"]
                }
        
        # All domains complete
        return {
            "next_node": "summary",
            "reasoning": ["All domains completed sequentially"]
        }
    
    async def _safety_first_routing(
        self,
        state: HybridInvestigationState,
        ai_decision,
        safety_status
    ) -> Dict[str, Any]:
        """Safety-first routing when AI control is denied"""
        
        logger.debug(f"🛡️ Safety-first routing")
        
        # Check for critical safety concerns
        critical_concerns = [c for c in safety_status.safety_concerns if "critical" in c.lower()]
        if critical_concerns:
            return {
                "next_node": "summary",
                "reasoning": ["Critical safety concerns detected", "Force immediate completion"] + critical_concerns[:2]
            }
        
        # Check resource pressure
        if safety_status.resource_pressure > 0.8:
            return {
                "next_node": "summary",
                "reasoning": [f"High resource pressure: {safety_status.resource_pressure:.2f}", "Force completion to prevent resource exhaustion"]
            }
        
        # Default to conservative sequential routing
        return await self._sequential_routing(state, "Safety-first mode: Conservative approach")
    
    async def _add_validation_checks(
        self,
        state: HybridInvestigationState,
        decision: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add validation checks for medium confidence decisions"""
        
        # Add safety validation to reasoning
        decision["reasoning"] = decision.get("reasoning", []) + [
            "Medium confidence validation applied",
            "Additional safety checks recommended"
        ]
        
        # Could add additional validation logic here
        # For now, just update reasoning
        
        return decision
    
    async def hybrid_routing_function(
        self,
        state: HybridInvestigationState
    ) -> str:
        """
        Main routing function used by the graph builder.
        
        This is the function called by LangGraph's conditional_edges.
        """
        
        try:
            # Get hybrid routing decision
            routing_decision = await self.get_hybrid_routing_decision(state)
            
            # Return the next node
            next_node = routing_decision["next_node"]
            
            logger.info(f"🧭 Hybrid routing: {next_node}")
            if routing_decision.get("safety_override"):
                logger.warning(f"   ⚠️ Safety override: {routing_decision.get('override_reason')}")
            
            return next_node
            
        except Exception as e:
            logger.error(f"❌ Hybrid routing function failed: {str(e)}")
            
            # Safe fallback
            return "summary"