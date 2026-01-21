/**
 * Dashboard Types
 * 
 * Types for the admin dashboard interface, widgets, and data visualization.
  */

import type { AdminUser, AdminPermissions, AdminAlert } from './admin.types';

// ============================================================================
// Dashboard Configuration
// ============================================================================

export interface AdminDashboardState {
  id: string;
  adminUser: string;
  permissions: AdminPermissions;
  data: AdminDashboardData;
  alerts: AdminAlert[];
  quickActions: QuickAction[];
  realtimeConfig: RealtimeConfig;
  lastUpdated: Date;
  config: AdminDashboardConfig;
}

export interface AdminDashboardConfig {
  layout: DashboardLayoutType;
  refreshInterval: number;
  realtimeModules: string[];
  widgetConfiguration: WidgetConfiguration[];
  filters: DashboardFilters;
  customization: DashboardCustomization;
}

export enum DashboardLayoutType {
  GRID = 'grid',
  MASONRY = 'masonry',
  FLUID = 'fluid',
  TABBED = 'tabbed'
}

export interface WidgetConfiguration {
  id: string;
  type: WidgetType;
  position: WidgetPosition;
  size: WidgetDimensions;
  config: WidgetConfig;
  permissions: string[];
  refreshInterval?: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetDimensions {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetConfig {
  title: string;
  showHeader: boolean;
  showControls: boolean;
  allowFullscreen: boolean;
  allowExport: boolean;
  customSettings: Record<string, any>;
}

// ============================================================================
// Dashboard Data Types
// ============================================================================

export interface AdminDashboardData {
  overview: SystemOverviewData;
  modules: AdminModuleData;
}

export interface SystemOverviewData {
  systemHealth: SystemHealthSummary;
  businessMetrics: BusinessMetricsSummary;
  systemMetrics: SystemMetricsSummary;
  recentEvents: RecentSystemEvent[];
  trendsAndInsights: TrendsAndInsights;
}

export interface SystemHealthSummary {
  status: SystemStatus;
  uptime: number;
  averageResponseTime: number;
  errorRate: number;
  activeUsers: number;
  systemLoad: number;
  lastHealthCheck: Date;
  issues: SystemIssue[];
}

export enum SystemStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  MAINTENANCE = 'maintenance'
}

export interface SystemIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  description: string;
  detectedAt: Date;
  estimatedResolution?: Date;
}

export interface BusinessMetricsSummary {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  totalCVsCreated: number;
  dailyActiveUsers: number;
  conversionRate: number;
  churnRate: number;
  monthlyRecurringRevenue: number;
}

export interface SystemMetricsSummary {
  uptime: number;
  responseTime: number;
  errorRate: number;
  resourceUtilization: ResourceUtilization;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  database: number;
}

export interface RecentSystemEvent {
  id: string;
  type: SystemEventType;
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  source: string;
  details?: Record<string, any>;
}

export enum SystemEventType {
  DEPLOYMENT = 'deployment',
  INCIDENT = 'incident',
  MAINTENANCE = 'maintenance',
  ALERT = 'alert',
  USER_ACTIVITY = 'user_activity',
  SYSTEM_CHANGE = 'system_change'
}

export interface TrendsAndInsights {
  userGrowthTrend: TrendData;
  performanceTrend: TrendData;
  errorRateTrend: TrendData;
  revenueGrowthTrend: TrendData;
  insights: BusinessInsight[];
}

export interface TrendData {
  period: string;
  data: TrendDataPoint[];
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface BusinessInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: InsightImpact;
  confidence: number;
  actionItems: string[];
  priority: InsightPriority;
}

export enum InsightType {
  OPPORTUNITY = 'opportunity',
  RISK = 'risk',
  ANOMALY = 'anomaly',
  TREND = 'trend',
  RECOMMENDATION = 'recommendation'
}

export enum InsightImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// ============================================================================
// Admin Module Data
// ============================================================================

export interface AdminModuleData {
  userManagement?: UserManagementData;
  contentModeration?: ContentModerationData;
  systemMonitoring?: SystemMonitoringData;
  analytics?: AnalyticsData;
  security?: SecurityAuditData;
  support?: SupportTicketsData;
}

