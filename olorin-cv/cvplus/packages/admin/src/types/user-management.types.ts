/**
 * User Management Types
 * 
 * Types for user management functionality in the admin dashboard.
  */

// Admin-specific User interface (self-contained for admin module)
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  disabled?: boolean;
  customClaims?: Record<string, any>;
}

interface Subscription {
  id: string;
  userId: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  plan: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
}

// Additional type definitions for missing types
export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SupportTicketSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenue: number;
}

// ============================================================================
// User Management Overview
// ============================================================================

export interface UserManagementOverview {
  statistics: UserManagementStatistics;
  segments: UserSegmentAnalysis[];
  recentActivities: UserActivity[];
  support: SupportTicketSummary;
  subscriptions: SubscriptionAnalytics;
  generatedAt: Date;
  filters: UserManagementFilters;
}

export interface UserManagementStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  suspendedUsers: number;
  deletedUsers: number;
  premiumUsers: number;
  freeUsers: number;
  userGrowthRate: number;
  activationRate: number;
  churnRate: number;
}

export interface UserSegmentAnalysis {
  segment: UserSegment;
  count: number;
  percentage: number;
  growthRate: number;
  averageLifetimeValue: number;
  retentionRate: number;
  characteristics: SegmentCharacteristics;
}

export enum UserSegment {
  NEW_USERS = 'new_users',
  ACTIVE_USERS = 'active_users',
  DORMANT_USERS = 'dormant_users',
  CHURNED_USERS = 'churned_users',
  FREE_USERS = 'free_users',
  PREMIUM_USERS = 'premium_users',
  ENTERPRISE_USERS = 'enterprise_users',
  POWER_USERS = 'power_users',
  AT_RISK_USERS = 'at_risk_users'
}

export interface SegmentCharacteristics {
  averageSessionDuration: number;
  averageFeatureUsage: number;
  commonActions: string[];
  preferredFeatures: string[];
  conversionLikelihood: number;
}

// ============================================================================
// User Management Actions
// ============================================================================

export interface UserManagementAction {
  id: string;
  type: UserActionType;
  targetUserId: string;
  adminUserId: string;
  timestamp: Date;
  parameters: UserActionParameters;
  result: UserManagementResult;
  reason?: string;
  notes?: string;
}

export enum UserActionType {
  VIEW_USER = 'view_user',
  EDIT_USER = 'edit_user',
  SUSPEND_ACCOUNT = 'suspend_account',
  REACTIVATE_ACCOUNT = 'reactivate_account',
  DELETE_ACCOUNT = 'delete_account',
  RESET_PASSWORD = 'reset_password',
  UPDATE_PERMISSIONS = 'update_permissions',
  UPGRADE_SUBSCRIPTION = 'upgrade_subscription',
  DOWNGRADE_SUBSCRIPTION = 'downgrade_subscription',
  CANCEL_SUBSCRIPTION = 'cancel_subscription',
  REFUND_PAYMENT = 'refund_payment',
  MERGE_ACCOUNTS = 'merge_accounts',
  IMPERSONATE_USER = 'impersonate_user',
  SEND_NOTIFICATION = 'send_notification',
  EXPORT_USER_DATA = 'export_user_data'
}

export interface UserActionParameters {
  [key: string]: any;
  // Specific parameter types based on action
  suspensionDuration?: number;
  suspensionReason?: string;
  newPermissions?: string[];
  subscriptionTier?: string;
  refundAmount?: number;
  targetMergeUserId?: string;
  notificationMessage?: string;
  exportFormat?: 'json' | 'csv' | 'pdf';
}

export interface UserManagementResult {
  success: boolean;
  action: UserActionType;
  result?: any;
  error?: string;
  message?: string;
  affectedUserId: string;
  timestamp: Date;
  shouldNotifyUser?: boolean;
}

// ============================================================================
// User Account Management
// ============================================================================

export interface ManagedUser extends User {
  managementInfo: UserManagementInfo;
  securityInfo: UserSecurityInfo;
  billingInfo: UserBillingInfo;
  supportInfo: UserSupportInfo;
  analyticsInfo: UserAnalyticsInfo;
}

export interface UserManagementInfo {
  accountStatus: UserAccountStatus;
  createdAt: Date;
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  source: UserSource;
  referrer?: string;
  lifecycleStage: UserLifecycleStage;
  riskScore: number;
  tags: string[];
  notes: UserNote[];
  assignedSupport?: string;
}

