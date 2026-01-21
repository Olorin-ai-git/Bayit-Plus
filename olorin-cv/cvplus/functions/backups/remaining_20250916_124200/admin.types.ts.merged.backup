// @ts-ignore - Export conflicts/**
 * Admin types for multimedia module
 * These are local definitions to avoid dependency violations
 * Higher layers should implement these interfaces
 */

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support'
}

export enum AdminLevel {
  L1_SUPPORT = 1,
  L2_MODERATOR = 2,
  L3_ADMIN = 3,
  L4_SUPER_ADMIN = 4,
  L5_SYSTEM_ADMIN = 5
}

export interface AdminPermissions {
  canAccessDashboard: boolean;
  canManageUsers: boolean;
  canModerateContent: boolean;
  canMonitorSystem: boolean;
  canViewAnalytics: boolean;
  canAuditSecurity: boolean;
  canManageSupport: boolean;
  canManageBilling: boolean;
  canConfigureSystem: boolean;
  canManageAdmins: boolean;
  canExportData: boolean;
  canManageFeatureFlags: boolean;
  
  userManagement: {
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
  };
  
  contentModeration: {
    canReviewContent: boolean;
    canApproveContent: boolean;
    canRejectContent: boolean;
    canFlagContent: boolean;
    canHandleAppeals: boolean;
    canConfigureFilters: boolean;
    canViewModerationQueue: boolean;
    canAssignModerators: boolean;
    canExportModerationData: boolean;
  };
  
  systemAdministration: {
    canViewSystemHealth: boolean;
    canManageServices: boolean;
    canConfigureFeatures: boolean;
    canViewLogs: boolean;
    canManageIntegrations: boolean;
    canDeployUpdates: boolean;
    canManageBackups: boolean;
    canConfigureSecurity: boolean;
  };
  
  billing: {
    canViewBilling: boolean;
    canProcessPayments: boolean;
    canProcessRefunds: boolean;
    canManageSubscriptions: boolean;
    canViewFinancialReports: boolean;
    canConfigurePricing: boolean;
    canManageDisputes: boolean;
    canExportBillingData: boolean;
  };
  
  analytics: {
    canViewBasicAnalytics: boolean;
    canViewAdvancedAnalytics: boolean;
    canExportAnalytics: boolean;
    canConfigureAnalytics: boolean;
    canViewCustomReports: boolean;
    canCreateCustomReports: boolean;
    canScheduleReports: boolean;
    canViewRealTimeData: boolean;
  };
  
  security: {
    canViewSecurityEvents: boolean;
    canManageSecurityPolicies: boolean;
    canViewAuditLogs: boolean;
    canExportAuditData: boolean;
    canManageAccessControl: boolean;
    canConfigureCompliance: boolean;
    canInvestigateIncidents: boolean;
    canManageSecurityAlerts: boolean;
  };
}