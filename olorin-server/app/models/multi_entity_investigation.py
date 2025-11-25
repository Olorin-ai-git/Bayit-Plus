"""
Multi-Entity Investigation Models

This module contains all Pydantic models for multi-entity structured investigations
including request models, relationship models, and comprehensive result models.

Phase 2.1 Implementation: Multi-Entity Investigation Request Models
"""

import re
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set

from pydantic import BaseModel, Field

from app.router.models.autonomous_investigation_models import TimeRange
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
    strength: float = Field(
        default=1.0, ge=0.0, le=1.0, description="Relationship strength (0.0-1.0)"
    )
    bidirectional: bool = Field(
        default=False, description="Whether relationship is bidirectional"
    )
    evidence: Optional[Dict[str, Any]] = Field(
        default=None, description="Supporting evidence for relationship"
    )
    confidence: float = Field(
        default=1.0, ge=0.0, le=1.0, description="Confidence in relationship"
    )


class MultiEntityInvestigationRequest(BaseModel):
    """Request model for multi-entity structured investigation"""

    investigation_id: str = Field(
        default_factory=lambda: f"multi_{uuid.uuid4().hex[:8]}",
        description="Unique investigation identifier",
    )

    entities: List[Dict[str, str]] = Field(
        ...,
        min_length=2,
        max_length=10,
        description="List of entities to investigate - format: [{'entity_id': 'user123', 'entity_type': 'user'}]",
    )

    relationships: List[EntityRelationship] = Field(
        default_factory=list, description="Relationships between entities"
    )

    boolean_logic: str = Field(
        default="AND",
        description="Boolean logic for entity investigation: 'AND', 'OR', '(A AND B) OR C'",
    )

    time_range: Optional[TimeRange] = Field(
        None,
        description="Optional time range filter for investigation data across all entities",
    )

    investigation_scope: List[str] = Field(
        default=["device", "location", "network", "logs"],
        description="Investigation agent scopes to execute",
    )

    priority: str = Field(
        default="normal",
        pattern="^(low|normal|high|critical)$",
        description="Investigation priority level",
    )

    enable_verbose_logging: bool = Field(
        default=True, description="Enable comprehensive logging"
    )
    enable_journey_tracking: bool = Field(
        default=True, description="Enable LangGraph journey tracking"
    )
    enable_chain_of_thought: bool = Field(
        default=True, description="Enable agent reasoning logging"
    )
    enable_cross_entity_analysis: bool = Field(
        default=True, description="Enable cross-entity pattern analysis"
    )

    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional investigation metadata"
    )

    class Config:
        """Pydantic model configuration"""

        use_enum_values = True


class CrossEntityAnalysis(BaseModel):
    """Results of cross-entity pattern analysis"""

    analysis_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investigation_id: str = Field(..., description="Parent investigation ID")

    entity_interactions: List[Dict[str, Any]] = Field(
        default_factory=list, description="Detected interactions between entities"
    )

    risk_correlations: List[Dict[str, Any]] = Field(
        default_factory=list, description="Risk score correlations across entities"
    )

    temporal_patterns: List[Dict[str, Any]] = Field(
        default_factory=list, description="Temporal patterns across entity timeline"
    )

    anomaly_clusters: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Clustered anomalies spanning multiple entities",
    )

    behavioral_insights: List[Dict[str, Any]] = Field(
        default_factory=list, description="Behavioral pattern insights across entities"
    )

    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    analysis_timestamp: datetime = Field(default_factory=datetime.now)


class RelationshipInsight(BaseModel):
    """Insights derived from entity relationships during investigation"""

    insight_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investigation_id: str = Field(..., description="Parent investigation ID")

    relationship_id: str = Field(..., description="Related EntityRelationship ID")
    insight_type: str = Field(
        ..., description="Type of insight (risk_propagation, pattern_match, anomaly)"
    )

    description: str = Field(..., description="Human-readable insight description")
    risk_impact: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Risk impact score"
    )
    confidence_level: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Confidence in insight"
    )

    supporting_evidence: List[Dict[str, Any]] = Field(
        default_factory=list, description="Evidence supporting this insight"
    )

    agent_sources: List[str] = Field(
        default_factory=list, description="Agent types that contributed to this insight"
    )

    discovered_at: datetime = Field(default_factory=datetime.now)


class MultiEntityRiskAssessment(BaseModel):
    """Overall risk assessment for multi-entity investigation"""

    assessment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investigation_id: str = Field(..., description="Parent investigation ID")

    overall_risk_score: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Combined risk score"
    )
    individual_entity_scores: Dict[str, float] = Field(
        default_factory=dict, description="Risk scores per entity (entity_id -> score)"
    )

    relationship_risk_factors: List[Dict[str, Any]] = Field(
        default_factory=list, description="Risk factors from entity relationships"
    )

    cross_entity_multipliers: Dict[str, float] = Field(
        default_factory=dict, description="Risk multipliers from cross-entity analysis"
    )

    aggregation_method: str = Field(
        default="weighted_average", description="Method used for score aggregation"
    )
    confidence_level: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Confidence in assessment"
    )

    assessment_timestamp: datetime = Field(default_factory=datetime.now)


