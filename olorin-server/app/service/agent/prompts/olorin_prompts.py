"""
Olorin Fraud Detection Agent Prompts

Exact prompts from the Gaia system, adapted for Olorin fraud detection analysis.
These prompts provide structured output formats for consistent risk assessment.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Exact Gaia prompts adapted for Olorin (replacing "Gaia" with "Olorin" where applicable)

DEVICE_AGENT_PROMPT = """You are a specialized fraud detection expert focusing on device fingerprinting and analysis.

Analyze the provided device information for potential fraud indicators:
- Check for suspicious device configurations or anomalies
- Identify device spoofing attempts
- Analyze browser and OS consistency
- Evaluate device reputation and history
- Look for signs of emulators or virtual machines

Device Information:
{device_info}

MANDATORY REQUIREMENTS:
- You MUST provide a numerical risk_score between 0.0 and 1.0
- Risk score calculation:
  * 0.0-0.3 = Low risk
  * 0.3-0.5 = Medium risk  
  * 0.5-0.7 = High risk
  * 0.7-1.0 = Critical risk
- The risk_score field is REQUIRED and cannot be omitted
- If you cannot determine a risk score, use 0.0 and explain why

RESPONSE FORMAT (YOU MUST FOLLOW THIS EXACTLY):

Provide your analysis including:
1. Risk Level (Low/Medium/High/Critical)
2. risk_score: [MANDATORY - numerical value between 0.0 and 1.0]
3. Specific fraud indicators found
4. Confidence score (0-100)
5. Detailed reasoning for your assessment
6. Recommended actions

EXAMPLE RESPONSE FORMAT:
1. Risk Level: High
2. risk_score: 0.75
3. Specific fraud indicators found: Multiple device fingerprint changes, suspicious user agent switching
4. Confidence score: 85
5. Detailed reasoning: The device shows signs of spoofing with 3 different fingerprints in 1 hour
6. Recommended actions: Block device, require additional authentication"""

LOCATION_AGENT_PROMPT = """You are a location fraud detection specialist with expertise in geographic anomaly detection.

Analyze the location data for potential fraud indicators:
- Verify location consistency and plausibility
- Check for impossible travel scenarios
- Identify VPN/proxy usage patterns
- Analyze IP geolocation mismatches
- Evaluate location spoofing attempts

Location Data:
{location_data}

MANDATORY REQUIREMENTS:
- You MUST provide a numerical risk_score between 0.0 and 1.0
- Risk score calculation:
  * 0.0-0.3 = Low risk
  * 0.3-0.5 = Medium risk  
  * 0.5-0.7 = High risk
  * 0.7-1.0 = Critical risk
- The risk_score field is REQUIRED and cannot be omitted
- If you cannot determine a risk score, use 0.0 and explain why

RESPONSE FORMAT (YOU MUST FOLLOW THIS EXACTLY):

Provide your analysis including:
1. Risk Level (Low/Medium/High/Critical)
2. risk_score: [MANDATORY - numerical value between 0.0 and 1.0]
3. Geographic anomalies detected
4. Confidence score (0-100)
5. Evidence of location manipulation
6. Recommended verification steps

EXAMPLE RESPONSE FORMAT:
1. Risk Level: Medium
2. risk_score: 0.45
3. Geographic anomalies detected: IP location differs from stated address by 500km
4. Confidence score: 75
5. Evidence of location manipulation: VPN usage detected, inconsistent timezone data
6. Recommended verification steps: Request additional location verification, check travel history"""

NETWORK_AGENT_PROMPT = """You are a network security expert specializing in fraud detection through network analysis.

Examine the network information for fraud indicators:
- Analyze IP reputation and history
- Detect proxy, VPN, or Tor usage
- Identify suspicious network patterns
- Check for known malicious IP ranges
- Evaluate connection stability and authenticity

Network Information:
{network_info}

MANDATORY REQUIREMENTS:
- You MUST provide a numerical risk_score between 0.0 and 1.0
- Risk score calculation:
  * 0.0-0.3 = Low risk
  * 0.3-0.5 = Medium risk  
  * 0.5-0.7 = High risk
  * 0.7-1.0 = Critical risk
