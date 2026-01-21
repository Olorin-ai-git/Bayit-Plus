/**
 * Performance Monitor Service
 * 
 * Service for monitoring system performance metrics, provider availability,
 * and generating performance analytics for the admin dashboard.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

export interface SystemPerformanceMetrics {
  timestamp: Date;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  systemUptime: number;
  providerMetrics: Record<string, ProviderMetrics>;
  responseTime?: number;
  totalRequests?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  uptime?: number;
  databaseUptime?: number;
  activeConnections?: number;
  issues?: any[];
}

export interface ProviderMetrics {
  successes: number;
  failures: number;
  averageResponseTime: number;
  availability: number;
  cost: number;
}

export interface PerformanceTrend {
  metric: string;
  period: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
}

// Performance Alert interface for AlertManager integration
export interface PerformanceAlert {
  id: string;
  type: 'performance' | 'availability' | 'quality' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metrics: Record<string, number>;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  provider?: string;
  service?: string;
  resolvedAt?: Date;
}

// System Alert interface for general system alerts
export interface SystemAlert {
  id: string;
  type: 'system' | 'security' | 'performance' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

// Alert Dashboard interface for alert management UI
export interface AlertDashboard {
  activeAlerts: SystemAlert[];
  recentAlerts: SystemAlert[];
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  totalAlerts: number;
  resolvedToday: number;
  averageResolutionTime: number;
  lastUpdated: Date;
}

export class PerformanceMonitorService {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Calculate current system performance metrics
    */
  async calculateSystemMetrics(timeRange: string): Promise<SystemPerformanceMetrics> {
    try {
      const hours = this.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

      // Query performance metrics from the last specified time range
      const metricsQuery = await this.db
        .collection('system_metrics')
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'desc')
        .get();

      if (metricsQuery.empty) {
        return this.getDefaultMetrics();
      }

      // Calculate aggregated metrics
      let totalRequests = 0;
      let successfulRequests = 0;
      let totalResponseTime = 0;
      let errorCount = 0;
      const providerStats: Record<string, any> = {};

      metricsQuery.docs.forEach(doc => {
        const data = doc.data();
        totalRequests += data.totalRequests || 0;
        successfulRequests += data.successfulRequests || 0;
        totalResponseTime += (data.responseTime || 0) * (data.totalRequests || 1);
        errorCount += data.errors || 0;

        // Aggregate provider metrics
        if (data.providers) {
          Object.entries(data.providers).forEach(([providerId, metrics]: [string, any]) => {
            if (!providerStats[providerId]) {
              providerStats[providerId] = {
                successes: 0,
                failures: 0,
                totalResponseTime: 0,
                requestCount: 0,
                cost: 0
              };
            }
            
            providerStats[providerId].successes += metrics.successes || 0;
            providerStats[providerId].failures += metrics.failures || 0;
            providerStats[providerId].totalResponseTime += metrics.responseTime || 0;
            providerStats[providerId].requestCount += metrics.requests || 0;
            providerStats[providerId].cost += metrics.cost || 0;
          });
        }
      });

      // Calculate final metrics
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

      // Calculate provider metrics
      const providerMetrics: Record<string, ProviderMetrics> = {};
      Object.entries(providerStats).forEach(([providerId, stats]: [string, any]) => {
        const totalProviderRequests = stats.successes + stats.failures;
        providerMetrics[providerId] = {
          successes: stats.successes,
          failures: stats.failures,
          averageResponseTime: stats.requestCount > 0 ? stats.totalResponseTime / stats.requestCount : 0,
          availability: totalProviderRequests > 0 ? (stats.successes / totalProviderRequests) : 0,
          cost: stats.cost
        };
      });

      return {
        timestamp: new Date(),
        successRate,
        averageResponseTime,
        errorRate,
        systemUptime: await this.calculateSystemUptime(),
        providerMetrics
      };

    } catch (error) {
      logger.error('Error calculating system metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get performance trends over time
    */
  async getPerformanceTrends(
    hours: number, 
    granularity: '1h' | '6h' | '24h'
  ): Promise<PerformanceTrend[]> {
    try {
      const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      const intervalMs = this.getIntervalMs(granularity);

      // Query metrics data
      const metricsQuery = await this.db
        .collection('system_metrics')
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'asc')
        .get();

      if (metricsQuery.empty) {
        return [];
      }

      // Group data by time intervals
      const groupedData = this.groupDataByInterval(metricsQuery.docs, intervalMs);

      // Generate trends for key metrics
      const trends: PerformanceTrend[] = [
        this.calculateTrend('success_rate', groupedData, hours),
        this.calculateTrend('average_response_time', groupedData, hours),
        this.calculateTrend('error_rate', groupedData, hours)
      ];

      return trends;

    } catch (error) {
      logger.error('Error getting performance trends:', error);
      return [];
    }
  }

  /**
   * Monitor system health and record metrics
    */
  async recordSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.calculateSystemMetrics('1h');
      
      // Store current metrics
      await this.db.collection('system_metrics').add({
        ...metrics,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Check for alerts
      await this.checkPerformanceAlerts(metrics);

    } catch (error) {
      logger.error('Error recording system metrics:', error);
    }
  }

  /**
   * Get system uptime percentage
    */
  private async calculateSystemUptime(): Promise<number> {
    try {
      // Query system status over the last 24 hours
      const startTime = new Date(Date.now() - (24 * 60 * 60 * 1000));
      
      const statusQuery = await this.db
        .collection('system_status')
        .where('timestamp', '>=', startTime)
        .get();

      if (statusQuery.empty) {
        return 99.9; // Default uptime if no data
      }

      let totalChecks = 0;
      let upChecks = 0;

      statusQuery.docs.forEach(doc => {
        const data = doc.data();
        totalChecks++;
        if (data.status === 'up' || data.status === 'healthy') {
          upChecks++;
        }
      });

      return totalChecks > 0 ? (upChecks / totalChecks) * 100 : 99.9;

    } catch (error) {
      logger.error('Error calculating uptime:', error);
      return 99.9;
    }
  }

  /**
   * Check for performance alerts
    */
  private async checkPerformanceAlerts(metrics: SystemPerformanceMetrics): Promise<void> {
    try {
      const alerts = [];

      // Check success rate
      if (metrics.successRate < 95) {
        alerts.push({
          type: 'low_success_rate',
          severity: metrics.successRate < 90 ? 'critical' : 'warning',
          message: `System success rate is ${metrics.successRate.toFixed(2)}%`,
          value: metrics.successRate,
          threshold: 95
        });
      }

      // Check response time
      if (metrics.averageResponseTime > 5000) {
        alerts.push({
          type: 'high_response_time',
          severity: metrics.averageResponseTime > 10000 ? 'critical' : 'warning',
          message: `Average response time is ${metrics.averageResponseTime.toFixed(0)}ms`,
          value: metrics.averageResponseTime,
          threshold: 5000
        });
      }

      // Check error rate
      if (metrics.errorRate > 5) {
        alerts.push({
          type: 'high_error_rate',
          severity: metrics.errorRate > 10 ? 'critical' : 'warning',
          message: `System error rate is ${metrics.errorRate.toFixed(2)}%`,
          value: metrics.errorRate,
          threshold: 5
        });
      }

      // Store alerts if any
      if (alerts.length > 0) {
        await this.db.collection('performance_alerts').add({
          alerts,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metrics: {
            successRate: metrics.successRate,
            averageResponseTime: metrics.averageResponseTime,
            errorRate: metrics.errorRate
          }
        });
      }

    } catch (error) {
      logger.error('Error checking performance alerts:', error);
    }
  }

  /**
   * Helper methods
    */
  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/(\d+)([hd])/);
    if (!match) return 24; // Default to 24 hours
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return unit === 'h' ? value : value * 24;
  }

  private getIntervalMs(granularity: '1h' | '6h' | '24h'): number {
    switch (granularity) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private groupDataByInterval(docs: admin.firestore.QueryDocumentSnapshot[], intervalMs: number): any[] {
    const groups: Record<string, any[]> = {};
    
    docs.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate() || new Date();
      const intervalKey = Math.floor(timestamp.getTime() / intervalMs) * intervalMs;
      
      if (!groups[intervalKey]) {
        groups[intervalKey] = [];
      }
      groups[intervalKey].push(data);
    });

    return Object.entries(groups).map(([timestamp, data]) => ({
      timestamp: new Date(parseInt(timestamp)),
      data
    }));
  }

  private calculateTrend(metric: string, groupedData: any[], hours: number): PerformanceTrend {
    const dataPoints = groupedData.map(group => {
      let value = 0;
      
      switch (metric) {
        case 'success_rate':
          const totalRequests = group.data.reduce((sum: number, d: any) => sum + (d.totalRequests || 0), 0);
          const successfulRequests = group.data.reduce((sum: number, d: any) => sum + (d.successfulRequests || 0), 0);
          value = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
          break;
        case 'average_response_time':
          value = group.data.reduce((sum: number, d: any) => sum + (d.responseTime || 0), 0) / group.data.length;
          break;
        case 'error_rate':
          const totalReqs = group.data.reduce((sum: number, d: any) => sum + (d.totalRequests || 0), 0);
          const errors = group.data.reduce((sum: number, d: any) => sum + (d.errors || 0), 0);
          value = totalReqs > 0 ? (errors / totalReqs) * 100 : 0;
          break;
      }

      return {
        timestamp: group.timestamp,
        value
      };
    });

    // Calculate trend direction and percentage change
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let changePercentage = 0;

    if (dataPoints.length > 1) {
      const firstValue = dataPoints[0].value;
      const lastValue = dataPoints[dataPoints.length - 1].value;
      
      if (firstValue > 0) {
        changePercentage = ((lastValue - firstValue) / firstValue) * 100;
        
        if (Math.abs(changePercentage) > 5) {
          trend = changePercentage > 0 ? 'increasing' : 'decreasing';
        }
      }
    }

    return {
      metric,
      period: `${hours}h`,
      trend,
      changePercentage,
      dataPoints
    };
  }

  private getDefaultMetrics(): SystemPerformanceMetrics {
    return {
      timestamp: new Date(),
      successRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      systemUptime: 0,
      providerMetrics: {}
    };
  }
}