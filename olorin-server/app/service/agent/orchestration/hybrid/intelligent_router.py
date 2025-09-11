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
    SafetyConcernType
)
from .state.state_updater import add_safety_override  # CRITICAL FIX: Use version with gating logic
from .ai_confidence_engine import AIConfidenceEngine
from .safety import AdvancedSafetyManager
from .safety_threshold_config import get_safety_threshold_manager

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
        logger.debug(f"   🔍 INPUT STATE ANALYSIS:")
        logger.debug(f"     Investigation ID: {state.get('investigation_id', 'N/A')}")
        logger.debug(f"     Current Phase: {state.get('current_phase', 'N/A')}")
        logger.debug(f"     Tool Count: {state.get('tool_count', 0)}")
        logger.debug(f"     Orchestrator Loops: {state.get('orchestrator_loops', 0)}")
        logger.debug(f"     Previous routing decisions: {len(state.get('routing_decisions', []))}")
        logger.debug(f"     Safety concerns: {len(state.get('safety_concerns', []))}")
        logger.debug(f"     Risk Score: {state.get('risk_score', 0.0)}")
        logger.debug(f"   🧠 DECISION FRAMEWORK:")
        logger.debug(f"     Router Type: Intelligent Router (AI confidence + Advanced safety validation)")
        logger.debug(f"     Decision factors: Confidence levels, investigation strategy, safety concerns")
        logger.debug(f"     Available strategies: {list(self.strategy_routing.keys())}")
        logger.debug(f"     Available confidence levels: {list(self.confidence_routing.keys())}")
        
        try:
            # Step 1: Get AI confidence assessment
            logger.debug(f"   🔄 STEP 1: Getting AI confidence assessment...")
            ai_decision = await self.confidence_engine.calculate_investigation_confidence(state)
            logger.debug(f"   ✅ AI DECISION RECEIVED:")
            logger.debug(f"     Confidence: {getattr(ai_decision, 'confidence', 'N/A')}")
            logger.debug(f"     Confidence Level: {getattr(ai_decision, 'confidence_level', 'N/A')}")
            logger.debug(f"     Strategy: {getattr(ai_decision, 'strategy', 'N/A')}")
            logger.debug(f"     Recommended Action: {getattr(ai_decision, 'recommended_action', 'N/A')}")
            logger.debug(f"     Reasoning Items: {len(getattr(ai_decision, 'reasoning', []))}")
            
            # Step 2: Validate with safety manager
            logger.debug(f"   🔄 STEP 2: Validating with safety manager...")
            safety_status = self.safety_manager.validate_current_state(state)
            logger.debug(f"   ✅ SAFETY STATUS RECEIVED:")
            logger.debug(f"     Safety Level: {getattr(safety_status, 'safety_level', 'N/A')}")
            logger.debug(f"     Allows AI Control: {getattr(safety_status, 'allows_ai_control', 'N/A')}")
            logger.debug(f"     Requires Termination: {getattr(safety_status, 'requires_immediate_termination', 'N/A')}")
            logger.debug(f"     Resource Pressure: {getattr(safety_status, 'resource_pressure', 'N/A')}")
            logger.debug(f"     Safety Concerns: {len(getattr(safety_status, 'safety_concerns', []))}")
            
            # Step 3: Apply hybrid decision logic
            logger.debug(f"   🔄 STEP 3: Applying hybrid decision logic...")
            routing_decision = await self._apply_hybrid_decision_logic(
                state, ai_decision, safety_status
            )
            logger.debug(f"   ✅ HYBRID DECISION LOGIC COMPLETE:")
            logger.debug(f"     Proposed Next Node: {routing_decision.get('next_node', 'N/A')}")
            logger.debug(f"     Safety Override: {routing_decision.get('safety_override', False)}")
            logger.debug(f"     Override Reason: {routing_decision.get('override_reason', 'None')}")
            logger.debug(f"     Reasoning Items: {len(routing_decision.get('reasoning', []))}")
            
            # Step 4: Add comprehensive metadata
            logger.debug(f"   🔄 STEP 4: Adding comprehensive metadata...")
            metadata = {
                "timestamp": datetime.now().isoformat(),
                "confidence": getattr(ai_decision, 'confidence', 0.0),
                "confidence_level": getattr(ai_decision, 'confidence_level', 'UNKNOWN').value if hasattr(getattr(ai_decision, 'confidence_level', None), 'value') else str(getattr(ai_decision, 'confidence_level', 'UNKNOWN')),
                "strategy": getattr(ai_decision, 'strategy', 'ADAPTIVE').value if hasattr(getattr(ai_decision, 'strategy', None), 'value') else str(getattr(ai_decision, 'strategy', 'ADAPTIVE')),
                "safety_level": getattr(safety_status, 'safety_level', 'UNKNOWN').value if hasattr(getattr(safety_status, 'safety_level', None), 'value') else str(getattr(safety_status, 'safety_level', 'UNKNOWN')),
                "resource_pressure": getattr(safety_status, 'resource_pressure', 0.0),
                "orchestrator_loops": state.get("orchestrator_loops", 0)
            }
            routing_decision.update(metadata)
            logger.debug(f"   ✅ METADATA ADDED: {metadata}")
            
            # Final decision logging
            logger.info(f"🧭 Routing decision: {routing_decision['next_node']}")
            # CRITICAL FIX: Safe access to ai_decision attributes to prevent None formatting errors
            confidence = getattr(ai_decision, 'confidence', 0.0) if ai_decision else 0.0
            confidence = confidence if confidence is not None else 0.0
            confidence_level = getattr(ai_decision, 'confidence_level', 'UNKNOWN') if ai_decision else 'UNKNOWN'
            strategy = getattr(ai_decision, 'strategy', 'ADAPTIVE') if ai_decision else 'ADAPTIVE'
            logger.info(f"   Confidence: {confidence:.3f} ({confidence_level})")
            logger.info(f"   Strategy: {strategy}")
            logger.info(f"   Safety override: {routing_decision.get('safety_override', False)}")
            logger.debug(f"   🎯 FINAL ROUTING DECISION:")
            logger.debug(f"     Complete decision object: {routing_decision}")
            
            return routing_decision
            
        except Exception as e:
            logger.error(f"❌ Hybrid routing decision failed: {str(e)}")
            logger.debug(f"   💥 ERROR DETAILS:")
            logger.debug(f"     Exception Type: {type(e).__name__}")
            logger.debug(f"     Exception Message: {str(e)}")
            logger.debug(f"     State at failure: {state.get('investigation_id', 'N/A')} - phase {state.get('current_phase', 'N/A')}")
            
            # Create comprehensive fallback decision
            fallback_decision = {
                "next_node": "summary",
                "reasoning": [f"Routing decision failed: {str(e)}", "Falling back to safe completion"],
                "safety_override": True,
                "override_reason": "routing_failure",
                "confidence": 0.0,
                "timestamp": datetime.now().isoformat(),
                "error_context": {
                    "exception_type": type(e).__name__,
                    "exception_message": str(e),
                    "investigation_id": state.get("investigation_id"),
                    "current_phase": state.get("current_phase"),
                    "orchestrator_loops": state.get("orchestrator_loops", 0)
                }
            }
            
            logger.debug(f"   🛡️ FALLBACK DECISION: {fallback_decision}")
            
            # Return safe fallback decision
            return fallback_decision
    
    async def _apply_hybrid_decision_logic(
        self,
        state: HybridInvestigationState,
        ai_decision,
        safety_status
    ) -> Dict[str, Any]:
        """Apply the core hybrid decision logic combining AI and safety"""
        
        logger.debug(f"🎯 Applying Hybrid Intelligence decision logic")
        logger.debug(f"   🧠 AI DECISION ANALYSIS:")
        # CRITICAL FIX: Safe access to ai_decision attributes to prevent None formatting errors
        confidence = getattr(ai_decision, 'confidence', 0.0) if ai_decision else 0.0
        confidence = confidence if confidence is not None else 0.0
        confidence_level = getattr(ai_decision, 'confidence_level', 'UNKNOWN') if ai_decision else 'UNKNOWN'
        recommended_action = getattr(ai_decision, 'recommended_action', 'N/A') if ai_decision else 'N/A'
        strategy = getattr(ai_decision, 'strategy', 'N/A') if ai_decision else 'N/A'
        reasoning = getattr(ai_decision, 'reasoning', []) if ai_decision else []
        logger.debug(f"     Confidence: {confidence:.3f}")
        logger.debug(f"     Confidence Level: {confidence_level}")
        logger.debug(f"     Recommended Action: {recommended_action}")
        logger.debug(f"     Strategy: {strategy}")
        logger.debug(f"     Reasoning Count: {len(reasoning)}")
        logger.debug(f"   🛡️ SAFETY STATUS ANALYSIS:")
        logger.debug(f"     Allows AI Control: {getattr(safety_status, 'allows_ai_control', False)}")
        logger.debug(f"     Requires Termination: {getattr(safety_status, 'requires_immediate_termination', False)}")
        logger.debug(f"     Safety Level: {getattr(safety_status, 'safety_level', 'UNKNOWN')}")
        logger.debug(f"     Resource Pressure: {getattr(safety_status, 'resource_pressure', 0.0)}")
        logger.debug(f"     Safety Concerns Count: {len(getattr(safety_status, 'safety_concerns', []))}")
        logger.debug(f"   🔄 DECISION FUSION PROCESS:")
        logger.debug(f"     Combining AI intelligence with safety validation")
        logger.debug(f"     Decision hierarchy: Emergency check → AI control check → Safety-first fallback")
        
        # Emergency termination check
        logger.debug(f"   🔄 DECISION STEP 1: Emergency termination check...")
        if getattr(safety_status, 'requires_immediate_termination', False):
            logger.warning(f"🚨 Emergency termination required")
            logger.debug(f"   🚨 EMERGENCY TERMINATION TRIGGERED:")
            logger.debug(f"     Reason: Safety manager requires immediate termination")
            logger.debug(f"     Safety concerns: {getattr(safety_status, 'safety_concerns', [])}")
            logger.debug(f"     Override reasoning: {getattr(safety_status, 'override_reasoning', [])}")
            
            emergency_decision = {
                "next_node": "summary",
                "reasoning": ["Emergency termination required by safety manager"] + getattr(safety_status, 'override_reasoning', []),
                "safety_override": True,
                "override_reason": "emergency_termination",
                "safety_concerns": getattr(safety_status, 'safety_concerns', [])
            }
            logger.debug(f"   ✅ EMERGENCY DECISION: {emergency_decision}")
            return emergency_decision
        
        logger.debug(f"   ✅ EMERGENCY CHECK PASSED: No immediate termination required")
        
        # AI control allowed - trust AI decision
        logger.debug(f"   🔄 DECISION STEP 2: AI control authorization check...")
        allows_ai_control = getattr(safety_status, 'allows_ai_control', False)
        confidence_level = getattr(ai_decision, 'confidence_level', None)
        high_confidence = confidence_level in [AIConfidenceLevel.HIGH, AIConfidenceLevel.MEDIUM] if confidence_level else False
        
        logger.debug(f"     Safety allows AI control: {allows_ai_control}")
        logger.debug(f"     AI confidence level: {confidence_level}")
        logger.debug(f"     High/Medium confidence: {high_confidence}")
        logger.debug(f"     Combined condition: {allows_ai_control and high_confidence}")
        
        if allows_ai_control and high_confidence:
            logger.debug(f"✅ AI control granted - using AI decision")
            logger.debug(f"   🧠 AI CONTROL AUTHORIZED:")
            logger.debug(f"     Confidence level qualifies: {confidence_level}")
            logger.debug(f"     Safety validation passed")
            logger.debug(f"     Using confidence-based routing method")
            
            # Use confidence-based routing
            routing_method = self.confidence_routing.get(confidence_level)
            if routing_method:
                logger.debug(f"     Selected routing method: {routing_method.__name__}")
                decision = await routing_method(state, ai_decision)
                logger.debug(f"     Routing method result: {decision}")
            else:
                logger.warning(f"     No routing method found for confidence level: {confidence_level}")
                decision = {"next_node": "summary", "reasoning": ["No routing method available"]}
            
            # Add AI control metadata
            decision.update({
                "safety_override": False,
                "reasoning": getattr(ai_decision, 'reasoning', []) + ["AI control granted by safety validation"],
                "ai_control_granted": True,
                "confidence_based_routing": True
            })
            
            logger.debug(f"   ✅ AI DECISION FINAL: {decision}")
            return decision
        
        logger.debug(f"   ❌ AI CONTROL DENIED: Proceeding to safety-first routing")
        logger.debug(f"     Reason: allows_ai_control={allows_ai_control}, high_confidence={high_confidence}")
        
        # AI control denied or low confidence - use safety-first approach
        logger.debug(f"   🔄 DECISION STEP 3: Safety-first routing...")
        logger.debug(f"🛡️ AI control denied - using safety-first routing")
        logger.debug(f"   🛡️ SAFETY-FIRST MODE:")
        logger.debug(f"     AI control was denied or confidence too low")
        logger.debug(f"     Using safety manager recommendations")
        logger.debug(f"     Prioritizing safe completion over AI optimization")
        
        safety_decision = await self._safety_first_routing(state, ai_decision, safety_status)
        logger.debug(f"   ✅ SAFETY-FIRST DECISION: {safety_decision}")
        
        # Record safety override if AI wanted something different
        ai_recommendation = getattr(ai_decision, 'recommended_action', None)
        safety_next_node = safety_decision.get("next_node")
        logger.debug(f"   🔄 OVERRIDE CHECK:")
        logger.debug(f"     AI wanted: {ai_recommendation}")
        logger.debug(f"     Safety chose: {safety_next_node}")
        logger.debug(f"     Override needed: {ai_recommendation != safety_next_node}")
        
        override_applied = False
        if ai_recommendation != safety_next_node:
            logger.debug(f"   🛡️ ATTEMPTING SAFETY OVERRIDE:")
            logger.debug(f"     Original AI decision: {ai_recommendation}")
            logger.debug(f"     Safety override to: {safety_next_node}")
            # Check if override was actually applied (gated function may reject it)
            original_override_count = len(state.get("safety_overrides", []))
            add_safety_override(
                state,
                original_ai_decision=ai_recommendation,
                safety_decision=safety_next_node,
                concern_type=SafetyConcernType.RESOURCE_PRESSURE,  # Default concern type
                reasoning=safety_status.override_reasoning
            )
            new_override_count = len(state.get("safety_overrides", []))
            override_applied = new_override_count > original_override_count
            logger.debug(f"     Override actually applied: {override_applied}")
        
        # Clean reasoning: empty for normal routing, specific for overrides
        clean_reasoning = []
        if override_applied:
            clean_reasoning = ["Safety-first routing applied"] + safety_status.override_reasoning
        # No reasoning for normal routing to reduce noise
        
        safety_decision.update({
            "safety_override": override_applied,  # Only True if override was actually applied
            "override_reason": "ai_control_denied" if override_applied else None,
            "reasoning": clean_reasoning
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
        domain_findings = state.get("domain_findings", {})
        
        # CRITICAL FIX: Ensure at least one domain analysis before risk assessment
        # Critical path still needs minimum evidence gathering
        if len(domain_findings) == 0 and len(domains_completed) == 0:
            logger.debug(f"⚡ Critical path: Need at least one domain analysis before risk assessment")
            
            # CRITICAL FIX: Use circuit breaker to avoid repeated failures
            from app.service.agent.orchestration.circuit_breaker import is_node_disabled, get_next_available_domain_node
            
            # Check if network_agent is available (not disabled by circuit breaker)
            if not is_node_disabled(state, "network_agent"):
                return {
                    "next_node": "network_agent",  # Network analysis has highest priority
                    "reasoning": ["Critical path: Priority domain analysis first", "Network analysis critical for fraud detection"]
                }
            else:
                # Network agent disabled, try next available domain
                next_available = get_next_available_domain_node(state)
                if next_available and next_available != "summary":
                    return {
                        "next_node": next_available,
                        "reasoning": ["Critical path: Network agent disabled, using next available domain", f"Fallback to {next_available}"]
                    }
                else:
                    # All domain agents disabled, skip to summary
                    logger.warning("⚡ Critical path: All domain agents disabled, skipping to summary")
                    return {
                        "next_node": "summary",
                        "reasoning": ["Critical path: All domain agents failed", "Emergency fallback to summary"]
                    }
        
        # After at least one domain, proceed to risk assessment
        if "risk" not in domains_completed:
            return {
                "next_node": "risk_agent",
                "reasoning": ["Critical path: Risk assessment with domain evidence", "High confidence fraud detected"]
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
        domain_findings = state.get("domain_findings", {})
        
        # CRITICAL FIX: Even minimal strategy needs at least one domain analysis
        # Cannot make reliable risk assessment without any domain evidence
        if len(domain_findings) == 0 and len(domains_completed) == 0:
            logger.debug(f"📋 Minimal routing: Need at least one domain for evidence")
            # Choose most efficient domain for minimal analysis
            return {
                "next_node": "device_agent",  # Device analysis is typically fastest
                "reasoning": ["Minimal strategy: One domain analysis required", "Device analysis for basic evidence"]
            }
        
        # After domain evidence, proceed to risk assessment
        if "risk" not in domains_completed:
            return {
                "next_node": "risk_agent",
                "reasoning": ["Minimal strategy: Risk assessment with minimal evidence", "Low fraud indicators detected"]
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
        
        # CRITICAL FIX: Check for safety override loops to prevent infinite recursion
        safety_overrides = state.get("safety_overrides", [])
        threshold_manager = get_safety_threshold_manager()
        
        if threshold_manager.should_force_termination_for_safety_overrides(len(safety_overrides)):
            logger.warning(f"🚨 LOOP PREVENTION: {len(safety_overrides)} safety overrides detected - forcing completion")
            return {
                "next_node": "summary",
                "reasoning": [
                    f"Loop prevention: {len(safety_overrides)} safety overrides (limit: {threshold_manager.get_threshold_config().max_safety_overrides_before_termination})",
                    "Forcing investigation completion to prevent infinite loops",
                    "Safety system detected potential recursion"
                ]
            }
        
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
        
        # CRITICAL FIX: Minimum evidence requirement - ALWAYS require at least 1 domain agent
        tools_used = state.get("tools_used", [])
        domains_completed = state.get("domains_completed", [])
        domain_findings = state.get("domain_findings", {})
        evidence_strength = state.get("evidence_strength", 0.0)
        
        # Count actual domain analysis completed (check both sources)
        actual_domains_completed = len(domains_completed)
        if len(domain_findings) > 0:
            # Count domains that have actual analysis results (not just "no_results")
            valid_domain_findings = sum(1 for k, v in domain_findings.items() 
                                      if v and isinstance(v, dict) and v.get("status") != "no_results")
            actual_domains_completed = max(actual_domains_completed, valid_domain_findings)
        
        # STRICT REQUIREMENT: At least 1 domain agent must execute with valid results
        has_sufficient_evidence = (
            actual_domains_completed >= 1 and len(tools_used) >= 2  # MUST have domain analysis
            and evidence_strength >= 0.3  # AND reasonable confidence
        )
        
        if has_sufficient_evidence:
            logger.debug(f"🛡️ Safety routing with sufficient evidence: {len(tools_used)} tools, {actual_domains_completed} valid domains - moving to summary")
            return {
                "next_node": "summary",
                "reasoning": [
                    "Safety-first mode: Sufficient evidence gathered",
                    f"Tools executed: {len(tools_used)}, Valid domains: {actual_domains_completed}",
                    f"Evidence strength: {evidence_strength:.2f}",
                    "Moving toward completion with adequate analysis"
                ]
            }
        
        # CRITICAL FIX: If no domain agents executed yet, force at least one
        if actual_domains_completed == 0:
            logger.debug(f"🛡️ CRITICAL: No domain agents executed - forcing domain analysis")
            # Go directly to first domain agent instead of sequential routing that might skip
            return {
                "next_node": "network_agent",
                "reasoning": [
                    "Safety-first: MUST execute at least one domain agent",
                    "No domain analysis completed - evidence gathering required",
                    "Network agent selected as priority domain for safety mode"
                ]
            }
        
        # If some tools but insufficient evidence, try more domain analysis
        elif len(tools_used) >= 1:  # Lowered from >= 2 to >= 1
            logger.debug(f"🛡️ Insufficient evidence: {len(tools_used)} tools, {actual_domains_completed} domains - require more domain analysis")
            return await self._sequential_routing(state, "Safety-first: Need more domain analysis for evidence")
        
        # Default to conservative sequential routing for initial state
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