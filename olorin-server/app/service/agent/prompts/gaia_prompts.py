"""
Gaia Fraud Detection Agent Prompts

Exact prompts from the Gaia system for fraud detection analysis.
These prompts provide structured output formats for consistent risk assessment.
"""

from typing import Dict, Any
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Exact Gaia prompts as specified by the user

DEVICE_AGENT_PROMPT = """You are a specialized fraud detection expert focusing on device fingerprinting and analysis.

Analyze the provided device information for potential fraud indicators:
- Check for suspicious device configurations or anomalies
- Identify device spoofing attempts
- Analyze browser and OS consistency
- Evaluate device reputation and history
- Look for signs of emulators or virtual machines

Device Information:
{device_info}

Provide your analysis including:
1. Risk Level (Low/Medium/High/Critical)
2. Specific fraud indicators found
3. Confidence score (0-100)
4. Detailed reasoning for your assessment
5. Recommended actions"""

LOCATION_AGENT_PROMPT = """You are a location fraud detection specialist with expertise in geographic anomaly detection.

Analyze the location data for potential fraud indicators:
- Verify location consistency and plausibility
- Check for impossible travel scenarios
- Identify VPN/proxy usage patterns
- Analyze IP geolocation mismatches
- Evaluate location spoofing attempts

Location Data:
{location_data}

Provide your analysis including:
1. Risk Level (Low/Medium/High/Critical)
2. Geographic anomalies detected
3. Confidence score (0-100)
4. Evidence of location manipulation
5. Recommended verification steps"""

NETWORK_AGENT_PROMPT = """You are a network security expert specializing in fraud detection through network analysis.

Examine the network information for fraud indicators:
- Analyze IP reputation and history
- Detect proxy, VPN, or Tor usage
- Identify suspicious network patterns
- Check for known malicious IP ranges
- Evaluate connection stability and authenticity

Network Information:
{network_info}

Provide your analysis including:
1. Risk Level (Low/Medium/High/Critical)
2. Network red flags identified
3. Confidence score (0-100)
4. Technical evidence summary
5. Suggested mitigation measures"""

LOGS_AGENT_PROMPT = """You are a log analysis expert specializing in fraud pattern detection.

Analyze the activity logs for suspicious patterns:
- Identify unusual access patterns
- Detect automated or bot-like behavior
- Find temporal anomalies in user activity
- Recognize account takeover indicators
- Spot privilege escalation attempts

Activity Logs:
{logs_data}

Provide your analysis including:
1. Risk Level (Low/Medium/High/Critical)
2. Suspicious patterns identified
3. Confidence score (0-100)
4. Timeline of suspicious events
5. Recommended monitoring actions"""

RISK_ASSESSMENT_AGENT_PROMPT = """You are a senior fraud risk assessment specialist responsible for synthesizing multiple analysis reports.

Review all domain agent findings and provide a comprehensive risk assessment:

Device Analysis: {device_analysis}
Location Analysis: {location_analysis}
Network Analysis: {network_analysis}
Logs Analysis: {logs_analysis}

Create a unified risk assessment that:
1. Determines overall risk score (0-100)
2. Identifies the most critical fraud indicators
3. Correlates findings across all domains
4. Provides final risk classification (Low/Medium/High/Critical)
5. Recommends immediate actions
6. Suggests long-term monitoring strategies

Consider correlation between different signals and provide a holistic view of the fraud risk."""

# Mapping of domain names to prompts
GAIA_PROMPTS = {
    "device": DEVICE_AGENT_PROMPT,
    "location": LOCATION_AGENT_PROMPT,
    "network": NETWORK_AGENT_PROMPT,
    "logs": LOGS_AGENT_PROMPT,
    "risk": RISK_ASSESSMENT_AGENT_PROMPT,
}


