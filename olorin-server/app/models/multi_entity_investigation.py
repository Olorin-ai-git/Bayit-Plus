"""
Multi-Entity Investigation Models

This module contains all Pydantic models for multi-entity autonomous investigations
including request models, relationship models, and comprehensive result models.

Phase 2.1 Implementation: Multi-Entity Investigation Request Models
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from enum import Enum
import uuid

from app.service.agent.multi_entity.entity_manager import EntityType


class RelationshipType(Enum):
    """Types of relationships between entities in investigations"""
    
    # Temporal relationships
    OCCURRED_AT = "occurred_at"
    INITIATED_BY = "initiated_by" 
    PRECEDED_BY = "preceded_by"
    FOLLOWED_BY = "followed_by"
    
    # Transactional relationships
    INITIATED = "initiated"
    PROCESSED_BY = "processed_by"
    AUTHORIZED_BY = "authorized_by"
    REVIEWED_BY = "reviewed_by"
    
    # Identity relationships
    ASSOCIATED_WITH = "associated_with"
    BELONGS_TO = "belongs_to"
    USED_BY = "used_by"
    ACCESSED_BY = "accessed_by"
    
    # Business relationships
    MERCHANT_OF = "merchant_of"
    PAYMENT_FOR = "payment_for"
    STORE_OF = "store_of"
    EVENT_OF = "event_of"
    
    # Generic relationships
    RELATED_TO = "related_to"
    CONNECTED_TO = "connected_to"
    DERIVED_FROM = "derived_from"


class EntityRelationship(BaseModel):
    """Relationship between entities in multi-entity investigation"""
    
    source_entity_id: str = Field(..., description="Source entity identifier")
    target_entity_id: str = Field(..., description="Target entity identifier") 
    relationship_type: RelationshipType = Field(..., description="Type of relationship")
    strength: float = Field(default=1.0, ge=0.0, le=1.0, description="Relationship strength (0.0-1.0)")
    bidirectional: bool = Field(default=False, description="Whether relationship is bidirectional")
    evidence: Optional[Dict[str, Any]] = Field(default=None, description="Supporting evidence for relationship")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence in relationship")


class MultiEntityInvestigationRequest(BaseModel):
    """Request model for multi-entity autonomous investigation"""
    
    investigation_id: str = Field(
        default_factory=lambda: f"multi_{uuid.uuid4().hex[:8]}", 
        description="Unique investigation identifier"
    )
    
    entities: List[Dict[str, str]] = Field(
        ..., 
        min_length=2, 
        max_length=10,
        description="List of entities to investigate - format: [{'entity_id': 'user123', 'entity_type': 'user'}]"
    )
    
    relationships: List[EntityRelationship] = Field(
        default_factory=list,
        description="Relationships between entities"
    )
    
    boolean_logic: str = Field(
        default="AND",
        description="Boolean logic for entity investigation: 'AND', 'OR', '(A AND B) OR C'"
    )
    
    investigation_scope: List[str] = Field(
        default=["device", "location", "network", "logs"],
        description="Investigation agent scopes to execute"
    )
    
    priority: str = Field(
        default="normal",
        pattern="^(low|normal|high|critical)$",
        description="Investigation priority level"
    )
    
    enable_verbose_logging: bool = Field(default=True, description="Enable comprehensive logging")
    enable_journey_tracking: bool = Field(default=True, description="Enable LangGraph journey tracking")
    enable_chain_of_thought: bool = Field(default=True, description="Enable agent reasoning logging")
    enable_cross_entity_analysis: bool = Field(default=True, description="Enable cross-entity pattern analysis")
    
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional investigation metadata")
    
    class Config:
        """Pydantic model configuration"""
        use_enum_values = True


class CrossEntityAnalysis(BaseModel):
    """Results of cross-entity pattern analysis"""
    
    analysis_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investigation_id: str = Field(..., description="Parent investigation ID")
    
    entity_interactions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Detected interactions between entities"
    )
    
    risk_correlations: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Risk score correlations across entities"
    )
    
    temporal_patterns: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Temporal patterns across entity timeline"
    )
    
    anomaly_clusters: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Clustered anomalies spanning multiple entities"
    )
    
    behavioral_insights: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Behavioral pattern insights across entities"
    )
    
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    analysis_timestamp: datetime = Field(default_factory=datetime.now)


class RelationshipInsight(BaseModel):
    """Insights derived from entity relationships during investigation"""
    
    insight_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investigation_id: str = Field(..., description="Parent investigation ID")
    
    relationship_id: str = Field(..., description="Related EntityRelationship ID")
    insight_type: str = Field(..., description="Type of insight (risk_propagation, pattern_match, anomaly)")
    
    description: str = Field(..., description="Human-readable insight description")
    risk_impact: float = Field(default=0.0, ge=0.0, le=1.0, description="Risk impact score")
    confidence_level: float = Field(default=0.0, ge=0.0, le=1.0, description="Confidence in insight")
    
    supporting_evidence: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Evidence supporting this insight"
    )
    
    agent_sources: List[str] = Field(
        default_factory=list,
        description="Agent types that contributed to this insight"
    )
    
    discovered_at: datetime = Field(default_factory=datetime.now)


class MultiEntityRiskAssessment(BaseModel):
    """Overall risk assessment for multi-entity investigation"""
    
    assessment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investigation_id: str = Field(..., description="Parent investigation ID")
    
    overall_risk_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Combined risk score")
    individual_entity_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Risk scores per entity (entity_id -> score)"
    )
    
    relationship_risk_factors: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Risk factors from entity relationships"
    )
    
    cross_entity_multipliers: Dict[str, float] = Field(
        default_factory=dict,
        description="Risk multipliers from cross-entity analysis"
    )
    
    aggregation_method: str = Field(default="weighted_average", description="Method used for score aggregation")
    confidence_level: float = Field(default=0.0, ge=0.0, le=1.0, description="Confidence in assessment")
    
    assessment_timestamp: datetime = Field(default_factory=datetime.now)


class InvestigationResult(BaseModel):
    """Individual agent investigation result for single entity"""
    
    result_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investigation_id: str = Field(..., description="Parent investigation ID")
    entity_id: str = Field(..., description="Investigated entity ID")
    agent_type: str = Field(..., description="Agent that performed investigation")
    
    findings: Dict[str, Any] = Field(default_factory=dict, description="Agent investigation findings")
    risk_indicators: List[Dict[str, Any]] = Field(default_factory=list, description="Risk indicators found")
    tool_results: List[Dict[str, Any]] = Field(default_factory=list, description="Tool execution results")
    
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Entity risk score from this agent")
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Agent confidence in results")
    
    execution_time_ms: int = Field(default=0, description="Agent execution time in milliseconds")
    agent_reasoning: Optional[str] = Field(default=None, description="Agent chain-of-thought reasoning")
    
    completed_at: datetime = Field(default_factory=datetime.now)


class MultiEntityInvestigationResult(BaseModel):
    """Complete results from multi-entity autonomous investigation"""
    
    investigation_id: str = Field(..., description="Investigation identifier")
    status: str = Field(default="completed", description="Investigation status")
    
    entities: List[Dict[str, str]] = Field(..., description="Original entities investigated")
    relationships: List[EntityRelationship] = Field(..., description="Entity relationships")
    boolean_logic: str = Field(..., description="Boolean logic used")
    
    # Individual entity results
    entity_results: Dict[str, List[InvestigationResult]] = Field(
        default_factory=dict,
        description="Results per entity (entity_id -> list of agent results)"
    )
    
    # Cross-entity analysis
    cross_entity_analysis: Optional[CrossEntityAnalysis] = Field(
        default=None,
        description="Cross-entity pattern analysis results"
    )
    
    relationship_insights: List[RelationshipInsight] = Field(
        default_factory=list,
        description="Insights from entity relationships"
    )
    
    overall_risk_assessment: Optional[MultiEntityRiskAssessment] = Field(
        default=None,
        description="Overall risk assessment"
    )
    
    # Investigation metadata
    investigation_timeline: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Timeline of investigation events"
    )
    
    performance_metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Performance metrics for investigation"
    )
    
    agent_coordination: Dict[str, Any] = Field(
        default_factory=dict,
        description="Agent coordination and orchestration details"
    )
    
    # Timestamps
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = Field(default=None)
    total_duration_ms: Optional[int] = Field(default=None)
    
    # WebSocket and monitoring
    websocket_url: Optional[str] = Field(default=None, description="WebSocket URL for real-time updates")
    monitoring_endpoints: Dict[str, str] = Field(default_factory=dict, description="Monitoring endpoint URLs")


class MultiEntityInvestigationStatus(BaseModel):
    """Status response for multi-entity investigation"""
    
    investigation_id: str = Field(..., description="Investigation identifier")
    status: str = Field(..., description="Current status")
    current_phase: str = Field(..., description="Current investigation phase")
    progress_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Overall progress")
    
    entity_progress: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Progress per entity (entity_id -> progress info)"
    )
    
    agent_status: Dict[str, str] = Field(
        default_factory=dict,
        description="Status of each agent type"
    )
    
    findings_summary: Dict[str, Any] = Field(
        default_factory=dict,
        description="Summary of findings so far"
    )
    
    investigation_timeline: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Investigation timeline"
    )
    
    performance_metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Performance metrics"
    )
    
    estimated_completion_time_ms: Optional[int] = Field(default=None)
    last_updated: datetime = Field(default_factory=datetime.now)


class BooleanQueryParser(BaseModel):
    """Parser for boolean logic expressions in multi-entity investigations"""
    
    expression: str = Field(..., description="Boolean expression to parse")
    entity_mapping: Dict[str, str] = Field(..., description="Entity variable to ID mapping")
    
    def parse(self) -> Dict[str, Any]:
        """Parse boolean expression into execution tree"""
        # Implementation will be added in Phase 2.2
        return {
            "parsed": False,
            "expression": self.expression,
            "entity_mapping": self.entity_mapping,
            "error": "Parser implementation pending Phase 2.2"
        }