export interface UserManagementData {
  totalUsers: number;
  newUsersToday: number;
  activeUsers: number;
  suspendedUsers: number;
  premiumUsers: number;
  pendingActions: number;
  recentRegistrations: UserRegistrationData[];
  userSegments: UserSegmentData[];
  userRegistrations?: UserRegistrationData[];
  userJourney?: UserJourneyData[];
}

export interface UserRegistrationData {
  userId: string;
  email: string;
  registeredAt: Date;
  source: string;
  isPremium: boolean;
  status: 'active' | 'pending' | 'suspended';
}

export interface UserSegmentData {
  segment: string;
  count: number;
  percentage: number;
  growth: number;
}

export interface ContentModerationData {
  pendingReviews: number;
  completedToday: number;
  flaggedContent: number;
  averageReviewTime: number;
  moderatorPerformance: ModeratorPerformance[];
  contentTypes: ContentTypeStatistics[];
  contentTrends?: ContentTrendData[];
  totalContent?: number;
  approvalRate?: number;
  escalationRate?: number;
}

export interface ModeratorPerformance {
  moderatorId: string;
  name: string;
  reviewsCompleted: number;
  averageTime: number;
  accuracy: number;
  status: 'active' | 'offline';
}

export interface ContentTypeStatistics {
  type: string;
  total: number;
  approved: number;
  rejected: number;
  flagged: number;
}

export interface SystemMonitoringData {
  systemStatus: SystemStatus;
  alerts: SystemAlert[];
  performance: PerformanceMetrics;
  services: ServiceStatus[];
}

export interface SystemAlert {
  id: string;
  type?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  message?: string;
  timestamp: Date;
  isResolved: boolean;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  resourceUtilization: ResourceUtilization;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  totalRequests?: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  responseTime?: number;
  lastCheck: Date;
  uptime: number;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  revenue: RevenueAnalytics;
  users: UserAnalytics;
  content: ContentAnalytics;
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalUsers: number;
  conversionRate: number;
  churnRate: number;
  averageSessionDuration: number;
  topFeatures: FeatureUsageData[];
  totalEvents?: number;
  uniqueUsers?: number;
  bounceRate?: number;
  pageViews?: number;
  sessionDuration?: number;
}

export interface RevenueAnalytics {
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  lifetimeValue: number;
  revenueGrowth: number;
  churnImpact: number;
  totalRevenue?: number;
  churnRate?: number;
  growthRate?: number;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  engagementScore: number;
  userJourney: UserJourneyData[];
  dailyActiveUsers?: number;
  weeklyActiveUsers?: number;
  monthlyActiveUsers?: number;
  acquisitionRate?: number;
}

export interface UserJourneyData {
  stage: string;
  users: number;
  conversionRate: number;
  averageTime: number;
}

export interface ContentAnalytics {
  totalContent: number;
  approvedContent: number;
  qualityScore: number;
  popularTemplates: TemplateUsageData[];
  contentTrends: ContentTrendData[];
  totalCVsCreated?: number;
  dailyCVCreations?: number;
  popularFeatures?: Array<{ feature: string; usage: number }>;
  templateUsage?: Array<{ template: string; usage: number }>;
  completionRate?: number;
}

export interface FeatureUsageData {
  feature: string;
  usage: number;
  growth: number;
  tier: 'free' | 'premium' | 'enterprise';
}

export interface TemplateUsageData {
  templateId: string;
  name: string;
  usage: number;
  rating: number;
  category: string;
}

