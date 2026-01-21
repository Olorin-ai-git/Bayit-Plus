/**
 * Security Types
 * 
 * Types for security auditing, compliance monitoring, and threat detection.
  */

// ============================================================================
// Security Overview
// ============================================================================

export interface SecurityAuditOverview {
  securityScore: SecurityScore;
  compliance: ComplianceOverview;
  threats: ThreatOverview;
  incidents: IncidentOverview;
  access: AccessOverview;
  vulnerabilities: VulnerabilityOverview;
  auditLogs: AuditLogSummary;
  recommendations: SecurityRecommendation[];
  lastAssessment: Date;
}

export interface IncidentOverview {
  total: number;
  open: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  recent: SecurityIncident[];
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  tags: string[];
}

export interface SecurityScore {
  overall: number; // 0-100
  breakdown: SecurityScoreBreakdown;
  trend: ScoreTrend;
  benchmarks: SecurityBenchmark[];
}

export interface SecurityScoreBreakdown {
  authentication: number;
  authorization: number;
  dataProtection: number;
  networkSecurity: number;
  applicationSecurity: number;
  compliance: number;
  incidentResponse: number;
  monitoring: number;
}

export interface ScoreTrend {
  direction: 'improving' | 'declining' | 'stable';
  changePoints: ScoreChangePoint[];
  projection: ScoreProjection;
}

export interface ScoreChangePoint {
  date: Date;
  score: number;
  reason: string;
  impact: number;
}

export interface ScoreProjection {
  predicted: number;
  confidence: number;
  timeframe: string;
}

export interface SecurityBenchmark {
  category: string;
  ourScore: number;
  industryAverage: number;
  bestPractice: number;
  gap: number;
}

// ============================================================================
// Compliance Management
// ============================================================================

export interface ComplianceOverview {
  frameworks: ComplianceFramework[];
  overallStatus: ComplianceStatus;
  upcomingDeadlines: ComplianceDeadline[];
  recentAudits: ComplianceAudit[];
  gaps: ComplianceGap[];
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  status: ComplianceStatus;
  coverage: number; // percentage
  requirements: ComplianceRequirement[];
  lastAssessment: Date;
  nextAssessment: Date;
  auditor?: string;
  certificate?: ComplianceCertificate;
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  PARTIAL = 'partial',
  NON_COMPLIANT = 'non_compliant',
  PENDING_REVIEW = 'pending_review',
  EXPIRED = 'expired'
}

export interface ComplianceRequirement {
  id: string;
  section: string;
  description: string;
  status: RequirementStatus;
  evidence: Evidence[];
  responsible: string;
  dueDate?: Date;
  lastReview: Date;
  risk: RiskLevel;
}

export enum RequirementStatus {
  IMPLEMENTED = 'implemented',
  PARTIALLY_IMPLEMENTED = 'partially_implemented',
  NOT_IMPLEMENTED = 'not_implemented',
  NOT_APPLICABLE = 'not_applicable',
  UNDER_REVIEW = 'under_review'
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  attachments: string[];
  submittedBy: string;
  submittedAt: Date;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export enum EvidenceType {
  DOCUMENT = 'document',
  SCREENSHOT = 'screenshot',
  POLICY = 'policy',
  PROCEDURE = 'procedure',
  LOG = 'log',
  CERTIFICATE = 'certificate',
  REPORT = 'report'
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  CRITICAL = 'critical'
}

export interface ComplianceDeadline {
  frameworkId: string;
  requirementId: string;
  title: string;
  dueDate: Date;
  daysRemaining: number;
  status: DeadlineStatus;
  priority: Priority;
}

export enum DeadlineStatus {
  ON_TRACK = 'on_track',
  AT_RISK = 'at_risk',
  OVERDUE = 'overdue',
  COMPLETED = 'completed'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ComplianceAudit {
  id: string;
  frameworkId: string;
  auditor: string;
  startDate: Date;
  endDate?: Date;
  status: AuditStatus;
  scope: AuditScope;
  findings: AuditFinding[];
  recommendations: AuditRecommendation[];
  finalReport?: string;
}

export enum AuditStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FOLLOW_UP_REQUIRED = 'follow_up_required'
}

export interface AuditScope {
  areas: string[];
  systems: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
  exclusions?: string[];
}

export interface AuditFinding {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  evidence: string[];
  impact: ImpactLevel;
  likelihood: LikelihoodLevel;
  recommendation: string;
  status: FindingStatus;
  assignee?: string;
  dueDate?: Date;
}

export enum FindingSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FindingCategory {
  ACCESS_CONTROL = 'access_control',
  DATA_PROTECTION = 'data_protection',
  NETWORK_SECURITY = 'network_security',
  APPLICATION_SECURITY = 'application_security',
  PHYSICAL_SECURITY = 'physical_security',
  OPERATIONAL_SECURITY = 'operational_security',
  COMPLIANCE = 'compliance'
}

export enum ImpactLevel {
  NEGLIGIBLE = 'negligible',
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  SEVERE = 'severe'
}

export enum LikelihoodLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum FindingStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ACCEPTED_RISK = 'accepted_risk',
  FALSE_POSITIVE = 'false_positive'
}