export enum UserAccountStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  DISABLED = 'disabled',
  DELETED = 'deleted',
  FLAGGED = 'flagged'
}

export enum UserSource {
  DIRECT = 'direct',
  GOOGLE = 'google',
  SOCIAL = 'social',
  REFERRAL = 'referral',
  AFFILIATE = 'affiliate',
  PAID_ADS = 'paid_ads',
  ORGANIC_SEARCH = 'organic_search',
  EMAIL_CAMPAIGN = 'email_campaign'
}

export enum UserLifecycleStage {
  TRIAL = 'trial',
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  ENGAGED = 'engaged',
  AT_RISK = 'at_risk',
  DORMANT = 'dormant',
  CHURNED = 'churned',
  REACTIVATED = 'reactivated'
}

export interface UserNote {
  id: string;
  adminUserId: string;
  note: string;
  timestamp: Date;
  type: UserNoteType;
  visibility: UserNoteVisibility;
}

export enum UserNoteType {
  GENERAL = 'general',
  SUPPORT = 'support',
  BILLING = 'billing',
  SECURITY = 'security',
  COMPLIANCE = 'compliance'
}

export enum UserNoteVisibility {
  INTERNAL = 'internal',
  TEAM = 'team',
  SUPPORT_ONLY = 'support_only'
}

// ============================================================================
// User Security Information
// ============================================================================

export interface UserSecurityInfo {
  riskLevel: SecurityRiskLevel;
  lastPasswordChange?: Date;
  mfaEnabled: boolean;
  mfaMethods: MfaMethod[];
  suspiciousActivity: SuspiciousActivity[];
  loginHistory: LoginAttempt[];
  securityEvents: SecurityEvent[];
  ipAddresses: IpAddressInfo[];
  devices: UserDevice[];
}

export enum SecurityRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface MfaMethod {
  type: 'sms' | 'email' | 'app' | 'hardware';
  enabled: boolean;
  lastUsed?: Date;
  backup_codes?: number;
}

export interface SuspiciousActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  riskScore: number;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  details: Record<string, any>;
}

export interface LoginAttempt {
  id: string;
  timestamp: Date;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  mfaUsed: boolean;
  failureReason?: string;
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: Date;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  details: Record<string, any>;
}

export enum SecurityEventType {
  UNUSUAL_LOGIN = 'unusual_login',
  PASSWORD_CHANGE = 'password_change',
  MFA_DISABLED = 'mfa_disabled',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKOUT = 'account_lockout',
  PERMISSION_CHANGE = 'permission_change'
}

export interface IpAddressInfo {
  ipAddress: string;
  lastSeen: Date;
  location?: GeoLocation;
  isSuspicious: boolean;
  isBlocked: boolean;
  firstSeen: Date;
  loginCount: number;
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

export interface UserDevice {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  operatingSystem: string;
  lastUsed: Date;
  isTrusted: boolean;
  fingerprint: string;
}

// ============================================================================
// User Billing Information
// ============================================================================

export interface UserBillingInfo {
  subscription?: Subscription;
  paymentMethods: PaymentMethod[];
  billingHistory: BillingTransaction[];
  invoices: Invoice[];
  totalSpent: number;
  lifetimeValue: number;
  averageMonthlySpending: number;
  paymentRisk: PaymentRiskInfo;
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  isDefault: boolean;
  isValid: boolean;
  addedAt: Date;
}

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay'
}

export interface BillingTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  timestamp: Date;
  description: string;
  paymentMethod?: string;
  refundAmount?: number;
  refundReason?: string;
}

export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
  CREDIT = 'credit',
  ADJUSTMENT = 'adjustment'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  createdAt: Date;
  dueAt: Date;
  paidAt?: Date;
  description: string;
  lineItems: InvoiceLineItem[];
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible'
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentRiskInfo {
  riskLevel: PaymentRiskLevel;
  factors: RiskFactor[];
  lastAssessment: Date;
  score: number;
}

export enum PaymentRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  BLOCKED = 'blocked'
}

export interface RiskFactor {
  factor: string;
  score: number;
  description: string;
}

// ============================================================================
// User Support Information
// ============================================================================

