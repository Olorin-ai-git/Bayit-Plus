// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsexport interface NetworkingConfiguration {
  profileId: string;
  networkingEnabled: boolean;
  connectionSettings: ConnectionSettings;
  messagingSettings: MessagingSettings;
  endorsementSettings: EndorsementSettings;
  recommendationSettings: RecommendationSettings;
  privacySettings: NetworkingPrivacySettings;
  automationSettings: NetworkingAutomationSettings;
  moderationSettings: ModerationSettings;
}

export interface ConnectionSettings {
  allowDirectConnections: boolean;
  requireConnectionApproval: boolean;
  connectionLimit: number;
  autoAcceptConnections: boolean;
  connectionMessage: boolean;
  customConnectionMessage?: string;
  blockList: string[];
  mutualConnectionsOnly: boolean;
  industryFilters: string[];
  locationFilters: string[];
  experienceLevelFilters: ExperienceLevel[];
}

export interface MessagingSettings {
  allowDirectMessages: boolean;
  requireConnectionForMessages: boolean;
  messageFilterEnabled: boolean;
  spamDetectionEnabled: boolean;
  autoResponderEnabled: boolean;
  autoResponderMessage?: string;
  messageTemplates: MessageTemplate[];
  messageLimit: MessageLimit;
  attachmentSettings: AttachmentSettings;
  messageRetention: number; // days
}

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'introduction' | 'follow_up' | 'collaboration' | 'thank_you' | 'custom';
  tags: string[];
  active: boolean;
}

export interface MessageLimit {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  perConnectionLimit: number;
}

export interface AttachmentSettings {
  allowAttachments: boolean;
  maxFileSize: number; // MB
  allowedFileTypes: string[];
  scanForViruses: boolean;
  requireApproval: boolean;
}

export interface EndorsementSettings {
  allowSkillEndorsements: boolean;
  moderateEndorsements: boolean;
  skillCategories: string[];
  maxEndorsementsPerSkill: number;
  reciprocalEndorsements: boolean;
  endorsementWeight: EndorsementWeight;
  verificationRequired: boolean;
  publicEndorsements: boolean;
}

export interface EndorsementWeight {
  colleague: number;
  manager: number;
  client: number;
  employee: number;
  other: number;
}

export interface RecommendationSettings {
  allowRecommendations: boolean;
  moderateRecommendations: boolean;
  requireApproval: boolean;
  displayLimit: number;
  reciprocalRecommendations: boolean;
  verificationRequired: boolean;
  templateSuggestions: boolean;
  publicRecommendations: boolean;
}

export interface NetworkingPrivacySettings {
  profileVisibility: 'everyone' | 'connections' | 'mutual_connections' | 'nobody';
  contactInfoVisibility: ContactInfoVisibility;
  activityVisibility: ActivityVisibility;
  connectionListVisibility: 'everyone' | 'connections' | 'nobody';
  lastActiveVisibility: boolean;
  readReceiptsEnabled: boolean;
  onlineStatusVisible: boolean;
  blockUnverifiedUsers: boolean;
}

export interface ContactInfoVisibility {
  email: 'everyone' | 'connections' | 'mutual_connections' | 'nobody';
  phone: 'everyone' | 'connections' | 'mutual_connections' | 'nobody';
  social: 'everyone' | 'connections' | 'mutual_connections' | 'nobody';
  location: 'everyone' | 'connections' | 'mutual_connections' | 'nobody';
}

export interface ActivityVisibility {
  connections: boolean;
  endorsements: boolean;
  recommendations: boolean;
  posts: boolean;
  comments: boolean;
  profileUpdates: boolean;
}

export interface NetworkingAutomationSettings {
  autoConnectionAcceptance: AutoConnectionAcceptance;
  smartMessaging: SmartMessaging;
  contentSharing: ContentSharing;
  leadNurturing: LeadNurturing;
}

export interface AutoConnectionAcceptance {
  enabled: boolean;
  criteria: AcceptanceCriteria[];
  customMessage: boolean;
  messageTemplate?: string;
  rateLimiting: boolean;
  dailyLimit: number;
}

export interface AcceptanceCriteria {
  type: 'industry' | 'location' | 'company' | 'title' | 'education' | 'mutual_connections';
  values: string[];
  weight: number;
  required: boolean;
}

export interface SmartMessaging {
  enabled: boolean;
  welcomeMessages: boolean;
  followUpMessages: boolean;
  birthdayMessages: boolean;
  anniversaryMessages: boolean;
  customTriggers: MessageTrigger[];
}

