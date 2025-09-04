"""
Autonomous Agent Prompt Generation

Prompt generation utilities for autonomous investigation agents.
Now integrates with Gaia prompts for structured fraud detection analysis.
"""

from typing import List, Optional, Dict, Any

from app.service.agent.autonomous_context import AutonomousInvestigationContext
from app.service.agent.prompts.olorin_prompts import (
from app.service.logging import get_bridge_logger

    get_olorin_prompt,
    format_olorin_prompt,
    validate_olorin_response_format,
    get_supported_olorin_domains
)
from app.service.agent.prompts.gaia_prompts import (
    get_gaia_prompt,
    format_gaia_prompt,
    validate_gaia_response_format,
    get_supported_domains
)

logger = get_bridge_logger(__name__)


def create_investigation_prompt(
    domain: str,
    context: AutonomousInvestigationContext,
    llm_context: str,
    specific_objectives: List[str] = None,
    use_olorin_prompts: bool = True,
    use_gaia_prompts: bool = False
) -> str:
    """Create detailed investigation prompt for autonomous analysis
    
    Args:
        domain: Investigation domain (device, location, network, logs, risk)
        context: Autonomous investigation context
        llm_context: LLM context string
        specific_objectives: Optional specific objectives
        use_gaia_prompts: Whether to use Gaia prompts (default: True)
        
    Returns:
        Formatted investigation prompt
    """
    # Use Olorin prompts by default (priority over Gaia)
    if use_olorin_prompts and domain in get_supported_olorin_domains():
        logger.info(f"Using Olorin prompt for domain: {domain}")
        return create_olorin_investigation_prompt(
            domain, context, llm_context, specific_objectives
        )
    # Use Gaia prompts if requested and domain is supported
    elif use_gaia_prompts and domain in get_supported_domains():
        logger.info(f"Using Gaia prompt for domain: {domain}")
        return create_gaia_investigation_prompt(
            domain, context, llm_context, specific_objectives
        )
    
    # Fallback to original prompt format
    logger.info(f"Using original prompt format for domain: {domain}")
    from .agent_factory import get_default_domain_objectives
    
    prompt_parts = [
        f"INVESTIGATION CONTEXT:\n{llm_context}",
        
        f"\nYOUR MISSION: Conduct autonomous {domain.upper()} analysis for entity {context.entity_id}",
        
        f"\nSPECIFIC OBJECTIVES for {domain}:",
    ]
    
    if specific_objectives:
        for obj in specific_objectives:
            prompt_parts.append(f"• {obj}")
    else:
        # Default objectives based on domain
        domain_objectives = get_default_domain_objectives(domain)
        for obj in domain_objectives:
            prompt_parts.append(f"• {obj}")
    
    prompt_parts.extend([
        "\nAUTONOMOUS ANALYSIS REQUIREMENTS:",
        "1. SELECT TOOLS based on what data you need, not predetermined patterns",
        "2. Use multiple tools if necessary to gather comprehensive evidence",
        "3. EXPLAIN your tool selection reasoning", 
        "4. Analyze all collected data for fraud indicators",
        "5. Correlate findings across data sources",
        "6. Assign risk scores based on evidence strength",
        "7. Provide confidence levels for all assessments",
        
        "\nEXPECTED OUTPUT FORMAT:",
        "Provide a comprehensive analysis that includes:",
        "- Tool selection rationale",
        "- Data collection summary", 
        "- Fraud indicators identified",
        "- MANDATORY: risk_score - A numerical risk assessment from 0.0 (no risk) to 1.0 (critical risk)",
        "- Risk assessment with detailed evidence supporting the score",
        "- Confidence scoring (0.0 to 1.0)",
        "- Recommendations for further investigation",
        "",
        "CRITICAL REQUIREMENT: You MUST provide a numerical risk_score (0.0-1.0) in your response.",
        "The risk_score field is MANDATORY and will cause investigation failure if omitted.",
        "Format: risk_score: 0.XX (where XX is the decimal value)",
        
        f"\nBEGIN AUTONOMOUS {domain.upper()} INVESTIGATION:",
    ])
    
    return "\n".join(prompt_parts)


