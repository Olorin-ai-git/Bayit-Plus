/**
 * Content Moderation Types
 * 
 * Types for content moderation functionality in the admin dashboard.
  */

// ============================================================================
// Content Moderation Core Types
// ============================================================================

export interface ModerationQueue {
  id: string;
  name: string;
  description: string;
  filters: ModerationFilters;
  priority: ModerationPriority;
  assignedModerators: string[];
  automationRules: AutomationRule[];
  statistics: QueueStatistics;
  isActive: boolean;
}

export interface ModerationFilters {
  contentTypes: ContentType[];
  sources: ContentSource[];
  riskLevels: RiskLevel[];
  languages: string[];
  userSegments: string[];
  keywords: string[];
  dateRange?: DateRange;
}

export enum ContentType {
  CV_PROFILE = 'cv_profile',
  PUBLIC_PROFILE = 'public_profile',
  USER_CONTENT = 'user_content',
  MEDIA_UPLOAD = 'media_upload',
  COMMENTS = 'comments',
  MESSAGES = 'messages',
  TESTIMONIALS = 'testimonials',
  PORTFOLIO_ITEMS = 'portfolio_items'
}

export enum ContentSource {
  USER_GENERATED = 'user_generated',
  IMPORTED = 'imported',
  AI_GENERATED = 'ai_generated',
  BULK_UPLOAD = 'bulk_upload',
  API_SUBMISSION = 'api_submission'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ModerationPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface QueueStatistics {
  totalItems: number;
  pendingReview: number;
  inProgress: number;
  completedToday: number;
  averageProcessingTime: number;
  backlogHours: number;
  slaCompliance: number;
}

// ============================================================================
// Content Items & Reviews
// ============================================================================

export interface ModerationItem {
  id: string;
  contentId: string;
  contentType: ContentType;
  content: ModeratableContent;
  submittedBy: string;
  submittedAt: Date;
  source: ContentSource;
  metadata: ContentMetadata;
  automatedReview: AutomatedReviewResult;
  humanReviews: HumanReview[];
  currentStatus: ModerationStatus;
  priority: ModerationPriority;
  queueId: string;
  assignedModerator?: string;
  assignedAt?: Date;
  deadlineAt?: Date;
  flags: ContentFlag[];
  appeals: ContentAppeal[];
  history: ModerationHistoryEntry[];
}

export interface ModeratableContent {
  type: ContentType;
  data: any;
  text?: string;
  images?: string[];
  videos?: string[];
  audio?: string[];
  documents?: string[];
  links?: string[];
  metadata?: Record<string, any>;
}

export interface ContentMetadata {
  userId: string;
  userTier: string;
  userRiskScore: number;
  ipAddress?: string;
  userAgent?: string;
  location?: GeoLocation;
  language?: string;
  contentLength: number;
  mediaCount: number;
  externalLinks: number;
  sensitivity: ContentSensitivity;
}

export enum ContentSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  SENSITIVE = 'sensitive',
  CONFIDENTIAL = 'confidential'
}

export interface GeoLocation {
  country: string;
  region?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================================================
// Automated Review System
// ============================================================================

export interface AutomatedReviewResult {
  id: string;
  reviewedAt: Date;
  confidence: number;
  decision: ModerationDecision;
  reasons: AutomatedReviewReason[];
  scores: ReviewScores;
  flags: AutomatedFlag[];
  requiredHumanReview: boolean;
  riskAssessment: RiskAssessment;
  processingTime: number;
}

export interface AutomatedReviewReason {
  type: ReasonType;
  description: string;
  severity: number;
  confidence: number;
  details?: Record<string, any>;
}

export enum ReasonType {
  SPAM_DETECTION = 'spam_detection',
  PROFANITY_FILTER = 'profanity_filter',
  CONTENT_QUALITY = 'content_quality',
  POLICY_VIOLATION = 'policy_violation',
  DUPLICATE_CONTENT = 'duplicate_content',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MALWARE_DETECTION = 'malware_detection',
  COPYRIGHT_VIOLATION = 'copyright_violation'
}

export interface ReviewScores {
  overallScore: number;
  qualityScore: number;
  safetyScore: number;
  authenticityScore: number;
  professionalismScore: number;
  completenessScore: number;
}

export interface AutomatedFlag {
  type: FlagType;
  severity: FlagSeverity;
  description: string;
  details: FlagDetails;
  autoResolvable: boolean;
}

export enum FlagType {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  FALSE_INFORMATION = 'false_information',
  COPYRIGHT_INFRINGEMENT = 'copyright_infringement',
  MALWARE = 'malware',
  PHISHING = 'phishing',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  ADULT_CONTENT = 'adult_content'
}

export enum FlagSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface FlagDetails {
  location?: string;
  matchedPatterns?: string[];
  confidence: number;
  context?: string;
  relatedFlags?: string[];
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  riskFactors: RiskFactor[];
  mitigationSuggestions: string[];
  requiresEscalation: boolean;
}

export interface RiskFactor {
  factor: string;
  impact: RiskImpact;
  likelihood: number;
  description: string;
}

export enum RiskImpact {
  NEGLIGIBLE = 'negligible',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SEVERE = 'severe'
}

// ============================================================================
// Human Review System
// ============================================================================

export interface HumanReview {
  id: string;
  moderatorId: string;
  moderatorName: string;
  reviewedAt: Date;
  decision: ModerationDecision;
  confidence: number;
  timeSpent: number;
  reasoning: string;
  notes?: string;
  tags: string[];
  overridesAutomated: boolean;
  requiresSecondOpinion: boolean;
  escalated: boolean;
  qualityRating?: ReviewQualityRating;
}

export enum ModerationDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  APPROVE_WITH_EDITS = 'approve_with_edits',
  FLAG_FOR_REVIEW = 'flag_for_review',
  ESCALATE = 'escalate',
  PENDING = 'pending',
  REQUIRE_ADDITIONAL_INFO = 'require_additional_info'
}