export interface UserSupportInfo {
  supportTier: SupportTier;
  totalTickets: number;
  openTickets: number;
  lastContactAt?: Date;
  satisfactionScore?: number;
  supportHistory: SupportTicket[];
  preferences: SupportPreferences;
  escalationHistory: EscalationEvent[];
}

export enum SupportTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  PRIORITY = 'priority',
  ENTERPRISE = 'enterprise'
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  responseTime?: number;
  resolutionTime?: number;
  satisfactionRating?: number;
  tags: string[];
}

export enum SupportCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  GENERAL = 'general'
}

export enum SupportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated'
}

export interface SupportPreferences {
  preferredContact: ContactMethod;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export enum ContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  CHAT = 'chat',
  SMS = 'sms'
}

export interface EscalationEvent {
  id: string;
  ticketId: string;
  reason: string;
  escalatedBy: string;
  escalatedTo: string;
  escalatedAt: Date;
  resolvedAt?: Date;
  outcome: string;
}

// ============================================================================
// User Analytics Information
// ============================================================================

export interface UserAnalyticsInfo {
  engagementScore: number;
  activityLevel: ActivityLevel;
  usagePatterns: UsagePattern[];
  featureAdoption: FeatureAdoptionInfo[];
  sessionMetrics: SessionMetrics;
  conversionFunnel: ConversionFunnelData[];
  churnRisk: ChurnRiskAnalysis;
  valueSegment: ValueSegment;
}

export enum ActivityLevel {
  INACTIVE = 'inactive',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  POWER_USER = 'power_user'
}

export interface UsagePattern {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface FeatureAdoptionInfo {
  feature: string;
  adopted: boolean;
  adoptionDate?: Date;
  usageFrequency: number;
  proficiency: FeatureProficiency;
}

export enum FeatureProficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface SessionMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  pagesPerSession: number;
  lastSessionAt: Date;
  sessionFrequency: SessionFrequency;
}

export enum SessionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  RARELY = 'rarely'
}

export interface ConversionFunnelData {
  stage: string;
  reached: boolean;
  reachedAt?: Date;
  completionRate: number;
}

export interface ChurnRiskAnalysis {
  riskScore: number;
  riskLevel: ChurnRiskLevel;
  factors: ChurnRiskFactor[];
  predictedChurnDate?: Date;
  confidence: number;
  recommendations: string[];
}

export enum ChurnRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ChurnRiskFactor {
  factor: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export enum ValueSegment {
  LOW_VALUE = 'low_value',
  MEDIUM_VALUE = 'medium_value',
  HIGH_VALUE = 'high_value',
  VIP = 'vip',
  ENTERPRISE = 'enterprise'
}

// ============================================================================
// User Management Filters & Search
// ============================================================================

export interface UserManagementFilters {
  search?: string;
  accountStatus?: UserAccountStatus[];
  userSegment?: UserSegment[];
  subscriptionTier?: string[];
  source?: UserSource[];
  riskLevel?: SecurityRiskLevel[];
  lastActivity?: DateRangeFilter;
  createdDate?: DateRangeFilter;
  lifetimeValue?: NumberRangeFilter;
  supportTier?: SupportTier[];
  tags?: string[];
}

export interface DateRangeFilter {
  start?: Date;
  end?: Date;
  preset?: DatePreset;
}

export enum DatePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom'
}

export interface NumberRangeFilter {
  min?: number;
  max?: number;
}

// ============================================================================
// Bulk Operations
// ============================================================================

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  targetUsers: string[];
  parameters: UserActionParameters;
  initiatedBy: string;
  initiatedAt: Date;
  status: BulkOperationStatus;
  progress: BulkOperationProgress;
  results: BulkOperationResult[];
}

export enum BulkOperationType {
  BULK_SUSPEND = 'bulk_suspend',
  BULK_REACTIVATE = 'bulk_reactivate',
  BULK_DELETE = 'bulk_delete',
  BULK_UPDATE_PERMISSIONS = 'bulk_update_permissions',
  BULK_SEND_NOTIFICATION = 'bulk_send_notification',
  BULK_EXPORT = 'bulk_export',
  BULK_TAG = 'bulk_tag',
  BULK_UNTAG = 'bulk_untag'
}

export enum BulkOperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIALLY_COMPLETED = 'partially_completed'
}

export interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface BulkOperationResult {
  userId: string;
  success: boolean;
  error?: string;
  result?: any;
}