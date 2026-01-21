"""
Intelligence Nodes - AI confidence and safety validation nodes.

This module contains the AI intelligence and safety validation nodes that handle
confidence assessment and safety validation in the hybrid intelligence system.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger

from ...advanced_safety_manager import AdvancedSafetyManager
from ...ai_confidence_engine import AIConfidenceEngine
from ...hybrid_state_schema import HybridInvestigationState, update_ai_confidence

logger = get_bridge_logger(__name__)


class IntelligenceNodes:
    """
    AI intelligence and safety validation nodes for hybrid investigation.

    Handles AI confidence assessment and safety validation with audit trail tracking.
    """

    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        self.confidence_engine = components["confidence_engine"]
        self.safety_manager = components["safety_manager"]

    async def ai_confidence_assessment_node(
        self, state: HybridInvestigationState, config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """AI confidence assessment and decision generation node"""

        logger.info(f"🧠 Hybrid Intelligence AI confidence assessment starting")
        logger.debug(f"   🔍 NODE CONTEXT:")
        logger.debug(f"     Node: AI Confidence Assessment")
        logger.debug(f"     Investigation ID: {state.get('investigation_id', 'N/A')}")
        logger.debug(f"     Current Phase: {state.get('current_phase', 'N/A')}")
        logger.debug(f"     Tool Count: {state.get('tool_count', 0)}")
        logger.debug(f"     Risk Score: {state.get('risk_score', 0.0)}")
        logger.debug(f"     Current AI Confidence: {state.get('ai_confidence', 0.0)}")
        logger.debug(f"   🧠 ASSESSMENT FRAMEWORK:")
        logger.debug(f"     Analysis Type: Multi-factor weighted analysis")
        logger.debug(
            f"     Factor weights: Snowflake(35%) + Tool(25%) + Domain(20%) + Pattern(15%) + Velocity(5%)"
        )
        logger.debug(f"     Engine Type: Advanced evidence quality calculation")
        logger.debug(f"     Output: Comprehensive AI routing decision with strategy")

        try:
            # Calculate AI confidence and routing decision
            logger.debug(f"   🔄 ASSESSMENT PHASE: Calling confidence engine...")
            ai_decision = (
                await self.confidence_engine.calculate_investigation_confidence(state)
            )
            logger.debug(f"   ✅ AI DECISION RECEIVED:")
            logger.debug(
                f"     Confidence: {getattr(ai_decision, 'confidence', 'N/A')}"
            )
            logger.debug(
                f"     Confidence Level: {getattr(ai_decision, 'confidence_level', 'N/A')}"
            )
            logger.debug(f"     Strategy: {getattr(ai_decision, 'strategy', 'N/A')}")
            logger.debug(
                f"     Recommended Action: {getattr(ai_decision, 'recommended_action', 'N/A')}"
            )
            logger.debug(
                f"     Reasoning Items: {len(getattr(ai_decision, 'reasoning', []))}"
            )

            # Update state with new confidence
            logger.debug(
                f"   🔄 STATE UPDATE PHASE: Updating state with AI confidence..."
            )
            updated_state = update_ai_confidence(
                state, ai_decision, "confidence_assessment"
            )
            logger.debug(
                f"   ✅ STATE UPDATED: AI confidence integrated into investigation state"
            )

            # Prepare audit trail entry
            audit_entry = {
                "timestamp": datetime.now().isoformat(),
                "decision_type": "confidence_assessment",
                "details": {
                    "confidence": getattr(ai_decision, "confidence", 0.0),
                    "confidence_level": (
                        getattr(ai_decision, "confidence_level", "UNKNOWN").value
                        if hasattr(
                            getattr(ai_decision, "confidence_level", None), "value"
                        )
                        else str(getattr(ai_decision, "confidence_level", "UNKNOWN"))
                    ),
                    "strategy": (
                        getattr(ai_decision, "strategy", "ADAPTIVE").value
                        if hasattr(getattr(ai_decision, "strategy", None), "value")
                        else str(getattr(ai_decision, "strategy", "ADAPTIVE"))
                    ),
                    "recommended_action": getattr(
                        ai_decision, "recommended_action", "N/A"
                    ),
                    "reasoning": getattr(ai_decision, "reasoning", []),
                },
            }

            # Add confidence assessment to audit trail
            logger.debug(
                f"   🔄 AUDIT TRAIL PHASE: Adding assessment to audit trail..."
            )
            updated_state["decision_audit_trail"].append(audit_entry)
            logger.debug(
                f"   ✅ AUDIT ENTRY ADDED: Total audit entries: {len(updated_state['decision_audit_trail'])}"
            )

            from app.service.agent.orchestration.metrics.safe import fmt_num

            confidence_val = getattr(ai_decision, "confidence", 0.0)
            logger.info(
                f"✅ AI confidence assessed: {fmt_num(confidence_val, 3)} ({getattr(ai_decision, 'confidence_level', 'UNKNOWN')})"
            )
            logger.info(f"   Strategy: {getattr(ai_decision, 'strategy', 'N/A')}")
            logger.info(
                f"   Recommended action: {getattr(ai_decision, 'recommended_action', 'N/A')}"
            )

            logger.debug(f"   🎯 AI CONFIDENCE ASSESSMENT COMPLETE:")
            logger.debug(f"     Multi-factor analysis performed")
            logger.debug(f"     Strategic decision generated")
            logger.debug(f"     State successfully updated")
            logger.debug(f"     Audit trail maintained")
            logger.debug(f"     Ready for next intelligence phase")

            return updated_state

        except Exception as e:
            logger.error(f"❌ AI confidence assessment failed: {str(e)}")
            logger.debug(f"   💥 ERROR DETAILS:")
            logger.debug(f"     Exception Type: {type(e).__name__}")
            logger.debug(f"     Exception Message: {str(e)}")
            logger.debug(
                f"     Investigation context: {state.get('investigation_id', 'N/A')} - {state.get('current_phase', 'N/A')}"
            )
            logger.debug(
                f"     State at failure: tool_count={state.get('tool_count', 0)}, loops={state.get('orchestrator_loops', 0)}"
            )

            # Create detailed error record
            error_record = {
                "timestamp": datetime.now().isoformat(),
                "error_type": "confidence_assessment_failure",
                "message": str(e),
                "exception_type": type(e).__name__,
                "recovery_action": "fallback_to_safety_mode",
                "node_context": {
                    "node": "ai_confidence_assessment",
                    "investigation_id": state.get("investigation_id"),
                    "current_phase": state.get("current_phase"),
                    "tool_count": state.get("tool_count", 0),
                    "orchestrator_loops": state.get("orchestrator_loops", 0),
                },
            }

            # Add error to state
            state["errors"].append(error_record)
            logger.debug(f"   🔄 ERROR RECOVERY: Added detailed error record to state")
            logger.debug(f"   🛡️ FALLBACK: Proceeding with safety-first mode")

            return state

    async def safety_validation_node(
        self, state: HybridInvestigationState, config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """Safety validation and override detection node"""

        logger.debug(f"🛡️ Hybrid Intelligence safety validation starting")
        logger.debug(f"   🔍 NODE CONTEXT:")
        logger.debug(f"     Node: Safety Validation")
        logger.debug(f"     Investigation ID: {state.get('investigation_id', 'N/A')}")
        logger.debug(f"     Current Phase: {state.get('current_phase', 'N/A')}")
        logger.debug(f"     Orchestrator Loops: {state.get('orchestrator_loops', 0)}")
        logger.debug(f"     Tool Count: {state.get('tool_count', 0)}")
        logger.debug(
            f"     Existing Safety Concerns: {len(state.get('safety_concerns', []))}"
        )
        logger.debug(f"     Current AI Confidence: {state.get('ai_confidence', 0.0)}")
        logger.debug(f"   🛡️ SAFETY FRAMEWORK:")
        logger.debug(
            f"     Manager Type: Advanced Safety Manager (Dynamic limits & resource monitoring)"
        )
        logger.debug(
            f"     Validation scope: AI control authorization & termination checks"
        )
        logger.debug(f"     Output: Comprehensive safety status with dynamic limits")

        try:
            # Validate current state
            logger.debug(f"   🔄 VALIDATION PHASE: Calling safety manager...")
            safety_status = self.safety_manager.validate_current_state(state)
            logger.debug(f"   ✅ SAFETY STATUS RECEIVED:")
            logger.debug(
                f"     Safety Level: {getattr(safety_status, 'safety_level', 'N/A')}"
            )
            logger.debug(
                f"     AI Control Allowed: {getattr(safety_status, 'allows_ai_control', False)}"
            )
            logger.debug(
                f"     Termination Required: {getattr(safety_status, 'requires_immediate_termination', False)}"
            )
            resource_pressure = getattr(safety_status, "resource_pressure", 0.0)
            logger.debug(f"     Resource Pressure: {fmt_num(resource_pressure, 3)}")
            logger.debug(
                f"     Safety Concerns: {len(getattr(safety_status, 'safety_concerns', []))}"
            )

            # Update dynamic limits
            logger.debug(f"   🔄 LIMITS UPDATE PHASE: Updating dynamic limits...")
            limits = getattr(safety_status, "current_limits", None)
            if limits:
                dynamic_limits = {
                    "max_orchestrator_loops": getattr(
                        limits, "max_orchestrator_loops", 50
                    ),
                    "max_tool_executions": getattr(limits, "max_tool_executions", 20),
                    "max_domain_attempts": getattr(limits, "max_domain_attempts", 10),
                    "max_investigation_time_minutes": getattr(
                        limits, "max_investigation_time_minutes", 30
                    ),
                }
                state["dynamic_limits"] = dynamic_limits
                logger.debug(f"   ✅ DYNAMIC LIMITS UPDATED: {dynamic_limits}")
            else:
                logger.warning(
                    f"   ⚠️ No current_limits in safety_status, skipping limits update"
                )

            # Record safety concerns
            logger.debug(f"   🔄 CONCERNS PHASE: Processing safety concerns...")
            safety_concerns = getattr(safety_status, "safety_concerns", [])
            if safety_concerns:
                safety_level_value = (
                    getattr(
                        safety_status.safety_level,
                        "value",
                        str(safety_status.safety_level),
                    )
                    if hasattr(safety_status, "safety_level")
                    else "UNKNOWN"
                )
                concern_records = [
                    {
                        "timestamp": datetime.now().isoformat(),
                        "concern": concern,
                        "safety_level": safety_level_value,
                        "resource_pressure": getattr(
                            safety_status, "resource_pressure", 0.0
                        ),
                    }
                    for concern in safety_concerns
                ]

                state["safety_concerns"].extend(concern_records)
                logger.debug(
                    f"   ✅ SAFETY CONCERNS RECORDED: {len(concern_records)} new concerns added"
                )
            else:
                logger.debug(
                    f"   ✅ NO NEW SAFETY CONCERNS: Current operation within safe parameters"
                )

            # Prepare audit trail entry
            safety_level_value = (
                getattr(
                    safety_status.safety_level, "value", str(safety_status.safety_level)
                )
                if hasattr(safety_status, "safety_level")
                else "UNKNOWN"
            )
            audit_entry = {
                "timestamp": datetime.now().isoformat(),
                "decision_type": "safety_validation",
                "details": {
                    "safety_level": safety_level_value,
                    "ai_control_allowed": getattr(
                        safety_status, "allows_ai_control", False
                    ),
                    "termination_required": getattr(
                        safety_status, "requires_immediate_termination", False
                    ),
                    "resource_pressure": getattr(
                        safety_status, "resource_pressure", 0.0
                    ),
                    "safety_concerns": len(safety_concerns),
                },
            }

            # Add safety validation to audit trail
            logger.debug(
                f"   🔄 AUDIT TRAIL PHASE: Adding validation to audit trail..."
            )
            state["decision_audit_trail"].append(audit_entry)
            logger.debug(
                f"   ✅ AUDIT ENTRY ADDED: Total audit entries: {len(state['decision_audit_trail'])}"
            )

            logger.info(f"✅ Safety validation complete")
            logger.info(
                f"   Safety level: {getattr(safety_status.safety_level, 'value', safety_status.safety_level) if hasattr(safety_status, 'safety_level') else 'UNKNOWN'}"
            )
            logger.info(
                f"   AI control allowed: {getattr(safety_status, 'allows_ai_control', False)}"
            )
            resource_pressure = getattr(safety_status, "resource_pressure", 0.0)
            logger.info(f"   Resource pressure: {fmt_num(resource_pressure, 3)}")

            logger.debug(f"   🎯 SAFETY VALIDATION COMPLETE:")
            logger.debug(f"     Comprehensive safety assessment performed")
            logger.debug(f"     Dynamic limits calculated and applied")
            logger.debug(f"     Resource pressure assessed")
            logger.debug(f"     AI control authorization determined")
            logger.debug(f"     Safety concerns recorded")
            logger.debug(f"     Audit trail maintained")
            logger.debug(f"     Ready for next intelligence phase")

            return state

        except Exception as e:
            logger.error(f"❌ Safety validation failed: {str(e)}")

            # Add error and force strict safety mode
            state["errors"].append(
                {
                    "timestamp": datetime.now().isoformat(),
                    "error_type": "safety_validation_failure",
                    "message": str(e),
                    "recovery_action": "force_strict_safety",
                }
            )

            return state
