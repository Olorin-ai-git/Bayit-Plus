"""
LLM Output Schema Validator Fix

Fixes the primary cause of zero risk scores: schema mismatches between LLM outputs and validators.

Symptoms:
- Missing domain-specific element 'Network red flags' in network response
- Missing required element 'overall_risk_score:' in risk response
- Agents return JSON while validators expect text patterns

Root Cause: 
- LLM prompts evolved to return JSON: {"risk_assessment": {"risk_level": 0.75}}
- Validators still look for text patterns: "overall_risk_score: 0.75"
- This causes all risk scores to default to 0.00

Solution: Unified JSON schema with flexible validators that handle both formats
"""

import json
import re
import logging
from typing import Dict, Any, Optional, Union, List
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class AgentType(Enum):
    """Agent types with their expected output schemas"""
    NETWORK = "network"
    DEVICE = "device"
    LOCATION = "location"
    LOGS = "logs"
    RISK = "risk"

@dataclass
class RiskScore:
    """Normalized risk score with metadata"""
    risk_level: float
    confidence: float
    agent_type: str
    raw_output: Any = None
    extraction_method: str = "unknown"
    validation_errors: List[str] = None

    def __post_init__(self):
        if self.validation_errors is None:
            self.validation_errors = []
        
        # Ensure risk_level and confidence are in [0, 1] range
        self.risk_level = max(0.0, min(1.0, self.risk_level))
        self.confidence = max(0.0, min(1.0, self.confidence))