export interface MessageTrigger {
  id: string;
  name: string;
  event: string;
  delay: number; // hours
  template: string;
  conditions: TriggerCondition[];
  active: boolean;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface ContentSharing {
  enabled: boolean;
  autoShare: boolean;
  platforms: string[];
  contentTypes: string[];
  schedulingEnabled: boolean;
  optimalTiming: boolean;
}

export interface LeadNurturing {
  enabled: boolean;
  scoringModel: LeadScoringModel;
  nurturingSequences: NurturingSequence[];
  qualificationCriteria: QualificationCriteria[];
}

export interface LeadScoringModel {
  profileCompleteness: number;
  industryRelevance: number;
  companySize: number;
  jobLevel: number;
  engagement: number;
  mutualConnections: number;
}

export interface NurturingSequence {
  id: string;
  name: string;
  trigger: string;
  steps: NurturingStep[];
  active: boolean;
}

export interface NurturingStep {
  delay: number; // hours
  action: 'message' | 'email' | 'connection_request' | 'endorsement' | 'content_share';
  content: string;
  conditions: NurturingCondition[];
}

export interface NurturingCondition {
  field: string;
  operator: string;
  value: string | number;
}

export interface QualificationCriteria {
  name: string;
  rules: QualificationRule[];
  score: number;
  priority: 'high' | 'medium' | 'low';
}

export interface QualificationRule {
  field: string;
  operator: string;
  value: string | number;
  weight: number;
}

export interface ModerationSettings {
  enabled: boolean;
  autoModeration: boolean;
  humanReview: boolean;
  contentFilters: ContentFilter[];
  reportingEnabled: boolean;
  appealProcess: boolean;
  moderators: string[];
}

export interface ContentFilter {
  type: 'spam' | 'inappropriate' | 'promotional' | 'personal' | 'custom';
  keywords: string[];
  action: 'block' | 'flag' | 'require_approval' | 'auto_respond';
  severity: 'low' | 'medium' | 'high';
}

export interface ConnectionRequest {
  id: string;
  fromProfileId: string;
  toProfileId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
  requestedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
  source: 'direct' | 'suggestion' | 'search' | 'imported' | 'event';
  metadata: ConnectionMetadata;
}

export interface ConnectionMetadata {
  mutualConnections: number;
  industryMatch: boolean;
  locationMatch: boolean;
  companyMatch: boolean;
  educationMatch: boolean;
  skillOverlap: number;
  relevanceScore: number;
}

export interface Connection {
  id: string;
  profileId: string;
  connectedProfileId: string;
  connectionType: ConnectionType;
  relationship: RelationshipType;
  strength: ConnectionStrength;
  establishedAt: Date;
  lastInteractionAt?: Date;
  tags: string[];
  notes: string;
  metadata: ConnectionData;
  status: 'active' | 'inactive' | 'blocked' | 'removed';
}

export type ConnectionType = 
  | 'professional' 
  | 'personal' 
  | 'business' 
  | 'academic' 
  | 'industry' 
  | 'service_provider' 
  | 'client' 
  | 'mentor' 
  | 'mentee' 
  | 'colleague' 
  | 'other';

export type RelationshipType = 
  | 'colleague' 
  | 'manager' 
  | 'direct_report' 
  | 'client' 
  | 'vendor' 
  | 'partner' 
  | 'competitor' 
  | 'peer' 
  | 'mentor' 
  | 'mentee' 
  | 'friend' 
  | 'acquaintance' 
  | 'other';

export type ConnectionStrength = 'weak' | 'medium' | 'strong' | 'very_strong';

export interface ConnectionData {
  interactionCount: number;
  messageCount: number;
  endorsementCount: number;
  recommendationCount: number;
  sharedConnections: number;
  commonInterests: string[];
  collaborationHistory: CollaborationRecord[];
  meetingHistory: MeetingRecord[];
  communicationPreferences: CommunicationPreference[];
}

export interface CollaborationRecord {
  id: string;
  project: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  outcome: string;
  rating?: number;
}

export interface MeetingRecord {
  id: string;
  type: 'in_person' | 'video_call' | 'phone_call' | 'conference' | 'event';
  date: Date;
  duration?: number;
  location?: string;
  notes?: string;
  followUpRequired: boolean;
}

export interface CommunicationPreference {
  method: 'email' | 'phone' | 'messaging' | 'video_call' | 'in_person';
  preference: 'preferred' | 'acceptable' | 'avoid';
  timeZone?: string;
  availability?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  fromProfileId: string;
  toProfileId: string;
  subject?: string;
  content: string;
  messageType: MessageType;
  sentAt: Date;
  readAt?: Date;
  status: MessageStatus;
  attachments: MessageAttachment[];
  replyToId?: string;
  priority: MessagePriority;
  metadata: MessageMetadata;
}

export type MessageType = 'text' | 'rich_text' | 'template' | 'automated' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'archived' | 'deleted' | 'failed';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface MessageAttachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  thumbnailUrl?: string;
  scanStatus: 'pending' | 'clean' | 'infected' | 'failed';
}