export interface AuditRecommendation {
  id: string;
  priority: Priority;
  title: string;
  description: string;
  businessJustification: string;
  estimatedCost: number;
  estimatedEffort: string;
  timeline: string;
  benefits: string[];
  risks: string[];
}

export interface ComplianceGap {
  id: string;
  frameworkId: string;
  requirementId: string;
  title: string;
  description: string;
  currentState: string;
  targetState: string;
  gap: string;
  priority: Priority;
  estimatedEffort: string;
  timeline: string;
  responsible: string;
}

export interface ComplianceCertificate {
  id: string;
  name: string;
  issuer: string;
  issuedDate: Date;
  expiryDate: Date;
  status: CertificateStatus;
  documentUrl?: string;
}

export enum CertificateStatus {
  VALID = 'valid',
  EXPIRED = 'expired',
  EXPIRING_SOON = 'expiring_soon',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended'
}

// ============================================================================
// Threat Detection & Management
// ============================================================================

export interface ThreatOverview {
  activeThreatLevel: ThreatLevel;
  activeThreats: number;
  resolvedThreats: number;
  threatTypes: ThreatTypeStatistics[];
  recentIncidents: ThreatIncident[];
  threatIntelligence: ThreatIntelligence;
}

export enum ThreatLevel {
  GREEN = 'green',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red',
  BLACK = 'black'
}

export interface ThreatTypeStatistics {
  type: ThreatType;
  count: number;
  severity: AverageSeverity;
  trend: TrendDirection;
}

export enum ThreatType {
  MALWARE = 'malware',
  PHISHING = 'phishing',
  DDOS = 'ddos',
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  BRUTE_FORCE = 'brute_force',
  DATA_BREACH = 'data_breach',
  INSIDER_THREAT = 'insider_threat',
  APT = 'apt',
  SOCIAL_ENGINEERING = 'social_engineering'
}

export interface AverageSeverity {
  average: number;
  distribution: SeverityDistribution[];
}

export interface SeverityDistribution {
  severity: FindingSeverity;
  count: number;
  percentage: number;
}

export enum TrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable'
}

export interface ThreatIncident {
  id: string;
  type: ThreatType;
  severity: FindingSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  source: ThreatSource;
  targetSystems: string[];
  impact: IncidentImpact;
  response: IncidentResponse;
  lessons: string[];
}

export enum IncidentStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  MITIGATED = 'mitigated',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export interface ThreatSource {
  type: SourceType;
  location?: GeoLocation;
  attributes: SourceAttributes;
  reputation: SourceReputation;
}

