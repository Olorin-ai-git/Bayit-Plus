/**
 * Admin Dashboard Service
 *
 * REFACTORED: Now uses orchestrator pattern with specialized services
 * Maintains backward compatibility while following 200-line compliance
 *
 * @author Gil Klainert
 * @version 2.0.0
 */

import type {
  AdminDashboardState,
  AdminDashboardConfig,
  AdminDashboardData,
  SystemOverviewData
} from '../types/dashboard.types';
import { SystemStatus, RealtimeConnectionStatus } from '../types/dashboard.types';
import { DashboardDataAggregator } from './dashboard-data-aggregator.service';
import { DashboardPermissionValidator } from './dashboard-permission-validator.service';
import { DashboardRealtimeManager } from './dashboard-realtime-manager.service';
import { EnhancedServiceConfig, LoggerFactory } from '@cvplus/core';

export class AdminDashboardService {
  private isInitialized = false;
  private dataAggregator: DashboardDataAggregator;
  private permissionValidator: DashboardPermissionValidator;
  private realtimeManager: DashboardRealtimeManager;
  private logger = LoggerFactory.getLogger('AdminDashboardService');

  constructor() {
    const config: EnhancedServiceConfig = {
      name: 'AdminDashboardService',
      version: '2.0.0'
    };

    this.dataAggregator = new DashboardDataAggregator(config);
    this.permissionValidator = new DashboardPermissionValidator(config);
    this.realtimeManager = new DashboardRealtimeManager(config);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('AdminDashboardService already initialized');
      return;
    }

    try {
      // Initialize all service components
      await Promise.all([
        this.dataAggregator.initialize(),
        this.permissionValidator.initialize(),
        this.realtimeManager.initialize()
      ]);

      this.isInitialized = true;
      this.logger.info('AdminDashboardService initialized successfully with all components');
    } catch (error) {
      this.logger.error('Failed to initialize AdminDashboardService', { error });
      throw error;
    }
  }

  /**
   * Cleanup the service
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('AdminDashboardService not initialized, nothing to cleanup');
      return;
    }

    try {
      // Cleanup all service components
      await Promise.all([
        this.dataAggregator.cleanup(),
        this.permissionValidator.cleanup(),
        this.realtimeManager.cleanup()
      ]);

      this.isInitialized = false;
      this.logger.info('AdminDashboardService cleanup completed for all components');
    } catch (error) {
      this.logger.error('Error during AdminDashboardService cleanup', { error });
      throw error;
    }
  }

  /**
   * Initialize admin dashboard with user permissions and configuration
   */
  async initializeDashboard(
    adminUserId: string,
    dashboardConfig: AdminDashboardConfig
  ): Promise<AdminDashboardState> {
    // Validate admin permissions first
    const hasPermission = await this.permissionValidator.validatePermission(adminUserId, 'canAccessDashboard');
    const permissions = await this.permissionValidator.getAdminPermissions(adminUserId);
    if (!hasPermission) {
      throw new Error('Insufficient permissions to access admin dashboard');
    }

    // Get real dashboard data
    const dashboardData = await this.dataAggregator.aggregateData(permissions, dashboardConfig);

    // Setup real-time updates
    const realtimeConfig = await this.realtimeManager.setupUpdates(adminUserId, dashboardConfig.realtimeModules || []);
    return {
      id: `dashboard-${adminUserId}`,
      adminUser: adminUserId,
      permissions,
      data: dashboardData,
      alerts: [],
      quickActions: [],
      realtimeConfig,
      lastUpdated: new Date(),
      config: dashboardConfig
    };
  }

  /**
   * Get system overview for admin dashboard
   */
  async getSystemOverview(adminUserId: string): Promise<SystemOverviewData> {
    // Validate permissions
    const permissions = await this.permissionValidator.getAdminPermissions(adminUserId);
    if (!permissions.canViewAnalytics && !permissions.canMonitorSystem) {
      throw new Error('Insufficient permissions to view system overview');
    }

    // Get real system overview data
    const systemData = await this.dataAggregator.getSystemOverview(permissions);
    return systemData;
  }

  /**
   * Refresh dashboard data
   */
  async refreshDashboard(adminUserId: string): Promise<AdminDashboardData> {
    // Clear cache and get fresh data
    // Clear cache functionality handled internally by data aggregator
    const permissions = await this.permissionValidator.getAdminPermissions(adminUserId);

    // Get refreshed dashboard data
    const dashboardData = await this.dataAggregator.aggregateData(permissions, {
      layout: 'GRID' as any,
      refreshInterval: 30000,
      realtimeModules: [],
      widgetConfiguration: [],
      filters: {
        timeRange: {
          preset: 'last_day',
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          end: new Date()
        }
      },
      customization: {
        theme: 'light' as const,
        colorScheme: 'default',
        showGrid: true,
        compactMode: false,
        animations: true,
        autoRefresh: true,
        exportFormats: ['csv', 'pdf']
      }
    });
    return dashboardData;
  }

  /**
   * Subscribe to real-time dashboard updates
   */
  subscribeToUpdates(
    adminUserId: string,
    callback: (data: any) => void
  ): () => void {
    return this.realtimeManager.subscribe(adminUserId, callback);
  }

  /**
   * Perform quick action
   */
  async executeQuickAction(
    adminUserId: string,
    actionType: string,
    parameters: any
  ): Promise<any> {
    // Validate permissions for the specific action
    const permissions = await this.permissionValidator.getAdminPermissions(adminUserId);

    // Execute action through data aggregator
    return this.dataAggregator.executeQuickAction(actionType, parameters, permissions);
  }
}

export default AdminDashboardService;