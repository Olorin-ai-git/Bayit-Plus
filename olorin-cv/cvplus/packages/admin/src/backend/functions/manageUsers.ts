import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { requireAdminPermission } from '../../middleware/admin-auth.middleware';

/**
 * Admin function for comprehensive user management operations
  */
export const manageUsers = onCall({
  cors: true,
  enforceAppCheck: false,
  region: 'us-central1',
}, async (request) => {
  try {
    // Require admin permission for user management
    const adminRequest = await requireAdminPermission(request, 'canManageUsers');
    
    const { action, userId, data } = request.data;
    
    if (!action) {
      throw new Error('Action is required');
    }

    logger.info('Admin user management action initiated', {
      adminUid: adminRequest.auth.uid,
      adminRole: adminRequest.admin.role,
      action,
      targetUserId: userId
    });

    const db = admin.firestore();
    const auth = admin.auth();

    let result;

    switch (action) {
      case 'get_user':
        result = await getUserDetails(db, auth, userId);
        break;
        
      case 'update_user':
        result = await updateUser(db, auth, userId, data, adminRequest);
        break;
        
      case 'suspend_user':
        result = await suspendUser(db, auth, userId, data?.reason, adminRequest);
        break;
        
      case 'unsuspend_user':
        result = await unsuspendUser(db, auth, userId, adminRequest);
        break;
        
      case 'delete_user':
        result = await deleteUser(db, auth, userId, data?.reason, adminRequest);
        break;
        
      case 'reset_password':
        result = await resetUserPassword(auth, userId, adminRequest);
        break;
        
      case 'verify_email':
        result = await verifyUserEmail(auth, userId, adminRequest);
        break;
        
      case 'manage_subscription':
        result = await manageUserSubscription(db, userId, data, adminRequest);
        break;
        
      case 'export_user_data':
        result = await exportUserData(db, userId, adminRequest);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log admin activity
    await logAdminActivity(adminRequest.auth.uid, `USER_${action.toUpperCase()}`, {
      targetUserId: userId,
      action,
      result: result.success,
      timestamp: new Date().toISOString()
    });

    logger.info('Admin user management action completed', {
      adminUid: adminRequest.auth.uid,
      action,
      targetUserId: userId,
      success: result.success
    });

    return result;

  } catch (error) {
    logger.error('Admin user management action failed', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      action: request.data?.action,
      userId: request.data?.userId
    });
    
    throw error;
  }
});

/**
 * Get detailed user information
  */
const getUserDetails = async (db: admin.firestore.Firestore, auth: admin.auth.Auth, userId: string) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Get Firebase Auth record
    const authRecord = await auth.getUser(userId);
    
    // Get Firestore user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User document not found in Firestore');
    }

    const userData = userDoc.data();
    
    // Get user's jobs
    const jobsSnapshot = await db.collection('jobs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const jobs = jobsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get subscription info if premium
    let subscriptionInfo = null;
    if (userData?.isPremium) {
      const subDoc = await db.collection('subscriptions').doc(userId).get();
      subscriptionInfo = subDoc.exists ? subDoc.data() : null;
    }

    return {
      success: true,
      data: {
        auth: {
          uid: authRecord.uid,
          email: authRecord.email,
          emailVerified: authRecord.emailVerified,
          displayName: authRecord.displayName,
          photoURL: authRecord.photoURL,
          disabled: authRecord.disabled,
          metadata: {
            creationTime: authRecord.metadata.creationTime,
            lastSignInTime: authRecord.metadata.lastSignInTime,
            lastRefreshTime: authRecord.metadata.lastRefreshTime
          },
          providerData: authRecord.providerData,
          customClaims: authRecord.customClaims
        },
        profile: userData,
        jobs: jobs,
        subscription: subscriptionInfo,
        stats: {
          totalJobs: jobs.length,
          isPremium: userData?.isPremium || false,
          isActive: userData?.isActive !== false,
          status: userData?.status || 'active'
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user details'
    };
  }
};

/**
 * Update user information
  */
const updateUser = async (
  db: admin.firestore.Firestore, 
  auth: admin.auth.Auth, 
  userId: string, 
  updateData: any,
  adminRequest: any
) => {
  if (!userId || !updateData) {
    throw new Error('User ID and update data are required');
  }

  try {
    const updates: any = {};
    const authUpdates: any = {};

    // Prepare Firestore updates
    if (updateData.displayName !== undefined) {
      updates.displayName = updateData.displayName;
      authUpdates.displayName = updateData.displayName;
    }
    
    if (updateData.isActive !== undefined) {
      updates.isActive = updateData.isActive;
    }
    
    if (updateData.status !== undefined) {
      updates.status = updateData.status;
    }

    // Update Firebase Auth if needed
    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(userId, authUpdates);
    }

    // Update Firestore
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      updates.updatedBy = adminRequest.auth.uid;
      
      await db.collection('users').doc(userId).update(updates);
    }

    return {
      success: true,
      message: 'User updated successfully',
      data: { userId, updates }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user'
    };
  }
};

