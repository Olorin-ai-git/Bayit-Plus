/**
 * Analytics Types - Real CVPlus Analytics Integration
 *
 * Real analytics types imported from CVPlus analytics module.
 * Provides complete analytics functionality for admin dashboard.
  */

// Import analytics types from admin backend services (where they are actually defined)
import type {
  BusinessMetrics,
  QualityInsights,
  UserBehaviorInsights
} from '../backend/services/analytics-engine.service';

// Admin-specific revenue analytics interface
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

// Re-export for consistency
export type { BusinessMetrics, QualityInsights, UserBehaviorInsights };

// Additional admin-specific analytics interfaces that extend CVPlus types
export interface AdminAnalyticsOverview extends BusinessMetrics {
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  securityMetrics: {
    activeThreats: number;
    blockedAttempts: number;
    securityScore: number;
  };
}

export interface AdminRealtimeMetrics {
  currentActiveUsers: number;
  currentSystemLoad: number;
  realtimeEvents: Array<{
    timestamp: Date;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }>;
}

// Service interfaces for admin analytics functionality
export interface AdminAnalyticsService {
  getBusinessMetrics(timeRange: string): Promise<BusinessMetrics>;
  getQualityInsights(timeRange: string): Promise<QualityInsights>;
  getUserBehaviorInsights(timeRange: string): Promise<UserBehaviorInsights>;
  getRevenueAnalytics(timeRange: string): Promise<RevenueAnalytics>;
  getAdminOverview(timeRange: string): Promise<AdminAnalyticsOverview>;
  getRealtimeMetrics(): Promise<AdminRealtimeMetrics>;
}

// Type aliases for backward compatibility
export type BusinessAnalytics = BusinessMetrics;