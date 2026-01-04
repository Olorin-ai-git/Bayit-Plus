"""
Structured Agent Prompt Generation

Unified prompt generation for structured investigation agents.
Single source of truth replacing scattered Gaia and Olorin prompts.
"""

from typing import Any, Dict, List, Optional

from app.service.agent.autonomous_context import StructuredInvestigationContext
from app.service.agent.unified_prompts import (
    get_unified_investigation_prompt,
    validate_tool_usage,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def create_investigation_prompt(
    domain: str,
    context: StructuredInvestigationContext,
    llm_context: str,
    specific_objectives: List[str] = None,
    available_tools: List[Any] = None,
) -> str:
    """Create unified investigation prompt with emphasis on comprehensive tool usage

    Args:
        domain: Investigation domain (device, location, network, logs, risk)
        context: Structured investigation context
        llm_context: LLM context string
        specific_objectives: Optional specific objectives
        available_tools: List of available tools for the agent

    Returns:
        Formatted investigation prompt emphasizing ALL tool usage
    """
    # Get tool names from tool objects
    if available_tools:
        tool_names = [
            tool.name if hasattr(tool, "name") else str(tool)
            for tool in available_tools
        ]
        logger.info(
            f"Creating unified prompt for {domain} with {len(tool_names)} available tools"
        )
    else:
        tool_names = []
        logger.warning(f"No tools provided for {domain} prompt generation")

    # Use unified prompt system - single source of truth
    logger.info(f"Using unified prompt system for domain: {domain}")

    # Extract entity_type from context if available
    entity_type = None
    if hasattr(context, "entity_type"):
        # StructuredInvestigationContext has entity_type as EntityType enum
        if hasattr(context.entity_type, "value"):
            entity_type = context.entity_type.value
        else:
            entity_type = str(context.entity_type)
    elif isinstance(context, dict):
        # Fallback for dict-based context
        entity_type = context.get("entity_type")

    # Generate unified prompt with emphasis on comprehensive tool usage
    unified_prompt = get_unified_investigation_prompt(
        domain=domain,
        context=context,
        llm_context=llm_context,
        available_tools=tool_names,
        specific_objectives=specific_objectives,
        entity_type=entity_type,
    )

    return unified_prompt


# Validation function for agent responses
def validate_investigation_response(response: str, domain: str) -> Dict[str, Any]:
    """Validate that the investigation response meets requirements.

    Args:
        response: Agent's investigation response
        domain: Investigation domain

    Returns:
        Validation result dictionary
    """
    # Validate tool usage
    tool_validation = validate_tool_usage(response)

    # Check for required fields
    has_risk_score = (
        "risk_score" in response.lower() or "risk score" in response.lower()
    )

    validation_result = {
        "valid": tool_validation["sufficient_coverage"] and has_risk_score,
        "tool_coverage": tool_validation,
        "has_risk_score": has_risk_score,
        "domain": domain,
        "recommendations": [],
    }

    if not tool_validation["sufficient_coverage"]:
        validation_result["recommendations"].append(tool_validation["recommendation"])

    if not has_risk_score:
        validation_result["recommendations"].append(
            "⚠️ MISSING RISK SCORE: The investigation must include a numerical risk_score (0.0-1.0)"
        )

    return validation_result


# Legacy validation function - kept for compatibility
def validate_investigation_response(response, domain: str) -> bool:
    """Validate investigation response format

    Args:
        response: LLM response to validate (string, list, or object)
        domain: Domain that generated the response

    Returns:
        True if response is valid, False otherwise
    """
    try:
        # Import and use content extraction utility
        from app.service.agent.structured_parsing import extract_content_from_response

        # Extract string content from various response formats
        if isinstance(response, str):
            response_content = response
        else:
            response_content = extract_content_from_response(response)

        # Basic validation - check for required elements
        required_elements = ["risk_score", "confidence"]
        response_lower = response_content.lower()

        for element in required_elements:
            if element not in response_lower:
                logger.warning(
                    f"Missing required element '{element}' in {domain} response"
                )
                return False

        logger.info(f"Response validated for domain: {domain}")
        return True

    except Exception as e:
        logger.error(f"Error validating response for domain {domain}: {str(e)}")
        return False


def _get_full_llm_response_for_domain(
    domain_findings: Dict[str, Any], domain: str
) -> str:
    """
    Get the full LLM response text for a specific domain from domain findings.

    This is CRITICAL for Risk Assessment - it needs the complete analysis text,
    not just summaries or scores.

    Args:
        domain_findings: Dictionary of domain findings from context
        domain: The domain to get the response for

    Returns:
        Full LLM response text or placeholder if not available
    """
    if domain not in domain_findings:
        logger.warning(
            f"Domain {domain} not found in domain findings for Risk Assessment"
        )
        return f"[No {domain} analysis completed yet - this analysis is pending]"

    findings = domain_findings[domain]

    # Get the full LLM response text
    if hasattr(findings, "llm_response_text") and findings.llm_response_text:
        logger.info(
            f"Retrieved full LLM response for {domain} domain ({len(findings.llm_response_text)} characters)"
        )
        return findings.llm_response_text

    # Fallback to raw data if available
    elif (
        hasattr(findings, "raw_data")
        and findings.raw_data
        and "llm_content" in findings.raw_data
    ):
        logger.info(f"Retrieved LLM content from raw data for {domain} domain")
        return findings.raw_data["llm_content"]

    # Last resort: construct a summary from structured findings
    else:
        logger.warning(
            f"No full LLM response available for {domain} - constructing summary"
        )
        if hasattr(findings, "key_findings") and findings.key_findings:
            summary_parts = [
                f"{domain.title()} Analysis Summary:",
                f"Risk Score: {getattr(findings, 'risk_score', 'Unknown')}",
                f"Confidence: {getattr(findings, 'confidence', 'Unknown')}",
                f"Key Findings: {'; '.join(findings.key_findings[:5])}",
                f"Suspicious Indicators: {'; '.join(getattr(findings, 'suspicious_indicators', [])[:3])}",
            ]
            return "\n".join(summary_parts)
        else:
            return f"[{domain} analysis data not available or incomplete]"
