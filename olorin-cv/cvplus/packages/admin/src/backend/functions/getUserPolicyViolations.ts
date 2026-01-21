import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

interface GetUserPolicyViolationsData {
  userId: string;
  includeResolved?: boolean;
}

export const getUserPolicyViolations = onCall<GetUserPolicyViolationsData>(
  {
    cors: true
  },
  async (request) => {
    const { data, auth } = request;

    // Verify authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Verify user matches the authenticated user
    if (auth.uid !== data.userId) {
      throw new HttpsError('permission-denied', 'User ID mismatch');
    }

    const { userId, includeResolved = false } = data;

    try {
      const db = admin.firestore();

      // Get user's policy record
      const userPolicyDoc = await db
        .collection('userPolicyRecords')
        .doc(userId)
        .get();

      if (!userPolicyDoc.exists) {
        return {
          violations: [],
          warnings: [],
          totalViolations: 0,
          activeViolations: 0,
          lastViolationDate: null
        };
      }

      // Get recent policy check history
      let checkHistoryQuery = db
        .collection('userPolicyRecords')
        .doc(userId)
        .collection('checkHistory')
        .orderBy('timestamp', 'desc')
        .limit(50);

      const checkHistory = await checkHistoryQuery.get();

      // Get active violations
      let violationsQuery = db
        .collection('policyViolations')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20);

      if (!includeResolved) {
        violationsQuery = violationsQuery.where('status', '!=', 'resolved');
      }

      const violationsSnapshot = await violationsQuery.get();

      // Process violations
      const violations = violationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.violationType || 'unknown',
          severity: data.severity || 'medium',
          status: data.status || 'active',
          message: data.message || 'Policy violation detected',
          details: data.details || {},
          createdAt: data.createdAt?.toDate?.() || new Date(),
          resolvedAt: data.resolvedAt?.toDate?.() || null,
          cvHash: data.cvHash,
          reviewerNotes: data.reviewerNotes
        };
      });

      // Process warnings from recent checks
      const warnings: any[] = [];
      checkHistory.docs.forEach(doc => {
        const checkData = doc.data();
        if (checkData.warnings && Array.isArray(checkData.warnings)) {
          checkData.warnings.forEach((warning: any) => {
            warnings.push({
              type: warning.type,
              message: warning.message,
              details: warning.details,
              timestamp: checkData.timestamp?.toDate?.() || new Date()
            });
          });
        }
      });

      // Remove duplicate warnings (same type within 24 hours)
      const uniqueWarnings = warnings.filter((warning, index, arr) => {
        const duplicateIndex = arr.findIndex(w => 
          w.type === warning.type && 
          Math.abs(w.timestamp - warning.timestamp) < 24 * 60 * 60 * 1000
        );
        return duplicateIndex === index;
      });

      // Calculate statistics
      const activeViolations = violations.filter(v => v.status === 'active').length;
      const lastViolationDate = violations.length > 0 ? violations[0].createdAt : null;

      const result = {
        violations: violations.slice(0, 10), // Limit to 10 most recent
        warnings: uniqueWarnings.slice(0, 5), // Limit to 5 most recent unique warnings
        totalViolations: violations.length,
        activeViolations,
        lastViolationDate,
        stats: {
          violationsByType: violations.reduce((acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          warningsByType: uniqueWarnings.reduce((acc, w) => {
            acc[w.type] = (acc[w.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      };

      logger.info('User policy violations retrieved', {
        userId,
        totalViolations: result.totalViolations,
        activeViolations: result.activeViolations,
        warningsCount: result.warnings.length
      });

      return result;

    } catch (error) {
      logger.error('Error getting user policy violations', { error, userId });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to get user policy violations',
        error
      );
    }
  }
);