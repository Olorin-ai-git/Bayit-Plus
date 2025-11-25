"""
Hybrid Assistant - Hybrid-aware LLM assistant for intelligent investigation guidance.

This module provides a hybrid-aware assistant that integrates AI recommendations
into LLM context for improved decision-making during fraud investigations.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from langchain_core.messages import SystemMessage

from app.service.agent.orchestration.assistant import assistant
from app.service.logging import get_bridge_logger

from ...hybrid_state_schema import HybridInvestigationState
from .context_enhancer import ContextEnhancer

logger = get_bridge_logger(__name__)


class HybridAssistant:
    """
    Hybrid-aware assistant that provides proper context to LLM.

    Ensures the LLM gets AI recommendations in the prompt context
    and maintains proper hybrid state management.
    """

    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        self.context_enhancer = ContextEnhancer(components)

    async def hybrid_aware_assistant(
        self, state: HybridInvestigationState, config: Optional[Dict] = None
    ) -> HybridInvestigationState:
        """
        Hybrid-aware assistant that provides proper context to LLM and maintains hybrid graph flow.

        This function ensures the LLM gets AI recommendations in the prompt context
        so it can naturally prioritize Snowflake, and maintains proper hybrid state management.
        """

        logger.info(
            f"🧠 Hybrid-aware assistant preparing LLM context with AI recommendations"
        )

        # Get AI context for LLM enhancement
        ai_context = self.context_enhancer.create_ai_guidance_context(state)

        # Create enhanced messages with AI guidance context
        enhanced_messages = self.context_enhancer.enhance_messages_with_ai_context(
            state.get("messages", []), ai_context
        )

        # Create enhanced state for LLM with AI guidance
        llm_state = state.copy()
        llm_state["messages"] = enhanced_messages

        logger.info(f"   🤖 Running LLM with AI guidance context")

        # Call LLM assistant with enhanced context (now async with resilience wrapper)
        assistant_result = await assistant(llm_state, config)

        # Merge LLM result back into hybrid state while preserving hybrid fields
        enhanced_state = self._merge_assistant_result(
            state, assistant_result, ai_context
        )

        logger.info(f"✅ Hybrid-aware assistant completed with LLM guidance")

        return enhanced_state

    def _merge_assistant_result(
        self,
        state: HybridInvestigationState,
        assistant_result: Dict[str, Any],
        ai_context: str,
    ) -> HybridInvestigationState:
        """Merge LLM assistant result back into hybrid state while preserving hybrid fields."""

        # Start with original hybrid state
        enhanced_state = state.copy()

        # Protected hybrid fields that should not be overwritten
        PROTECTED_HYBRID_FIELDS = {
            "ai_decisions",
            "confidence_evolution",
            "decision_audit_trail",
            "performance_metrics",
            "hybrid_system_version",
            "feature_flags_active",
        }

        # Update with LLM results but preserve hybrid-specific fields
        for key, value in assistant_result.items():
            if key not in PROTECTED_HYBRID_FIELDS:
                enhanced_state[key] = value

        # Add audit trail for hybrid assistant execution
        ai_decisions = state.get("ai_decisions", [])
        enhanced_state["decision_audit_trail"].append(
            {
                "timestamp": datetime.now().isoformat(),
                "decision_type": "hybrid_assistant_execution",
                "details": {
                    "ai_guidance_provided": bool(ai_context.strip()),
                    "recommended_action": (
                        ai_decisions[-1].recommended_action if ai_decisions else "none"
                    ),
                    "llm_response_received": True,
                    "messages_count": len(enhanced_state.get("messages", [])),
                },
            }
        )

        return enhanced_state

    def get_assistant_stats(self, state: HybridInvestigationState) -> Dict[str, Any]:
        """Get statistics about assistant execution."""
        assistant_executions = [
            entry
            for entry in state.get("decision_audit_trail", [])
            if entry.get("decision_type") == "hybrid_assistant_execution"
        ]

        return {
            "assistant_executions_count": len(assistant_executions),
            "ai_guidance_provided_count": len(
                [
                    ex
                    for ex in assistant_executions
                    if ex.get("details", {}).get("ai_guidance_provided", False)
                ]
            ),
            "last_execution": (
                assistant_executions[-1] if assistant_executions else None
            ),
        }
