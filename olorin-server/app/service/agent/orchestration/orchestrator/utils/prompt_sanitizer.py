"""
Prompt Sanitizer

Handles sanitization and validation of custom prompts to prevent injection attacks.
"""

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PromptSanitizer:
    """Sanitizes and validates user prompts for security."""

    def __init__(self):
        """Initialize with security patterns."""
        self.dangerous_patterns = [
            'ignore previous', 'forget instructions', 'system:',
            'assistant:', 'user:', '```', 'exec(', 'eval(',
            'import ', '__', 'os.', 'subprocess', 'rm -rf', 'delete'
        ]

    def sanitize_custom_prompt(self, prompt: str) -> str:
        """
        Sanitize custom prompt to prevent injection and ensure safety.

        Args:
            prompt: Raw custom prompt from user

        Returns:
            Sanitized prompt safe for use
        """
        if not prompt:
            return ""

        # Basic sanitization
        sanitized = prompt.strip()

        # Length limit for reasonable prompts
        if len(sanitized) > 500:
            sanitized = sanitized[:500] + "..."
            logger.warning(f"Custom prompt truncated to 500 characters")

        # Basic security filtering - prevent common injection patterns
        prompt_lower = sanitized.lower()
        for pattern in self.dangerous_patterns:
            if pattern in prompt_lower:
                logger.warning(f"Potentially dangerous pattern '{pattern}' detected in custom prompt - removing")
                # Replace dangerous patterns with safe alternatives
                sanitized = sanitized.replace(pattern, '[FILTERED]')

        return sanitized

    def is_prompt_safe(self, prompt: str) -> bool:
        """
        Check if a prompt contains dangerous patterns.

        Args:
            prompt: Prompt to check

        Returns:
            True if prompt is safe, False otherwise
        """
        if not prompt:
            return True

        prompt_lower = prompt.lower()
        for pattern in self.dangerous_patterns:
            if pattern in prompt_lower:
                return False

        return True

    def get_security_report(self, prompt: str) -> dict:
        """
        Generate a security report for a prompt.

        Args:
            prompt: Prompt to analyze

        Returns:
            Dict with security analysis details
        """
        if not prompt:
            return {"safe": True, "issues": [], "sanitized_length": 0}

        issues = []
        prompt_lower = prompt.lower()

        # Check for dangerous patterns
        for pattern in self.dangerous_patterns:
            if pattern in prompt_lower:
                issues.append(f"Dangerous pattern detected: {pattern}")

        # Check length
        if len(prompt) > 500:
            issues.append(f"Prompt too long: {len(prompt)} characters (max 500)")

        # Check for suspicious characters
        suspicious_chars = ['<', '>', '{', '}', '$', '|', ';']
        for char in suspicious_chars:
            if char in prompt:
                issues.append(f"Suspicious character detected: {char}")

        return {
            "safe": len(issues) == 0,
            "issues": issues,
            "original_length": len(prompt),
            "sanitized_length": len(self.sanitize_custom_prompt(prompt))
        }