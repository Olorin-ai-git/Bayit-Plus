"""
Unified Agent Response Schema

This module defines the standardized Pydantic schema that ALL investigation agents 
must return to ensure consistent risk aggregation and prevent 0.00 score issues.

Based on user analysis: "Define one schema all agents must return and validate before aggregation"
"""

from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum


class RiskLevel(str, Enum):
    """Standard risk level classifications"""
    CRITICAL = "critical"
    HIGH = "high"  
    MEDIUM = "medium"
    LOW = "low"


class AgentType(str, Enum):
    """Investigation agent types"""
    NETWORK = "network"
    DEVICE = "device"
    LOCATION = "location"
    LOGS = "logs"
    RISK_AGGREGATION = "risk_aggregation"


class AgentRiskResponse(BaseModel):
    """
    Unified agent response schema that ALL investigation agents must return.
    
    This ensures consistent risk aggregation and prevents the 0.00 score issue
    caused by schema mismatches between agents and the aggregation system.
    
    Key requirements:
    - overall_risk_score: Mandatory float between 0.0-1.0
    - confidence: Agent's confidence in the assessment
    - risk_factors: List of specific risk indicators found
    - mitigation_measures: Recommended actions to address risks
    - domain_specific: Agent-specific data that doesn't break aggregation
    """
    
    # Core required fields that ALL agents must provide
    overall_risk_score: float = Field(
        ..., 
        ge=0.0, 
        le=1.0,
        description="Primary risk score used by aggregation system (0.0-1.0)"
    )
    
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0, 
        description="Agent's confidence in the assessment (0.0-1.0)"
    )
    
    risk_factors: List[str] = Field(
        ...,
        min_items=0,
        description="Specific risk indicators found during analysis"
    )
    
    mitigation_measures: List[str] = Field(
        ...,
        min_items=0,
        description="Recommended actions to address identified risks"
    )
    
    # Standard metadata fields
    agent_type: AgentType = Field(..., description="Type of agent that generated this response")
    investigation_id: str = Field(..., description="Unique investigation identifier")
    timestamp: str = Field(..., description="ISO timestamp when analysis completed")
    
    # Risk categorization
    risk_level: RiskLevel = Field(..., description="Categorical risk level")
    
    # Agent-specific data (flexible but structured)
    domain_specific: Dict[str, Any] = Field(
        default_factory=dict,
        description="Agent-specific data that won't break aggregation"
    )
    
    # Technical metadata
    analysis_duration_ms: Optional[int] = Field(
        None, 
        description="Time taken for analysis in milliseconds"
    )
    
    validation_errors: List[str] = Field(
        default_factory=list,
        description="Any validation or processing errors encountered"
    )
    
    @field_validator('overall_risk_score')
    @classmethod
    def validate_risk_score(cls, v):
        """Ensure risk score is valid and within expected range"""
        if not isinstance(v, (int, float)):
            raise ValueError("overall_risk_score must be a number")
        if v < 0.0 or v > 1.0:
            raise ValueError("overall_risk_score must be between 0.0 and 1.0")
        return float(v)
    
    @field_validator('confidence')
    @classmethod
    def validate_confidence(cls, v):
        """Ensure confidence is valid and within expected range"""
        if not isinstance(v, (int, float)):
            raise ValueError("confidence must be a number")
        if v < 0.0 or v > 1.0:
            raise ValueError("confidence must be between 0.0 and 1.0")
        return float(v)
    
    @model_validator(mode='before')
    @classmethod
    def validate_risk_level_consistency(cls, values):
        """Ensure risk_level matches overall_risk_score"""
        if isinstance(values, dict):
            risk_score = values.get('overall_risk_score')
            risk_level = values.get('risk_level')
            
            if risk_score is not None:
                # Auto-assign risk_level based on score if not provided or inconsistent
                if risk_score >= 0.8:
                    expected_level = RiskLevel.CRITICAL
                elif risk_score >= 0.6:
                    expected_level = RiskLevel.HIGH
                elif risk_score >= 0.3:
                    expected_level = RiskLevel.MEDIUM
                else:
                    expected_level = RiskLevel.LOW
                    
                if risk_level != expected_level:
                    values['risk_level'] = expected_level
        
        return values
    
    @field_validator('risk_factors')
    @classmethod
    def validate_risk_factors(cls, v):
        """Ensure risk factors are meaningful"""
        if not isinstance(v, list):
            raise ValueError("risk_factors must be a list")
        
        # Filter out empty or meaningless entries
        filtered = [factor for factor in v if factor and isinstance(factor, str) and factor.strip()]
        return filtered
    
    @field_validator('mitigation_measures')
    @classmethod
    def validate_mitigation_measures(cls, v):
        """Ensure mitigation measures are meaningful"""
        if not isinstance(v, list):
            raise ValueError("mitigation_measures must be a list")
            
        # Filter out empty or meaningless entries
        filtered = [measure for measure in v if measure and isinstance(measure, str) and measure.strip()]
        return filtered