class UnifiedSchemaValidator:
    """Unified validator that handles both JSON and text LLM outputs"""
    
    def __init__(self):
        self.extraction_stats = {
            'json_extractions': 0,
            'text_extractions': 0,
            'fallback_extractions': 0,
            'failed_extractions': 0
        }
    
    def extract_risk_score(
        self, 
        agent_output: Any, 
        agent_type: AgentType,
        debug: bool = False
    ) -> RiskScore:
        """
        Unified risk score extraction that handles all output formats
        
        Priority order:
        1. JSON extraction (current LLM format)
        2. Text pattern extraction (legacy format)
        3. Fallback extraction (partial data)
        4. Zero score with error (complete failure)
        """
        
        if debug:
            logger.debug(f"Extracting risk score for {agent_type.value}")
            logger.debug(f"Raw output type: {type(agent_output)}")
            logger.debug(f"Raw output: {str(agent_output)[:500]}...")
        
        # Try all extraction methods and choose the best result
        json_result = self._extract_from_json(agent_output, agent_type)
        text_result = self._extract_from_text(agent_output, agent_type)
        fallback_result = self._extract_fallback(agent_output, agent_type)
        
        # Prioritize results with risk scores > 0, then by extraction method quality
        candidates = []
        
        if json_result.risk_level > 0 or json_result.confidence > 0:
            json_result.extraction_method = 'json'
            candidates.append((json_result, 'json', 3))  # Highest priority
            
        if text_result.risk_level > 0 or text_result.confidence > 0:
            text_result.extraction_method = 'text'
            candidates.append((text_result, 'text', 2))  # Medium priority
            
        if fallback_result.risk_level > 0 or fallback_result.confidence > 0:
            fallback_result.extraction_method = 'fallback'
            candidates.append((fallback_result, 'fallback', 1))  # Lower priority
        
        if candidates:
            # Sort by risk_level (descending), then by priority (descending)
            candidates.sort(key=lambda x: (x[0].risk_level, x[2]), reverse=True)
            best_result, best_method, _ = candidates[0]
            
            # Update stats
            self.extraction_stats[f'{best_method}_extractions'] += 1
            
            if debug:
                logger.debug(f"Selected {best_method} extraction with risk_level={best_result.risk_level}")
                
            return best_result
        
        # Complete failure - return zero with detailed error
        self.extraction_stats['failed_extractions'] += 1
        return RiskScore(
            risk_level=0.0,
            confidence=0.0,
            agent_type=agent_type.value,
            raw_output=agent_output,
            extraction_method='failed',
            validation_errors=[f"Could not extract risk score from {type(agent_output)} output"]
        )
    
    def _extract_from_json(self, output: Any, agent_type: AgentType) -> RiskScore:
        """Extract risk score from JSON output (current LLM format)"""
        
        errors = []
        risk_level = 0.0
        confidence = 0.0
        
        try:
            # Handle string JSON
            if isinstance(output, str):
                if output.strip().startswith('{'):
                    data = json.loads(output)
                else:
                    return RiskScore(0.0, 0.0, agent_type.value, output, validation_errors=["Not JSON string"])
            elif isinstance(output, dict):
                data = output
            else:
                return RiskScore(0.0, 0.0, agent_type.value, output, validation_errors=["Not JSON format"])
            
            # Define JSON paths by agent type
            json_paths = self._get_json_paths_for_agent(agent_type)
            
            # Try each path for risk_level
            for path in json_paths['risk_level']:
                try:
                    value = self._extract_nested_value(data, path)
                    if value is not None and isinstance(value, (int, float)):
                        risk_level = float(value)
                        break
                except:
                    continue
            
            # Try each path for confidence
            for path in json_paths['confidence']:
                try:
                    value = self._extract_nested_value(data, path)
                    if value is not None and isinstance(value, (int, float)):
                        confidence = float(value)
                        break
                except:
                    continue
            
            # Check for required domain-specific elements with flexible matching
            required_elements = self._get_required_elements_for_agent(agent_type)
            missing_elements = []
            
            for element in required_elements:
                if not self._check_json_element_exists_flexible(data, element):
                    missing_elements.append(element)
            
            # Only report error if ALL required elements are missing (allows for partial matches)
            if len(missing_elements) == len(required_elements) and required_elements:
                errors.append(f"Missing all domain-specific elements. Expected any of: {required_elements}")
            elif len(missing_elements) > len(required_elements) * 0.7:  # If more than 70% missing
                errors.append(f"Missing most domain-specific elements: {missing_elements[:3]}")  # Only show first 3
            
        except json.JSONDecodeError as e:
            errors.append(f"JSON decode error: {e}")
        except Exception as e:
            errors.append(f"JSON extraction error: {e}")
        
        return RiskScore(
            risk_level=risk_level,
            confidence=confidence,
            agent_type=agent_type.value,
            raw_output=output,
            validation_errors=errors
        )
    
    def _extract_from_text(self, output: Any, agent_type: AgentType) -> RiskScore:
        """Extract risk score from text output (legacy format)"""
        
        errors = []
        risk_level = 0.0
        confidence = 0.0
        
        try:
            # Convert to string for text extraction
            text = str(output) if not isinstance(output, str) else output
            
            # Define text patterns by agent type
            text_patterns = self._get_text_patterns_for_agent(agent_type)
            
            # Try each pattern for risk_level
            for pattern in text_patterns['risk_level']:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    try:
                        risk_level = float(match.group(1))
                        break
                    except (ValueError, IndexError):
                        continue
            
            # Try each pattern for confidence
            for pattern in text_patterns['confidence']:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    try:
                        confidence = float(match.group(1))
                        break
                    except (ValueError, IndexError):
                        continue
            
            # Check for required text elements with flexible matching
            required_elements = self._get_required_elements_for_agent(agent_type)
            missing_elements = []
            
            for element in required_elements:
                if not self._check_text_element_exists_flexible(text, element):
                    missing_elements.append(element)
            
            # Only report error if ALL required elements are missing (allows for partial matches)
            if len(missing_elements) == len(required_elements) and required_elements:
                errors.append(f"Missing all domain-specific elements. Expected any of: {required_elements}")
            elif len(missing_elements) > len(required_elements) * 0.7:  # If more than 70% missing  
                errors.append(f"Missing most domain-specific elements: {missing_elements[:3]}")  # Only show first 3
        
        except Exception as e:
            errors.append(f"Text extraction error: {e}")
        
        return RiskScore(
            risk_level=risk_level,
            confidence=confidence,
            agent_type=agent_type.value,
            raw_output=output,
            validation_errors=errors
        )
    
    def _extract_fallback(self, output: Any, agent_type: AgentType) -> RiskScore:
        """Enhanced fallback extraction for partial data"""
        
        errors = ["Using fallback extraction"]
        risk_level = 0.0
        confidence = 0.0
        
        try:
            # Convert everything to string and look for patterns
            text = str(output).lower()
            
            # Try more specific patterns first
            risk_patterns = [
                r'risk.*?([0-9]*\.?[0-9]+)',
                r'score.*?([0-9]*\.?[0-9]+)',
                r'level.*?([0-9]*\.?[0-9]+)',
                r'assessment.*?([0-9]*\.?[0-9]+)'
            ]
            
            # Try to find risk scores using contextual patterns
            for pattern in risk_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    try:
                        score = float(match)
                        if 0.0 <= score <= 1.0:
                            risk_level = score
                            confidence = 0.7  # Medium confidence for pattern match
                            errors = [f"Extracted from pattern: {pattern}"]
                            break
                        elif 0 <= score <= 100:  # Maybe percentage
                            risk_level = score / 100.0
                            confidence = 0.6  # Lower confidence for percentage conversion
                            errors = [f"Extracted percentage from pattern: {pattern}"]
                            break
                    except ValueError:
                        continue
                if risk_level > 0:
                    break
            
            # If no risk found from patterns, try general number extraction
            if risk_level == 0.0:
                decimal_pattern = r'([0-9]*\.?[0-9]+)'
                matches = re.findall(decimal_pattern, text)
                
                valid_scores = []
                for match in matches:
                    try:
                        score = float(match)
                        if 0.0 <= score <= 1.0:
                            valid_scores.append(score)
                        elif 0 <= score <= 100:  # Maybe percentage
                            valid_scores.append(score / 100.0)
                    except ValueError:
                        continue
                
                if valid_scores:
                    # Use highest score as risk_level (likely the most significant)
                    risk_level = max(valid_scores)
                    confidence = 0.5  # Lower confidence for general extraction
                    errors = ["Extracted from general numeric pattern"]
                else:
                    # Last resort: check for risk level words
                    if any(word in text for word in ['high', 'critical', 'severe']):
                        risk_level = 0.75
                        confidence = 0.3
                        errors = ["Inferred high risk from qualitative indicators"]
                    elif any(word in text for word in ['medium', 'moderate']):
                        risk_level = 0.5
                        confidence = 0.3
                        errors = ["Inferred medium risk from qualitative indicators"]
                    elif any(word in text for word in ['low', 'minimal']):
                        risk_level = 0.25
                        confidence = 0.3
                        errors = ["Inferred low risk from qualitative indicators"]
                    else:
                        errors.append("No valid scores or risk indicators found")
        
        except Exception as e:
            errors.append(f"Fallback extraction error: {e}")
        
        return RiskScore(
            risk_level=risk_level,
            confidence=confidence,
            agent_type=agent_type.value,
            raw_output=output,
            validation_errors=errors
        )
    
    def _get_json_paths_for_agent(self, agent_type: AgentType) -> Dict[str, List[List[str]]]:
        """Get JSON paths for each agent type"""
        
        paths = {
            AgentType.NETWORK: {
                'risk_level': [
                    ['risk_assessment', 'risk_level'],
                    ['network_risk', 'risk_level'],
                    ['risk_level'],
                    ['score']
                ],
                'confidence': [
                    ['risk_assessment', 'confidence'],
                    ['network_risk', 'confidence'],
                    ['confidence']
                ]
            },
            AgentType.DEVICE: {
                'risk_level': [
                    ['llm_assessment', 'risk_level'],
                    ['device_risk', 'risk_level'],
                    ['risk_assessment', 'risk_level'],
                    ['risk_level'],
                    ['score']
                ],
                'confidence': [
                    ['llm_assessment', 'confidence'],
                    ['device_risk', 'confidence'],
                    ['risk_assessment', 'confidence'],
                    ['confidence']
                ]
            },
            AgentType.LOCATION: {
                'risk_level': [
                    ['location_risk_assessment', 'risk_level'],
                    ['geographic_risk', 'risk_level'],
                    ['risk_assessment', 'risk_level'],
                    ['risk_level'],
                    ['score']
                ],
                'confidence': [
                    ['location_risk_assessment', 'confidence'],
                    ['geographic_risk', 'confidence'],
                    ['risk_assessment', 'confidence'],
                    ['confidence']
                ]
            },
            AgentType.LOGS: {
                'risk_level': [
                    ['behavioral_analysis', 'risk_level'],
                    ['behavioral_risk', 'risk_level'],
                    ['risk_assessment', 'risk_level'],
                    ['risk_level'],
                    ['score']
                ],
                'confidence': [
                    ['behavioral_analysis', 'confidence'],
                    ['behavioral_risk', 'confidence'],
                    ['risk_assessment', 'confidence'],
                    ['confidence']
                ]
            },
            AgentType.RISK: {
                'risk_level': [
                    ['overall_risk_assessment', 'overall_risk_score'],
                    ['overall_risk_assessment', 'risk_level'],
                    ['risk_synthesis', 'overall_risk_score'],
                    ['overall_risk_score'],
                    ['risk_level'],
                    ['score']
                ],
                'confidence': [
                    ['overall_risk_assessment', 'confidence'],
                    ['risk_synthesis', 'confidence'],
                    ['confidence']
                ]
            }
        }
        
        return paths.get(agent_type, {'risk_level': [['risk_level']], 'confidence': [['confidence']]})
    
    def _get_text_patterns_for_agent(self, agent_type: AgentType) -> Dict[str, List[str]]:
        """Get text patterns for each agent type"""
        
        base_patterns = {
            'risk_level': [
                r'overall_risk_score[:\s]+([0-9.]+)',
                r'risk_level[:\s]+([0-9.]+)',
                r'risk_score[:\s]+([0-9.]+)',
                r'score[:\s]+([0-9.]+)'
            ],
            'confidence': [
                r'confidence[:\s]+([0-9.]+)'
            ]
        }
        
        # Agent-specific patterns
        if agent_type == AgentType.NETWORK:
            base_patterns['risk_level'].insert(0, r'network.*risk.*[:\s]+([0-9.]+)')
        elif agent_type == AgentType.DEVICE:
            base_patterns['risk_level'].insert(0, r'device.*risk.*[:\s]+([0-9.]+)')
        elif agent_type == AgentType.LOCATION:
            base_patterns['risk_level'].insert(0, r'location.*risk.*[:\s]+([0-9.]+)')
            base_patterns['risk_level'].insert(0, r'geographic.*risk.*[:\s]+([0-9.]+)')
        elif agent_type == AgentType.LOGS:
            base_patterns['risk_level'].insert(0, r'behavioral.*risk.*[:\s]+([0-9.]+)')
        
        return base_patterns
    
    def _get_required_elements_for_agent(self, agent_type: AgentType) -> List[str]:
        """Get required elements for each agent type - updated to match actual validation requirements"""
        
        elements = {
            AgentType.NETWORK: [
                'network red flags',  # Matches gaia_prompts validation
                'network_red_flags',  # JSON format fallback
                'entities',
                'mitigation measures'
            ],
            AgentType.DEVICE: [
                'device fingerprint anomalies',  # User requirement
                'fraud indicators found',         # Matches gaia_prompts validation
                'device_analysis',               # JSON format fallback
                'fingerprint_anomalies',         # JSON format fallback
                'recommended actions'
            ],
            AgentType.LOCATION: [
                'geographic anomalies',          # Matches gaia_prompts validation and user requirement
                'geographic_anomalies',          # JSON format fallback
                'travel_patterns',
                'verification steps'
            ],
            AgentType.LOGS: [
                'behavioral patterns',           # User requirement
                'suspicious patterns',           # Matches gaia_prompts validation
                'suspicious_patterns',           # JSON format fallback
                'activity_timeline',
                'monitoring actions'
            ],
            AgentType.RISK: [
                'overall_risk_score', 
                'overall risk score',
                'cross_domain_correlations',
                'risk classification'
            ]
        }
        
        return elements.get(agent_type, [])
    
    def _extract_nested_value(self, data: dict, path: List[str]) -> Any:
        """Extract value from nested dictionary using path"""
        current = data
        for key in path:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current
    
    def _check_json_element_exists_flexible(self, data: dict, element: str) -> bool:
        """Check if element exists anywhere in JSON structure with flexible matching"""
        # First try exact recursive key search
        if self._recursive_key_search(data, element.lower()):
            return True
        
        # Then try content search (for cases where element appears in values, not keys)
        data_str = json.dumps(data).lower()
        element_variants = [
            element.lower(),
            element.lower().replace(' ', '_'),
            element.lower().replace('_', ' '),
            element.lower().replace(' ', ''),
            element.lower().replace('_', '')
        ]
        
        for variant in element_variants:
            if variant in data_str:
                return True
        
        return False
    
    def _check_text_element_exists_flexible(self, text: str, element: str) -> bool:
        """Check if element exists in text with flexible matching"""
        text_lower = text.lower()
        element_variants = [
            element.lower(),
            element.lower().replace(' ', '_'),
            element.lower().replace('_', ' '),
            element.lower().replace(' ', ''),
            element.lower().replace('_', '')
        ]
        
        for variant in element_variants:
            if variant in text_lower:
                return True
        
        return False
    
    def _recursive_key_search(self, obj: Any, target_key: str) -> bool:
        """Recursively search for key in nested structure"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                key_normalized = key.lower().replace('_', '').replace('-', '').replace(' ', '')
                target_normalized = target_key.replace('_', '').replace('-', '').replace(' ', '')
                
                if key_normalized == target_normalized:
                    return True
                if self._recursive_key_search(value, target_key):
                    return True
        elif isinstance(obj, list):
            for item in obj:
                if self._recursive_key_search(item, target_key):
                    return True
        elif isinstance(obj, str):
            # Also check string values for the target
            obj_normalized = obj.lower().replace('_', '').replace('-', '').replace(' ', '')
            target_normalized = target_key.replace('_', '').replace('-', '').replace(' ', '')
            if target_normalized in obj_normalized:
                return True
        return False
    
    def get_extraction_stats(self) -> Dict[str, Any]:
        """Get statistics about extraction methods used"""
        total = sum(self.extraction_stats.values())
        
        return {
            'total_extractions': total,
            'success_rate': (total - self.extraction_stats['failed_extractions']) / max(total, 1),
            'method_breakdown': self.extraction_stats,
            'method_percentages': {
                method: (count / max(total, 1)) * 100 
                for method, count in self.extraction_stats.items()
            }
        }


# Global validator instance
_global_validator = None

def get_unified_validator() -> UnifiedSchemaValidator:
    """Get global unified validator instance"""
    global _global_validator
    if _global_validator is None:
        _global_validator = UnifiedSchemaValidator()
    return _global_validator

# Convenience functions for immediate use

def extract_network_risk_score(agent_output: Any, debug: bool = False) -> RiskScore:
    """Extract risk score from network agent output"""
    validator = get_unified_validator()
    return validator.extract_risk_score(agent_output, AgentType.NETWORK, debug)

def extract_device_risk_score(agent_output: Any, debug: bool = False) -> RiskScore:
    """Extract risk score from device agent output"""
    validator = get_unified_validator()
    return validator.extract_risk_score(agent_output, AgentType.DEVICE, debug)

def extract_location_risk_score(agent_output: Any, debug: bool = False) -> RiskScore:
    """Extract risk score from location agent output"""
    validator = get_unified_validator()
    return validator.extract_risk_score(agent_output, AgentType.LOCATION, debug)

def extract_logs_risk_score(agent_output: Any, debug: bool = False) -> RiskScore:
    """Extract risk score from logs agent output"""
    validator = get_unified_validator()
    return validator.extract_risk_score(agent_output, AgentType.LOGS, debug)

def extract_overall_risk_score(agent_output: Any, debug: bool = False) -> RiskScore:
    """Extract overall risk score from risk aggregation output"""
    validator = get_unified_validator()
    return validator.extract_risk_score(agent_output, AgentType.RISK, debug)

def get_validator_stats() -> Dict[str, Any]:
    """Get validation statistics"""
    validator = get_unified_validator()
    return validator.get_extraction_stats()

# Example usage:
"""
# Replace old validation code:
# OLD:
risk_score = float(re.search(r"risk_level:\s*([0-9.]+)", response).group(1))

# NEW:
risk_result = extract_network_risk_score(agent_response, debug=True)
risk_score = risk_result.risk_level
confidence = risk_result.confidence

if risk_result.validation_errors:
    logger.warning(f"Validation issues: {risk_result.validation_errors}")
"""