export interface ContentTrendData {
  category: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export interface SecurityAuditData {
  securityScore: number;
  activeThreats: number;
  resolvedIncidents: number;
  complianceStatus: ComplianceStatus;
  recentEvents: SecurityEvent[];
  vulnerabilities: SecurityVulnerability[];
  accessAttempts?: number;
}

export interface ComplianceStatus {
  gdpr: 'compliant' | 'partial' | 'non_compliant';
  ccpa: 'compliant' | 'partial' | 'non_compliant';
  sox: 'compliant' | 'partial' | 'non_compliant';
  iso27001: 'compliant' | 'partial' | 'non_compliant';
  soc2?: 'compliant' | 'partial' | 'non_compliant';
  lastAudit: Date;
  nextAudit: Date;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'access' | 'breach' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  source: string;
  resolved: boolean;
}

export interface SecurityVulnerability {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  discoveredAt: Date;
  status: 'open' | 'in_progress' | 'resolved';
  assignee?: string;
}

export interface SupportTicketsData {
  totalTickets: number;
  openTickets: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  ticketsByPriority: TicketPriorityData[];
  ticketsByCategory: TicketCategoryData[];
}

export interface TicketPriorityData {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  count: number;
  averageResolutionTime: number;
}

export interface TicketCategoryData {
  category: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// Widget Types
// ============================================================================

export enum WidgetType {
  METRICS_CARD = 'metrics_card',
  CHART = 'chart',
  TABLE = 'table',
  LIST = 'list',
  MAP = 'map',
  GAUGE = 'gauge',
  PROGRESS = 'progress',
  ALERT_LIST = 'alert_list',
  ACTIVITY_FEED = 'activity_feed',
  QUICK_ACTIONS = 'quick_actions',
  SYSTEM_STATUS = 'system_status',
  PERFORMANCE_MONITOR = 'performance_monitor'
}

export interface MetricsCardWidget {
  type: WidgetType.METRICS_CARD;
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  color?: 'primary' | 'success' | 'warning' | 'error';
}

export interface ChartWidget {
  type: WidgetType.CHART;
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: ChartDataPoint[];
  xAxis?: string;
  yAxis?: string;
  legend?: boolean;
}

export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface TableWidget {
  type: WidgetType.TABLE;
  title: string;
  columns: TableColumn[];
  data: Record<string, any>[];
  pagination?: boolean;
  sorting?: boolean;
  filtering?: boolean;
}

export interface TableColumn {
  key: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'action';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
}

// ============================================================================
// Quick Actions
// ============================================================================

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: AdminQuickActionType;
  parameters?: Record<string, any>;
  permissions: string[];
  category: QuickActionCategory;
  priority: number;
}

export enum AdminQuickActionType {
  CREATE_USER = 'create_user',
  SUSPEND_USER = 'suspend_user',
  APPROVE_CONTENT = 'approve_content',
  REJECT_CONTENT = 'reject_content',
  RESTART_SERVICE = 'restart_service',
  CLEAR_CACHE = 'clear_cache',
  SEND_NOTIFICATION = 'send_notification',
  EXPORT_DATA = 'export_data',
  GENERATE_REPORT = 'generate_report',
  SCHEDULE_MAINTENANCE = 'schedule_maintenance'
}

export enum QuickActionCategory {
  USER_MANAGEMENT = 'user_management',
  CONTENT_MODERATION = 'content_moderation',
  SYSTEM_ADMINISTRATION = 'system_administration',
  ANALYTICS = 'analytics',
  SECURITY = 'security'
}

// ============================================================================
// Real-time Configuration
// ============================================================================

export interface RealtimeConfig {
  enabled: boolean;
  modules: string[];
  updateInterval?: number;
  updateIntervals?: Record<string, number>;
  maxRetries?: number;
  connectionStatus: RealtimeConnectionStatus;
  lastUpdate?: Date;
}

export enum RealtimeConnectionStatus {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// ============================================================================
// Dashboard Filters & Customization
// ============================================================================

export interface DashboardFilters {
  timeRange: TimeRangeFilter;
  userSegment?: UserSegmentFilter;
  contentType?: ContentTypeFilter;
  severity?: SeverityFilter;
  status?: StatusFilter;
}

export interface TimeRangeFilter {
  preset: 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'custom';
  start?: Date;
  end?: Date;
  customRange?: {
    start: Date;
    end: Date;
  };
}

export interface UserSegmentFilter {
  segments: string[];
  includeAnonymous: boolean;
}

export interface ContentTypeFilter {
  types: string[];
  includeSystem: boolean;
}

export interface SeverityFilter {
  levels: ('low' | 'medium' | 'high' | 'critical')[];
}

export interface StatusFilter {
  statuses: string[];
}

export interface DashboardCustomization {
  theme: 'light' | 'dark' | 'system';
  colorScheme: string;
  showGrid: boolean;
  compactMode: boolean;
  animations: boolean;
  autoRefresh: boolean;
  exportFormats: string[];
}