export enum SourceType {
  EXTERNAL = 'external',
  INTERNAL = 'internal',
  UNKNOWN = 'unknown'
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

export interface SourceAttributes {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  domain?: string;
  organization?: string;
}

export interface SourceReputation {
  score: number; // -100 to 100
  sources: ReputationSource[];
  lastUpdated: Date;
}

export interface ReputationSource {
  name: string;
  score: number;
  lastChecked: Date;
}

export interface IncidentImpact {
  confidentiality: ImpactLevel;
  integrity: ImpactLevel;
  availability: ImpactLevel;
  affectedUsers: number;
  affectedSystems: string[];
  dataCompromised: boolean;
  financialImpact?: number;
  reputationalImpact: ImpactLevel;
}

export interface IncidentResponse {
  timeline: ResponseTimeline[];
  team: ResponseTeam[];
  actions: ResponseAction[];
  communications: CommunicationRecord[];
  costs: ResponseCosts;
}

export interface ResponseTimeline {
  timestamp: Date;
  event: string;
  description: string;
  responsible: string;
}

export interface ResponseTeam {
  role: ResponseRole;
  member: string;
  responsibilities: string[];
  contactInfo: ContactInfo;
}

export enum ResponseRole {
  INCIDENT_COMMANDER = 'incident_commander',
  SECURITY_ANALYST = 'security_analyst',
  SYSTEM_ADMINISTRATOR = 'system_administrator',
  LEGAL_COUNSEL = 'legal_counsel',
  PUBLIC_RELATIONS = 'public_relations',
  EXECUTIVE_SPONSOR = 'executive_sponsor'
}

export interface ContactInfo {
  email: string;
  phone?: string;
  alternateContact?: string;
}

export interface ResponseAction {
  id: string;
  action: string;
  description: string;
  status: ActionStatus;
  assignee: string;
  createdAt: Date;
  completedAt?: Date;
  priority: Priority;
  dependencies?: string[];
}

export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked'
}

export interface CommunicationRecord {
  id: string;
  timestamp: Date;
  type: CommunicationType;
  audience: string;
  message: string;
  channel: string;
  sender: string;
}

export enum CommunicationType {
  INTERNAL_UPDATE = 'internal_update',
  STAKEHOLDER_NOTIFICATION = 'stakeholder_notification',
  CUSTOMER_COMMUNICATION = 'customer_communication',
  REGULATORY_REPORT = 'regulatory_report',
  MEDIA_STATEMENT = 'media_statement'
}

export interface ResponseCosts {
  directCosts: number;
  indirectCosts: number;
  totalCosts: number;
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  category: CostCategory;
  amount: number;
  description: string;
}

export enum CostCategory {
  INVESTIGATION = 'investigation',
  REMEDIATION = 'remediation',
  NOTIFICATION = 'notification',
  LEGAL_FEES = 'legal_fees',
  REGULATORY_FINES = 'regulatory_fines',
  BUSINESS_DISRUPTION = 'business_disruption',
  REPUTATION_RECOVERY = 'reputation_recovery'
}

export interface ThreatIntelligence {
  feeds: ThreatFeed[];
  indicators: ThreatIndicator[];
  campaigns: ThreatCampaign[];
  actors: ThreatActor[];
  recommendations: ThreatRecommendation[];
}

export interface ThreatFeed {
  id: string;
  name: string;
  source: string;
  type: FeedType;
  lastUpdate: Date;
  indicators: number;
  confidence: number;
  status: FeedStatus;
}

export enum FeedType {
  IOC = 'ioc',
  YARA_RULES = 'yara_rules',
  SIGNATURES = 'signatures',
  REPUTATION = 'reputation',
  BEHAVIORAL = 'behavioral'
}

export enum FeedStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export interface ThreatIndicator {
  id: string;
  type: IndicatorType;
  value: string;
  confidence: number;
  severity: FindingSeverity;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  context: IndicatorContext;
}

export enum IndicatorType {
  IP_ADDRESS = 'ip_address',
  DOMAIN = 'domain',
  URL = 'url',
  FILE_HASH = 'file_hash',
  EMAIL = 'email',
  USER_AGENT = 'user_agent',
  REGISTRY_KEY = 'registry_key',
  MUTEX = 'mutex'
}

export interface IndicatorContext {
  malwareFamily?: string;
  campaign?: string;
  actor?: string;
  ttp?: string[];
  killChainPhase?: string;
}

export interface ThreatCampaign {
  id: string;
  name: string;
  actor?: string;
  firstSeen: Date;
  lastSeen: Date;
  status: CampaignStatus;
  targets: string[];
  techniques: string[];
  indicators: string[];
  objectives: string[];
}

