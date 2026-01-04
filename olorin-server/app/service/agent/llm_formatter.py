"""
LLM Prompt and Response Formatting Utilities

Provides parsing and formatting functions for LLM interactions to ensure
they are easily readable in both console output and log files.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


class LLMPromptParser:
    """Parser for LLM prompts to extract and highlight key information."""

    @staticmethod
    def parse_prompt(
        prompt: str, domain: str, investigation_id: str, entity_id: str
    ) -> str:
        """
        Parse and format an LLM prompt for better readability.

        Args:
            prompt: Raw prompt string
            domain: Investigation domain (DEVICE, NETWORK, etc.)
            investigation_id: Investigation identifier
            entity_id: Entity being analyzed

        Returns:
            Formatted prompt string with sections and highlights
        """
        # Extract key sections from the prompt
        sections = LLMPromptParser._extract_prompt_sections(prompt)

        formatted_lines = []

        # Add header information
        formatted_lines.extend(
            [
                f"   Investigation ID: {investigation_id}",
                f"   Entity: {entity_id}",
                f"   Domain: {domain} Analysis",
                "",
            ]
        )

        # Parse objectives
        if "OBJECTIVES" in sections or "objectives" in prompt.lower():
            formatted_lines.extend(
                [
                    "   OBJECTIVES:",
                    "   ✓ Analyze patterns for fraud indicators",
                    "   ✓ Detect anomalies and suspicious behavior",
                    "   ✓ Assess risk levels and confidence scores",
                    "",
                ]
            )

        # Parse available tools
        tools = LLMPromptParser._extract_tools(prompt)
        if tools:
            formatted_lines.append("   AVAILABLE TOOLS:")
            for tool in tools:
                formatted_lines.append(f"   • {tool}")
            formatted_lines.append("")

        # Parse requirements
        requirements = LLMPromptParser._extract_requirements(prompt)
        if requirements:
            formatted_lines.append("   REQUIREMENTS:")
            for req in requirements:
                formatted_lines.append(f"   ⚠️ {req}")
            formatted_lines.append("")

        # Add specific investigation context
        if "investigation context" in prompt.lower():
            formatted_lines.extend(
                [
                    "   CONTEXT:",
                    "   📊 Investigation data and evidence provided",
                    "   🔍 Historical patterns and baselines available",
                    "   🎯 Specific entity analysis requested",
                    "",
                ]
            )

        return "\n".join(formatted_lines)

    @staticmethod
    def _extract_prompt_sections(prompt: str) -> Dict[str, str]:
        """Extract major sections from the prompt."""
        sections = {}

        # Look for common section headers
        section_patterns = {
            "objectives": r"(?i)objectives?[:]\s*(.*?)(?=\n\n|\n[A-Z]|$)",
            "tools": r"(?i)available tools?[:]\s*(.*?)(?=\n\n|\n[A-Z]|$)",
            "requirements": r"(?i)requirements?[:]\s*(.*?)(?=\n\n|\n[A-Z]|$)",
            "format": r"(?i)format[:]\s*(.*?)(?=\n\n|\n[A-Z]|$)",
        }

        for section, pattern in section_patterns.items():
            match = re.search(pattern, prompt, re.DOTALL)
            if match:
                sections[section] = match.group(1).strip()

        return sections

    @staticmethod
    def _extract_tools(prompt: str) -> List[str]:
        """Extract tool names from the prompt."""
        tools = []

        # Look for tool mentions
        tool_patterns = [
            r"splunk_query_tool",
            r"vector_search_tool",
            r"oii_tool",
            r"device_.*?_tool",
            r"network_.*?_tool",
            r"location_.*?_tool",
        ]

        for pattern in tool_patterns:
            matches = re.findall(pattern, prompt, re.IGNORECASE)
            for match in matches:
                if match not in tools:
                    tool_desc = LLMPromptParser._get_tool_description(match)
                    tools.append(f"{match} - {tool_desc}")

        return tools

    @staticmethod
    def _get_tool_description(tool_name: str) -> str:
        """Get description for a tool."""
        descriptions = {
            "splunk_query_tool": "Log analysis and pattern detection",
            "vector_search_tool": "Semantic search and matching",
            "oii_tool": "Threat intelligence lookup",
            "device_fingerprint_tool": "Device identity analysis",
            "network_analysis_tool": "Network pattern detection",
            "location_validation_tool": "Geographic verification",
        }

        for key, desc in descriptions.items():
            if key in tool_name.lower():
                return desc

        return "Analysis tool"

    @staticmethod
    def _extract_requirements(prompt: str) -> List[str]:
        """Extract key requirements from the prompt."""
        requirements = []

        # Look for mandatory requirements
        if "risk_score" in prompt.lower():
            requirements.append("MANDATORY: Include risk_score (0.0-1.0)")

        if "numbered format" in prompt.lower() or "exact format" in prompt.lower():
            requirements.append("Follow exact numbered format")

        if "confidence" in prompt.lower():
            requirements.append("Include confidence scores")

        if "reasoning" in prompt.lower():
            requirements.append("Provide detailed reasoning")

        return requirements


class LLMResponseParser:
    """Parser for LLM responses to extract and highlight key information."""

    @staticmethod
    def parse_response(response: str, domain: str) -> str:
        """
        Parse and format an LLM response for better readability.

        Args:
            response: Raw response string
            domain: Investigation domain

        Returns:
            Formatted response string with highlights and structure
        """
        # Extract key components
        risk_score = LLMResponseParser._extract_risk_score(response)
        risk_level = LLMResponseParser._extract_risk_level(response)
        confidence = LLMResponseParser._extract_confidence(response)

        formatted_lines = []

        # Parse the numbered format response
        numbered_items = LLMResponseParser._extract_numbered_items(response)

        if numbered_items:
            for i, (number, content) in enumerate(numbered_items):
                if i == 0:  # Risk Level
                    formatted_lines.append(f"   {number}. Risk Level: {content}")
                elif i == 1:  # Risk Score
                    risk_indicator = "✅" if risk_score is not None else "❌"
                    formatted_lines.append(
                        f"   {number}. risk_score: {content} {risk_indicator}"
                    )
                elif i == 2:  # Fraud indicators
                    formatted_lines.append(f"   {number}. Fraud indicators: {content}")
                elif i == 3:  # Confidence
                    formatted_lines.append(f"   {number}. Confidence score: {content}")
                elif i == 4:  # Reasoning
                    formatted_lines.append(f"   {number}. Reasoning: {content}")
                elif i == 5:  # Actions
                    formatted_lines.append(f"   {number}. Actions: {content}")
                else:
                    formatted_lines.append(f"   {number}. {content}")
        else:
            # If not numbered format, try to extract key information
            formatted_lines.extend(
                [
                    f"   Risk Assessment: {risk_level or 'Not specified'}",
                    f"   Risk Score: {risk_score if risk_score is not None else 'MISSING ❌'}",
                    f"   Confidence: {confidence or 'Not specified'}",
                    "",
                    "   Analysis Content:",
                    f"   {response[:500]}{'...' if len(response) > 500 else ''}",
                ]
            )

        return "\n".join(formatted_lines)

    @staticmethod
    def _extract_risk_score(response: str) -> Optional[float]:
        """Extract risk_score from response."""
        # Look for risk_score patterns
        patterns = [
            r"risk_score:\s*([0-9]+\.?[0-9]*)",
            r"risk score:\s*([0-9]+\.?[0-9]*)",
            r"risk_score\s*=\s*([0-9]+\.?[0-9]*)",
        ]

        for pattern in patterns:
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue

        return None

    @staticmethod
    def _extract_risk_level(response: str) -> Optional[str]:
        """Extract risk level from response."""
        patterns = [
            r"risk level:\s*([a-zA-Z]+)",
            r"risk:\s*([a-zA-Z]+)",
            r"level:\s*(low|medium|high|critical)",
        ]

        for pattern in patterns:
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                return match.group(1).title()

        return None

    @staticmethod
    def _extract_confidence(response: str) -> Optional[str]:
        """Extract confidence score from response."""
        patterns = [
            r"confidence\s*(?:score)?:\s*([0-9]+(?:\.[0-9]+)?%?)",
            r"confidence\s*=\s*([0-9]+(?:\.[0-9]+)?%?)",
        ]

        for pattern in patterns:
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                return match.group(1)

        return None

    @staticmethod
    def _extract_numbered_items(response: str) -> List[Tuple[int, str]]:
        """Extract numbered items from response."""
        # Look for numbered format like "1. Risk Level: High"
        pattern = r"(\d+)\.\s*([^\n]+(?:\n(?!\d+\.)[^\n]*)*)"
        matches = re.findall(pattern, response, re.MULTILINE)

        numbered_items = []
        for match in matches:
            number = int(match[0])
            content = match[1].strip()
            numbered_items.append((number, content))

        return numbered_items


class LLMInteractionFormatter:
    """Main formatter for LLM interactions with console and log formatting."""

    @staticmethod
    def format_console_interaction(
        domain: str, investigation_id: str, entity_id: str, prompt: str, response: str
    ) -> Tuple[str, str]:
        """
        Format LLM interaction for console output with colors and structure.

        Returns:
            Tuple of (formatted_prompt, formatted_response)
        """
        # Header
        header = "=" * 80
        section_divider = "-" * 80

        # Format prompt section
        prompt_header = f"🤖 LLM INTERACTION: {domain.title()} Agent"
        prompt_section = "📝 PARSED PROMPT:"
        parsed_prompt = LLMPromptParser.parse_prompt(
            prompt, domain, investigation_id, entity_id
        )

        console_prompt = f"{header}\n{prompt_header}\n{header}\n{prompt_section}\n{parsed_prompt}\n{section_divider}"

        # Format response section
        response_section = "💬 LLM RESPONSE:"
        parsed_response = LLMResponseParser.parse_response(response, domain)

        console_response = f"{response_section}\n{parsed_response}\n{header}"

        return console_prompt, console_response

    @staticmethod
    def format_log_interaction(
        domain: str, investigation_id: str, entity_id: str, prompt: str, response: str
    ) -> Tuple[str, str]:
        """
        Format LLM interaction for log files with clear text formatting.

        Returns:
            Tuple of (formatted_prompt, formatted_response)
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Format for logs (no emojis, clear structure)
        log_header = f"[{timestamp}] LLM INTERACTION: {domain.upper()} AGENT"
        log_separator = "=" * 60

        # Prompt formatting for logs
        parsed_prompt = LLMPromptParser.parse_prompt(
            prompt, domain, investigation_id, entity_id
        )
        log_prompt = f"{log_header}\n{log_separator}\nPARSED PROMPT:\n{parsed_prompt}\n{'-' * 40}"

        # Response formatting for logs
        parsed_response = LLMResponseParser.parse_response(response, domain)
        log_response = f"LLM RESPONSE:\n{parsed_response}\n{log_separator}"

        return log_prompt, log_response

    @staticmethod
    def validate_response_format(response: str) -> Dict[str, Any]:
        """
        Validate response format and extract key validation metrics.

        Returns:
            Dictionary with validation results
        """
        validation_result = {
            "has_risk_score": False,
            "risk_score_value": None,
            "has_numbered_format": False,
            "format_compliance": 0.0,
            "missing_elements": [],
        }

        # Check for risk_score
        risk_score = LLMResponseParser._extract_risk_score(response)
        if risk_score is not None:
            validation_result["has_risk_score"] = True
            validation_result["risk_score_value"] = risk_score
        else:
            validation_result["missing_elements"].append("risk_score")

        # Check for numbered format
        numbered_items = LLMResponseParser._extract_numbered_items(response)
        if numbered_items and len(numbered_items) >= 4:
            validation_result["has_numbered_format"] = True
        else:
            validation_result["missing_elements"].append("numbered_format")

        # Calculate format compliance
        required_elements = ["risk_score", "numbered_format"]
        compliant_elements = sum(
            1
            for elem in required_elements
            if elem not in validation_result["missing_elements"]
        )
        validation_result["format_compliance"] = compliant_elements / len(
            required_elements
        )

        return validation_result