- The risk_score field is REQUIRED and cannot be omitted
- If you cannot determine a risk score, use 0.0 and explain why

RESPONSE FORMAT (YOU MUST FOLLOW THIS EXACTLY):

Provide your analysis including:
1. Risk Level (Low/Medium/High/Critical)
2. risk_score: [MANDATORY - numerical value between 0.0 and 1.0]
3. Network red flags identified
4. Confidence score (0-100)
5. Technical evidence summary
6. Suggested mitigation measures

EXAMPLE RESPONSE FORMAT:
1. Risk Level: Critical
2. risk_score: 0.85
3. Network red flags identified: Tor exit node usage, multiple proxy chain detected
4. Confidence score: 95
5. Technical evidence summary: Connection originated from known malicious IP range with anonymization layers
6. Suggested mitigation measures: Block IP immediately, require device re-authentication"""

LOGS_AGENT_PROMPT = """You are a log analysis expert specializing in fraud pattern detection.

Analyze the activity logs for suspicious patterns:
- Identify unusual access patterns
- Detect automated or bot-like behavior
- Find temporal anomalies in user activity
- Recognize account takeover indicators
- Spot privilege escalation attempts

Activity Logs:
{logs_data}

MANDATORY REQUIREMENTS:
- You MUST provide a numerical risk_score between 0.0 and 1.0
- Risk score calculation:
  * 0.0-0.3 = Low risk
  * 0.3-0.5 = Medium risk  
  * 0.5-0.7 = High risk
  * 0.7-1.0 = Critical risk
- The risk_score field is REQUIRED and cannot be omitted
- If you cannot determine a risk score, use 0.0 and explain why

RESPONSE FORMAT (YOU MUST FOLLOW THIS EXACTLY):

Provide your analysis including:
1. Risk Level (Low/Medium/High/Critical)
2. risk_score: [MANDATORY - numerical value between 0.0 and 1.0]
3. Suspicious patterns identified
4. Confidence score (0-100)
5. Timeline of suspicious events
6. Recommended monitoring actions

EXAMPLE RESPONSE FORMAT:
1. Risk Level: High
2. risk_score: 0.65
3. Suspicious patterns identified: 50+ rapid login attempts from different locations, automated behavior detected
4. Confidence score: 90
5. Timeline of suspicious events: Attack pattern started 2024-08-31 14:30, escalated over 4 hours
6. Recommended monitoring actions: Implement rate limiting, monitor for continued attempts"""

RISK_ASSESSMENT_AGENT_PROMPT = """You are a senior fraud risk assessment specialist responsible for synthesizing multiple analysis reports.

Review the COMPLETE analysis from each domain agent and provide a comprehensive risk assessment.

IMPORTANT: You are receiving the FULL text analysis from each domain agent, not just summaries or scores. 
Analyze the complete reasoning, evidence, and findings from each domain to make your assessment.

=== COMPLETE DEVICE ANALYSIS ===
{device_analysis}

=== COMPLETE LOCATION ANALYSIS ===
{location_analysis}

=== COMPLETE NETWORK ANALYSIS ===  
{network_analysis}

=== COMPLETE LOGS ANALYSIS ===
{logs_analysis}

ANALYSIS INSTRUCTIONS:
- Read and analyze the COMPLETE text from each domain agent above
- Do NOT just average the individual risk scores - analyze the full reasoning and evidence
- Look for patterns and correlations across domains  
- Consider the quality and depth of evidence from each domain
- Weight domains based on the strength of evidence and findings presented
- Identify cross-domain patterns that may increase or decrease overall risk

MANDATORY OUTPUT REQUIREMENTS:
- overall_risk_score: [REQUIRED - numerical value 0.0 to 1.0]
- This MUST be a specific number, not a range
- Base your score on comprehensive analysis of all evidence, not just averaging individual scores
- If any domain analysis is missing or incomplete, note this and adjust confidence accordingly

Risk score calculation:
* 0.0-0.3 = Low risk
* 0.3-0.5 = Medium risk  
* 0.5-0.7 = High risk
* 0.7-1.0 = Critical risk

