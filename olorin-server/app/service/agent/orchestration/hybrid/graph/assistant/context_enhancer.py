"""
Context Enhancer - AI guidance context preparation for LLM enhancement.

This module handles the preparation and enhancement of LLM context with
AI recommendations and guidance for improved investigation decision-making.
"""

from typing import Dict, Any, List

from langchain_core.messages import BaseMessage, SystemMessage

from ...hybrid_state_schema import HybridInvestigationState

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ContextEnhancer:
    """
    AI guidance context preparation for LLM enhancement.
    
    Handles the creation and integration of AI recommendations into
    LLM context for improved decision-making.
    """
    
    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        
    def create_ai_guidance_context(self, state: HybridInvestigationState) -> str:
        """
        Create AI guidance context for LLM enhancement.
        
        Args:
            state: Current investigation state
            
        Returns:
            AI guidance context string for LLM
        """
        # Get AI recommendations to include in LLM prompt context
        ai_decisions = state.get("ai_decisions", [])
        ai_context = ""
        
        if ai_decisions:
            latest_decision = ai_decisions[-1]
            recommended_action = latest_decision.recommended_action
            reasoning = latest_decision.reasoning
            
            logger.info(f"   AI recommendation: {recommended_action}")
            logger.info(f"   AI reasoning: {reasoning}")
            
            # Create context for LLM that includes AI recommendations
            ai_context = f"""

HYBRID INTELLIGENCE GUIDANCE:
- AI Confidence Engine recommends: {recommended_action}
- Reasoning: {' '.join(reasoning) if reasoning else 'Strategic investigation approach'}
- Current investigation strategy: {state.get('investigation_strategy', 'adaptive')}
- Snowflake completed: {state.get('snowflake_completed', False)}

Please follow this guidance when selecting tools and investigation approach.
"""
        
        return ai_context
    
    def enhance_messages_with_ai_context(
        self, 
        messages: List[BaseMessage], 
        ai_context: str
    ) -> List[BaseMessage]:
        """
        Enhance messages with AI guidance context.
        
        Args:
            messages: Original message list
            ai_context: AI guidance context to add
            
        Returns:
            Enhanced message list with AI context
        """
        # Add AI guidance as system context if we have recommendations
        if ai_context.strip():
            # CRITICAL: Preserve tool_use/tool_result message sequence integrity
            # Find the first system message and enhance it, but don't rearrange message order
            enhanced_messages = []
            system_message_found = False
            
            for msg in messages:
                if isinstance(msg, SystemMessage) and not system_message_found:
                    # Enhance the first system message with AI context
                    combined_content = msg.content + "\n\n" + ai_context
                    enhanced_messages.append(SystemMessage(content=combined_content))
                    system_message_found = True
                else:
                    # Preserve all other messages in their exact order
                    enhanced_messages.append(msg)
            
            # If no system message was found, add AI context as first system message
            # but only if there are no tool_use messages at the start
            if not system_message_found:
                # Check if first message is tool_use - if so, don't prepend system message
                if messages and hasattr(messages[0], 'type') and messages[0].type == 'tool_use':
                    # Cannot safely add system message without breaking tool sequence
                    logger.warning("Cannot add AI context - would break tool_use/tool_result sequence")
                    enhanced_messages = messages
                else:
                    enhanced_messages = [SystemMessage(content=ai_context)] + messages
        else:
            enhanced_messages = messages
            
        return enhanced_messages
    
    def get_ai_recommendation_summary(self, state: HybridInvestigationState) -> Dict[str, Any]:
        """
        Get summary of AI recommendations in the current state.
        
        Args:
            state: Current investigation state
            
        Returns:
            Summary of AI recommendations
        """
        ai_decisions = state.get("ai_decisions", [])
        
        if not ai_decisions:
            return {
                "has_recommendations": False,
                "recommendation_count": 0,
                "latest_recommendation": None
            }
        
        latest_decision = ai_decisions[-1]
        
        return {
            "has_recommendations": True,
            "recommendation_count": len(ai_decisions),
            "latest_recommendation": {
                "action": latest_decision.recommended_action,
                "confidence": latest_decision.confidence,
                "strategy": latest_decision.strategy.value if hasattr(latest_decision.strategy, 'value') else str(latest_decision.strategy),
                "reasoning": latest_decision.reasoning
            },
            "investigation_strategy": state.get('investigation_strategy', 'adaptive'),
            "snowflake_completed": state.get('snowflake_completed', False)
        }
    
    def validate_message_sequence_integrity(self, messages: List[BaseMessage]) -> bool:
        """
        Validate that tool_use/tool_result message sequences are preserved.
        
        Args:
            messages: Message list to validate
            
        Returns:
            True if sequence integrity is maintained
        """
        tool_sequence_valid = True
        expecting_tool_result = False
        
        for i, msg in enumerate(messages):
            if hasattr(msg, 'type'):
                if msg.type == 'tool_use':
                    expecting_tool_result = True
                elif msg.type == 'tool_result':
                    if not expecting_tool_result:
                        logger.warning(f"Tool result without preceding tool_use at position {i}")
                        tool_sequence_valid = False
                    expecting_tool_result = False
                elif expecting_tool_result and msg.type != 'tool_result':
                    logger.warning(f"Expected tool_result but found {msg.type} at position {i}")
                    tool_sequence_valid = False
                    expecting_tool_result = False
        
        return tool_sequence_valid