class NetworkAgentResponse(AgentRiskResponse):
    """Network agent specific response schema"""
    
    def __init__(self, **data):
        # Set agent_type automatically
        data['agent_type'] = AgentType.NETWORK
        super().__init__(**data)
    
    @field_validator('domain_specific')
    @classmethod
    def validate_network_specific(cls, v):
        """Validate network-specific fields"""
        required_fields = ['network_red_flags', 'connection_analysis', 'ip_reputation']
        for field in required_fields:
            if field not in v:
                v[field] = []
        return v


class DeviceAgentResponse(AgentRiskResponse):
    """Device agent specific response schema"""
    
    def __init__(self, **data):
        # Set agent_type automatically  
        data['agent_type'] = AgentType.DEVICE
        super().__init__(**data)
    
    @field_validator('domain_specific')
    @classmethod
    def validate_device_specific(cls, v):
        """Validate device-specific fields"""
        required_fields = ['device_fingerprint_anomalies', 'fraud_indicators', 'fingerprint_analysis']
        for field in required_fields:
            if field not in v:
                v[field] = []
        return v


class LocationAgentResponse(AgentRiskResponse):
    """Location agent specific response schema"""
    
    def __init__(self, **data):
        # Set agent_type automatically
        data['agent_type'] = AgentType.LOCATION
        super().__init__(**data)
    
    @field_validator('domain_specific')
    @classmethod
    def validate_location_specific(cls, v):
        """Validate location-specific fields"""
        required_fields = ['geographic_anomalies', 'travel_patterns', 'location_verification']
        for field in required_fields:
            if field not in v:
                v[field] = []
        return v


class LogsAgentResponse(AgentRiskResponse):
    """Logs agent specific response schema"""
    
    def __init__(self, **data):
        # Set agent_type automatically
        data['agent_type'] = AgentType.LOGS
        super().__init__(**data)
    
    @field_validator('domain_specific')
    @classmethod
    def validate_logs_specific(cls, v):
        """Validate logs-specific fields"""
        required_fields = ['behavioral_patterns', 'suspicious_patterns', 'activity_timeline']
        for field in required_fields:
            if field not in v:
                v[field] = []
        return v


class RiskAggregationResponse(AgentRiskResponse):
    """Risk aggregation agent specific response schema"""
    
    def __init__(self, **data):
        # Set agent_type automatically
        data['agent_type'] = AgentType.RISK_AGGREGATION
        super().__init__(**data)
    
    @field_validator('domain_specific')
    @classmethod
    def validate_risk_aggregation_specific(cls, v):
        """Validate risk aggregation specific fields"""
        required_fields = [
            'cross_domain_correlations', 
            'risk_classification',
            'aggregation_metadata',
            'individual_agent_scores'
        ]
        for field in required_fields:
            if field not in v:
                if field == 'individual_agent_scores':
                    v[field] = {}
                elif field == 'aggregation_metadata':
                    v[field] = {}
                else:
                    v[field] = []
        return v


# Agent response factory function
def create_agent_response(agent_type: AgentType, **kwargs) -> AgentRiskResponse:
    """
    Factory function to create the appropriate agent response type
    
    Args:
        agent_type: Type of agent creating the response
        **kwargs: Response data
        
    Returns:
        Typed agent response instance
    """
    
    response_classes = {
        AgentType.NETWORK: NetworkAgentResponse,
        AgentType.DEVICE: DeviceAgentResponse,
        AgentType.LOCATION: LocationAgentResponse,
        AgentType.LOGS: LogsAgentResponse,
        AgentType.RISK_AGGREGATION: RiskAggregationResponse
    }
    
    response_class = response_classes.get(agent_type, AgentRiskResponse)
    return response_class(**kwargs)


