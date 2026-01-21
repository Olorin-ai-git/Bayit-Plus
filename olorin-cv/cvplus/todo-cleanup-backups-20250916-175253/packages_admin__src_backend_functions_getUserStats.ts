import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireAdminPermission } from '../../middleware/admin-auth.middleware';

/**
 * Admin function to get user statistics and management data
  */
export const getUserStats = onCall({
  cors: true,
  enforceAppCheck: false,
  region: 'us-central1',
}, async (request) => {
  try {
    // Require admin permission for user management
    const adminRequest = await requireAdminPermission(request, 'canManageUsers');
    
    logger.info('Getting user statistics', {
      adminUid: adminRequest.auth.uid,
      adminRole: adminRequest.admin.role
    });

    const db = admin.firestore();
    
    // Get basic user counts
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Get user statistics
    const activeUsers = await db.collection('users')
      .where('isActive', '==', true)
      .get();
      
    const premiumUsers = await db.collection('users')
      .where('isPremium', '==', true)
      .get();
      
    const suspendedUsers = await db.collection('users')
      .where('status', '==', 'suspended')
      .get();

    // Get recent user registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await db.collection('users')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();

    // Get user activity metrics
    const userActivityPromises = usersSnapshot.docs.slice(0, 100).map(async (userDoc) => {
      const userData = userDoc.data();
      return {
        uid: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        isActive: userData.isActive || false,
        isPremium: userData.isPremium || false,
        status: userData.status || 'active',
        createdAt: userData.createdAt,
        lastLoginAt: userData.lastLoginAt,
        cvCount: userData.cvCount || 0,
        subscriptionStatus: userData.subscriptionStatus
      };
    });

    const userDetails = await Promise.all(userActivityPromises);

    const stats = {
      totalUsers,
      activeUsers: activeUsers.size,
      premiumUsers: premiumUsers.size,
      suspendedUsers: suspendedUsers.size,
      recentRegistrations: recentUsers.size,
      userGrowthRate: ((recentUsers.size / totalUsers) * 100).toFixed(2),
      premiumConversionRate: ((premiumUsers.size / totalUsers) * 100).toFixed(2),
      userDetails: userDetails.slice(0, 50), // Limit for performance
      lastUpdated: new Date().toISOString()
    };

    // Log admin activity
    await logAdminActivity(adminRequest.auth.uid, 'USER_STATS_VIEW', {
      totalUsers,
      timestamp: new Date().toISOString()
    });

    logger.info('User statistics retrieved successfully', {
      adminUid: adminRequest.auth.uid,
      totalUsers,
      activeUsers: activeUsers.size
    });

    return {
      success: true,
      data: stats
    };

  } catch (error) {
    logger.error('Failed to get user statistics', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
});

/**
 * Helper function to log admin activities
  */
const logAdminActivity = async (adminUid: string, action: string, details: any) => {
  try {
    const db = admin.firestore();
    await db.collection('adminAuditLogs').add({
      adminUid,
      action,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: 'unknown', // TODO: Extract from request
      userAgent: 'unknown'  // TODO: Extract from request
    });
  } catch (error) {
    logger.error('Failed to log admin activity', {
      error: error instanceof Error ? error.message : error,
      adminUid,
      action
    });
  }
};