/**
 * Suspend user account
  */
const suspendUser = async (
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  userId: string,
  reason: string,
  adminRequest: any
) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Disable in Firebase Auth
    await auth.updateUser(userId, { disabled: true });
    
    // Update Firestore
    await db.collection('users').doc(userId).update({
      status: 'suspended',
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      suspendedBy: adminRequest.auth.uid,
      suspensionReason: reason || 'Administrative suspension',
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'User suspended successfully',
      data: { userId, reason }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to suspend user'
    };
  }
};

/**
 * Unsuspend user account
  */
const unsuspendUser = async (
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  userId: string,
  adminRequest: any
) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Enable in Firebase Auth
    await auth.updateUser(userId, { disabled: false });
    
    // Update Firestore
    await db.collection('users').doc(userId).update({
      status: 'active',
      suspendedAt: admin.firestore.FieldValue.delete(),
      suspendedBy: admin.firestore.FieldValue.delete(),
      suspensionReason: admin.firestore.FieldValue.delete(),
      unsuspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      unsuspendedBy: adminRequest.auth.uid,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'User unsuspended successfully',
      data: { userId }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unsuspend user'
    };
  }
};

/**
 * Delete user account (requires high-level admin permission)
  */
const deleteUser = async (
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  userId: string,
  reason: string,
  adminRequest: any
) => {
  // Only super admins and system admins can delete users
  if (adminRequest.admin.level < 4) {
    throw new Error('Insufficient permissions to delete users');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Archive user data instead of hard delete
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // Move to archived users collection
      await db.collection('archivedUsers').doc(userId).set({
        ...userData,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: adminRequest.auth.uid,
        deletionReason: reason || 'Administrative deletion',
        originalId: userId
      });
      
      // Remove from active users
      await db.collection('users').doc(userId).delete();
    }

    // Archive user jobs
    const jobsSnapshot = await db.collection('jobs').where('userId', '==', userId).get();
    const batch = db.batch();
    
    jobsSnapshot.docs.forEach(doc => {
      batch.set(db.collection('archivedJobs').doc(doc.id), {
        ...doc.data(),
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        archivedReason: 'User deletion'
      });
      batch.delete(doc.ref);
    });
    
    await batch.commit();

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    return {
      success: true,
      message: 'User deleted and archived successfully',
      data: { userId, reason, archivedJobsCount: jobsSnapshot.size }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user'
    };
  }
};

/**
 * Reset user password
  */
const resetUserPassword = async (auth: admin.auth.Auth, userId: string, adminRequest: any) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const user = await auth.getUser(userId);
    
    if (!user.email) {
      throw new Error('User does not have an email address');
    }

    // Generate password reset link
    const resetLink = await auth.generatePasswordResetLink(user.email);

    return {
      success: true,
      message: 'Password reset link generated successfully',
      data: { userId, email: user.email, resetLink }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset user password'
    };
  }
};