# Legacy response converter for backward compatibility
def convert_legacy_response(
    agent_type: AgentType,
    legacy_response: Union[str, Dict[str, Any]],
    investigation_id: str,
    timestamp: str
) -> AgentRiskResponse:
    """
    Convert legacy agent responses to unified schema
    
    This function handles the transition period where agents might still
    return old format responses. It extracts the key information and
    creates a properly formatted unified response.
    
    Args:
        agent_type: Type of agent that created the legacy response
        legacy_response: Old format response (string or dict)  
        investigation_id: Investigation ID for the response
        timestamp: ISO timestamp for the response
        
    Returns:
        Unified schema response
    """
    
    # Import the existing validator for extraction
    from .schema_validator_fix import get_unified_validator, AgentType as SchemaAgentType
    
    validator = get_unified_validator()
    
    # Extract risk score using existing logic - map our AgentType to schema AgentType
    # Map our agent type values to schema validator values
    agent_type_mapping = {
        "network": "network",
        "device": "device", 
        "location": "location",
        "logs": "logs",
        "risk_aggregation": "risk"  # Map risk_aggregation to risk
    }
    
    agent_type_str = agent_type.value if hasattr(agent_type, 'value') else str(agent_type)
    schema_value = agent_type_mapping.get(agent_type_str, "risk")
    schema_agent_type = SchemaAgentType(schema_value)
    risk_result = validator.extract_risk_score(
        legacy_response, 
        schema_agent_type
    )
    
    # Create unified response
    unified_response = create_agent_response(
        agent_type=agent_type,
        overall_risk_score=risk_result.risk_level,
        confidence=risk_result.confidence,
        risk_factors=_extract_risk_factors(legacy_response),
        mitigation_measures=_extract_mitigation_measures(legacy_response),
        risk_level=_score_to_risk_level(risk_result.risk_level),
        investigation_id=investigation_id,
        timestamp=timestamp,
        domain_specific=_extract_domain_specific(agent_type, legacy_response),
        validation_errors=risk_result.validation_errors or []
    )
    
    return unified_response


def _extract_risk_factors(response: Union[str, Dict]) -> List[str]:
    """Extract risk factors from legacy response"""
    
    risk_factors = []
    
    try:
        if isinstance(response, dict):
            # Look for common risk factor fields
            for field in ['risk_factors', 'findings', 'indicators', 'anomalies', 'red_flags']:
                if field in response:
                    value = response[field]
                    if isinstance(value, list):
                        risk_factors.extend([str(item) for item in value if item])
                    elif isinstance(value, str) and value:
                        risk_factors.append(value)
        
        elif isinstance(response, str):
            # Extract from text patterns
            import re
            
            # Look for numbered lists or bullet points
            patterns = [
                r'(\d+\.\s+[^.]+(?:\.|$))',  # 1. Something.
                r'(-\s+[^.]+(?:\.|$))',      # - Something.
                r'(\*\s+[^.]+(?:\.|$))',     # * Something.
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, response, re.MULTILINE | re.IGNORECASE)
                for match in matches:
                    clean_match = re.sub(r'^[\d\-\*\.\s]+', '', match).strip()
                    if len(clean_match) > 10:  # Only meaningful factors
                        risk_factors.append(clean_match)
                
                if risk_factors:  # Use first pattern that works
                    break
    
    except Exception:
        pass  # Graceful fallback
    
    # If no specific factors found, add generic entry
    if not risk_factors:
        risk_factors.append("Risk factors identified during analysis")
    
    return risk_factors[:10]  # Limit to first 10


def _extract_mitigation_measures(response: Union[str, Dict]) -> List[str]:
    """Extract mitigation measures from legacy response"""
    
    measures = []
    
    try:
        if isinstance(response, dict):
            # Look for common mitigation fields
            for field in ['mitigation_measures', 'recommendations', 'actions', 'measures', 'steps']:
                if field in response:
                    value = response[field]
                    if isinstance(value, list):
                        measures.extend([str(item) for item in value if item])
                    elif isinstance(value, str) and value:
                        measures.append(value)
        
        elif isinstance(response, str):
            # Look for recommendation patterns
            import re
            
            # Find sentences with recommendation keywords
            recommendation_patterns = [
                r'recommend[^.]*\.',
                r'suggest[^.]*\.',
                r'should[^.]*\.',
                r'implement[^.]*\.',
                r'consider[^.]*\.',
                r'enable[^.]*\.',
                r'require[^.]*\.',
                r'apply[^.]*\.',
                r'set up[^.]*\.',
                r'flag[^.]*\.'
            ]
            
            for pattern in recommendation_patterns:
                matches = re.findall(pattern, response, re.IGNORECASE)
                measures.extend([match.strip() for match in matches])
    
    except Exception:
        pass  # Graceful fallback
    
    # If no specific measures found, add generic ones
    if not measures:
        measures.extend([
            "Review investigation findings",
            "Monitor for suspicious activity", 
            "Apply appropriate security controls"
        ])
    
    return measures[:10]  # Limit to first 10