def create_olorin_investigation_prompt(
    domain: str,
    context: AutonomousInvestigationContext,
    llm_context: str,
    specific_objectives: List[str] = None
) -> str:
    """Create Olorin-style investigation prompt with structured output format
    
    Args:
        domain: Investigation domain
        context: Investigation context
        llm_context: LLM context data
        specific_objectives: Optional specific objectives
        
    Returns:
        Formatted Olorin investigation prompt
    """
    try:
        # Get the base Olorin prompt
        olorin_prompt = get_olorin_prompt(domain)
        
        # Prepare data for prompt formatting
        prompt_data = _prepare_olorin_prompt_data(domain, context, llm_context)
        
        # Format the Olorin prompt with investigation data
        if domain == "risk":
            # Risk assessment prompt needs findings from other domains
            formatted_prompt = format_olorin_prompt(domain, prompt_data)
        else:
            # Other domains use their specific data
            formatted_prompt = format_olorin_prompt(domain, prompt_data)
        
        # Add Olorin-specific context and requirements
        enhanced_prompt = _enhance_olorin_prompt_with_context(
            formatted_prompt, domain, context, specific_objectives
        )
        
        logger.info(f"Created Olorin investigation prompt for domain: {domain}")
        return enhanced_prompt
        
    except Exception as e:
        logger.error(f"Failed to create Olorin prompt for domain {domain}: {str(e)}")
        # Fallback to Gaia prompts, then original format
        logger.warning(f"Falling back to Gaia prompt format for domain: {domain}")
        return create_gaia_investigation_prompt(
            domain, context, llm_context, specific_objectives
        )


def create_gaia_investigation_prompt(
    domain: str,
    context: AutonomousInvestigationContext,
    llm_context: str,
    specific_objectives: List[str] = None
) -> str:
    """Create Gaia-style investigation prompt with structured output format
    
    Args:
        domain: Investigation domain
        context: Investigation context
        llm_context: LLM context data
        specific_objectives: Optional specific objectives
        
    Returns:
        Formatted Gaia investigation prompt
    """
    try:
        # Get the base Gaia prompt
        gaia_prompt = get_gaia_prompt(domain)
        
        # Prepare data for prompt formatting
        prompt_data = _prepare_gaia_prompt_data(domain, context, llm_context)
        
        # Format the Gaia prompt with investigation data
        if domain == "risk":
            # Risk assessment prompt needs findings from other domains
            formatted_prompt = format_gaia_prompt(domain, prompt_data)
        else:
            # Other domains use their specific data
            formatted_prompt = format_gaia_prompt(domain, prompt_data)
        
        # Add Olorin-specific context and requirements
        enhanced_prompt = _enhance_gaia_prompt_with_olorin_context(
            formatted_prompt, domain, context, specific_objectives
        )
        
        logger.info(f"Created Gaia investigation prompt for domain: {domain}")
        return enhanced_prompt
        
    except Exception as e:
        logger.error(f"Failed to create Gaia prompt for domain {domain}: {str(e)}")
        # Fallback to original prompt format
        logger.warning(f"Falling back to original prompt format for domain: {domain}")
        return create_investigation_prompt(
            domain, context, llm_context, specific_objectives, use_gaia_prompts=False
        )


def _prepare_olorin_prompt_data(domain: str, context: AutonomousInvestigationContext, llm_context: str) -> Dict[str, Any]:
    """Prepare data for Olorin prompt formatting
    
    Args:
        domain: Investigation domain
        context: Investigation context
        llm_context: LLM context string
        
    Returns:
        Dictionary with data for prompt formatting
    """
    base_data = {
        "investigation_id": context.investigation_id,
        "entity_id": context.entity_id,
        "entity_type": context.entity_type.value,
        "context_data": llm_context
    }
    
    # Domain-specific data mapping
    if domain == "device":
        base_data["device_info"] = llm_context or "[Device information to be gathered via tools]"
    elif domain == "location":
        base_data["location_data"] = llm_context or "[Location data to be gathered via tools]"
    elif domain == "network":
        base_data["network_info"] = llm_context or "[Network information to be gathered via tools]"
    elif domain == "logs":
        base_data["logs_data"] = llm_context or "[Activity logs to be gathered via tools]"
    elif domain == "risk":
        # Risk assessment needs FULL LLM responses from other domains
        domain_findings = context.progress.domain_findings
        base_data.update({
            "device_analysis": _get_full_llm_response_for_domain(domain_findings, "device"),
            "location_analysis": _get_full_llm_response_for_domain(domain_findings, "location"),
            "network_analysis": _get_full_llm_response_for_domain(domain_findings, "network"),
            "logs_analysis": _get_full_llm_response_for_domain(domain_findings, "logs")
        })
    
    return base_data