export enum CampaignStatus {
  ACTIVE = 'active',
  DORMANT = 'dormant',
  CONCLUDED = 'concluded',
  MONITORING = 'monitoring'
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  type: ActorType;
  motivation: string[];
  sophistication: SophisticationLevel;
  countries: string[];
  targets: string[];
  campaigns: string[];
  techniques: string[];
}

export enum ActorType {
  NATION_STATE = 'nation_state',
  CRIMINAL = 'criminal',
  HACKTIVIST = 'hacktivist',
  INSIDER = 'insider',
  SCRIPT_KIDDIE = 'script_kiddie',
  UNKNOWN = 'unknown'
}

export enum SophisticationLevel {
  MINIMAL = 'minimal',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  INNOVATOR = 'innovator'
}

export interface ThreatRecommendation {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  category: RecommendationCategory;
  actionItems: ActionItem[];
  timeline: string;
  cost: number;
  benefits: string[];
}

export enum RecommendationCategory {
  PREVENTION = 'prevention',
  DETECTION = 'detection',
  RESPONSE = 'response',
  RECOVERY = 'recovery',
  TRAINING = 'training'
}

export interface ActionItem {
  id: string;
  description: string;
  responsible: string;
  dueDate?: Date;
  status: ActionStatus;
  dependencies?: string[];
}

// ============================================================================
// Access Control & Monitoring
// ============================================================================

export interface AccessOverview {
  overview: AccessSummary;
  privilegedAccess: PrivilegedAccessSummary;
  recentActivity: AccessActivity[];
  anomalies: AccessAnomaly[];
  policies: AccessPolicy[];
  reviews: AccessReview[];
}

export interface AccessSummary {
  totalUsers: number;
  activeUsers: number;
  privilegedUsers: number;
  serviceAccounts: number;
  orphanedAccounts: number;
  dormantAccounts: number;
  excessivePermissions: number;
}

export interface PrivilegedAccessSummary {
  adminAccounts: number;
  serviceAccounts: number;
  emergencyAccess: number;
  temporaryAccess: number;
  sharedAccounts: number;
  unreviewed: number;
}

export interface AccessActivity {
  id: string;
  userId: string;
  action: AccessAction;
  resource: string;
  timestamp: Date;
  source: AccessSource;
  result: AccessResult;
  risk: RiskLevel;
  context: AccessContext;
}

export enum AccessAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled'
}

export interface AccessSource {
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  device?: DeviceInfo;
}

export interface DeviceInfo {
  id: string;
  type: DeviceType;
  name: string;
  trusted: boolean;
  lastSeen: Date;
}

export enum DeviceType {
  DESKTOP = 'desktop',
  LAPTOP = 'laptop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

export enum AccessResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  BLOCKED = 'blocked',
  CHALLENGED = 'challenged'
}

export interface AccessContext {
  sessionId?: string;
  applicationId?: string;
  apiEndpoint?: string;
  httpMethod?: string;
  requestSize?: number;
  responseSize?: number;
  duration?: number;
}

export interface AccessAnomaly {
  id: string;
  type: AnomalyType;
  userId: string;
  description: string;
  detectedAt: Date;
  severity: FindingSeverity;
  confidence: number;
  status: AnomalyStatus;
  evidence: AnomalyEvidence[];
  investigation?: Investigation;
}

export enum AnomalyType {
  UNUSUAL_LOGIN_TIME = 'unusual_login_time',
  UNUSUAL_LOCATION = 'unusual_location',
  IMPOSSIBLE_TRAVEL = 'impossible_travel',
  UNUSUAL_ACTIVITY_VOLUME = 'unusual_activity_volume',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_RESOURCE_ACCESS = 'suspicious_resource_access',
  CONCURRENT_SESSIONS = 'concurrent_sessions'
}

export enum AnomalyStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  RESOLVED = 'resolved'
}

export interface AnomalyEvidence {
  type: EvidenceType;
  description: string;
  data: any;
  confidence: number;
}

export interface Investigation {
  id: string;
  investigator: string;
  startedAt: Date;
  status: InvestigationStatus;
  findings: string[];
  actions: InvestigationAction[];
  conclusion?: string;
}