export interface MessageMetadata {
  source: 'manual' | 'template' | 'automated' | 'api';
  template?: string;
  automation?: string;
  ipAddress?: string;
  userAgent?: string;
  spamScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  category?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  subject?: string;
  messageCount: number;
  lastMessageAt: Date;
  lastMessageBy: string;
  status: 'active' | 'archived' | 'blocked' | 'deleted';
  tags: string[];
  priority: 'low' | 'normal' | 'high';
  unreadCount: { [profileId: string]: number };
  metadata: ConversationMetadata;
}

export interface ConversationMetadata {
  createdAt: Date;
  lastActivity: Date;
  category?: string;
  project?: string;
  deal?: string;
  customFields: { [key: string]: unknown };
}

export interface Endorsement {
  id: string;
  endorserId: string;
  endorseeId: string;
  skillId: string;
  skill: string;
  message?: string;
  relationship: RelationshipType;
  weight: number;
  endorsedAt: Date;
  status: 'active' | 'pending' | 'declined' | 'revoked';
  isPublic: boolean;
  verificationRequired: boolean;
  verifiedAt?: Date;
}

export interface Recommendation {
  id: string;
  recommenderId: string;
  recommendeeId: string;
  relationship: RelationshipType;
  content: string;
  skills: string[];
  projects?: string[];
  rating?: number;
  recommendedAt: Date;
  status: 'active' | 'pending' | 'declined' | 'revoked';
  isPublic: boolean;
  featured: boolean;
  approvedAt?: Date;
  metadata: RecommendationMetadata;
}

export interface RecommendationMetadata {
  workingRelationshipDuration?: string;
  projectsWorkedTogether?: number;
  wouldRehire?: boolean;
  managerRecommendation?: boolean;
  clientRecommendation?: boolean;
  customQuestions?: { [question: string]: string };
}

export interface NetworkAnalytics {
  profileId: string;
  networkSize: number;
  connectionGrowth: GrowthData[];
  connectionBreakdown: ConnectionBreakdownData;
  networkStrength: NetworkStrengthMetrics;
  influenceMetrics: InfluenceMetrics;
  engagementMetrics: NetworkEngagementMetrics;
  networkHealth: NetworkHealthMetrics;
  opportunityMetrics: OpportunityMetrics;
  reportGeneratedAt: Date;
}

export interface GrowthData {
  period: string;
  newConnections: number;
  lostConnections: number;
  netGrowth: number;
  growthRate: number;
}

export interface ConnectionBreakdownData {
  byType: { [type: string]: number };
  byIndustry: { [industry: string]: number };
  byLocation: { [location: string]: number };
  byCompanySize: { [size: string]: number };
  byExperienceLevel: { [level: string]: number };
  byStrength: { [strength: string]: number };
}

export interface NetworkStrengthMetrics {
  averageStrength: number;
  strongConnections: number;
  weakConnections: number;
  dormantConnections: number;
  activeConnections: number;
  connectionDensity: number;
  clusteringCoefficient: number;
}

export interface InfluenceMetrics {
  networkReach: number;
  secondDegreeConnections: number;
  thirdDegreeConnections: number;
  influenceScore: number;
  authorityScore: number;
  betweennessCentrality: number;
  closenesssCentrality: number;
  eigenvectorCentrality: number;
}

export interface NetworkEngagementMetrics {
  messagesSent: number;
  messagesReceived: number;
  responseRate: number;
  averageResponseTime: number;
  endorsementsGiven: number;
  endorsementsReceived: number;
  recommendationsGiven: number;
  recommendationsReceived: number;
  networkActivity: NetworkActivity[];
}

export interface NetworkActivity {
  type: 'connection' | 'message' | 'endorsement' | 'recommendation' | 'interaction';
  count: number;
  period: string;
  trend: 'up' | 'down' | 'stable';
}

export interface NetworkHealthMetrics {
  healthScore: number;
  diversityScore: number;
  qualityScore: number;
  activityScore: number;
  growthScore: number;
  recommendations: NetworkHealthRecommendation[];
}