class InvestigationResult(BaseModel):
    """Individual agent investigation result for single entity"""

    result_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    investigation_id: str = Field(..., description="Parent investigation ID")
    entity_id: str = Field(..., description="Investigated entity ID")
    agent_type: str = Field(..., description="Agent that performed investigation")

    findings: Dict[str, Any] = Field(
        default_factory=dict, description="Agent investigation findings"
    )
    risk_indicators: List[Dict[str, Any]] = Field(
        default_factory=list, description="Risk indicators found"
    )
    tool_results: List[Dict[str, Any]] = Field(
        default_factory=list, description="Tool execution results"
    )

    risk_score: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Entity risk score from this agent"
    )
    confidence_score: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Agent confidence in results"
    )

    execution_time_ms: int = Field(
        default=0, description="Agent execution time in milliseconds"
    )
    agent_reasoning: Optional[str] = Field(
        default=None, description="Agent chain-of-thought reasoning"
    )

    completed_at: datetime = Field(default_factory=datetime.now)


class MultiEntityInvestigationResult(BaseModel):
    """Complete results from multi-entity structured investigation"""

    investigation_id: str = Field(..., description="Investigation identifier")
    status: str = Field(default="completed", description="Investigation status")

    entities: List[Dict[str, str]] = Field(
        ..., description="Original entities investigated"
    )
    relationships: List[EntityRelationship] = Field(
        ..., description="Entity relationships"
    )
    boolean_logic: str = Field(..., description="Boolean logic used")

    # Individual entity results
    entity_results: Dict[str, List[InvestigationResult]] = Field(
        default_factory=dict,
        description="Results per entity (entity_id -> list of agent results)",
    )

    # Cross-entity analysis
    cross_entity_analysis: Optional[CrossEntityAnalysis] = Field(
        default=None, description="Cross-entity pattern analysis results"
    )

    relationship_insights: List[RelationshipInsight] = Field(
        default_factory=list, description="Insights from entity relationships"
    )

    overall_risk_assessment: Optional[MultiEntityRiskAssessment] = Field(
        default=None, description="Overall risk assessment"
    )

    # Investigation metadata
    investigation_timeline: List[Dict[str, Any]] = Field(
        default_factory=list, description="Timeline of investigation events"
    )

    performance_metrics: Dict[str, Any] = Field(
        default_factory=dict, description="Performance metrics for investigation"
    )

    agent_coordination: Dict[str, Any] = Field(
        default_factory=dict, description="Agent coordination and orchestration details"
    )

    # Timestamps
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = Field(default=None)
    total_duration_ms: Optional[int] = Field(default=None)

    # WebSocket and monitoring
    websocket_url: Optional[str] = Field(
        default=None, description="WebSocket URL for real-time updates"
    )
    monitoring_endpoints: Dict[str, str] = Field(
        default_factory=dict, description="Monitoring endpoint URLs"
    )


class MultiEntityInvestigationStatus(BaseModel):
    """Status response for multi-entity investigation"""

    investigation_id: str = Field(..., description="Investigation identifier")
    status: str = Field(..., description="Current status")
    current_phase: str = Field(..., description="Current investigation phase")
    progress_percentage: float = Field(
        default=0.0, ge=0.0, le=100.0, description="Overall progress"
    )

    entity_progress: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Progress per entity (entity_id -> progress info)",
    )

    agent_status: Dict[str, str] = Field(
        default_factory=dict, description="Status of each agent type"
    )

    findings_summary: Dict[str, Any] = Field(
        default_factory=dict, description="Summary of findings so far"
    )

    investigation_timeline: List[Dict[str, Any]] = Field(
        default_factory=list, description="Investigation timeline"
    )

    performance_metrics: Dict[str, Any] = Field(
        default_factory=dict, description="Performance metrics"
    )

    estimated_completion_time_ms: Optional[int] = Field(default=None)
    last_updated: datetime = Field(default_factory=datetime.now)


