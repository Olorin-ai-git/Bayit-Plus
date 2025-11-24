"""
Multi-Entity Investigation API Schemas

OpenAPI schema definitions for multi-entity investigation endpoints.
Provides comprehensive documentation for all request/response models.
"""

from typing import Dict, List, Any, Optional, Union
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

from app.models.multi_entity_investigation import (
    MultiEntityInvestigationRequest,
    MultiEntityInvestigationResult,
    MultiEntityInvestigationStatus
)


class QueryComplexityLevelSchema(str, Enum):
    """Query complexity levels"""
    SIMPLE = "simple"
    MODERATE = "moderate" 
    COMPLEX = "complex"
    EXCESSIVE = "excessive"


class QueryValidationMetrics(BaseModel):
    """Query validation complexity metrics"""
    entity_count: int = Field(description="Number of entities in the query")
    operator_count: int = Field(description="Number of Boolean operators (AND/OR/NOT)")
    nesting_depth: int = Field(description="Maximum parentheses nesting depth")
    expression_length: int = Field(description="Length of Boolean expression in characters")
    complexity_score: float = Field(description="Overall complexity score")
    complexity_level: QueryComplexityLevelSchema = Field(description="Complexity classification")
    estimated_execution_time_ms: float = Field(description="Estimated execution time in milliseconds")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "entity_count": 5,
                "operator_count": 4,
                "nesting_depth": 2,
                "expression_length": 87,
                "complexity_score": 18.5,
                "complexity_level": "moderate",
                "estimated_execution_time_ms": 300.0
            }
        }
    )


class QueryValidationErrorResponse(BaseModel):
    """Error response for query validation failures"""
    detail: str = Field(description="Error message")
    validation_errors: List[str] = Field(description="List of specific validation errors")
    complexity_metrics: QueryValidationMetrics = Field(description="Query complexity analysis")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Query validation failed: Too many entities: 60 (max: 50)",
                "validation_errors": ["Too many entities: 60 (max: 50)"],
                "complexity_metrics": {
                    "entity_count": 60,
                    "operator_count": 15,
                    "nesting_depth": 3,
                    "expression_length": 450,
                    "complexity_score": 75.2,
                    "complexity_level": "excessive",
                    "estimated_execution_time_ms": 3000.0
                }
            }
        }
    )


class InvestigationStatusSummary(BaseModel):
    """Investigation status summary for API responses"""
    investigation_id: str = Field(description="Unique investigation identifier")
    status: str = Field(description="Current investigation status")
    created_at: str = Field(description="Investigation creation timestamp")
    updated_at: str = Field(description="Last update timestamp")
    entity_count: int = Field(description="Number of entities being investigated")
    boolean_logic: str = Field(description="Boolean logic expression")
    total_duration_ms: Optional[int] = Field(description="Total execution duration in milliseconds")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "investigation_id": "multi_a1b2c3d4",
                "status": "completed",
                "created_at": "2025-01-09T10:30:00Z",
                "updated_at": "2025-01-09T10:32:15Z", 
                "entity_count": 3,
                "boolean_logic": "USER_12345 AND (TXN_67890 OR STORE_999)",
                "total_duration_ms": 135000
            }
        }
    )


class MultiEntityMetricsResponse(BaseModel):
    """Orchestrator metrics response schema"""
    total_investigations: int = Field(description="Total number of investigations processed")
    active_investigations: int = Field(description="Currently active investigations")
    completed_investigations: int = Field(description="Successfully completed investigations")
    failed_investigations: int = Field(description="Failed investigations")
    avg_execution_time_ms: float = Field(description="Average execution time in milliseconds")
    cache_hit_rate: float = Field(description="Query cache hit rate (0.0-1.0)")
    complexity_distribution: Dict[str, int] = Field(description="Distribution of query complexity levels")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_investigations": 1247,
                "active_investigations": 3,
                "completed_investigations": 1180,
                "failed_investigations": 64,
                "avg_execution_time_ms": 2340.5,
                "cache_hit_rate": 0.76,
                "complexity_distribution": {
                    "simple": 523,
                    "moderate": 456,
                    "complex": 201,
                    "excessive": 67
                }
            }
        }
    )


