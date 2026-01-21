import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireAuth, AdminRole, AdminLevel } from '../../middleware/admin-auth.middleware';

/**
 * Admin initialization function
 * Sets up admin custom claims for authorized users
  */
export const initializeAdmin = onCall({
  cors: true,
  enforceAppCheck: false,
  region: 'us-central1',
}, async (request) => {
  try {
    // Only allow system-level initialization by pre-authorized admin emails
    const authenticatedRequest = await requireAuth(request);
    const userEmail = authenticatedRequest.auth.token.email;
    
    // Security: Only allow initialization by specific admin emails
    const adminEmails = (process.env.ADMIN_EMAILS || 'gil.klainert@gmail.com,admin@cvplus.ai')
      .split(',')
      .map(email => email.trim());
    
    if (!userEmail || !adminEmails.includes(userEmail)) {
      logger.error('Unauthorized admin initialization attempt', {
        uid: authenticatedRequest.auth.uid,
        email: userEmail
      });
      throw new Error('Unauthorized: Only pre-authorized admin emails can initialize admin system');
    }

    logger.info('Admin initialization started', {
      uid: authenticatedRequest.auth.uid,
      email: userEmail
    });

    const db = admin.firestore();
    const auth = admin.auth();

    // Initialize admin for the requesting user
    const result = await initializeAdminUser(auth, db, authenticatedRequest.auth.uid, userEmail);

    // Initialize admin database collections
    await initializeAdminCollections(db);

    logger.info('Admin initialization completed successfully', {
      uid: authenticatedRequest.auth.uid,
      email: userEmail,
      result
    });

    return {
      success: true,
      message: 'Admin system initialized successfully',
      data: result
    };

  } catch (error) {
    logger.error('Admin initialization failed', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
});

/**
 * Initialize admin user with custom claims and profile
  */
async function initializeAdminUser(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  uid: string,
  email: string
) {
  try {
    // Set admin custom claims
    const adminClaims = {
      admin: {
        role: AdminRole.SYSTEM_ADMIN,
        level: AdminLevel.L5_SYSTEM_ADMIN,
        permissions: getSystemAdminPermissions(),
        grantedAt: new Date().toISOString(),
        grantedBy: 'system-init'
      }
    };

    await auth.setCustomUserClaims(uid, adminClaims);

    // Create admin profile in Firestore
    const adminProfile = {
      id: uid,
      userId: uid,
      role: AdminRole.SYSTEM_ADMIN,
      level: AdminLevel.L5_SYSTEM_ADMIN,
      email: email,
      adminSince: admin.firestore.FieldValue.serverTimestamp(),
      specializations: ['system_administration', 'security_analysis', 'technical_support'],
      isActive: true,
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system-init'
    };

    await db.collection('adminProfiles').doc(uid).set(adminProfile);

    // Log admin activity
    await db.collection('adminAuditLogs').add({
      adminUid: uid,
      action: 'ADMIN_INITIALIZED',
      details: {
        role: AdminRole.SYSTEM_ADMIN,
        level: AdminLevel.L5_SYSTEM_ADMIN,
        email: email,
        timestamp: new Date().toISOString()
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: 'unknown',
      userAgent: 'system-init'
    });

    return {
      uid,
      email,
      role: AdminRole.SYSTEM_ADMIN,
      level: AdminLevel.L5_SYSTEM_ADMIN,
      status: 'initialized'
    };

  } catch (error) {
    logger.error('Failed to initialize admin user', {
      uid,
      email,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

/**
 * Initialize admin database collections with default data
  */
async function initializeAdminCollections(db: admin.firestore.Firestore) {
  try {
    // Create system metrics collection
    await db.collection('systemMetrics').doc('initial').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'healthy',
      metrics: {
        totalUsers: 0,
        activeJobs: 0,
        systemLoad: 0,
        errorRate: 0
      },
      createdBy: 'system-init'
    });

    // Create admin config collection
    await db.collection('adminConfig').doc('global').set({
      maxConcurrentSessions: 5,
      sessionTimeout: 3600000, // 1 hour in milliseconds
      mfaRequired: false,
      ipWhitelistEnabled: false,
      auditRetentionDays: 90,
      notificationChannels: ['email', 'inApp'],
      maintenanceMode: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system-init'
    });

    // Create initial admin alert
    await db.collection('adminAlerts').add({
      type: 'system',
      severity: 'info',
      title: 'Admin System Initialized',
      message: 'CVPlus admin system has been successfully initialized and is ready for use.',
      source: 'system-init',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      isResolved: false,
      targetAdminLevel: 1,
      actions: []
    });

    logger.info('Admin database collections initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize admin collections', {
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

/**
 * Get system admin permissions (full access)
  */
function getSystemAdminPermissions() {
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