export enum ReviewQualityRating {
  EXCELLENT = 5,
  GOOD = 4,
  SATISFACTORY = 3,
  NEEDS_IMPROVEMENT = 2,
  POOR = 1
}

export enum ModerationStatus {
  PENDING_AUTOMATED_REVIEW = 'pending_automated_review',
  PENDING_HUMAN_REVIEW = 'pending_human_review',
  IN_HUMAN_REVIEW = 'in_human_review',
  AWAITING_SECOND_OPINION = 'awaiting_second_opinion',
  ESCALATED = 'escalated',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
  APPEALED = 'appealed',
  PERMANENTLY_BANNED = 'permanently_banned'
}

// ============================================================================
// Content Appeals System
// ============================================================================

export interface ContentAppeal {
  id: string;
  contentId: string;
  appealedBy: string;
  appealedAt: Date;
  reason: AppealReason;
  description: string;
  evidence: AppealEvidence[];
  status: AppealStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  decision?: AppealDecision;
  decisionReason?: string;
  processingTime?: number;
}

export enum AppealReason {
  FALSE_POSITIVE = 'false_positive',
  POLICY_MISINTERPRETATION = 'policy_misinterpretation',
  CONTEXT_MISSING = 'context_missing',
  TECHNICAL_ERROR = 'technical_error',
  NEW_EVIDENCE = 'new_evidence',
  CHANGED_CIRCUMSTANCES = 'changed_circumstances'
}

export interface AppealEvidence {
  type: EvidenceType;
  description: string;
  attachments?: string[];
  submittedAt: Date;
}

export enum EvidenceType {
  DOCUMENTATION = 'documentation',
  SCREENSHOT = 'screenshot',
  VIDEO = 'video',
  WITNESS_STATEMENT = 'witness_statement',
  EXPERT_OPINION = 'expert_opinion',
  LEGAL_DOCUMENT = 'legal_document'
}

export enum AppealStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  ADDITIONAL_INFO_REQUIRED = 'additional_info_required',
  APPROVED = 'approved',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn'
}

export enum AppealDecision {
  OVERTURN_ORIGINAL = 'overturn_original',
  UPHOLD_ORIGINAL = 'uphold_original',
  MODIFY_DECISION = 'modify_decision',
  REQUIRE_CHANGES = 'require_changes'
}

// ============================================================================
// Content Flags & Reporting
// ============================================================================

export interface ContentFlag {
  id: string;
  flaggedBy: FlaggedBy;
  flaggedAt: Date;
  type: FlagType;
  severity: FlagSeverity;
  reason: string;
  description?: string;
  status: FlagStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: FlagResolution;
}

export interface FlaggedBy {
  type: 'user' | 'automated' | 'moderator';
  id?: string;
  name?: string;
  system?: string;
}

export enum FlagStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated'
}

export interface FlagResolution {
  action: ResolutionAction;
  reason: string;
  notes?: string;
  followUpRequired: boolean;
}

export enum ResolutionAction {
  NO_ACTION = 'no_action',
  CONTENT_REMOVED = 'content_removed',
  CONTENT_EDITED = 'content_edited',
  USER_WARNING = 'user_warning',
  USER_SUSPENDED = 'user_suspended',
  FALSE_FLAG = 'false_flag'
}

