"""
Orchestrator Node - Main hybrid orchestrator node for intelligent routing.

This module contains the main hybrid orchestrator node that combines AI and safety
decisions to make intelligent routing choices in the investigation workflow.
"""

from typing import Dict, Any, Optional
from datetime import datetime

from ...hybrid_state_schema import HybridInvestigationState
from ...intelligent_router import IntelligentRouter

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class OrchestratorNode:
    """
    Main hybrid orchestrator node combining AI and safety decisions.
    
    Handles intelligent routing decisions based on AI confidence and safety validation.
    """
    
    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        self.intelligent_router = components["intelligent_router"]
        
    async def hybrid_orchestrator_node(
        self,
        state: HybridInvestigationState,
        config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Main hybrid orchestrator node combining AI and safety decisions"""
        
        logger.info(f"🎛️ Hybrid Intelligence orchestrator executing")
        logger.debug(f"   🔍 STATE ANALYSIS:")
        logger.debug(f"     Investigation ID: {state.get('investigation_id', 'N/A')}")
        logger.debug(f"     Current Phase: {state.get('current_phase', 'N/A')}")
        logger.debug(f"     Tool Count: {state.get('tool_count', 0)}")
        logger.debug(f"     Orchestrator Loops: {state.get('orchestrator_loops', 0)}")
        logger.debug(f"     Risk Score: {state.get('risk_score', 0.0)}")
        logger.debug(f"     Confidence Score: {state.get('confidence_score', 0.0)}")
        logger.debug(f"     AI Confidence Level: {state.get('ai_confidence_level', 'UNKNOWN')}")
        logger.debug(f"   🧠 ROUTING CONTEXT:")
        logger.debug(f"     Intelligent Router: AI confidence + safety validation")
        logger.debug(f"     Available strategies: CRITICAL_PATH | MINIMAL | FOCUSED | ADAPTIVE | COMPREHENSIVE")
        logger.debug(f"     Safety concerns: {len(state.get('safety_concerns', []))} active")
        logger.debug(f"     Previous routing decisions: {len(state.get('routing_decisions', []))}")
        
        try:
            logger.debug(f"   🎯 DECISION PROCESS: Starting hybrid routing decision...")
            # Get hybrid routing decision
            routing_decision = await self.intelligent_router.get_hybrid_routing_decision(state)
            logger.debug(f"   ✅ DECISION RECEIVED: {routing_decision}")
            
            # Update orchestrator loop count
            old_loop_count = state.get("orchestrator_loops", 0)
            state["orchestrator_loops"] = old_loop_count + 1
            logger.debug(f"   🔄 LOOP UPDATE: {old_loop_count} → {state['orchestrator_loops']}")
            
            # Prepare routing decision record
            decision_record = {
                "timestamp": datetime.now().isoformat(),
                "decision": routing_decision["next_node"],
                "confidence": routing_decision.get("confidence", 0.0),
                "reasoning": routing_decision.get("reasoning", []),
                "safety_override": routing_decision.get("safety_override", False)
            }
            logger.debug(f"   📝 DECISION RECORD: {decision_record}")
            
            # Add routing decision to state
            state["routing_decisions"] = state.get("routing_decisions", [])
            state["routing_decisions"].append(decision_record)
            logger.debug(f"   📋 DECISION HISTORY: Total decisions: {len(state['routing_decisions'])}")
            
            # Update audit trail
            audit_entry = {
                "timestamp": datetime.now().isoformat(),
                "decision_type": "hybrid_orchestration",
                "details": routing_decision
            }
            state["decision_audit_trail"].append(audit_entry)
            logger.debug(f"   📊 AUDIT TRAIL: Total entries: {len(state['decision_audit_trail'])}")
            
            # Log final decision with context
            logger.info(f"✅ Hybrid orchestrator decision: {routing_decision['next_node']}")
            logger.debug(f"   🎯 DECISION DETAILS:")
            logger.debug(f"     Next Node: {routing_decision['next_node']}")
            from app.service.agent.orchestration.metrics.safe import fmt_num
            confidence_val = routing_decision.get('confidence', 0.0)
            logger.debug(f"     Confidence: {fmt_num(confidence_val, 3)}")
            logger.debug(f"     Reasoning Items: {len(routing_decision.get('reasoning', []))}")
            logger.debug(f"     Safety Override: {routing_decision.get('safety_override', False)}")
            
            if routing_decision.get("safety_override"):
                logger.warning(f"⚠️ Safety override applied: {routing_decision.get('override_reason')}")
                logger.debug(f"   🛡️ SAFETY OVERRIDE DETAILS:")
                logger.debug(f"     Reason: {routing_decision.get('override_reason', 'No reason provided')}")
                logger.debug(f"     Override Type: {routing_decision.get('override_type', 'N/A')}")
            
            return state
            
        except Exception as e:
            logger.error(f"❌ Hybrid orchestrator failed: {str(e)}")
            logger.debug(f"   💥 ERROR CONTEXT:")
            logger.debug(f"     Exception Type: {type(e).__name__}")
            logger.debug(f"     Exception Message: {str(e)}")
            logger.debug(f"     State at failure: investigation_id={state.get('investigation_id')}, phase={state.get('current_phase')}")
            logger.debug(f"     Loop count at failure: {state.get('orchestrator_loops', 0)}")
            
            # Create detailed error record
            error_record = {
                "timestamp": datetime.now().isoformat(),
                "error_type": "hybrid_orchestration_failure",
                "message": str(e),
                "exception_type": type(e).__name__,
                "recovery_action": "fallback_to_summary",
                "state_context": {
                    "investigation_id": state.get("investigation_id"),
                    "current_phase": state.get("current_phase"),
                    "orchestrator_loops": state.get("orchestrator_loops", 0),
                    "tool_count": state.get("tool_count", 0)
                }
            }
            
            # Add error and return safe fallback
            state["errors"].append(error_record)
            logger.debug(f"   🔄 ERROR RECOVERY: Added error record to state, total errors: {len(state['errors'])}")
            logger.debug(f"   🛡️ FALLBACK: Proceeding with safe fallback to summary")
            
            return state
    
    def get_orchestrator_stats(self, state: HybridInvestigationState) -> Dict[str, Any]:
        """Get statistics about orchestrator performance."""
        return {
            "orchestrator_loops": state.get("orchestrator_loops", 0),
            "routing_decisions_count": len(state.get("routing_decisions", [])),
            "last_routing_decision": state.get("routing_decisions", [])[-1] if state.get("routing_decisions") else None,
            "safety_overrides_count": len([d for d in state.get("routing_decisions", []) if d.get("safety_override")])
        }