export enum InvestigationStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ESCALATED = 'escalated',
  CLOSED = 'closed'
}

export interface InvestigationAction {
  timestamp: Date;
  action: string;
  details: string;
  investigator: string;
}

export interface AccessPolicy {
  id: string;
  name: string;
  type: PolicyType;
  status: PolicyStatus;
  scope: PolicyScope;
  rules: PolicyRule[];
  exceptions: PolicyException[];
  lastReview: Date;
  nextReview: Date;
  owner: string;
  compliance: string[];
}

export enum PolicyType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  PASSWORD = 'password',
  SESSION = 'session',
  API_ACCESS = 'api_access',
  DATA_ACCESS = 'data_access'
}

export enum PolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  DEPRECATED = 'deprecated'
}

export interface PolicyScope {
  users: string[];
  groups: string[];
  resources: string[];
  applications: string[];
}

export interface PolicyRule {
  id: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
}

export interface RuleCondition {
  type: ConditionType;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

export enum ConditionType {
  USER = 'user',
  GROUP = 'group',
  ROLE = 'role',
  RESOURCE = 'resource',
  TIME = 'time',
  LOCATION = 'location',
  DEVICE = 'device',
  RISK_SCORE = 'risk_score'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export interface RuleAction {
  type: ActionType;
  parameters: Record<string, any>;
}

export enum ActionType {
  ALLOW = 'allow',
  DENY = 'deny',
  CHALLENGE = 'challenge',
  LOG = 'log',
  ALERT = 'alert'
}

export interface PolicyException {
  id: string;
  reason: string;
  requestor: string;
  approver: string;
  validFrom: Date;
  validTo: Date;
  conditions: RuleCondition[];
}

export interface AccessReview {
  id: string;
  type: ReviewType;
  scope: ReviewScope;
  status: ReviewStatus;
  startDate: Date;
  endDate?: Date;
  reviewer: string;
  items: ReviewItem[];
  summary: ReviewSummary;
}

export enum ReviewType {
  USER_ACCESS = 'user_access',
  ROLE_ASSIGNMENT = 'role_assignment',
  PRIVILEGED_ACCESS = 'privileged_access',
  SERVICE_ACCOUNT = 'service_account',
  EMERGENCY_ACCESS = 'emergency_access'
}

export interface ReviewScope {
  users?: string[];
  groups?: string[];
  roles?: string[];
  applications?: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
}

export enum ReviewStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export interface ReviewItem {
  id: string;
  subject: string;
  type: ReviewItemType;
  currentAccess: AccessDetails;
  recommendation: ReviewRecommendation;
  decision?: ReviewDecision;
  reviewer?: string;
  reviewedAt?: Date;
  justification?: string;
}

export enum ReviewItemType {
  USER_PERMISSION = 'user_permission',
  ROLE_ASSIGNMENT = 'role_assignment',
  GROUP_MEMBERSHIP = 'group_membership',
  RESOURCE_ACCESS = 'resource_access'
}

export interface AccessDetails {
  resource: string;
  permissions: string[];
  grantedAt: Date;
  grantedBy: string;
  lastUsed?: Date;
  usageFrequency: UsageFrequency;
}

export enum UsageFrequency {
  NEVER = 'never',
  RARELY = 'rarely',
  OCCASIONALLY = 'occasionally',
  FREQUENTLY = 'frequently',
  ALWAYS = 'always'
}

export interface ReviewRecommendation {
  action: RecommendedAction;
  confidence: number;
  reasoning: string;
  riskReduction: number;
}

export enum RecommendedAction {
  RETAIN = 'retain',
  REMOVE = 'remove',
  REDUCE = 'reduce',
  REVIEW_LATER = 'review_later',
  ESCALATE = 'escalate'
}

export interface ReviewDecision {
  action: ReviewAction;
  justification: string;
  effectiveDate: Date;
  nextReview?: Date;
}

export enum ReviewAction {
  APPROVED = 'approved',
  REVOKED = 'revoked',
  MODIFIED = 'modified',
  DEFERRED = 'deferred',
  ESCALATED = 'escalated'
}

export interface ReviewSummary {
  totalItems: number;
  reviewed: number;
  approved: number;
  revoked: number;
  modified: number;
  pending: number;
  riskReduction: number;
}

// ============================================================================
// Vulnerability Management
// ============================================================================

export interface VulnerabilityOverview {
  summary: VulnerabilitySummary;
  categories: VulnerabilityCategory[];
  trending: VulnerabilityTrend[];
  patches: PatchManagement;
  scanning: ScanningStatus;
}

export interface VulnerabilitySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  remediated: number;
  accepted: number;
  falsePositives: number;
  meanTimeToRemediate: number;
}

export interface VulnerabilityCategory {
  category: string;
  count: number;
  severity: AverageSeverity;
  trend: TrendDirection;
}

export interface VulnerabilityTrend {
  vulnerability: string;
  occurrences: number;
  systems: number;
  firstSeen: Date;
  lastSeen: Date;
  trend: TrendDirection;
}

export interface PatchManagement {
  pendingPatches: number;
  availablePatches: number;
  installedPatches: number;
  failedPatches: number;
  patchCompliance: number;
  criticalPatchesPending: number;
  averagePatchTime: number;
}

export interface ScanningStatus {
  lastScan: Date;
  nextScan: Date;
  coverage: number;
  scanningErrors: number;
  scanDuration: number;
  newVulnerabilities: number;
}

// ============================================================================
// Audit Logging
// ============================================================================

export interface AuditLogSummary {
  totalLogs: number;
  logSources: LogSource[];
  recentActivity: AuditLogEntry[];
  retention: LogRetentionInfo;
  integrity: LogIntegrityStatus;
  alerts: LogAlert[];
}

export interface LogSource {
  source: string;
  type: LogSourceType;
  volume: number;
  lastEntry: Date;
  status: LogSourceStatus;
}

export enum LogSourceType {
  APPLICATION = 'application',
  SYSTEM = 'system',
  DATABASE = 'database',
  NETWORK = 'network',
  SECURITY = 'security'
}

export enum LogSourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error'
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  source: string;
  userId?: string;
  action: string;
  resource?: string;
  result: string;
  details: Record<string, any>;
  risk: RiskLevel;
}