/**
 * Verify user email
  */
const verifyUserEmail = async (auth: admin.auth.Auth, userId: string, adminRequest: any) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    await auth.updateUser(userId, { emailVerified: true });

    return {
      success: true,
      message: 'User email verified successfully',
      data: { userId }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify user email'
    };
  }
};

/**
 * Manage user subscription
  */
const manageUserSubscription = async (
  db: admin.firestore.Firestore,
  userId: string,
  data: any,
  adminRequest: any
) => {
  if (!userId || !data?.action) {
    throw new Error('User ID and subscription action are required');
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    let result;
    switch (data.action) {
      case 'upgrade_to_premium':
        result = await upgradeUserToPremium(db, userId, adminRequest);
        break;
      case 'downgrade_to_free':
        result = await downgradeUserToFree(db, userId, adminRequest);
        break;
      case 'extend_subscription':
        result = await extendSubscription(db, userId, data.days, adminRequest);
        break;
      default:
        throw new Error(`Unknown subscription action: ${data.action}`);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to manage user subscription'
    };
  }
};

/**
 * Export user data (GDPR compliance)
  */
const exportUserData = async (
  db: admin.firestore.Firestore,
  userId: string,
  adminRequest: any
) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Get all user data
    const userDoc = await db.collection('users').doc(userId).get();
    const jobsSnapshot = await db.collection('jobs').where('userId', '==', userId).get();
    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get();

    const exportData = {
      user: userDoc.exists ? userDoc.data() : null,
      jobs: jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      subscription: subscriptionDoc.exists ? subscriptionDoc.data() : null,
      exportedAt: new Date().toISOString(),
      exportedBy: adminRequest.auth.uid
    };

    return {
      success: true,
      message: 'User data exported successfully',
      data: exportData
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export user data'
    };
  }
};

/**
 * Helper functions for subscription management
  */
const upgradeUserToPremium = async (
  db: admin.firestore.Firestore,
  userId: string,
  adminRequest: any
) => {
  await db.collection('users').doc(userId).update({
    isPremium: true,
    subscriptionStatus: 'active',
    subscriptionType: 'admin_granted',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminRequest.auth.uid
  });

  return {
    success: true,
    message: 'User upgraded to premium successfully'
  };
};

const downgradeUserToFree = async (
  db: admin.firestore.Firestore,
  userId: string,
  adminRequest: any
) => {
  await db.collection('users').doc(userId).update({
    isPremium: false,
    subscriptionStatus: 'cancelled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminRequest.auth.uid
  });

  return {
    success: true,
    message: 'User downgraded to free successfully'
  };
};

const extendSubscription = async (
  db: admin.firestore.Firestore,
  userId: string,
  days: number,
  adminRequest: any
) => {
  const subscriptionDoc = await db.collection('subscriptions').doc(userId).get();
  let newExpiryDate;

  if (subscriptionDoc.exists) {
    const currentExpiry = subscriptionDoc.data()?.expiresAt?.toDate() || new Date();
    newExpiryDate = new Date(currentExpiry.getTime() + (days * 24 * 60 * 60 * 1000));
  } else {
    newExpiryDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  }

  await db.collection('subscriptions').doc(userId).set({
    expiresAt: admin.firestore.Timestamp.fromDate(newExpiryDate),
    extendedBy: adminRequest.auth.uid,
    extendedAt: admin.firestore.FieldValue.serverTimestamp(),
    daysExtended: days
  }, { merge: true });

  return {
    success: true,
    message: `Subscription extended by ${days} days`,
    data: { newExpiryDate: newExpiryDate.toISOString() }
  };
};

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
      ipAddress: 'unknown',
      userAgent: 'unknown'
    });
  } catch (error) {
    logger.error('Failed to log admin activity', {
      error: error instanceof Error ? error.message : error,
      adminUid,
      action
    });
  }
};