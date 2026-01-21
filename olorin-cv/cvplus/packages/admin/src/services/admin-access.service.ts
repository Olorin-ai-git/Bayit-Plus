/**
 * Admin Access Service
 * 
 * Centralized service for admin authentication, authorization, and permission management.
 * Provides consistent admin access checking across all CVPlus admin functions.
 * 
 * Features:
 * - Firebase Custom Claims integration
 * - Fallback email-based admin checking
 * - Granular permission management
 * - Role-based access control (RBAC)
 * - Comprehensive audit logging
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { AdminPermissions, AdminRole, AdminLevel } from '../types';
import { adminLogger } from '../logging/AdminLogger';

export class AdminAccessService {
  /**
   * Admin email addresses for fallback authentication
    */
  private static readonly ADMIN_EMAILS = [
    'gil.klainert@gmail.com',
    'admin@cvplus.ai',
    'support@cvplus.ai'
  ];

  /**
   * Super admin emails with highest privileges
    */
  private static readonly SUPER_ADMIN_EMAILS = [
    'gil.klainert@gmail.com'
  ];

  /**
   * Check if user has basic admin access
   * 
   * @param userId - Firebase user ID
   * @returns Promise<boolean> - True if user has admin access
    */
  static async checkAdminAccess(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }

    try {
      // Get user record from Firebase Auth
      const user = await admin.auth().getUser(userId);
      
      // Check Firebase custom claims first (preferred method)
      const claims = user.customClaims;
      if (claims?.adminLevel && typeof claims.adminLevel === 'number' && claims.adminLevel >= 1) {
        return true;
      }

      if (claims?.isAdmin === true) {
        return true;
      }

      // Fallback to email-based check for initial setup
      const userEmail = user.email?.toLowerCase();
      if (userEmail && this.ADMIN_EMAILS.includes(userEmail)) {
        // Auto-upgrade to custom claims if user is in admin email list
        await this.upgradeToCustomClaims(userId, userEmail);
        return true;
      }

      return false;
    } catch (error) {
      adminLogger.error(`Admin access check failed for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Require admin access or throw error
   * 
   * @param userId - Firebase user ID
   * @throws functions.https.HttpsError if user lacks admin access
    */
  static async requireAdminAccess(userId: string): Promise<void> {
    const hasAccess = await this.checkAdminAccess(userId);
    if (!hasAccess) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Administrative access required. Please contact support if you believe this is an error.'
      );
    }
  }

  /**
   * Check if user has specific admin permission
   * 
   * @param userId - Firebase user ID
   * @param permission - Specific permission to check
   * @returns Promise<boolean> - True if user has the permission
    */
  static async hasPermission(userId: string, permission: keyof AdminPermissions): Promise<boolean> {
    try {
      const permissions = await this.getAdminPermissions(userId);
      return permissions[permission] === true;
    } catch (error) {
      adminLogger.error(`Permission check failed for user ${userId}, permission ${permission}:`, error);
      return false;
    }
  }

  /**
   * Require specific admin permission or throw error
   * 
   * @param userId - Firebase user ID
   * @param permission - Required permission
   * @throws functions.https.HttpsError if user lacks the permission
    */
  static async requirePermission(userId: string, permission: keyof AdminPermissions): Promise<void> {
    const hasPermission = await this.hasPermission(userId, permission);
    if (!hasPermission) {
      throw new functions.https.HttpsError(
        'permission-denied',
        `Missing required permission: ${permission}`
      );
    }
  }

  /**
   * Get detailed admin permissions for user
   * 
   * @param userId - Firebase user ID
   * @returns Promise<AdminPermissions> - Complete permissions object
    */
  static async getAdminPermissions(userId: string): Promise<AdminPermissions> {
    // Check basic admin access first
    const hasAccess = await this.checkAdminAccess(userId);
    if (!hasAccess) {
      return this.getEmptyPermissions();
    }

    try {
      const user = await admin.auth().getUser(userId);
      const claims = user.customClaims;
      
      // Extract admin level and roles from custom claims
      const adminLevel = (claims?.adminLevel as AdminLevel) || 1;
      const adminRoles = (claims?.adminRoles as AdminRole[]) || ['support'];
      const userEmail = user.email?.toLowerCase();

      // Super admins get highest privileges
      if (userEmail && this.SUPER_ADMIN_EMAILS.includes(userEmail)) {
        return this.getSuperAdminPermissions();
      }

      // Calculate permissions based on level and roles
      return this.calculatePermissions(adminLevel, adminRoles, userId);
    } catch (error) {
      adminLogger.error(`Failed to get admin permissions for user ${userId}:`, error);
      return this.getEmptyPermissions();
    }
  }

  /**
   * Get admin user metadata
   * 
   * @param userId - Firebase user ID
   * @returns Admin user information
    */
  static async getAdminUserInfo(userId: string) {
    try {
      const user = await admin.auth().getUser(userId);
      const permissions = await this.getAdminPermissions(userId);
      
      return {
        userId,
        email: user.email,
        displayName: user.displayName,
        permissions,
        lastSignIn: user.metadata.lastSignInTime,
        createdAt: user.metadata.creationTime
      };
    } catch (error) {
      adminLogger.error(`Failed to get admin user info for ${userId}:`, error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to retrieve admin user information'
      );
    }
  }

  /**
   * Upgrade user to use Firebase Custom Claims instead of email-based checking
   * 
   * @private
   * @param userId - Firebase user ID
   * @param email - User email address
    */
  private static async upgradeToCustomClaims(userId: string, email: string): Promise<void> {
    try {
      // Determine admin level based on email
      const adminLevel = this.SUPER_ADMIN_EMAILS.includes(email) ? 5 : 3;
      const adminRoles = this.SUPER_ADMIN_EMAILS.includes(email)
        ? [AdminRole.SYSTEM_ADMIN, AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT]
        : [AdminRole.ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT];

      // Set custom claims
      await admin.auth().setCustomUserClaims(userId, {
        isAdmin: true,
        adminLevel,
        adminRoles,
        upgradeDate: new Date().toISOString(),
        upgradeReason: 'email_based_fallback'
      });

      adminLogger.info(`Upgraded user ${userId} (${email}) to custom claims with admin level ${adminLevel}`);
    } catch (error) {
      adminLogger.error(`Failed to upgrade user ${userId} to custom claims:`, error);
      // Don't throw - fallback should still work
    }
  }

  /**
   * Get empty permissions object (no admin access)
   * 
   * @private
   * @returns Empty AdminPermissions object
    */
  private static getEmptyPermissions(): AdminPermissions {
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
        canViewUserAnalytics: false
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
        canExportModerationData: false
      },
      systemAdministration: {
        canViewSystemHealth: false,
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
        canViewBasicAnalytics: false,
        canViewAdvancedAnalytics: false,
        canExportAnalytics: false,
        canConfigureAnalytics: false,
        canViewCustomReports: false,
        canCreateCustomReports: false,
        canScheduleReports: false,
        canViewRealTimeData: false
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
  }

  /**
   * Get super admin permissions (highest level)
   * 
   * @private
   * @returns Complete AdminPermissions with all permissions enabled
    */
  private static getSuperAdminPermissions(): AdminPermissions {
    return {
      canAccessDashboard: true,
      canManageUsers: true,
      canModerateContent: true,
      canMonitorSystem: true,
      canViewAnalytics: true,
      canAuditSecurity: true,
      canManageSupport: true,
      canManageBilling: true,
      canConfigureSystem: true,
      canManageAdmins: true,
      canExportData: true,
      canManageFeatureFlags: true,
      userManagement: {
        canViewUsers: true,
        canEditUsers: true,
        canSuspendUsers: true,
        canDeleteUsers: true,
        canImpersonateUsers: true,
        canManageSubscriptions: true,
        canProcessRefunds: true,
        canMergeAccounts: true,
        canExportUserData: true,
        canViewUserAnalytics: true
      },
      contentModeration: {
        canReviewContent: true,
        canApproveContent: true,
        canRejectContent: true,
        canFlagContent: true,
        canHandleAppeals: true,
        canConfigureFilters: true,
        canViewModerationQueue: true,
        canAssignModerators: true,
        canExportModerationData: true
      },
      systemAdministration: {
        canViewSystemHealth: true,
        canManageServices: true,
        canConfigureFeatures: true,
        canViewLogs: true,
        canManageIntegrations: true,
        canDeployUpdates: true,
        canManageBackups: true,
        canConfigureSecurity: true
      },
      billing: {
        canViewBilling: true,
        canProcessPayments: true,
        canProcessRefunds: true,
        canManageSubscriptions: true,
        canViewFinancialReports: true,
        canConfigurePricing: true,
        canManageDisputes: true,
        canExportBillingData: true
      },
      analytics: {
        canViewBasicAnalytics: true,
        canViewAdvancedAnalytics: true,
        canExportAnalytics: true,
        canConfigureAnalytics: true,
        canViewCustomReports: true,
        canCreateCustomReports: true,
        canScheduleReports: true,
        canViewRealTimeData: true
      },
      security: {
        canViewSecurityEvents: true,
        canManageSecurityPolicies: true,
        canViewAuditLogs: true,
        canExportAuditData: true,
        canManageAccessControl: true,
        canConfigureCompliance: true,
        canInvestigateIncidents: true,
        canManageSecurityAlerts: true
      }
    };
  }

  /**
   * Calculate permissions based on admin level and roles
   * 
   * @private
   * @param adminLevel - Admin level (1-5)
   * @param roles - Array of admin roles
   * @param userId - User ID for logging
   * @returns Calculated AdminPermissions object
    */
  private static calculatePermissions(
    adminLevel: AdminLevel,
    roles: AdminRole[],
    userId: string
  ): AdminPermissions {
    const permissions: AdminPermissions = {
      canAccessDashboard: adminLevel >= 1 || roles.includes(AdminRole.SUPPORT),
      canManageUsers: adminLevel >= 2 || roles.includes(AdminRole.ADMIN),
      canMonitorSystem: adminLevel >= 1 || roles.includes(AdminRole.SUPPORT),
      canViewAnalytics: adminLevel >= 2 || roles.includes(AdminRole.ADMIN),
      canManageAdmins: adminLevel >= 4 || roles.includes(AdminRole.SUPER_ADMIN),
      canModerateContent: adminLevel >= 2 || roles.includes(AdminRole.MODERATOR),
      canAuditSecurity: adminLevel >= 3 || roles.includes(AdminRole.ADMIN),
      canManageSupport: adminLevel >= 3 || roles.includes(AdminRole.ADMIN),
      canManageBilling: adminLevel >= 3 || roles.includes(AdminRole.ADMIN),
      canConfigureSystem: adminLevel >= 4 || roles.includes(AdminRole.SUPER_ADMIN),
      canExportData: adminLevel >= 3 || roles.includes(AdminRole.ADMIN),
      canManageFeatureFlags: adminLevel >= 4 || roles.includes(AdminRole.SUPER_ADMIN),
      userManagement: {
        canViewUsers: true,
        canEditUsers: adminLevel >= 2,
        canSuspendUsers: adminLevel >= 2,
        canDeleteUsers: adminLevel >= 3,
        canImpersonateUsers: adminLevel >= 4,
        canManageSubscriptions: adminLevel >= 3,
        canProcessRefunds: adminLevel >= 3,
        canMergeAccounts: adminLevel >= 4,
        canExportUserData: adminLevel >= 2,
        canViewUserAnalytics: adminLevel >= 2
      },
      contentModeration: {
        canReviewContent: adminLevel >= 2,
        canApproveContent: adminLevel >= 2,
        canRejectContent: adminLevel >= 2,
        canFlagContent: adminLevel >= 1,
        canHandleAppeals: adminLevel >= 3,
        canConfigureFilters: adminLevel >= 3,
        canViewModerationQueue: adminLevel >= 2,
        canAssignModerators: adminLevel >= 4,
        canExportModerationData: adminLevel >= 3
      },
      systemAdministration: {
        canViewSystemHealth: adminLevel >= 3,
        canManageServices: adminLevel >= 4,
        canConfigureFeatures: adminLevel >= 4,
        canViewLogs: adminLevel >= 3,
        canManageIntegrations: adminLevel >= 4,
        canDeployUpdates: adminLevel >= 5,
        canManageBackups: adminLevel >= 4,
        canConfigureSecurity: adminLevel >= 4
      },
      billing: {
        canViewBilling: adminLevel >= 3,
        canProcessPayments: adminLevel >= 3,
        canProcessRefunds: adminLevel >= 3,
        canManageSubscriptions: adminLevel >= 3,
        canViewFinancialReports: adminLevel >= 3,
        canConfigurePricing: adminLevel >= 4,
        canManageDisputes: adminLevel >= 3,
        canExportBillingData: adminLevel >= 3
      },
      analytics: {
        canViewBasicAnalytics: adminLevel >= 2,
        canViewAdvancedAnalytics: adminLevel >= 3,
        canExportAnalytics: adminLevel >= 3,
        canConfigureAnalytics: adminLevel >= 4,
        canViewCustomReports: adminLevel >= 3,
        canCreateCustomReports: adminLevel >= 3,
        canScheduleReports: adminLevel >= 3,
        canViewRealTimeData: adminLevel >= 3
      },
      security: {
        canViewSecurityEvents: adminLevel >= 3,
        canManageSecurityPolicies: adminLevel >= 4,
        canViewAuditLogs: adminLevel >= 3,
        canExportAuditData: adminLevel >= 3,
        canManageAccessControl: adminLevel >= 4,
        canConfigureCompliance: adminLevel >= 4,
        canInvestigateIncidents: adminLevel >= 3,
        canManageSecurityAlerts: adminLevel >= 3
      }
    };

    // Log permission calculation for audit
    adminLogger.info(`Calculated permissions for user ${userId}: level ${adminLevel}, roles [${roles.join(', ')}]`);
    
    return permissions;
  }

  /**
   * Validate admin context from Firebase Functions call
   * 
   * @param context - Firebase Functions CallableContext
   * @returns User ID if valid, throws error otherwise
    */
  static validateAdminContext(context: functions.https.CallableContext): string {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required for admin functions'
      );
    }

    return context.auth.uid;
  }

  /**
   * Log admin action for audit purposes
   * 
   * @param action - Action performed
   * @param userId - Admin user ID
   * @param targetId - Target of the action (optional)
   * @param metadata - Additional metadata (optional)
    */
  static async logAdminAction(
    action: string,
    userId: string,
    targetId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const adminInfo = await this.getAdminUserInfo(userId);
      
      const logEntry = {
        action,
        adminUserId: userId,
        adminEmail: adminInfo.email,
        adminLevel: 1, // Default admin level since not available in adminInfo
        targetId,
        metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'admin_access_service'
      };

      await admin.firestore()
        .collection('admin_audit_log')
        .add(logEntry);

      adminLogger.info(`Admin action logged: ${action} by ${userId} (${adminInfo.email})`);
    } catch (error) {
      adminLogger.error(`Failed to log admin action ${action} by ${userId}:`, error);
      // Don't throw - logging failure shouldn't break functionality
    }
  }
}