class EntityTypeInfo(BaseModel):
    """Entity type information schema"""
    name: str = Field(description="Entity type name")
    description: str = Field(description="Entity type description")
    example_ids: List[str] = Field(description="Example entity IDs of this type")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "user_id",
                "description": "User identifier for account-based entities",
                "example_ids": ["USER_12345", "USER_98765", "USER_54321"]
            }
        }
    )


class EnhancedEntityTypesResponse(BaseModel):
    """Enhanced entity types response with categorization"""
    core_entity_types: List[str] = Field(description="Core entity types for basic investigations")
    transaction_entity_types: List[str] = Field(description="Transaction-specific entity types")
    extended_entity_types: List[str] = Field(description="Extended entity types for advanced use cases")
    all_entity_types: List[str] = Field(description="Complete list of all available entity types")
    total_types: int = Field(description="Total number of entity types available")
    type_descriptions: Dict[str, EntityTypeInfo] = Field(description="Detailed descriptions for each type")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "core_entity_types": ["device", "location", "network", "user"],
                "transaction_entity_types": [
                    "timestamp", "tx_id_key", "store_id", "app_id", "event_type"
                ],
                "extended_entity_types": [
                    "email_normalized", "unique_user_id", "merchant_id"
                ],
                "all_entity_types": ["device", "location", "user", "timestamp", "tx_id_key"],
                "total_types": 25,
                "type_descriptions": {
                    "user": {
                        "name": "user_id",
                        "description": "User identifier for account-based entities",
                        "example_ids": ["USER_12345", "USER_98765"]
                    }
                }
            }
        }
    )


class HealthCheckResponse(BaseModel):
    """Health check response schema"""
    status: str = Field(description="Service health status")
    active_investigations_count: int = Field(description="Number of active investigations")
    websocket_connections_count: int = Field(description="Number of active WebSocket connections")
    multi_entity_investigations: int = Field(description="Number of active multi-entity investigations")
    router_version: str = Field(description="API router version")
    modules: List[str] = Field(description="List of loaded modules")
    features: List[str] = Field(description="List of available features")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "healthy",
                "active_investigations_count": 5,
                "websocket_connections_count": 12,
                "multi_entity_investigations": 2,
                "router_version": "2.1.0-multi-entity",
                "modules": [
                    "models.autonomous_investigation_models",
                    "models.multi_entity_investigation",
                    "handlers.websocket_handler"
                ],
                "features": [
                    "single_entity_investigation",
                    "multi_entity_investigation",
                    "boolean_logic_queries",
                    "cross_entity_analysis"
                ]
            }
        }
    )


# Enhanced request/response schemas with better documentation
class MultiEntityInvestigationRequestSchema(MultiEntityInvestigationRequest):
    """Multi-entity investigation request with enhanced documentation"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "investigation_id": "multi_a1b2c3d4",
                "entities": [
                    {"entity_id": "USER_12345", "entity_type": "user"},
                    {"entity_id": "TXN_67890", "entity_type": "transaction_id"},
                    {"entity_id": "STORE_999", "entity_type": "store_id"}
                ],
                "relationships": [
                    {
                        "source_entity_id": "USER_12345",
                        "target_entity_id": "TXN_67890",
                        "relationship_type": "initiated",
                        "strength": 1.0,
                        "evidence": {"source": "transaction_log", "confidence": 0.95}
                    }
                ],
                "boolean_logic": "USER_12345 AND (TXN_67890 OR STORE_999)",
                "investigation_scope": ["device", "location", "network", "logs"],
                "enable_verbose_logging": True,
                "enable_cross_entity_analysis": True,
                "max_investigation_time_minutes": 30
            }
        }
    )


class MultiEntityInvestigationResultSchema(MultiEntityInvestigationResult):
    """Multi-entity investigation result with enhanced documentation"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "investigation_id": "multi_a1b2c3d4",
                "status": "completed",
                "entities": [
                    {"entity_id": "USER_12345", "entity_type": "user"},
                    {"entity_id": "TXN_67890", "entity_type": "transaction_id"}
                ],
                "relationships": [],
                "boolean_logic": "USER_12345 AND TXN_67890",
                "started_at": "2025-01-09T10:30:00Z",
                "completed_at": "2025-01-09T10:32:15Z",
                "total_duration_ms": 135000,
                "investigation_results": [],
                "cross_entity_analysis": {
                    "correlation_score": 0.87,
                    "risk_factors": ["high_velocity", "unusual_location"],
                    "pattern_insights": []
                },
                "boolean_evaluation_result": True,
                "risk_assessment": {
                    "overall_risk_score": 0.76,
                    "risk_factors": ["velocity_anomaly", "location_mismatch"],
                    "recommendations": ["Additional verification recommended"]
                },
                "investigation_timeline": []
            }
        }
    )


