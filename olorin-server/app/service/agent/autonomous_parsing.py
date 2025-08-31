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


def parse_autonomous_result(
    llm_result: Any,
    context: AutonomousInvestigationContext,
    domain: str
) -> DomainFindings:
    """Parse autonomous LLM result into structured findings"""
    
    try:
        # Extract content from LLM response - handle different result types
        content = ""
        
        if hasattr(llm_result, 'content'):
            # Single message with content attribute
            content = llm_result.content
        elif isinstance(llm_result, list):
            # List of messages - extract content from all
            content_parts = []
            for item in llm_result:
                if hasattr(item, 'content'):
                    content_parts.append(str(item.content))
                else:
                    content_parts.append(str(item))
            content = " ".join(content_parts)
        else:
            # Fallback to string representation
            content = str(llm_result)
        
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
            recommended_actions=findings_data.get("recommended_actions", [])
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
            raw_data={"parse_error": str(e)}
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
        
        # Extract risk score
        if "risk" in line.lower() and any(c.isdigit() for c in line):
            try:
                import re
                numbers = re.findall(r'(\d+\.?\d*)', line)
                if numbers:
                    score = float(numbers[0])
                    if score <= 1.0:
                        findings["risk_score"] = score
                    elif score <= 10.0:
                        findings["risk_score"] = score / 10.0
            except (ValueError, IndexError):
                pass
        
        # Extract confidence score  
        if "confidence" in line.lower() and any(c.isdigit() for c in line):
            try:
                import re
                numbers = re.findall(r'(\d+\.?\d*)', line)
                if numbers:
                    score = float(numbers[0])
                    if score <= 1.0:
                        findings["confidence"] = score
                    elif score <= 100.0:
                        findings["confidence"] = score / 100.0
            except (ValueError, IndexError):
                pass
        
        # Extract findings and indicators
        if line.startswith("•") or line.startswith("-") or line.startswith("*"):
            clean_line = line[1:].strip()
            if "suspicious" in line.lower() or "anomal" in line.lower():
                findings["suspicious_indicators"].append(clean_line)
            elif "recommend" in line.lower():
                findings["recommended_actions"].append(clean_line)
            else:
                findings["key_findings"].append(clean_line)
    
    # Ensure we have some findings
    if not findings["key_findings"] and not findings["suspicious_indicators"]:
        findings["key_findings"] = [f"Autonomous {domain} analysis completed"]
    
    return findings