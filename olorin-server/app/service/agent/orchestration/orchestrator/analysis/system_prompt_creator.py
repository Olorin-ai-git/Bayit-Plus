"""
System Prompt Creator

Creates enhanced system prompts with custom user instructions.
"""

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.agent.orchestration.orchestrator.utils import PromptSanitizer, IntegrityValidator

logger = get_bridge_logger(__name__)


class SystemPromptCreator:
    """Creates enhanced system prompts with custom user priority."""

    def __init__(self):
        """Initialize with sanitizer and validator."""
        self.prompt_sanitizer = PromptSanitizer()
        self.integrity_validator = IntegrityValidator()

    def create_enhanced_system_prompt(self, base_prompt: str, state: InvestigationState) -> str:
        """
        Create system prompt with custom user prompt priority.

        Args:
            base_prompt: Base system prompt for the current phase
            state: Current investigation state

        Returns:
            Enhanced prompt with custom user instruction
        """
        custom_prompt = state.get('custom_user_prompt')
        if not custom_prompt:
            return base_prompt

        # Validate investigation integrity first
        if not self.integrity_validator.validate_investigation_integrity(state):
            logger.warning("Custom prompt violates investigation integrity - ignoring")
            return base_prompt

        # Sanitize custom prompt
        sanitized_prompt = self.prompt_sanitizer.sanitize_custom_prompt(custom_prompt)
        if not sanitized_prompt or sanitized_prompt == '[FILTERED]':
            logger.warning("Custom prompt was filtered out due to security concerns")
            return base_prompt

        # Construct enhanced prompt with priority
        enhanced_prompt = f"""🎯 USER PRIORITY INSTRUCTION: {sanitized_prompt}

{base_prompt}

IMPORTANT: While following the standard investigation process, give special attention to the user's priority instruction above. Adapt your analysis and tool selection to focus on the specified areas while maintaining investigation completeness."""

        logger.info(f"✨ Enhanced prompt with custom user focus: '{sanitized_prompt}'")
        return enhanced_prompt