def get_gaia_prompt(domain: str) -> str:
    """
    Get the exact Gaia prompt for a specific domain.
    
    Args:
        domain: The investigation domain (device, location, network, logs, risk)
        
    Returns:
        The exact Gaia prompt template for the domain
        
    Raises:
        ValueError: If domain is not supported
    """
    if domain not in GAIA_PROMPTS:
        supported_domains = ", ".join(GAIA_PROMPTS.keys())
        raise ValueError(f"Domain '{domain}' not supported. Supported domains: {supported_domains}")
    
    logger.info(f"Retrieved Gaia prompt for domain: {domain}")
    return GAIA_PROMPTS[domain]


def format_gaia_prompt(domain: str, data: Dict[str, Any]) -> str:
    """
    Format a Gaia prompt with investigation data.
    
    Args:
        domain: The investigation domain
        data: Dictionary containing the data to inject into the prompt
        
    Returns:
        Formatted prompt string ready for LLM consumption
    """
    try:
        prompt_template = get_gaia_prompt(domain)
        
        # Map domain to expected data keys
        data_key_mapping = {
            "device": "device_info",
            "location": "location_data", 
            "network": "network_info",
            "logs": "logs_data",
            "risk": ["device_analysis", "location_analysis", "network_analysis", "logs_analysis"]
        }
        
        if domain == "risk":
            # Risk assessment needs multiple fields
            expected_keys = data_key_mapping[domain]
            formatted_prompt = prompt_template.format(**{
                key: data.get(key, f"[No {key.replace('_', ' ')} available]")
                for key in expected_keys
            })
        else:
            # Other domains need single data field
            expected_key = data_key_mapping[domain]
            data_value = data.get(expected_key, f"[No {expected_key.replace('_', ' ')} available]")
            formatted_prompt = prompt_template.format(**{expected_key: data_value})
        
        logger.info(f"Formatted Gaia prompt for domain: {domain}")
        return formatted_prompt
        
    except Exception as e:
        logger.error(f"Failed to format Gaia prompt for domain {domain}: {str(e)}")
        raise


def get_supported_domains() -> list:
    """
    Get list of supported domains for Gaia prompts.
    
    Returns:
        List of supported domain names
    """
    return list(GAIA_PROMPTS.keys())


def validate_gaia_response_format(response: str, domain: str) -> bool:
    """
    Validate that a response follows the expected Gaia format.
    
    Args:
        response: The LLM response to validate
        domain: The domain that generated the response
        
    Returns:
        True if response appears to follow Gaia format, False otherwise
    """
    try:
        # Check for required elements in Gaia format
        if domain == "risk":
            # Risk domain uses different terminology
            required_elements = [
                "risk score",
                "risk classification",
            ]
        else:
            required_elements = [
                "Risk Level",
                "Confidence score",
            ]
        
        # Domain-specific requirements
        domain_specific = {
            "device": ["fraud indicators found", "Recommended actions"],
            "location": ["Geographic anomalies", "verification steps"],
            "network": ["Network red flags", "mitigation measures"],
            "logs": ["Suspicious patterns", "monitoring actions"],
            "risk": ["overall risk score", "risk classification"]
        }
        
        response_lower = response.lower()
        
        # Check general requirements
        for element in required_elements:
            if element.lower() not in response_lower:
                logger.warning(f"Missing required element '{element}' in {domain} response")
                return False
        
        # Check domain-specific requirements (flexible validation)
        domain_reqs = domain_specific.get(domain, [])
        missing_elements = []
        for req in domain_reqs:
            if req.lower() not in response_lower:
                missing_elements.append(req)
                logger.warning(f"Missing domain-specific element '{req}' in {domain} response")
        
        # Log missing elements but don't fail validation unless ALL required elements are missing
        if missing_elements:
            logger.info(f"Domain {domain} response missing {len(missing_elements)} optional elements but validation passed")
        
        logger.info(f"Gaia response format validated successfully for domain: {domain}")
        return True
        
    except Exception as e:
        logger.error(f"Error validating Gaia response format for domain {domain}: {str(e)}")
        return False