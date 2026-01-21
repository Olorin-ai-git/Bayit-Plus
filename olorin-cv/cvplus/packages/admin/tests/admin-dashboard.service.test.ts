/**
 * Admin Dashboard Service Tests
 * 
 * Test suite for the AdminDashboardService class.
  */

import { AdminDashboardService } from '../../services/admin-dashboard.service';
import type { AdminDashboardConfig, AdminPermissions } from '../../types';

// Mock fetch for testing
global.fetch = jest.fn();

describe('AdminDashboardService', () => {
  let dashboardService: AdminDashboardService;

  beforeEach(() => {
    dashboardService = new AdminDashboardService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    dashboardService.dispose();
  });

  describe('initializeDashboard', () => {
    const mockAdminUserId = 'admin-123';
    const mockConfig: AdminDashboardConfig = {
      layout: 'GRID',
      refreshInterval: 30000,
      realtimeModules: ['system_health', 'active_users'],
      widgetConfiguration: [],
      filters: {
        timeRange: {
          preset: 'LAST_24_HOURS',
          customRange: {
            start: new Date(Date.now() - 86400000),
            end: new Date()
          }
        }
      },
      customization: {
        theme: 'light',
        colorScheme: 'default',
        showGrid: true,
        compactMode: false,
        animations: true,
        autoRefresh: true,
        exportFormats: ['csv', 'json']
      }
    };

    const mockPermissions: AdminPermissions = {
      canAccessDashboard: true,
      canManageUsers: true,
      canModerateContent: true,
      canMonitorSystem: true,
      canViewAnalytics: true,
      canAuditSecurity: false,
      canManageSupport: true,
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
        canExportModerationData: true
      },
      systemAdministration: {
        canViewSystemHealth: true,
        canManageServices: false,
        canConfigureFeatures: false,
        canViewLogs: true,
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
        canViewAdvancedAnalytics: false,
        canExportAnalytics: true,
        canConfigureAnalytics: false,
        canViewCustomReports: false,
        canCreateCustomReports: false,
        canScheduleReports: false,
        canViewRealTimeData: true
      },
      security: {
        canViewSecurityEvents: false,
        canManageSecurityPolicies: false,
        canViewAuditLogs: false,
        canExportAuditData: false,
        canManageAccessControl: false,
        canConfigureCompliance: false,
        canInvestigateIncidents: false,
        canManageSecurityAlerts: false
      }
    };

    beforeEach(() => {
      // Mock successful API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPermissions
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ totalUsers: 1000, activeUsers: 750 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pendingReviews: 25, completedToday: 100 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy', uptime: 99.9 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ totalRevenue: 50000, growthRate: 12.5 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ totalTickets: 50, openTickets: 10 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        });
    });

    it('should initialize dashboard successfully', async () => {
      const dashboard = await dashboardService.initializeDashboard(
        mockAdminUserId,
        mockConfig
      );

      expect(dashboard).toBeDefined();
      expect(dashboard.adminUser).toBe(mockAdminUserId);
      expect(dashboard.permissions).toEqual(mockPermissions);
      expect(dashboard.config).toEqual(mockConfig);
      expect(dashboard.data).toBeDefined();
      expect(dashboard.data.overview).toBeDefined();
      expect(dashboard.data.modules).toBeDefined();
    });

    it('should throw error if user lacks dashboard access', async () => {
      const noAccessPermissions = { ...mockPermissions, canAccessDashboard: false };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => noAccessPermissions
      });

      await expect(
        dashboardService.initializeDashboard(mockAdminUserId, mockConfig)
      ).rejects.toThrow('Insufficient permissions to access admin dashboard');
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        dashboardService.initializeDashboard(mockAdminUserId, mockConfig)
      ).rejects.toThrow('Dashboard initialization failed');
    });

    it('should set up real-time updates when enabled', async () => {
      const configWithRealtime = {
        ...mockConfig,
        realtimeModules: ['system_health', 'active_users', 'pending_moderation']
      };

      // Mock successful responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockPermissions });

      // Mock other required API calls
      for (let i = 0; i < 10; i++) {
        (fetch as jest.Mock)
          .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      }

      const dashboard = await dashboardService.initializeDashboard(
        mockAdminUserId,
        configWithRealtime
      );

      expect(dashboard.realtimeConfig.enabled).toBe(true);
      expect(dashboard.realtimeConfig.modules).toEqual(configWithRealtime.realtimeModules);
    });
  });

  describe('refreshDashboard', () => {
    it('should refresh dashboard data', async () => {
      const mockDashboardId = 'dashboard-123';
      
      // Mock API responses for refresh
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ totalUsers: 1100 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ pendingReviews: 30 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'healthy' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ totalRevenue: 55000 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ totalTickets: 60 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      // Mock getDashboard to return existing dashboard
      jest.spyOn(dashboardService as any, 'getDashboard').mockResolvedValue({
        id: mockDashboardId,
        adminUser: 'admin-123',
        permissions: {
          canAccessDashboard: true,
          canManageUsers: true,
          canModerateContent: true,
          canMonitorSystem: true,
          canViewAnalytics: true
        },
        config: {
          layout: 'GRID',
          refreshInterval: 30000,
          realtimeModules: []
        }
      });

      const refreshedDashboard = await dashboardService.refreshDashboard(
        mockDashboardId,
        'admin-123'
      );

      expect(refreshedDashboard).toBeDefined();
      expect(refreshedDashboard.lastUpdated).toBeInstanceOf(Date);
    });

    it('should throw error if dashboard not found', async () => {
      jest.spyOn(dashboardService as any, 'getDashboard').mockResolvedValue(null);

      await expect(
        dashboardService.refreshDashboard('non-existent', 'admin-123')
      ).rejects.toThrow('Dashboard not found');
    });
  });

  describe('event handling', () => {
    it('should add and remove event listeners', () => {
      const callback = jest.fn();
      const eventName = 'test:event';

      dashboardService.addEventListener(eventName, callback);
      
      // Verify listener was added
      expect((dashboardService as any).eventListeners.has(eventName)).toBe(true);
      expect((dashboardService as any).eventListeners.get(eventName).has(callback)).toBe(true);

      dashboardService.removeEventListener(eventName, callback);
      
      // Verify listener was removed
      expect((dashboardService as any).eventListeners.has(eventName)).toBe(false);
    });

    it('should handle multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const eventName = 'test:event';

      dashboardService.addEventListener(eventName, callback1);
      dashboardService.addEventListener(eventName, callback2);

      const listeners = (dashboardService as any).eventListeners.get(eventName);
      expect(listeners.size).toBe(2);
      expect(listeners.has(callback1)).toBe(true);
      expect(listeners.has(callback2)).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clean up resources on dispose', () => {
      const callback = jest.fn();
      dashboardService.addEventListener('test:event', callback);

      // Simulate active real-time updates
      (dashboardService as any).realtimeUpdates.set('admin-123', setInterval(() => {}, 1000));

      dashboardService.dispose();

      expect((dashboardService as any).realtimeUpdates.size).toBe(0);
      expect((dashboardService as any).eventListeners.size).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should generate unique dashboard IDs', () => {
      const id1 = (dashboardService as any).generateDashboardId('admin-123');
      const id2 = (dashboardService as any).generateDashboardId('admin-123');

      expect(id1).not.toBe(id2);
      expect(id1).toContain('dashboard_admin-123_');
      expect(id2).toContain('dashboard_admin-123_');
    });
  });
});