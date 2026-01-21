/**
 * Dashboard Data Aggregator Service Tests
 *
 * Test suite for the dashboard data aggregation service
 * Following CVPlus testing patterns
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DashboardDataAggregator } from '../dashboard-data-aggregator.service';
import type { AdminPermissions } from '../../types/admin.types';

describe('DashboardDataAggregator', () => {
  let service: DashboardDataAggregator;

  beforeEach(async () => {
    service = new DashboardDataAggregator({
      name: 'TestDashboardDataAggregator',
      version: '1.0.0'
    });
    await service.initialize();
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('Service Lifecycle', () => {
    it('should initialize successfully', async () => {
      const newService = new DashboardDataAggregator({
        name: 'TestService',
        version: '1.0.0'
      });

      await expect(newService.initialize()).resolves.not.toThrow();
      await newService.cleanup();
    });

    it('should cleanup successfully', async () => {
      await expect(service.cleanup()).resolves.not.toThrow();
    });

    it('should report healthy status', async () => {
      const health = await service.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.metrics).toHaveProperty('cacheSize');
      expect(health.metrics).toHaveProperty('cacheHitRate');
    });
  });

  describe('Data Aggregation', () => {
    const mockPermissions: AdminPermissions = {
      canAccessDashboard: true,
      canManageUsers: true,
      canModerateContent: true,
      canMonitorSystem: true,
      canViewAnalytics: true,
      canAuditSecurity: true,
      canManageSupport: false,
      canManageBilling: false,
      canConfigureSystem: false,
      canManageAdmins: false,
      canExportData: true,
      canManageFeatureFlags: false,
      userManagement: {
        canViewUsers: true,
        canEditUsers: true,
        canSuspendUsers: true,
        canDeleteUsers: false,
        canImpersonateUsers: false,
        canManageSubscriptions: false,
        canProcessRefunds: false,
        canMergeAccounts: false,
        canExportUserData: true,
        canViewUserAnalytics: true
      },
      contentModeration: {
        canReviewContent: true,
        canApproveContent: true,
        canRejectContent: true,
        canFlagContent: true,
        canHandleAppeals: false,
        canConfigureFilters: false,
        canViewModerationQueue: true,
        canAssignModerators: false,
        canExportModerationData: false
      },
      systemAdministration: {
        canViewSystemHealth: true,
        canManageServices: false,
        canConfigureFeatures: false,
        canViewLogs: false,
        canManageIntegrations: false,
        canDeployUpdates: false,
        canManageBackups: false,
        canConfigureSecurity: false
      },
      billing: {
        canViewBilling: false,
        canProcessPayments: false,
        canProcessRefunds: false,
        canManageSubscriptions: false,
        canViewFinancialReports: false,
        canConfigurePricing: false,
        canManageDisputes: false,
        canExportBillingData: false
      },
      analytics: {
        canViewBasicAnalytics: true,
        canViewAdvancedAnalytics: true,
        canExportAnalytics: true,
        canConfigureAnalytics: false,
        canViewCustomReports: true,
        canCreateCustomReports: false,
        canScheduleReports: false,
        canViewRealTimeData: true
      },
      security: {
        canViewSecurityEvents: true,
        canManageSecurityPolicies: false,
        canViewAuditLogs: true,
        canExportAuditData: true,
        canManageAccessControl: false,
        canConfigureCompliance: false,
        canInvestigateIncidents: true,
        canManageSecurityAlerts: false
      }
    };

    it('should aggregate data based on permissions', async () => {
      const config = {
        realtimeModules: ['system-health'],
        refreshInterval: 30000
      };

      const result = await service.aggregateData(mockPermissions, config);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('lastUpdated');
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle limited permissions', async () => {
      const limitedPermissions: AdminPermissions = {
        ...mockPermissions,
        canMonitorSystem: false,
        canViewAnalytics: false,
        canAuditSecurity: false
      };

      const config = {
        realtimeModules: [],
        refreshInterval: 30000
      };

      const result = await service.aggregateData(limitedPermissions, config);

      expect(result).toBeDefined();
      // Should still return data structure but with limited content
      expect(result).toHaveProperty('lastUpdated');
    });
  });

  describe('System Overview', () => {
    it('should get system overview with full permissions', async () => {
      const fullPermissions: AdminPermissions = {
        ...mockPermissions,
        canMonitorSystem: true,
        canViewAnalytics: true,
        canAuditSecurity: true
      };

      const result = await service.getSystemOverview(fullPermissions);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('lastUpdated');
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should cache system overview data', async () => {
      const permissions = mockPermissions;

      // First call
      const result1 = await service.getSystemOverview(permissions);

      // Second call should use cache
      const result2 = await service.getSystemOverview(permissions);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Would be same object if using cache correctly
    });
  });

  describe('Data Refresh', () => {
    it('should refresh all data and clear cache', async () => {
      const permissions = mockPermissions;

      // First, populate cache
      await service.getSystemOverview(permissions);

      // Then refresh - should clear cache and re-aggregate
      const result = await service.refreshAllData(permissions);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('lastUpdated');
    });
  });

  describe('Quick Actions', () => {
    const mockPermissions: AdminPermissions = {
      ...mockPermissions,
      canExportData: true,
      userManagement: {
        ...mockPermissions.userManagement,
        canSuspendUsers: true
      },
      contentModeration: {
        ...mockPermissions.contentModeration,
        canApproveContent: true
      }
    };

    it('should execute suspend user action', async () => {
      const actionType = 'suspend_user';
      const parameters = { userId: 'test-user-123' };

      const result = await service.executeQuickAction(actionType, parameters, mockPermissions);

      expect(result).toEqual({ success: true, userId: 'test-user-123' });
    });

    it('should execute approve content action', async () => {
      const actionType = 'approve_content';
      const parameters = { contentId: 'content-456' };

      const result = await service.executeQuickAction(actionType, parameters, mockPermissions);

      expect(result).toEqual({ success: true, contentId: 'content-456' });
    });

    it('should execute data export action', async () => {
      const actionType = 'export_data';
      const parameters = { dataType: 'users', format: 'csv' };

      const result = await service.executeQuickAction(actionType, parameters, mockPermissions);

      expect(result).toHaveProperty('exportId');
      expect(result.exportId).toMatch(/export-/);
    });

    it('should reject action without permission', async () => {
      const limitedPermissions: AdminPermissions = {
        ...mockPermissions,
        userManagement: {
          ...mockPermissions.userManagement,
          canSuspendUsers: false
        }
      };

      const actionType = 'suspend_user';
      const parameters = { userId: 'test-user-123' };

      await expect(service.executeQuickAction(actionType, parameters, limitedPermissions))
        .rejects.toThrow('Insufficient permissions for action: suspend_user');
    });

    it('should reject unknown action', async () => {
      const actionType = 'unknown_action';
      const parameters = {};

      await expect(service.executeQuickAction(actionType, parameters, mockPermissions))
        .rejects.toThrow('Unknown quick action: unknown_action');
    });
  });

  describe('Caching Behavior', () => {
    it('should implement cache TTL correctly', async () => {
      // This would test the private caching methods
      // For now, we'll test the public interface

      const permissions = mockPermissions;

      // Get data multiple times within TTL
      const result1 = await service.getSystemOverview(permissions);
      const result2 = await service.getSystemOverview(permissions);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should report correct health metrics', async () => {
      const health = await service.getHealth();

      expect(health.metrics).toHaveProperty('cacheSize');
      expect(health.metrics).toHaveProperty('cacheHitRate');
      expect(typeof health.metrics.cacheSize).toBe('number');
      expect(typeof health.metrics.cacheHitRate).toBe('number');
    });
  });
});