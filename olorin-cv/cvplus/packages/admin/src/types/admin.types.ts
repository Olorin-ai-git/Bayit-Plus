/**
 * Admin Interface Types
 *
 * Core administrative types for the CVPlus admin module.
 * Defines interfaces for admin users, permissions, and general admin functionality.
  */

import type { AdminPermissions, AdminLevel } from '../middleware/admin-auth.middleware';

// Use local user interface for admin module
interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
}

// ============================================================================
// Admin User Types
// ============================================================================

export interface AdminUser extends User {
  adminProfile: AdminProfile;
  permissions: AdminPermissions;
  lastAdminActivity: Date;
  adminSessions: AdminSession[];
}

export interface AdminProfile {
  id: string;
  userId: string;
  role: AdminRole;
  level: AdminLevel;
  department?: string;
  manager?: string;
  adminSince: Date;
  specializations: AdminSpecialization[];
  preferences: AdminPreferences;
  certifications: AdminCertification[];
}

export interface AdminSession {
  id: string;
  adminUserId: string;
  startedAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  mfaVerified: boolean;
  isActive: boolean;
}

// ============================================================================
// Admin Permissions & Roles
// ============================================================================

// AdminPermissions is exported from middleware/admin-auth.middleware.ts to avoid conflicts
export type { AdminPermissions } from '../middleware/admin-auth.middleware';

export interface UserManagementPermissions {
  canViewUsers: boolean;
  canEditUsers: boolean;
  canSuspendUsers: boolean;
  canDeleteUsers: boolean;
  canImpersonateUsers: boolean;
  canManageSubscriptions: boolean;
  canProcessRefunds: boolean;
  canMergeAccounts: boolean;
  canExportUserData: boolean;
  canViewUserAnalytics: boolean;
}

export interface ContentModerationPermissions {
  canReviewContent: boolean;
  canApproveContent: boolean;
  canRejectContent: boolean;
  canFlagContent: boolean;
  canHandleAppeals: boolean;
  canConfigureFilters: boolean;
  canViewModerationQueue: boolean;
  canAssignModerators: boolean;
  canExportModerationData: boolean;
}

export interface SystemAdministrationPermissions {
  canViewSystemHealth: boolean;
  canManageServices: boolean;
  canConfigureFeatures: boolean;
  canViewLogs: boolean;
  canManageIntegrations: boolean;
  canDeployUpdates: boolean;
  canManageBackups: boolean;
  canConfigureSecurity: boolean;
}

export interface BillingPermissions {
  canViewBilling: boolean;
  canProcessPayments: boolean;
  canProcessRefunds: boolean;
  canManageSubscriptions: boolean;
  canViewFinancialReports: boolean;
  canConfigurePricing: boolean;
  canManageDisputes: boolean;
  canExportBillingData: boolean;
}

export interface AnalyticsPermissions {
  canViewBasicAnalytics: boolean;
  canViewAdvancedAnalytics: boolean;
  canExportAnalytics: boolean;
  canConfigureAnalytics: boolean;
  canViewCustomReports: boolean;
  canCreateCustomReports: boolean;
  canScheduleReports: boolean;
  canViewRealTimeData: boolean;
}

export interface SecurityPermissions {
  canViewSecurityEvents: boolean;
  canManageSecurityPolicies: boolean;
  canViewAuditLogs: boolean;
  canExportAuditData: boolean;
  canManageAccessControl: boolean;
  canConfigureCompliance: boolean;
  canInvestigateIncidents: boolean;
  canManageSecurityAlerts: boolean;
}

// ============================================================================
// Admin Roles & Levels
// ============================================================================

export enum AdminRole {
  SUPPORT = 'support',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin'
}

// AdminLevel is exported from middleware/admin-auth.middleware.ts to avoid conflicts
export { AdminLevel } from '../middleware/admin-auth.middleware';

export enum AdminSpecialization {
  USER_SUPPORT = 'user_support',
  CONTENT_MODERATION = 'content_moderation',
  TECHNICAL_SUPPORT = 'technical_support',
  BILLING_SUPPORT = 'billing_support',
  SECURITY_ANALYSIS = 'security_analysis',
  DATA_ANALYSIS = 'data_analysis',
  SYSTEM_ADMINISTRATION = 'system_administration',
  COMPLIANCE = 'compliance'
}

// ============================================================================
// Admin Configuration & Preferences
// ============================================================================

export interface AdminPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dashboardLayout: DashboardLayout;
  notificationSettings: AdminNotificationSettings;
  accessibility: AdminAccessibilitySettings;
  defaultViews: AdminDefaultViews;
  shortcuts: Record<string, string>;
}

export interface DashboardLayout {
  layout: 'grid' | 'list' | 'cards';
  columns: number;
  compactMode: boolean;
  showSidebar: boolean;
  sidebarCollapsed: boolean;
  pinnedWidgets: string[];
  widgetSizes: Record<string, WidgetSize>;
}

export interface AdminNotificationSettings {
  email: AdminEmailNotifications;
  push: AdminPushNotifications;
  inApp: AdminInAppNotifications;
  slack: AdminSlackNotifications;
}

export interface AdminEmailNotifications {
  enabled: boolean;
  criticalAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  systemUpdates: boolean;
  securityAlerts: boolean;
}