# API response examples for documentation
class APIExamples:
    """Collection of API examples for OpenAPI documentation"""
    
    MULTI_ENTITY_REQUEST_SIMPLE = {
        "summary": "Simple two-entity investigation",
        "description": "Basic investigation with user and transaction entities",
        "value": {
            "entities": [
                {"entity_id": "USER_12345", "entity_type": "user"},
                {"entity_id": "TXN_67890", "entity_type": "transaction_id"}
            ],
            "relationships": [
                {
                    "source_entity_id": "USER_12345",
                    "target_entity_id": "TXN_67890",
                    "relationship_type": "initiated",
                    "strength": 1.0
                }
            ],
            "boolean_logic": "USER_12345 AND TXN_67890",
            "investigation_scope": ["device", "location"],
            "enable_verbose_logging": False
        }
    }
    
    MULTI_ENTITY_REQUEST_COMPLEX = {
        "summary": "Complex multi-entity investigation",
        "description": "Advanced investigation with multiple entities and complex Boolean logic",
        "value": {
            "entities": [
                {"entity_id": "USER_12345", "entity_type": "user"},
                {"entity_id": "TXN_67890", "entity_type": "transaction_id"},
                {"entity_id": "STORE_999", "entity_type": "store_id"},
                {"entity_id": "DEVICE_ABC", "entity_type": "device"},
                {"entity_id": "IP_192", "entity_type": "network"}
            ],
            "relationships": [
                {
                    "source_entity_id": "USER_12345",
                    "target_entity_id": "TXN_67890",
                    "relationship_type": "initiated",
                    "strength": 1.0
                },
                {
                    "source_entity_id": "TXN_67890",
                    "target_entity_id": "STORE_999",
                    "relationship_type": "processed_by",
                    "strength": 0.9
                }
            ],
            "boolean_logic": "(USER_12345 AND TXN_67890) OR (STORE_999 AND NOT DEVICE_ABC)",
            "investigation_scope": ["device", "location", "network", "logs"],
            "enable_verbose_logging": True,
            "enable_cross_entity_analysis": True,
            "max_investigation_time_minutes": 45
        }
    }
    
    VALIDATION_ERROR_RESPONSE = {
        "summary": "Query validation failure",
        "description": "Example of validation error when query exceeds complexity limits",
        "value": {
            "detail": "Query validation failed: Too many entities: 60 (max: 50), Query too complex: score 75.2 (max: 50.0)",
            "validation_errors": [
                "Too many entities: 60 (max: 50)",
                "Query too complex: score 75.2 (max: 50.0)"
            ],
            "complexity_metrics": {
                "entity_count": 60,
                "operator_count": 25,
                "nesting_depth": 5,
                "expression_length": 580,
                "complexity_score": 75.2,
                "complexity_level": "excessive",
                "estimated_execution_time_ms": 4500.0
            }
        }
    }