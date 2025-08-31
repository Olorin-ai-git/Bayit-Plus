"""
Autonomous Agent Result Parsing

Utilities for parsing and structuring autonomous LLM investigation results.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict

from app.service.agent.autonomous_context import (
    AutonomousInvestigationContext,
    DomainFindings,
)

logger = logging.getLogger(__name__)


def extract_content_from_response(response: Any) -> str:
    """
    Extract string content from various response formats (string, list, or object with content attribute).
    
    Args:
        response: Response that can be a string, list of content blocks, or object with .content
        
    Returns:
        str: Extracted text content
    """
    try:
        # Handle string responses
        if isinstance(response, str):
            return response
        
        # Handle list responses (e.g., from OpenAI conversation patterns)
        elif isinstance(response, list):
            content_parts = []
            for item in response:
                if hasattr(item, 'content'):
                    # Handle content blocks with content attribute
                    content_parts.append(str(item.content))
                elif hasattr(item, 'text'):
                    # Handle text blocks
                    content_parts.append(str(item.text))
                elif isinstance(item, dict):
                    # Handle dictionary blocks
                    if 'content' in item:
                        content_parts.append(str(item['content']))
                    elif 'text' in item:
                        content_parts.append(str(item['text']))
                    else:
                        content_parts.append(str(item))
                else:
                    # Fallback to string representation
                    content_parts.append(str(item))
            return " ".join(content_parts)
        
        # Handle objects with content attribute
        elif hasattr(response, 'content'):
            content = response.content
            # Handle nested list content
            if isinstance(content, list):
                return extract_content_from_response(content)
            else:
                return str(content)
        
        # Handle objects with text attribute
        elif hasattr(response, 'text'):
            return str(response.text)
        
        # Handle dictionary responses
        elif isinstance(response, dict):
            if 'content' in response:
                nested_content = response['content']
                if isinstance(nested_content, (list, dict)):
                    return extract_content_from_response(nested_content)
                else:
                    return str(nested_content)
            elif 'text' in response:
                return str(response['text'])
            else:
                # Try to extract any text-like values
                text_parts = []
                for key, value in response.items():
                    if isinstance(value, str):
                        text_parts.append(value)
                return " ".join(text_parts) if text_parts else str(response)
        
        # Fallback to string conversion
        else:
            return str(response)
            
    except Exception as e:
        logger.warning(f"Error extracting content from response: {e}. Falling back to string conversion.")
        return str(response)


def parse_autonomous_result(
    llm_result: Any,
    context: AutonomousInvestigationContext,
    domain: str
) -> DomainFindings:
    """Parse autonomous LLM result into structured findings"""
    
    try:
        # Extract content from LLM response using unified utility function
        content = extract_content_from_response(llm_result)
        
        logger.debug(f"Parsing autonomous {domain} result: {content[:200]}...")
        
        # Try to extract structured data if present
        findings_data = extract_findings_from_content(content, domain)
        
        # Get risk_score and validate
        risk_score = findings_data.get("risk_score")
        if risk_score is None:
            logger.error(
                f"CRITICAL: Risk score is missing for {domain} analysis! "
                f"Agent failed to provide risk assessment for investigation {context.investigation_id}"
            )
            print(f"        ❌ ERROR: {domain.title()} Agent failed to provide risk_score!")
        
        # Create domain findings
        findings = DomainFindings(
            domain=domain,
            risk_score=risk_score,
            confidence=findings_data.get("confidence", 0.7),
            key_findings=findings_data.get("key_findings", []),
            suspicious_indicators=findings_data.get("suspicious_indicators", []),
            data_quality=findings_data.get("data_quality", "good"),
            timestamp=datetime.now(),
            raw_data={"llm_content": content},
            recommended_actions=findings_data.get("recommended_actions", []),
            # CRITICAL: Store full LLM response for Risk Assessment analysis
            llm_response_text=content
        )
        
        return findings
        
    except Exception as e:
        logger.error(f"Failed to parse autonomous result for {domain}: {str(e)}")
        
        # Log the parsing error
        logger.error(
            f"CRITICAL: Failed to parse {domain} analysis result! "
            f"Risk score will be missing for investigation {context.investigation_id}: {str(e)}"
        )
        print(f"        ❌ ERROR: {domain.title()} Agent parsing failed - no risk_score available!")
        
        # Return minimal findings on parse error with None risk_score
        return DomainFindings(
            domain=domain,
            risk_score=None,  # Explicit None to indicate missing risk assessment
            confidence=0.0,
            key_findings=[f"Parse error: {str(e)}"],
            suspicious_indicators=[],
            data_quality="error",
            timestamp=datetime.now(),
            raw_data={"parse_error": str(e)},
            llm_response_text=f"Parse error: {str(e)}"
        )


def extract_findings_from_content(content: str, domain: str) -> Dict[str, Any]:
    """Extract structured findings from LLM content"""
    
    findings = {
        "key_findings": [],
        "suspicious_indicators": [],
        "recommended_actions": [],
        "risk_score": None,  # No default - must be calculated by LLM
        "confidence": 0.7,
        "data_quality": "good"
    }
    
    # Ensure content is a string
    if not isinstance(content, str):
        content = str(content)
    
    try:
        # Try to parse JSON if present
        if "{" in content and "}" in content:
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            json_content = content[json_start:json_end]
            parsed_data = json.loads(json_content)
            
            if isinstance(parsed_data, dict):
                findings.update(parsed_data)
                return findings
    except (json.JSONDecodeError, ValueError):
        # Fall back to text parsing
        pass
    
    # Extract information using text patterns
    lines = content.split("\n")
    
    for line in lines:
        line = line.strip()
        
        # Extract risk score - enhanced to handle numbered format and explicit patterns
        if "risk" in line.lower() and any(c.isdigit() for c in line):
            try:
                import re
                
                # First try to find explicit "risk_score: X.XX" pattern
                risk_score_match = re.search(r'risk_score\s*:\s*(\d+\.?\d*)', line.lower())
                if risk_score_match:
                    score = float(risk_score_match.group(1))
                    if 0.0 <= score <= 1.0:
                        findings["risk_score"] = score
                    elif 0.0 <= score <= 10.0:
                        findings["risk_score"] = score / 10.0
                    continue
                
                # Handle numbered format "2. risk_score: X.XX"
                numbered_risk_match = re.search(r'^\d+\.\s*risk_score\s*:\s*(\d+\.?\d*)', line.lower())
                if numbered_risk_match:
                    score = float(numbered_risk_match.group(1))
                    if 0.0 <= score <= 1.0:
                        findings["risk_score"] = score
                    elif 0.0 <= score <= 10.0:
                        findings["risk_score"] = score / 10.0
                    continue
                
                # Fallback to general number extraction
                numbers = re.findall(r'(\d+\.?\d*)', line)
                if numbers and not findings["risk_score"]:  # Only if we haven't found it yet
                    score = float(numbers[0])
                    if score <= 1.0:
                        findings["risk_score"] = score
                    elif score <= 10.0:
                        findings["risk_score"] = score / 10.0
                        
            except (ValueError, IndexError):
                pass
        
        # Extract confidence score - enhanced to handle numbered format
        if "confidence" in line.lower() and any(c.isdigit() for c in line):
            try:
                import re
                
                # Handle numbered format "4. Confidence score: XX"
                numbered_confidence_match = re.search(r'^\d+\.\s*confidence\s*score\s*[:]\s*(\d+\.?\d*)', line.lower())
                if numbered_confidence_match:
                    score = float(numbered_confidence_match.group(1))
                    if 0.0 <= score <= 1.0:
                        findings["confidence"] = score
                    elif 0.0 <= score <= 100.0:
                        findings["confidence"] = score / 100.0
                    continue
                
                # Fallback to general confidence extraction
                numbers = re.findall(r'(\d+\.?\d*)', line)
                if numbers and "confidence" not in [k for k in findings.keys() if findings[k] != 0.7]:  # Only if we haven't found it yet
                    score = float(numbers[0])
                    if score <= 1.0:
                        findings["confidence"] = score
                    elif score <= 100.0:
                        findings["confidence"] = score / 100.0
                        
            except (ValueError, IndexError):
                pass
        
        # Extract findings and indicators from numbered format and bullet points
        if line.startswith("•") or line.startswith("-") or line.startswith("*"):
            clean_line = line[1:].strip()
            if "suspicious" in line.lower() or "anomal" in line.lower():
                findings["suspicious_indicators"].append(clean_line)
            elif "recommend" in line.lower():
                findings["recommended_actions"].append(clean_line)
            else:
                findings["key_findings"].append(clean_line)
        
        # Handle numbered format items
        import re
        numbered_match = re.match(r'^\d+\.\s*(.+)', line)
        if numbered_match:
            content = numbered_match.group(1).strip()
            content_lower = content.lower()
            
            # Skip if it's a risk_score or confidence score line (already handled above)
            if "risk_score:" in content_lower or "confidence score:" in content_lower:
                continue
                
            # Categorize based on content
            if content_lower.startswith("specific fraud indicators") or "indicators found" in content_lower:
                # Extract the actual indicators after the colon
                colon_split = content.split(":", 1)
                if len(colon_split) > 1:
                    indicators_text = colon_split[1].strip()
                    findings["suspicious_indicators"].append(indicators_text)
                else:
                    findings["suspicious_indicators"].append(content)
            elif content_lower.startswith("recommended actions") or content_lower.startswith("recommend"):
                # Extract the actual recommendations after the colon
                colon_split = content.split(":", 1)
                if len(colon_split) > 1:
                    actions_text = colon_split[1].strip()
                    findings["recommended_actions"].append(actions_text)
                else:
                    findings["recommended_actions"].append(content)
            elif content_lower.startswith("detailed reasoning") or "risk level" in content_lower:
                # Extract the reasoning/level after the colon
                colon_split = content.split(":", 1)
                if len(colon_split) > 1:
                    reasoning_text = colon_split[1].strip()
                    findings["key_findings"].append(reasoning_text)
                else:
                    findings["key_findings"].append(content)
            else:
                # General findings
                findings["key_findings"].append(content)
    
    # Ensure we have some findings
    if not findings["key_findings"] and not findings["suspicious_indicators"]:
        findings["key_findings"] = [f"Autonomous {domain} analysis completed"]
    
    return findings