export interface LogRetentionInfo {
  policy: string;
  retentionPeriod: number;
  archiveLocation: string;
  complianceRequirements: string[];
}

export interface LogIntegrityStatus {
  verified: boolean;
  lastVerification: Date;
  checksumValidation: boolean;
  tamperingDetected: boolean;
  integrityScore: number;
}

export interface LogAlert {
  id: string;
  type: LogAlertType;
  description: string;
  timestamp: Date;
  severity: FindingSeverity;
  resolved: boolean;
}

export enum LogAlertType {
  MISSING_LOGS = 'missing_logs',
  LOG_TAMPERING = 'log_tampering',
  UNUSUAL_VOLUME = 'unusual_volume',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  SYSTEM_ERROR = 'system_error'
}

export interface SecurityRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: Priority;
  title: string;
  description: string;
  impact: ImpactEstimate;
  implementation: ImplementationGuide;
  compliance: string[];
  timeline: string;
  cost: number;
}

export interface ImpactEstimate {
  securityImprovement: number;
  riskReduction: number;
  complianceImprovement: number;
  operationalImpact: ImpactLevel;
}

export interface ImplementationGuide {
  steps: ImplementationStep[];
  resources: RequiredResource[];
  dependencies: string[];
  risks: ImplementationRisk[];
}

export interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  estimatedTime: string;
  responsible: string;
  deliverables: string[];
}

export interface RequiredResource {
  type: ResourceType;
  description: string;
  quantity: number;
  cost?: number;
}

export enum ResourceType {
  PERSONNEL = 'personnel',
  TECHNOLOGY = 'technology',
  TRAINING = 'training',
  CONSULTANT = 'consultant',
  TOOL = 'tool'
}

export interface ImplementationRisk {
  description: string;
  likelihood: LikelihoodLevel;
  impact: ImpactLevel;
  mitigation: string;
}