// ============================================================================
// Moderation Rules & Automation
// ============================================================================

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  executionCount: number;
  successRate: number;
}

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'not_in',
  REGEX = 'regex'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export interface RuleAction {
  type: ActionType;
  parameters: Record<string, any>;
  order: number;
}

export enum ActionType {
  AUTO_APPROVE = 'auto_approve',
  AUTO_REJECT = 'auto_reject',
  ASSIGN_QUEUE = 'assign_queue',
  ASSIGN_MODERATOR = 'assign_moderator',
  SET_PRIORITY = 'set_priority',
  ADD_FLAG = 'add_flag',
  SEND_NOTIFICATION = 'send_notification',
  ESCALATE = 'escalate',
  REQUIRE_HUMAN_REVIEW = 'require_human_review'
}

// ============================================================================
// Moderation Analytics & Reporting
// ============================================================================

export interface ModerationAnalytics {
  timeRange: DateRange;
  overview: ModerationOverview;
  performance: ModerationPerformance;
  quality: ModerationQuality;
  trends: ModerationTrends;
  alerts: ModerationAlert[];
}

export interface ModerationOverview {
  totalItemsProcessed: number;
  automatedDecisions: number;
  humanReviews: number;
  averageProcessingTime: number;
  queueBacklog: number;
  slaCompliance: number;
  appealRate: number;
  flagAccuracy: number;
}

export interface ModerationPerformance {
  moderatorStats: ModeratorPerformance[];
  queuePerformance: QueuePerformance[];
  automationEfficiency: AutomationEfficiency;
  resourceUtilization: ResourceUtilization;
}

export interface ModeratorPerformance {
  moderatorId: string;
  name: string;
  itemsReviewed: number;
  averageReviewTime: number;
  accuracy: number;
  consistency: number;
  overturnRate: number;
  productivityScore: number;
  qualityScore: number;
  specializations: ContentType[];
}

export interface QueuePerformance {
  queueId: string;
  name: string;
  throughput: number;
  averageWaitTime: number;
  backlogSize: number;
  slaCompliance: number;
  escalationRate: number;
}

export interface AutomationEfficiency {
  accuracyRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  humanOverrideRate: number;
  processingSpeed: number;
  costSavings: number;
}

export interface ResourceUtilization {
  moderatorCapacity: number;
  queueCapacity: number;
  peakHours: string[];
  bottlenecks: string[];
  recommendations: string[];
}

export interface ModerationQuality {
  overallScore: number;
  consistencyScore: number;
  accuracyTrend: TrendData;
  appealSuccessRate: number;
  userSatisfaction: number;
  policyCompliance: number;
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  dataPoints: TrendDataPoint[];
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
}

export interface ModerationTrends {
  volumeTrend: TrendData;
  qualityTrend: TrendData;
  speedTrend: TrendData;
  flagTrends: FlagTrendData[];
  contentTypeTrends: ContentTypeTrendData[];
}

export interface FlagTrendData {
  flagType: FlagType;
  trend: TrendData;
  seasonality: SeasonalityPattern[];
}

export interface ContentTypeTrendData {
  contentType: ContentType;
  volume: TrendData;
  quality: TrendData;
  riskLevel: TrendData;
}

export interface SeasonalityPattern {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  pattern: number[];
  confidence: number;
}

export interface ModerationAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  relatedItems?: string[];
}

export enum AlertType {
  SLA_BREACH = 'sla_breach',
  QUALITY_DROP = 'quality_drop',
  VOLUME_SPIKE = 'volume_spike',
  ACCURACY_DECLINE = 'accuracy_decline',
  RESOURCE_SHORTAGE = 'resource_shortage',
  POLICY_VIOLATION_SPIKE = 'policy_violation_spike'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// ============================================================================
// Moderation History & Audit
// ============================================================================

export interface ModerationHistoryEntry {
  id: string;
  timestamp: Date;
  action: HistoryAction;
  performedBy: string;
  details: HistoryDetails;
  previousState?: any;
  newState?: any;
}

export enum HistoryAction {
  ITEM_SUBMITTED = 'item_submitted',
  AUTOMATED_REVIEW = 'automated_review',
  ASSIGNED_MODERATOR = 'assigned_moderator',
  HUMAN_REVIEW = 'human_review',
  DECISION_MADE = 'decision_made',
  APPEAL_SUBMITTED = 'appeal_submitted',
  APPEAL_REVIEWED = 'appeal_reviewed',
  STATUS_CHANGED = 'status_changed',
  FLAG_ADDED = 'flag_added',
  FLAG_RESOLVED = 'flag_resolved'
}

export interface HistoryDetails {
  description: string;
  metadata?: Record<string, any>;
  duration?: number;
  notes?: string;
}