export interface NetworkHealthRecommendation {
  category: 'growth' | 'engagement' | 'diversity' | 'quality' | 'activity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  expectedImpact: string;
}

export interface OpportunityMetrics {
  connectionSuggestions: ConnectionSuggestion[];
  networkGaps: NetworkGap[];
  introductionOpportunities: IntroductionOpportunity[];
  collaborationPotential: CollaborationPotential[];
}

export interface ConnectionSuggestion {
  profileId: string;
  name: string;
  title: string;
  company: string;
  relevanceScore: number;
  mutualConnections: number;
  reasonsToConnect: string[];
  industry: string;
  location: string;
  connectionPath: string[];
}

export interface NetworkGap {
  category: 'industry' | 'role' | 'location' | 'skill' | 'company_size';
  description: string;
  impact: 'high' | 'medium' | 'low';
  suggestions: string[];
  targetProfiles: string[];
}

export interface IntroductionOpportunity {
  introduceeId: string;
  introducerConnectionId: string;
  relevanceScore: number;
  reason: string;
  potentialBenefit: string;
  suggested: boolean;
  probability: number;
}

export interface CollaborationPotential {
  profileId: string;
  name: string;
  skillsMatch: string[];
  projectTypes: string[];
  probability: number;
  benefits: string[];
  mutualInterests: string[];
}

export interface NetworkingEvent {
  id: string;
  type: 'connection_request' | 'connection_accepted' | 'message_sent' | 'endorsement_given' | 'recommendation_given';
  profileId: string;
  targetProfileId?: string;
  timestamp: Date;
  metadata: { [key: string]: unknown };
  processed: boolean;
}

export interface NetworkingNotification {
  id: string;
  profileId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  readAt?: Date;
  archived: boolean;
  metadata: { [key: string]: unknown };
}

export type NotificationType = 
  | 'connection_request'
  | 'connection_accepted'
  | 'message_received'
  | 'endorsement_received'
  | 'recommendation_received'
  | 'profile_viewed'
  | 'milestone_reached'
  | 'system_update';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive' | 'c_level';

export interface NetworkingReport {
  profileId: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: NetworkingSummary;
  detailed: DetailedNetworkingMetrics;
  insights: NetworkingInsight[];
  recommendations: NetworkingActionItem[];
  generatedAt: Date;
}

export interface NetworkingSummary {
  totalConnections: number;
  newConnections: number;
  activeConversations: number;
  messagesExchanged: number;
  endorsementsReceived: number;
  networkGrowthRate: number;
  engagementScore: number;
}

export interface DetailedNetworkingMetrics {
  connectionMetrics: ConnectionMetrics;
  messagingMetrics: MessagingMetrics;
  endorsementMetrics: EndorsementMetrics;
  recommendationMetrics: RecommendationMetrics;
  networkQuality: NetworkQualityMetrics;
}

export interface ConnectionMetrics {
  totalConnections: number;
  newConnections: number;
  connectionRequests: {
    sent: number;
    received: number;
    accepted: number;
    declined: number;
    pending: number;
  };
  connectionBreakdown: ConnectionBreakdownData;
  connectionStrength: NetworkStrengthMetrics;
}

export interface MessagingMetrics {
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  responseRate: number;
  averageResponseTime: number;
  activeConversations: number;
  messagesByType: { [type: string]: number };
}

export interface EndorsementMetrics {
  endorsementsGiven: number;
  endorsementsReceived: number;
  skillsEndorsed: { [skill: string]: number };
  endorsementQuality: number;
  reciprocityRate: number;
}

export interface RecommendationMetrics {
  recommendationsGiven: number;
  recommendationsReceived: number;
  averageRating: number;
  recommendationQuality: number;
  reciprocityRate: number;
}

export interface NetworkQualityMetrics {
  qualityScore: number;
  diversityIndex: number;
  strengthDistribution: { [strength: string]: number };
  industryDiversification: number;
  geographicSpread: number;
}

export interface NetworkingInsight {
  category: 'growth' | 'engagement' | 'quality' | 'opportunity' | 'performance';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  trend: 'improving' | 'declining' | 'stable';
  dataPoints: { [key: string]: number | string };
}

export interface NetworkingActionItem {
  priority: 'high' | 'medium' | 'low';
  category: 'connections' | 'messaging' | 'content' | 'engagement' | 'profile';
  title: string;
  description: string;
  steps: string[];
  expectedOutcome: string;
  timeframe: string;
  difficulty: 'easy' | 'medium' | 'hard';
}