class BooleanQueryParser(BaseModel):
    """Parser for boolean logic expressions in multi-entity investigations"""

    expression: str = Field(..., description="Boolean expression to parse")
    entity_mapping: Dict[str, str] = Field(
        ..., description="Entity variable to ID mapping"
    )

    def parse(self) -> Dict[str, Any]:
        """Parse boolean expression into execution tree"""
        from typing import List, Union

        try:
            # Normalize expression
            normalized_expr = self._normalize_expression(self.expression)

            # Tokenize expression
            tokens = self._tokenize(normalized_expr)

            # Parse tokens into AST
            ast = self._parse_tokens(tokens)

            # Validate entity references
            self._validate_entities(ast)

            return {
                "parsed": True,
                "expression": self.expression,
                "normalized_expression": normalized_expr,
                "tokens": tokens,
                "ast": ast,
                "entity_mapping": self.entity_mapping,
                "valid": True,
            }

        except Exception as e:
            return {
                "parsed": False,
                "expression": self.expression,
                "entity_mapping": self.entity_mapping,
                "error": str(e),
                "valid": False,
            }

    def _normalize_expression(self, expr: str) -> str:
        """Normalize boolean expression"""
        # Convert to uppercase and clean whitespace
        normalized = re.sub(r"\s+", " ", expr.strip().upper())

        # Replace entity IDs with placeholders for easier parsing
        for entity_var, entity_id in self.entity_mapping.items():
            normalized = normalized.replace(entity_id.upper(), entity_var.upper())

        return normalized

    def _tokenize(self, expr: str) -> List[str]:
        """Tokenize normalized expression into operators and operands"""
        # Define token patterns
        token_pattern = r"(\(|\)|AND|OR|NOT|\w+)"
        tokens = re.findall(token_pattern, expr)

        return [token for token in tokens if token.strip()]

    def _parse_tokens(self, tokens: List[str]) -> Dict[str, Any]:
        """Parse tokens into abstract syntax tree using simple recursive descent"""

        def parse_expression(tokens, start_index=0):
            """Simple expression parser that returns (result, next_index)"""
            return parse_or_expression(tokens, start_index)

        def parse_or_expression(tokens, index):
            left, index = parse_and_expression(tokens, index)

            while index < len(tokens) and tokens[index] == "OR":
                index += 1  # consume OR
                right, index = parse_and_expression(tokens, index)
                left = {
                    "type": "binary_op",
                    "operator": "OR",
                    "left": left,
                    "right": right,
                }

            return left, index

        def parse_and_expression(tokens, index):
            left, index = parse_not_expression(tokens, index)

            while index < len(tokens) and tokens[index] == "AND":
                index += 1  # consume AND
                right, index = parse_not_expression(tokens, index)
                left = {
                    "type": "binary_op",
                    "operator": "AND",
                    "left": left,
                    "right": right,
                }

            return left, index

        def parse_not_expression(tokens, index):
            if index < len(tokens) and tokens[index] == "NOT":
                index += 1  # consume NOT
                operand, index = parse_primary(tokens, index)
                return {
                    "type": "unary_op",
                    "operator": "NOT",
                    "operand": operand,
                }, index

            return parse_primary(tokens, index)

        def parse_primary(tokens, index):
            if index >= len(tokens):
                raise ValueError("Unexpected end of expression")

            token = tokens[index]

            if token == "(":
                index += 1  # consume (
                expr, index = parse_or_expression(tokens, index)

                if index >= len(tokens) or tokens[index] != ")":
                    raise ValueError("Missing closing parenthesis")

                index += 1  # consume )
                return expr, index

            elif token in self.entity_mapping or token.upper() in [
                k.upper() for k in self.entity_mapping.keys()
            ]:
                index += 1  # consume entity
                entity_key = next(
                    (
                        k
                        for k in self.entity_mapping.keys()
                        if k.upper() == token.upper()
                    ),
                    token,
                )
                return {
                    "type": "entity",
                    "entity_variable": entity_key,
                    "entity_id": self.entity_mapping.get(entity_key, token),
                }, index

            else:
                raise ValueError(f"Unexpected token: {token}")

        # Parse the expression
        result, final_index = parse_expression(tokens)

        if final_index < len(tokens):
            raise ValueError(f"Unexpected token: {tokens[final_index]}")

        return result

    def _validate_entities(self, ast: Dict[str, Any]) -> None:
        """Validate that all entities in AST exist in entity mapping"""

        def validate_node(node):
            if isinstance(node, dict):
                if node.get("type") == "entity":
                    entity_var = node.get("entity_variable")
                    if entity_var not in self.entity_mapping:
                        raise ValueError(f"Unknown entity variable: {entity_var}")

                # Recursively validate child nodes
                for key, value in node.items():
                    if key in ["left", "right", "operand"]:
                        validate_node(value)

        validate_node(ast)

    def evaluate(self, entity_results: Dict[str, bool]) -> bool:
        """
        Evaluate boolean expression given entity results.

        Args:
            entity_results: Dict mapping entity_id to boolean investigation result

        Returns:
            Boolean result of expression evaluation
        """
        parse_result = self.parse()
        if not parse_result.get("valid"):
            raise ValueError(f"Invalid expression: {parse_result.get('error')}")

        ast = parse_result["ast"]
        return self._evaluate_node(ast, entity_results)

    def _evaluate_node(
        self, node: Dict[str, Any], entity_results: Dict[str, bool]
    ) -> bool:
        """Recursively evaluate AST node"""
        node_type = node.get("type")

        if node_type == "entity":
            entity_id = node.get("entity_id")
            return entity_results.get(entity_id, False)

        elif node_type == "binary_op":
            operator = node.get("operator")
            left_result = self._evaluate_node(node["left"], entity_results)
            right_result = self._evaluate_node(node["right"], entity_results)

            if operator == "AND":
                return left_result and right_result
            elif operator == "OR":
                return left_result or right_result
            else:
                raise ValueError(f"Unknown binary operator: {operator}")

        elif node_type == "unary_op":
            operator = node.get("operator")
            operand_result = self._evaluate_node(node["operand"], entity_results)

            if operator == "NOT":
                return not operand_result
            else:
                raise ValueError(f"Unknown unary operator: {operator}")

        else:
            raise ValueError(f"Unknown node type: {node_type}")
