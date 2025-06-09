from datetime import datetime, timezone
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.location_risk import LocationRiskAssessment
from app.service.agent.ato_agents.location_data_agent.client import LocationInfo


class Investigation(BaseModel):
    id: str
    entity_id: str
    entity_type: str
    user_id: Optional[str] = None  # Deprecated, kept for backward compatibility
    status: str = "IN_PROGRESS"
    policy_comments: str = ""
    investigator_comments: str = ""
    overall_risk_score: float = 0.0
    device_llm_thoughts: str = ""
    location_llm_thoughts: str = ""
    network_llm_thoughts: str = ""
    logs_llm_thoughts: str = ""
    device_risk_score: float = 0.0
    location_risk_score: float = 0.0
    network_risk_score: float = 0.0
    logs_risk_score: float = 0.0


class InvestigationCreate(BaseModel):
    id: str  # investigationId
    entity_id: str
    entity_type: str = "user_id"  # Default to user_id for backward compatibility


class InvestigationUpdate(BaseModel):
    id: Optional[str] = None  # investigationId is optional for update
    status: Optional[str] = None  # IN_PROGRESS/FAILED/COMPLETED
    policy_comments: str = ""
    investigator_comments: str = ""


class InvestigationOut(BaseModel):
    id: str
    entity_id: str
    entity_type: str
    user_id: Optional[str] = None  # Deprecated, kept for backward compatibility
    status: str = "IN_PROGRESS"
    policy_comments: str = ""
    investigator_comments: str = ""
    overall_risk_score: float = 0.0
    device_llm_thoughts: str = ""
    location_llm_thoughts: str = ""
    network_llm_thoughts: str = ""
    logs_llm_thoughts: str = ""
    device_risk_score: float = 0.0
    location_risk_score: float = 0.0
    network_risk_score: float = 0.0
    logs_risk_score: float = 0.0

    # Map chat_messages to policy_comments and investigator_comments
    # Remove chat_messages as a list
    model_config = ConfigDict(from_attributes=True)


class LocationRiskAnalysisResponse(BaseModel):
    entity_id: str
    entity_type: str = "user_id"
    user_id: Optional[str] = None  # Deprecated, kept for backward compatibility
    oii_location_info: Optional["LocationInfo"] = None
    business_location_info: Optional["LocationInfo"] = None
    phone_location_info: Optional["LocationInfo"] = None
    device_analysis_results: Optional[Dict[str, Any]] = None
    overall_location_risk_assessment: Optional[LocationRiskAssessment] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    model_config = {"from_attributes": True}


# Ensure forward references are resolved for OpenAPI
LocationRiskAnalysisResponse.model_rebuild()