def _prepare_gaia_prompt_data(domain: str, context: AutonomousInvestigationContext, llm_context: str) -> Dict[str, Any]:
    """Prepare data for Gaia prompt formatting
    
    Args:
        domain: Investigation domain
        context: Investigation context
        llm_context: LLM context string
        
    Returns:
        Dictionary with data for prompt formatting
    """
    base_data = {
        "investigation_id": context.investigation_id,
        "entity_id": context.entity_id,
        "entity_type": context.entity_type.value,
        "context_data": llm_context
    }
    
    # Domain-specific data mapping
    if domain == "device":
        base_data["device_info"] = llm_context or "[Device information to be gathered via tools]"
    elif domain == "location":
        base_data["location_data"] = llm_context or "[Location data to be gathered via tools]"
    elif domain == "network":
        base_data["network_info"] = llm_context or "[Network information to be gathered via tools]"
    elif domain == "logs":
        base_data["logs_data"] = llm_context or "[Activity logs to be gathered via tools]"
    elif domain == "risk":
        # Risk assessment needs FULL LLM responses from other domains
        domain_findings = context.progress.domain_findings
        base_data.update({
            "device_analysis": _get_full_llm_response_for_domain(domain_findings, "device"),
            "location_analysis": _get_full_llm_response_for_domain(domain_findings, "location"),
            "network_analysis": _get_full_llm_response_for_domain(domain_findings, "network"),
            "logs_analysis": _get_full_llm_response_for_domain(domain_findings, "logs")
        })
    
    return base_data


def _enhance_olorin_prompt_with_context(
    olorin_prompt: str,
    domain: str,
    context: AutonomousInvestigationContext,
    specific_objectives: List[str] = None
) -> str:
    """Enhance Olorin prompt with additional context and requirements
    
    Args:
        olorin_prompt: Base Olorin prompt
        domain: Investigation domain
        context: Investigation context
        specific_objectives: Optional specific objectives
        
    Returns:
        Enhanced prompt with Olorin context
    """
    enhancement_parts = [
        f"INVESTIGATION CONTEXT:",
        f"Investigation ID: {context.investigation_id}",
        f"Entity: {context.entity_id} (Type: {context.entity_type.value})",
        f"Domain: {domain.upper()} Analysis",
        "",
        "OLORIN SYSTEM INTEGRATION:",
        "- Use available tools to gather data before analysis",
        "- Provide structured output as specified in the Olorin format",
        "- MANDATORY: Include numerical risk_score (0.0-1.0) for compatibility",
        "- CRITICAL: The risk_score field is REQUIRED and cannot be omitted",
        "- Explain tool selection and reasoning",
        "",
    ]
    
    if specific_objectives:
        enhancement_parts.extend([
            "SPECIFIC OBJECTIVES:",
            *[f"- {obj}" for obj in specific_objectives],
            ""
        ])
    
    enhancement_parts.extend([
        "=" * 80,
        "OLORIN FRAUD DETECTION ANALYSIS:",
        "",
        olorin_prompt,
        "",
        "=" * 80,
        "IMPORTANT: Provide your response in the exact format specified above.",
        "CRITICAL REMINDER: You MUST include 'risk_score: X.XX' in your response (numerical value 0.0-1.0).",
        "Remember to include tool usage rationale and numerical risk_score."
    ])
    
    return "\n".join(enhancement_parts)