def _extract_domain_specific(agent_type: AgentType, response: Union[str, Dict]) -> Dict[str, Any]:
    """Extract domain-specific data from legacy response"""
    
    domain_data = {}
    
    try:
        if isinstance(response, dict):
            # Copy all non-standard fields to domain_specific
            standard_fields = {
                'overall_risk_score', 'confidence', 'risk_factors', 
                'mitigation_measures', 'agent_type', 'investigation_id',
                'timestamp', 'risk_level', 'analysis_duration_ms'
            }
            
            for key, value in response.items():
                if key not in standard_fields:
                    domain_data[key] = value
        
        # Add agent-type specific required fields if missing
        if agent_type == AgentType.NETWORK:
            for field in ['network_red_flags', 'connection_analysis', 'ip_reputation']:
                if field not in domain_data:
                    domain_data[field] = []
        
        elif agent_type == AgentType.DEVICE:
            for field in ['device_fingerprint_anomalies', 'fraud_indicators', 'fingerprint_analysis']:
                if field not in domain_data:
                    domain_data[field] = []
                    
        elif agent_type == AgentType.LOCATION:
            for field in ['geographic_anomalies', 'travel_patterns', 'location_verification']:
                if field not in domain_data:
                    domain_data[field] = []
                    
        elif agent_type == AgentType.LOGS:
            for field in ['behavioral_patterns', 'suspicious_patterns', 'activity_timeline']:
                if field not in domain_data:
                    domain_data[field] = []
        
        elif agent_type == AgentType.RISK_AGGREGATION:
            for field in ['cross_domain_correlations', 'risk_classification', 'aggregation_metadata', 'individual_agent_scores']:
                if field not in domain_data:
                    domain_data[field] = {} if 'scores' in field or 'metadata' in field else []
    
    except Exception:
        pass  # Graceful fallback
    
    return domain_data


def _score_to_risk_level(score: float) -> RiskLevel:
    """Convert numeric risk score to categorical risk level"""
    
    if score >= 0.8:
        return RiskLevel.CRITICAL
    elif score >= 0.6:
        return RiskLevel.HIGH
    elif score >= 0.3:
        return RiskLevel.MEDIUM
    else:
        return RiskLevel.LOW


# Validation helper functions for agents
def validate_agent_response(response_data: Dict[str, Any]) -> AgentRiskResponse:
    """
    Validate and create agent response from raw data
    
    Raises:
        ValidationError: If response data is invalid
        
    Returns:
        Validated agent response
    """
    
    agent_type = AgentType(response_data.get('agent_type'))
    return create_agent_response(agent_type=agent_type, **response_data)


def ensure_valid_response(
    agent_type: AgentType,
    response: Union[str, Dict, AgentRiskResponse],
    investigation_id: str,
    timestamp: str = None
) -> AgentRiskResponse:
    """
    Ensure any agent response conforms to unified schema
    
    This is the main function agents should call to guarantee 
    their responses work with the aggregation system.
    
    Args:
        agent_type: Type of agent creating response
        response: Raw agent response in any format
        investigation_id: Investigation ID  
        timestamp: Optional timestamp (will generate if None)
        
    Returns:
        Validated unified response that will work with aggregation
    """
    
    if timestamp is None:
        from datetime import datetime
        timestamp = datetime.utcnow().isoformat()
    
    # If already unified response, validate and return
    if isinstance(response, AgentRiskResponse):
        return response
    
    # Convert legacy response
    return convert_legacy_response(
        agent_type=agent_type,
        legacy_response=response, 
        investigation_id=investigation_id,
        timestamp=timestamp
    )


# Example usage for agents:
"""
# In your agent code, replace this:
return {"risk_level": 0.75, "findings": ["suspicious activity"]}

# With this:
from app.service.agent.unified_agent_schema import ensure_valid_response, AgentType

response = ensure_valid_response(
    agent_type=AgentType.NETWORK,
    response={"risk_level": 0.75, "findings": ["suspicious activity"]},
    investigation_id=investigation_id
)
return {"messages": [AIMessage(content=response.model_dump_json())]}
"""