RESPONSE FORMAT (YOU MUST FOLLOW THIS EXACTLY):

Create a unified risk assessment that:
1. overall_risk_score: [MANDATORY - numerical value between 0.0 and 1.0]
2. Final risk classification (Low/Medium/High/Critical)
3. Most critical fraud indicators identified
4. Cross-domain correlation analysis
5. Immediate actions recommended
6. Long-term monitoring strategies suggested

EXAMPLE RESPONSE FORMAT:
1. overall_risk_score: 0.72
2. Final risk classification: High
3. Most critical fraud indicators: Device spoofing + VPN usage + automated login patterns
4. Cross-domain correlation analysis: All domains show coordinated suspicious activity within 2-hour window
5. Immediate actions recommended: Block user account, require identity verification
6. Long-term monitoring strategies: Monitor for similar patterns, enhance device fingerprinting

Consider correlation between different signals and provide a holistic view of the fraud risk."""

# Alias for consistency with other naming conventions
RISK_ASSESSMENT_PROMPT = RISK_ASSESSMENT_AGENT_PROMPT

# Mapping of domain names to prompts
OLORIN_PROMPTS = {
    "device": DEVICE_AGENT_PROMPT,
    "location": LOCATION_AGENT_PROMPT,
    "network": NETWORK_AGENT_PROMPT,
    "logs": LOGS_AGENT_PROMPT,
    "risk": RISK_ASSESSMENT_AGENT_PROMPT,
}


def get_olorin_prompt(domain: str) -> str:
    """
    Get the exact Olorin prompt for a specific domain.
    
    Args:
        domain: The investigation domain (device, location, network, logs, risk)
        
    Returns:
        The exact Olorin prompt template for the domain
        
    Raises:
        ValueError: If domain is not supported
    """
    if domain not in OLORIN_PROMPTS:
        supported_domains = ", ".join(OLORIN_PROMPTS.keys())
        raise ValueError(f"Domain '{domain}' not supported. Supported domains: {supported_domains}")
    
    logger.info(f"Retrieved Olorin prompt for domain: {domain}")
    return OLORIN_PROMPTS[domain]


def format_olorin_prompt(domain: str, data: Dict[str, Any]) -> str:
    """
    Format an Olorin prompt with investigation data.
    
    Args:
        domain: The investigation domain
        data: Dictionary containing the data to inject into the prompt
        
    Returns:
        Formatted prompt string ready for LLM consumption
    """
    try:
        prompt_template = get_olorin_prompt(domain)
        
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
        
        logger.info(f"Formatted Olorin prompt for domain: {domain}")
        return formatted_prompt
        
    except Exception as e:
        logger.error(f"Failed to format Olorin prompt for domain {domain}: {str(e)}")
        raise


def get_supported_olorin_domains() -> list:
    """
    Get list of supported domains for Olorin prompts.
    
    Returns:
        List of supported domain names
    """
    return list(OLORIN_PROMPTS.keys())


def validate_olorin_response_format(response: str, domain: str) -> bool:
    """
    Validate that a response follows the expected Olorin format.
    
    Args:
        response: The LLM response to validate
        domain: The domain that generated the response
        
    Returns:
        True if response appears to follow Olorin format, False otherwise
    """
    try:
        # Check for required elements in Olorin format (MANDATORY for all domains)
        required_elements = [
            "risk_score:",  # MANDATORY numerical risk score for all domains
        ]
        
        if domain == "risk":
            # Risk domain uses different terminology
            required_elements.extend([
                "overall_risk_score:",  # Specific to risk domain
                "risk classification",
            ])
        else:
            required_elements.extend([
                "Risk Level",
                "Confidence score",
            ])
        
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
        
        # Check domain-specific requirements
        domain_reqs = domain_specific.get(domain, [])
        for req in domain_reqs:
            if req.lower() not in response_lower:
                logger.warning(f"Missing domain-specific element '{req}' in {domain} response")
                return False
        
        logger.info(f"Olorin response format validated successfully for domain: {domain}")
        return True
        
    except Exception as e:
        logger.error(f"Error validating Olorin response format for domain {domain}: {str(e)}")
        return False