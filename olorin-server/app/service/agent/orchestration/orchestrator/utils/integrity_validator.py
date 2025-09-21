"""
Integrity Validator

Validates investigation integrity and ensures custom prompts don't compromise the investigation process.
"""

from typing import Dict, Any
from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState

logger = get_bridge_logger(__name__)


class IntegrityValidator:
    """Validates investigation integrity and prevents bypass attempts."""

    def __init__(self):
        """Initialize with integrity violation patterns."""
        self.integrity_violations = [
            'skip snowflake', 'bypass snowflake', 'ignore snowflake',
            'no snowflake', 'disable snowflake', 'avoid analysis',
            'skip investigation', 'bypass analysis', 'only use'
        ]

    def validate_investigation_integrity(self, state: InvestigationState) -> bool:
        """
        Validate that custom prompts don't compromise investigation integrity.

        Args:
            state: Current investigation state

        Returns:
            True if investigation integrity is maintained
        """
        custom_prompt = state.get('custom_user_prompt')
        if not custom_prompt:
            return True

        # Ensure mandatory phases cannot be disabled
        prompt_lower = custom_prompt.lower()

        for violation in self.integrity_violations:
            if violation in prompt_lower:
                logger.warning(f"Investigation integrity violation detected: '{violation}' in custom prompt")
                return False

        return True

    def validate_state_consistency(self, state: InvestigationState) -> Dict[str, Any]:
        """
        Validate state consistency and detect potential issues.

        Args:
            state: Investigation state to validate

        Returns:
            Dict with validation results
        """
        validation_result = {
            "valid": True,
            "warnings": [],
            "errors": []
        }

        # Check required fields
        required_fields = ['investigation_id', 'entity_id', 'entity_type']
        for field in required_fields:
            if not state.get(field):
                validation_result["errors"].append(f"Missing required field: {field}")
                validation_result["valid"] = False

        # Check entity type validity
        valid_entity_types = ['ip', 'user', 'transaction', 'device']
        entity_type = state.get('entity_type')
        if entity_type and entity_type not in valid_entity_types:
            validation_result["warnings"].append(f"Unusual entity type: {entity_type}")

        # Check tool count limits
        tool_count = state.get('tool_count', 0)
        max_tools = state.get('max_tools', 10)
        if tool_count > max_tools:
            validation_result["warnings"].append(f"Tool count ({tool_count}) exceeds limit ({max_tools})")

        # Check investigation phase consistency
        current_phase = state.get('current_phase')
        if current_phase and current_phase not in ['initialization', 'snowflake_analysis', 'tool_execution', 'domain_analysis', 'summary']:
            validation_result["warnings"].append(f"Unknown investigation phase: {current_phase}")

        return validation_result

    def check_prompt_compliance(self, prompt: str) -> Dict[str, Any]:
        """
        Check if prompt complies with investigation requirements.

        Args:
            prompt: Custom prompt to check

        Returns:
            Dict with compliance results
        """
        if not prompt:
            return {"compliant": True, "issues": []}

        issues = []
        prompt_lower = prompt.lower()

        # Check for integrity violations
        for violation in self.integrity_violations:
            if violation in prompt_lower:
                issues.append(f"Integrity violation: {violation}")

        # Check for mandatory phase interference
        mandatory_phases = ['snowflake', 'analysis', 'investigation']
        for phase in mandatory_phases:
            skip_patterns = [f'skip {phase}', f'ignore {phase}', f'bypass {phase}']
            for pattern in skip_patterns:
                if pattern in prompt_lower:
                    issues.append(f"Attempts to bypass mandatory phase: {phase}")

        return {
            "compliant": len(issues) == 0,
            "issues": issues
        }