def _enhance_gaia_prompt_with_olorin_context(
    gaia_prompt: str,
    domain: str,
    context: AutonomousInvestigationContext,
    specific_objectives: List[str] = None
) -> str:
    """Enhance Gaia prompt with Olorin-specific context and requirements
    
    Args:
        gaia_prompt: Base Gaia prompt
        domain: Investigation domain
        context: Investigation context
        specific_objectives: Optional specific objectives
        
    Returns:
        Enhanced prompt with Olorin context
    """
    enhancement_parts = [
        f"INVESTIGATION CONTEXT:",
        f"Investigation ID: {context.investigation_id}",
        f"Entity: {context.entity_id} (Type: {context.entity_type.value})",
        f"Domain: {domain.upper()} Analysis",
        "",
        "OLORIN SYSTEM INTEGRATION:",
        "- Use available tools to gather data before analysis",
        "- Provide structured output as specified in the Gaia format",
        "- MANDATORY: Include numerical risk_score (0.0-1.0) for compatibility",
        "- CRITICAL: The risk_score field is REQUIRED and cannot be omitted",
        "- Explain tool selection and reasoning",
        "",
    ]
    
    if specific_objectives:
        enhancement_parts.extend([
            "SPECIFIC OBJECTIVES:",
            *[f"- {obj}" for obj in specific_objectives],
            ""
        ])
    
    enhancement_parts.extend([
        "=" * 80,
        "GAIA FRAUD DETECTION ANALYSIS:",
        "",
        gaia_prompt,
        "",
        "=" * 80,
        "IMPORTANT: Provide your response in the exact format specified above.",
        "CRITICAL REMINDER: You MUST include 'risk_score: X.XX' in your response (numerical value 0.0-1.0).",
        "Remember to include tool usage rationale and numerical risk_score."
    ])
    
    return "\n".join(enhancement_parts)


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
        from app.service.agent.autonomous_parsing import extract_content_from_response
        
        # Extract string content from various response formats
        if isinstance(response, str):
            response_content = response
        else:
            response_content = extract_content_from_response(response)
        
        # First try Olorin format validation
        if validate_olorin_response_format(response_content, domain):
            logger.info(f"Response validated as Olorin format for domain: {domain}")
            return True
        
        # Then try Gaia format validation
        elif validate_gaia_response_format(response_content, domain):
            logger.info(f"Response validated as Gaia format for domain: {domain}")
            return True
        
        # Fallback to original format validation
        required_elements = ["risk_score", "confidence"]
        response_lower = response_content.lower()
        
        for element in required_elements:
            if element not in response_lower:
                logger.warning(f"Missing required element '{element}' in {domain} response")
                return False
        
        logger.info(f"Response validated as original format for domain: {domain}")
        return True
        
    except Exception as e:
        logger.error(f"Error validating response for domain {domain}: {str(e)}")
        return False


def _get_full_llm_response_for_domain(domain_findings: Dict[str, Any], domain: str) -> str:
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
        logger.warning(f"Domain {domain} not found in domain findings for Risk Assessment")
        return f"[No {domain} analysis completed yet - this analysis is pending]"
    
    findings = domain_findings[domain]
    
    # Get the full LLM response text
    if hasattr(findings, 'llm_response_text') and findings.llm_response_text:
        logger.info(f"Retrieved full LLM response for {domain} domain ({len(findings.llm_response_text)} characters)")
        return findings.llm_response_text
    
    # Fallback to raw data if available
    elif hasattr(findings, 'raw_data') and findings.raw_data and 'llm_content' in findings.raw_data:
        logger.info(f"Retrieved LLM content from raw data for {domain} domain")
        return findings.raw_data['llm_content']
    
    # Last resort: construct a summary from structured findings
    else:
        logger.warning(f"No full LLM response available for {domain} - constructing summary")
        if hasattr(findings, 'key_findings') and findings.key_findings:
            summary_parts = [
                f"{domain.title()} Analysis Summary:",
                f"Risk Score: {getattr(findings, 'risk_score', 'Unknown')}",
                f"Confidence: {getattr(findings, 'confidence', 'Unknown')}",
                f"Key Findings: {'; '.join(findings.key_findings[:5])}",
                f"Suspicious Indicators: {'; '.join(getattr(findings, 'suspicious_indicators', [])[:3])}"
            ]
            return "\n".join(summary_parts)
        else:
            return f"[{domain} analysis data not available or incomplete]"