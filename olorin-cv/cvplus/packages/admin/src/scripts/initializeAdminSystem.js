const admin = require('firebase-admin');
const { AdminRole, AdminLevel } = require('@cvplus/admin');

/**
 * Admin System Initialization Script
 * 
 * This script initializes the comprehensive admin system for CVPlus:
 * - Sets up admin Firebase custom claims
 * - Creates initial admin profiles
 * - Initializes admin database collections
 * - Configures admin permissions and roles
 */

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.PROJECT_ID || 'getmycv-ai'
  });
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Default admin configuration
 */
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gil.klainert@gmail.com';
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? 
  process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : 
  [DEFAULT_ADMIN_EMAIL];

/**
 * Set admin custom claims for a user
 */
async function setAdminCustomClaims(uid, role, level, permissions) {
  try {
    const customClaims = {
      admin: {
        role: role,
        level: level,
        permissions: permissions,
        grantedAt: new Date().toISOString(),
        grantedBy: 'system'
      }
    };

    await auth.setCustomUserClaims(uid, customClaims);
    console.log(`✅ Admin custom claims set for user ${uid} with role ${role} and level ${level}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to set admin custom claims for ${uid}:`, error.message);
    return false;
  }
}

/**
 * Create admin profile in Firestore
 */
async function createAdminProfile(uid, userRecord, role, level) {
  try {
    const adminProfile = {
      id: uid,
      userId: uid,
      role: role,
      level: level,
      adminSince: admin.firestore.FieldValue.serverTimestamp(),
      email: userRecord.email,
      displayName: userRecord.displayName || userRecord.email?.split('@')[0],
      specializations: getDefaultSpecializations(role),
      preferences: getDefaultAdminPreferences(),
      certifications: [],
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    };

    await db.collection('adminProfiles').doc(uid).set(adminProfile);
    console.log(`✅ Admin profile created for ${userRecord.email} (${role})`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to create admin profile for ${uid}:`, error.message);
    return false;
  }
}

/**
 * Get default specializations based on admin role
 */
function getDefaultSpecializations(role) {
  switch (role) {
    case AdminRole.SYSTEM_ADMIN:
      return ['system_administration', 'security_analysis', 'technical_support'];
    case AdminRole.SUPER_ADMIN:
      return ['user_support', 'billing_support', 'data_analysis'];
    case AdminRole.ADMIN:
      return ['user_support', 'content_moderation'];
    case AdminRole.MODERATOR:
      return ['content_moderation'];
    case AdminRole.SUPPORT:
    default:
      return ['user_support'];
  }
}

/**
 * Get default admin preferences
 */
function getDefaultAdminPreferences() {
  return {
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dashboardLayout: {
      layout: 'grid',
      columns: 3,
      compactMode: false,
      showSidebar: true,
      sidebarCollapsed: false,
      pinnedWidgets: ['system-health', 'user-stats', 'recent-activity']
    },
    notificationSettings: {
      email: {
        enabled: true,
        criticalAlerts: true,
        dailyDigest: true,
        weeklyReport: true,
        systemUpdates: true,
        securityAlerts: true
      },
      inApp: {
        enabled: true,
        showBadges: true,
        playSound: true,
        autoMarkRead: false,
        persistentAlerts: true
      }
    }
  };
}

/**
 * Get default permissions based on admin level
 */
function getDefaultPermissions(level) {
  const basePermissions = {
    canAccessDashboard: true,
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
    canManageFeatureFlags: false
  };

  // Apply permissions based on admin level
  switch (level) {
    case AdminLevel.L5_SYSTEM_ADMIN:
      return {
        ...basePermissions,
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
        canManageFeatureFlags: true
      };
      
    case AdminLevel.L4_SUPER_ADMIN:
      return {
        ...basePermissions,
        canManageUsers: true,
        canModerateContent: true,
        canMonitorSystem: true,
        canViewAnalytics: true,
        canAuditSecurity: true,
        canManageSupport: true,
        canManageBilling: true,
        canExportData: true
      };
      
    case AdminLevel.L3_ADMIN:
      return {
        ...basePermissions,
        canManageUsers: true,
        canModerateContent: true,
        canMonitorSystem: true,
        canViewAnalytics: true,
        canManageSupport: true
      };
      
    case AdminLevel.L2_MODERATOR:
      return {
        ...basePermissions,
        canModerateContent: true,
        canViewAnalytics: true,
        canManageSupport: true
      };
      
    case AdminLevel.L1_SUPPORT:
    default:
      return {
        ...basePermissions,
        canManageSupport: true
      };
  }
}

/**
 * Initialize admin collections with sample data
 */
async function initializeAdminCollections() {
  try {
    console.log('📊 Initializing admin database collections...');

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
      createdBy: 'system'
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
      updatedBy: 'system'
    });

    // Create initial admin alert
    await db.collection('adminAlerts').add({
      type: 'system',
      severity: 'info',
      title: 'Admin System Initialized',
      message: 'CVPlus admin system has been successfully initialized and is ready for use.',
      source: 'admin-init-script',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      isResolved: false,
      targetAdminLevel: 1,
      actions: []
    });

    console.log('✅ Admin database collections initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize admin collections:', error.message);
    return false;
  }
}

/**
 * Main initialization function
 */
async function initializeAdminSystem() {
  try {
    console.log('🚀 Starting CVPlus Admin System Initialization...');
    console.log(`📧 Admin emails: ${ADMIN_EMAILS.join(', ')}`);
    
    let successCount = 0;
    let totalAdmins = ADMIN_EMAILS.length;

    // Process each admin email
    for (let i = 0; i < ADMIN_EMAILS.length; i++) {
      const email = ADMIN_EMAILS[i];
      console.log(`\n👤 Processing admin ${i + 1}/${totalAdmins}: ${email}`);

      try {
        // Get user by email
        let userRecord;
        try {
          userRecord = await auth.getUserByEmail(email);
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            console.log(`⚠️ User not found for email ${email}. Skipping...`);
            continue;
          }
          throw error;
        }

        // Determine admin role and level (first user gets system admin, others get super admin)
        const role = i === 0 ? AdminRole.SYSTEM_ADMIN : AdminRole.SUPER_ADMIN;
        const level = i === 0 ? AdminLevel.L5_SYSTEM_ADMIN : AdminLevel.L4_SUPER_ADMIN;
        const permissions = getDefaultPermissions(level);

        // Set custom claims
        const claimsSuccess = await setAdminCustomClaims(userRecord.uid, role, level, permissions);
        
        // Create admin profile
        const profileSuccess = await createAdminProfile(userRecord.uid, userRecord, role, level);

        if (claimsSuccess && profileSuccess) {
          successCount++;
          console.log(`✅ Admin setup completed for ${email}`);
        } else {
          console.log(`⚠️ Partial setup for ${email} - some operations failed`);
        }

      } catch (error) {
        console.error(`❌ Failed to setup admin for ${email}:`, error.message);
      }
    }

    // Initialize admin database collections
    const collectionsSuccess = await initializeAdminCollections();

    // Summary
    console.log('\n📋 Admin System Initialization Summary:');
    console.log(`✅ Successfully configured: ${successCount}/${totalAdmins} admins`);
    console.log(`📊 Database collections: ${collectionsSuccess ? 'Initialized' : 'Failed'}`);
    
    if (successCount > 0) {
      console.log('\n🎉 CVPlus Admin System is ready!');
      console.log('🔗 Admin users can now access the admin dashboard');
      console.log('🛡️ All admin actions will be logged and audited');
      console.log('📊 System metrics and health monitoring are active');
    } else {
      console.log('\n❌ Admin system initialization failed');
      console.log('Please check the errors above and try again');
    }

    return successCount > 0;

  } catch (error) {
    console.error('💥 Fatal error during admin system initialization:', error);
    return false;
  }
}

/**
 * Utility function to list current admin users
 */
async function listAdminUsers() {
  try {
    console.log('\n👥 Current Admin Users:');
    
    const adminProfiles = await db.collection('adminProfiles').get();
    
    if (adminProfiles.empty) {
      console.log('No admin users found');
      return;
    }

    adminProfiles.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.email} (${data.role}, Level ${data.level})`);
    });

  } catch (error) {
    console.error('Failed to list admin users:', error.message);
  }
}

/**
 * Command line interface
 */
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'init':
      initializeAdminSystem();
      break;
    case 'list':
      listAdminUsers();
      break;
    default:
      console.log('CVPlus Admin System Manager');
      console.log('');
      console.log('Usage:');
      console.log('  node initializeAdminSystem.js init   - Initialize admin system');
      console.log('  node initializeAdminSystem.js list   - List current admin users');
      console.log('');
      console.log('Environment Variables:');
      console.log('  ADMIN_EMAIL    - Primary admin email (default: gil.klainert@gmail.com)');
      console.log('  ADMIN_EMAILS   - Comma-separated list of admin emails');
      console.log('  PROJECT_ID     - Firebase project ID (default: getmycv-ai)');
  }
}

module.exports = {
  initializeAdminSystem,
  listAdminUsers,
  setAdminCustomClaims,
  createAdminProfile
};