export interface AdminPushNotifications {
  enabled: boolean;
  criticalAlerts: boolean;
  moderationQueue: boolean;
  supportTickets: boolean;
  systemAlerts: boolean;
}

export interface AdminInAppNotifications {
  enabled: boolean;
  showBadges: boolean;
  playSound: boolean;
  autoMarkRead: boolean;
  persistentAlerts: boolean;
}

export interface AdminSlackNotifications {
  enabled: boolean;
  webhook: string;
  channel: string;
  criticalOnly: boolean;
}

export interface AdminDefaultViews {
  userManagement: UserManagementView;
  contentModeration: ContentModerationView;
  systemMonitoring: SystemMonitoringView;
  analytics: AnalyticsView;
}

export enum UserManagementView {
  TABLE = 'table',
  CARDS = 'cards',
  DETAILED = 'detailed'
}

export enum ContentModerationView {
  QUEUE = 'queue',
  GRID = 'grid',
  TIMELINE = 'timeline'
}

export enum SystemMonitoringView {
  DASHBOARD = 'dashboard',
  METRICS = 'metrics',
  LOGS = 'logs'
}

export enum AnalyticsView {
  OVERVIEW = 'overview',
  DETAILED = 'detailed',
  CUSTOM = 'custom'
}

export enum WidgetSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large'
}

// ============================================================================
// Admin Certifications & Training
// ============================================================================

export interface AdminCertification {
  id: string;
  name: string;
  issuer: string;
  issuedAt: Date;
  expiresAt?: Date;
  verificationUrl?: string;
  level: CertificationLevel;
  area: AdminSpecialization;
  isActive: boolean;
}

export enum CertificationLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

// ============================================================================
// Admin Activity & Audit Types
// ============================================================================

export interface AdminActivity {
  id: string;
  adminUserId: string;
  action: AdminAction;
  resource: string;
  resourceId?: string;
  details: AdminActionDetails;
  result: AdminActionResult;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export enum AdminAction {
  // User Management
  USER_VIEW = 'user:view',
  USER_EDIT = 'user:edit',
  USER_SUSPEND = 'user:suspend',
  USER_UNSUSPEND = 'user:unsuspend',
  USER_DELETE = 'user:delete',
  USER_IMPERSONATE = 'user:impersonate',
  USER_EXPORT = 'user:export',
  
  // Content Moderation
  CONTENT_REVIEW = 'content:review',
  CONTENT_APPROVE = 'content:approve',
  CONTENT_REJECT = 'content:reject',
  CONTENT_FLAG = 'content:flag',
  CONTENT_UNFLAG = 'content:unflag',
  
  // System Administration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MONITOR = 'system:monitor',
  SYSTEM_MAINTENANCE = 'system:maintenance',
  
  // Billing
  BILLING_VIEW = 'billing:view',
  BILLING_REFUND = 'billing:refund',
  BILLING_DISPUTE = 'billing:dispute',
  
  // Security
  SECURITY_AUDIT = 'security:audit',
  SECURITY_INCIDENT = 'security:incident',
  ACCESS_GRANT = 'access:grant',
  ACCESS_REVOKE = 'access:revoke'
}

export interface AdminActionDetails {
  description: string;
  parameters?: Record<string, any>;
  changes?: AdminActionChange[];
  reason?: string;
  notes?: string;
}

export interface AdminActionChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AdminActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  duration?: number;
}

// ============================================================================
// Admin Alerts & Notifications
// ============================================================================

export interface AdminAlert {
  id: string;
  type: AdminAlertType;
  severity: AdminAlertSeverity;
  title: string;
  message: string;
  details?: AdminAlertDetails;
  source: string;
  timestamp: Date;
  isRead: boolean;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  actions: AdminAlertAction[];
}

export enum AdminAlertType {
  SYSTEM = 'system',
  SECURITY = 'security',
  USER = 'user',
  CONTENT = 'content',
  BILLING = 'billing',
  PERFORMANCE = 'performance',
  COMPLIANCE = 'compliance'
}

export enum AdminAlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface AdminAlertDetails {
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
  stackTrace?: string;
}

export interface AdminAlertAction {
  id: string;
  label: string;
  action: string;
  parameters?: Record<string, any>;
  destructive: boolean;
}

// ============================================================================
// Admin Metrics & Statistics
// ============================================================================

export interface AdminMetrics {
  activeAdmins: number;
  totalSessions: number;
  averageSessionDuration: number;
  actionsPerformed: number;
  alertsResolved: number;
  responseTime: AdminResponseTimeMetrics;
  productivity: AdminProductivityMetrics;
}

export interface AdminResponseTimeMetrics {
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  slaCompliance: number;
}

export interface AdminProductivityMetrics {
  actionsPerHour: number;
  issuesResolved: number;
  ticketsProcessed: number;
  contentReviewed: number;
  usersManaged: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface GeoLocation {
  country: string;
  region?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface AdminAccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface AdminConfig {
  maxConcurrentSessions: number;
  sessionTimeout: number;
  mfaRequired: boolean;
  ipWhitelistEnabled: boolean;
  auditRetentionDays: number;
  notificationChannels: string[];
}

export interface AdminModuleInfo {
  name: string;
  version: string;
  permissions: AdminPermissions;
  features: AdminFeature[];
}

export interface AdminFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredLevel: AdminLevel;
  requiredSpecializations: AdminSpecialization[];
}