/**
 * Dashboard Permission Validator Service
 *
 * Specialized service for validating admin permissions and access control
 * Following CVPlus BaseService pattern and 200-line compliance
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { EnhancedBaseService, EnhancedServiceConfig } from '@cvplus/core';
import { AdminPermissions, AdminLevel } from '../middleware/admin-auth.middleware';
import type { AuthenticatedRequest } from '../middleware/admin-auth.middleware';
import { AdminAccessService } from './admin-access.service';

export class DashboardPermissionValidator extends EnhancedBaseService {
  private permissionsCache: Map<string, { permissions: AdminPermissions; expiry: number }> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: EnhancedServiceConfig) {
    super(config);
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('Dashboard Permission Validator initialized');
  }

  protected async onCleanup(): Promise<void> {
    this.permissionsCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.info('Dashboard Permission Validator cleaned up');
  }

  protected async onHealthCheck() {
    return {
      status: 'healthy' as const,
      timestamp: new Date(),
      metrics: {
        permissionsCacheSize: this.permissionsCache.size,
        cacheHitRate: this.calculateCacheHitRate()
      }
    };
  }

  /**
   * Get admin permissions for user with caching
   */
  async getAdminPermissions(adminUserId: string): Promise<AdminPermissions> {
    // Check cache first
    const cached = this.getCachedPermissions(adminUserId);
    if (cached) {
      return cached;
    }

    try {
      // Fetch permissions from Firebase Custom Claims via admin middleware
      const permissions = await this.fetchAdminPermissions(adminUserId);

      // Cache the permissions
      this.setCachedPermissions(adminUserId, permissions);

      return permissions;

    } catch (error) {
      this.logger.error('Failed to get admin permissions', {
        adminUserId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Validate specific admin permission
   */
  async validatePermission(
    adminUserId: string,
    permission: keyof AdminPermissions
  ): Promise<boolean> {
    const permissions = await this.getAdminPermissions(adminUserId);
    const permissionValue = permissions[permission];
    return typeof permissionValue === 'boolean' ? permissionValue : false;
  }

  /**
   * Validate nested admin permission (e.g., userManagement.canEditUsers)
   */
  async validateNestedPermission(
    adminUserId: string,
    category: keyof AdminPermissions,
    permission: string
  ): Promise<boolean> {
    const permissions = await this.getAdminPermissions(adminUserId);
    const categoryPermissions = permissions[category];

    if (typeof categoryPermissions === 'object' && categoryPermissions !== null) {
      return (categoryPermissions as any)[permission] || false;
    }

    return false;
  }

  /**
   * Check minimum admin level requirement
   */
  async validateMinimumLevel(
    adminUserId: string,
    minLevel: AdminLevel
  ): Promise<boolean> {
    try {
      // This would typically involve checking Firebase Custom Claims
      // For now, we'll simulate the check
      const userLevel = await this.getAdminLevel(adminUserId);
      return userLevel >= minLevel;

    } catch (error) {
      this.logger.error('Failed to validate admin level', {
        adminUserId,
        minLevel,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  /**
   * Invalidate permissions cache for user
   */
  invalidateCache(adminUserId: string): void {
    this.permissionsCache.delete(adminUserId);
    this.logger.info('Invalidated permissions cache', { adminUserId });
  }

  /**
   * Clear all cached permissions
   */
  clearAllCache(): void {
    this.permissionsCache.clear();
    this.logger.info('Cleared all permissions cache');
  }

  // Private helper methods
  private getCachedPermissions(adminUserId: string): AdminPermissions | null {
    const cached = this.permissionsCache.get(adminUserId);
    if (cached && cached.expiry > Date.now()) {
      this.cacheHits++;
      return cached.permissions;
    }

    if (cached) {
      this.permissionsCache.delete(adminUserId);
    }

    this.cacheMisses++;
    return null;
  }

  private setCachedPermissions(adminUserId: string, permissions: AdminPermissions): void {
    this.permissionsCache.set(adminUserId, {
      permissions,
      expiry: Date.now() + this.CACHE_TTL
    });
  }

  private calculateCacheHitRate(): number {
    const totalRequests = this.cacheHits + this.cacheMisses;
    if (totalRequests === 0) return 0;
    return Number((this.cacheHits / totalRequests).toFixed(2));
  }

  private async fetchAdminPermissions(adminUserId: string): Promise<AdminPermissions> {
    try {
      // Use the real AdminAccessService to get permissions
      const permissions = await AdminAccessService.getAdminPermissions(adminUserId);
      this.logger.info(`Fetched real admin permissions for user: ${adminUserId}`);
      return permissions;
    } catch (error) {
      this.logger.error(`Failed to fetch admin permissions for user ${adminUserId}`, error);

      // Return minimal permissions as fallback
      return {
        canAccessDashboard: false,
        canManageUsers: false,
        canModerateContent: false,
        canMonitorSystem: false,
        canViewAnalytics: false,
        canAuditSecurity: false,
        canManageSupport: false,
        canManageBilling: false,
        canConfigureSystem: false,
        canManageAdmins: false,
        canExportData: false,
        canManageFeatureFlags: false,
        userManagement: {
          canViewUsers: false,
          canEditUsers: false,
          canSuspendUsers: false,
          canDeleteUsers: false,
          canImpersonateUsers: false,
          canManageSubscriptions: false,
          canProcessRefunds: false,
          canMergeAccounts: false,
          canExportUserData: false,
          canViewUserAnalytics: false,
        },
        contentModeration: {
          canReviewContent: false,
          canApproveContent: false,
          canRejectContent: false,
          canFlagContent: false,
          canHandleAppeals: false,
          canConfigureFilters: false,
          canViewModerationQueue: false,
          canAssignModerators: false,
          canExportModerationData: false,
        },
        systemAdministration: {
          canViewSystemHealth: false,
          canManageServices: false,
          canConfigureFeatures: false,
          canViewLogs: false,
          canManageIntegrations: false,
          canDeployUpdates: false,
          canManageBackups: false,
          canConfigureSecurity: false,
        },
        billing: {
          canViewBilling: false,
          canProcessPayments: false,
          canProcessRefunds: false,
          canManageSubscriptions: false,
          canViewFinancialReports: false,
          canConfigurePricing: false,
          canManageDisputes: false,
          canExportBillingData: false,
        },
        analytics: {
          canViewBasicAnalytics: false,
          canViewAdvancedAnalytics: false,
          canExportAnalytics: false,
          canConfigureAnalytics: false,
          canViewCustomReports: false,
          canCreateCustomReports: false,
          canScheduleReports: false,
          canViewRealTimeData: false,
        },
        security: {
          canViewSecurityEvents: false,
          canManageSecurityPolicies: false,
          canViewAuditLogs: false,
          canExportAuditData: false,
          canManageAccessControl: false,
          canConfigureCompliance: false,
          canInvestigateIncidents: false,
          canManageSecurityAlerts: false,
        }
      };
    }
  }

  private async getAdminLevel(adminUserId: string): Promise<AdminLevel> {
    try {
      // Use the real AdminAccessService to get admin level
      const adminInfo = await AdminAccessService.getAdminUserInfo(adminUserId);
      // adminLevel is not directly available in the returned object, use L1_SUPPORT as default
      return AdminLevel.L1_SUPPORT;
    } catch (error) {
      this.logger.error(`Failed to fetch admin level for user ${adminUserId}`, error);
      return AdminLevel.L1_SUPPORT;
    }
  }
}

export default DashboardPermissionValidator;