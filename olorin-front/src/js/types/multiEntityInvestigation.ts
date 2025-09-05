import { RiskAssessment } from './RiskAssessment';
import { Investigation } from './investigation';

// Entity Types supported in multi-entity investigations
export enum EntityType {
  USER = 'user',
  DEVICE = 'device',
  LOCATION = 'location',
  NETWORK = 'network',
  ACCOUNT = 'account',
  TRANSACTION = 'transaction',
  TIMESTAMP = 'timestamp',
  EVENT = 'event',
  TRANSACTION_ID = 'transaction_id',
  REQUEST = 'request',
  USER_IDENTITY = 'user_identity',
  AUTHORIZATION = 'authorization',
  CURRENCY = 'currency',
  MERCHANT_CATEGORY = 'merchant_category',
  DATETIME_PATTERN = 'datetime_pattern',
  SEQUENCE = 'sequence',
  BATCH = 'batch',
  BUSINESS_RULE = 'business_rule',
  COMPLIANCE_STATUS = 'compliance_status',
  REVIEW_QUEUE = 'review_queue'
}

// Entity relationship types
export enum RelationshipType {
  INITIATED = 'initiated',
  OCCURRED_AT = 'occurred_at',
  ASSOCIATED_WITH = 'associated_with',
  OWNS = 'owns',
  USES = 'uses',
  LOCATED_IN = 'located_in',
  PROCESSED_BY = 'processed_by',
  BELONGS_TO = 'belongs_to'
}

// Boolean logic operators
export enum BooleanOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT'
}

// Entity for multi-entity investigations
export interface EntityDefinition {
  entity_id: string;
  entity_type: EntityType;
  display_name?: string;
  attributes?: Record<string, any>;
}

// Relationship between entities
export interface EntityRelationship {
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  strength: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

// Multi-entity investigation request
export interface MultiEntityInvestigationRequest {
  investigation_id: string;
  entities: EntityDefinition[];
  relationships: EntityRelationship[];
  boolean_logic: string;
  investigation_scope: string[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

// Cross-entity analysis results
export interface CrossEntityAnalysis {
  patterns_detected: EntityPattern[];
  relationship_insights: RelationshipInsight[];
  risk_correlations: RiskCorrelation[];
  timeline_reconstruction: TimelineEvent[];
  anomaly_summary: string;
  confidence_score: number;
}

// Entity pattern detected across multiple entities
export interface EntityPattern {
  pattern_id: string;
  pattern_type: string;
  description: string;
  entities_involved: string[];
  confidence: number;
  risk_level: number;
  supporting_evidence: string[];
}

// Relationship insight between entities
export interface RelationshipInsight {
  insight_id: string;
  source_entity: string;
  target_entity: string;
  relationship_strength: number;
  risk_impact: number;
  description: string;
  confidence: number;
}

// Risk correlation between entities
export interface RiskCorrelation {
  correlation_id: string;
  entities: string[];
  correlation_strength: number;
  risk_amplification: number;
  description: string;
  evidence: string[];
}

// Timeline event for cross-entity analysis
export interface TimelineEvent {
  timestamp: string;
  event_type: string;
  entities_involved: string[];
  description: string;
  risk_impact: number;
}

// Multi-entity risk assessment
export interface MultiEntityRiskAssessment {
  overall_risk_score: number;
  risk_distribution: Record<string, number>;
  high_risk_entities: string[];
  risk_factors: string[];
  confidence: number;
  summary: string;
  recommendations: string[];
}

// Investigation result for a single entity
export interface EntityInvestigationResult {
  entity_id: string;
  entity_type: EntityType;
  investigation_result: Investigation;
  risk_assessment: RiskAssessment;
  agent_responses: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

// Complete multi-entity investigation result
export interface MultiEntityInvestigationResult {
  investigation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  entities: EntityDefinition[];
  entity_results: Record<string, EntityInvestigationResult>;
  cross_entity_analysis: CrossEntityAnalysis;
  overall_risk_assessment: MultiEntityRiskAssessment;
  investigation_timeline: TimelineEvent[];
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

// Multi-entity investigation status update
export interface MultiEntityInvestigationStatusUpdate {
  investigation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  current_entity?: string;
  entities_completed: string[];
  entities_remaining: string[];
  progress_percentage: number;
  message: string;
  timestamp: string;
}

// WebSocket event for multi-entity investigations
export interface MultiEntityInvestigationEvent {
  type: 'entity_started' | 'entity_completed' | 'entity_failed' | 'cross_analysis_started' | 'investigation_completed' | 'status_update';
  investigation_id: string;
  entity_id?: string;
  data: any;
  timestamp: string;
}

// Boolean query builder node
export interface BooleanQueryNode {
  id: string;
  type: 'entity' | 'operator' | 'group';
  value?: EntityDefinition | BooleanOperator;
  children?: BooleanQueryNode[];
  parentId?: string;
}

// Investigation configuration
export interface MultiEntityInvestigationConfig {
  max_entities: number;
  supported_entity_types: EntityType[];
  supported_relationship_types: RelationshipType[];
  default_investigation_scope: string[];
  timeout_ms: number;
}