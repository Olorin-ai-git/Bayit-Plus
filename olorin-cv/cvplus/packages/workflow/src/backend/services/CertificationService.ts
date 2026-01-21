/**
 * Certification Service
 *
 * Service for managing certification badges, badge issuance, validation,
 * and certification-related operations within the workflow system.
  */

import { getFirestore } from 'firebase-admin/firestore';
import { CertificationBadge, BadgeType, BadgeStatus, BadgeDefinition } from '../../types/Certification';

export class CertificationService {
  private db: FirebaseFirestore.Firestore | null = null;

  /**
   * Initialize Firestore database connection
   */
  private async initialize(): Promise<FirebaseFirestore.Firestore> {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  /**
   * Issue a certification badge to a user
    */
  async issueBadge(
    userId: string,
    badgeType: BadgeType,
    criteria: any,
    metadata?: any
  ): Promise<CertificationBadge> {
    const db = await this.initialize();

    try {
      // Get badge definition
      const badgeDefinition = await this.getBadgeDefinition(badgeType);

      if (!badgeDefinition) {
        throw new Error(`Badge type ${badgeType} not found`);
      }

      // Validate criteria
      const isEligible = await this.validateBadgeCriteria(userId, badgeType, criteria);

      if (!isEligible) {
        throw new Error(`User ${userId} does not meet criteria for badge ${badgeType}`);
      }

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const verificationUrl = `https://cvplus.com/verify/${verificationCode}`;

      const badge: CertificationBadge = {
        id: '', // Will be set by Firestore
        userId,
        badgeType,
        name: badgeDefinition.name,
        description: badgeDefinition.description,
        status: 'active',
        issuedAt: new Date(),
        verificationCode,
        verificationUrl,
        issuer: 'CVPlus Certification System',
        criteria: {
          requirements: badgeDefinition.criteria.requirements.map(r => r.type),
          thresholds: criteria.thresholds || {},
          timeframe: criteria.timeframe
        },
        evidence: criteria.evidence || {},
        metadata
      };

      const docRef = await db.collection('badge_certifications').add(badge);
      badge.id = docRef.id;

      await docRef.update({ id: docRef.id });

      // Store verification mapping
      await db.collection('badge_verifications').doc(verificationCode).set({
        badgeId: badge.id,
        userId,
        createdAt: new Date()
      });

      logger.info(`[CertificationService] Issued badge ${badgeType} to user ${userId}`);
      return badge;

    } catch (error) {
      logger.error(`[CertificationService] Error issuing badge:`, error);
      throw error;
    }
  }

  /**
   * Get all certification badges for a user
    */
  async getUserBadges(userId: string): Promise<CertificationBadge[]> {
    const db = await this.initialize();

    try {
      const snapshot = await db
        .collection('badge_certifications')
        .where('userId', '==', userId)
        .orderBy('issuedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as CertificationBadge);

    } catch (error) {
      logger.error(`[CertificationService] Error getting user badges for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific certification badge
    */
  async getBadge(badgeId: string): Promise<CertificationBadge | null> {
    const db = await this.initialize();

    try {
      const doc = await db.collection('badge_certifications').doc(badgeId).get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as CertificationBadge;

    } catch (error) {
      logger.error(`[CertificationService] Error getting badge ${badgeId}:`, error);
      throw error;
    }
  }

  /**
   * Verify a certification badge
    */
  async verifyBadge(badgeId: string, verificationCode?: string): Promise<{
    valid: boolean;
    badge?: CertificationBadge;
    reason?: string;
  }> {
    const db = await this.initialize();

    try {
      let badge: CertificationBadge | null = null;

      // Verify by code if provided
      if (verificationCode) {
        const verificationDoc = await db
          .collection('badge_verifications')
          .doc(verificationCode)
          .get();

        if (!verificationDoc.exists) {
          return {
            valid: false,
            reason: 'Invalid verification code'
          };
        }

        const verificationData = verificationDoc.data();
        badge = await this.getBadge(verificationData?.badgeId);
      } else {
        badge = await this.getBadge(badgeId);
      }

      if (!badge) {
        return {
          valid: false,
          reason: 'Badge not found'
        };
      }

      // Check badge status
      if (badge.status === 'revoked') {
        return {
          valid: false,
          badge,
          reason: 'Badge has been revoked'
        };
      }

      if (badge.status === 'expired') {
        return {
          valid: false,
          badge,
          reason: 'Badge has expired'
        };
      }

      // Check expiration date
      if (badge.expiresAt && new Date() > badge.expiresAt) {
        // Update status to expired
        await db.collection('badge_certifications').doc(badge.id).update({
          status: 'expired'
        });

        return {
          valid: false,
          badge,
          reason: 'Badge has expired'
        };
      }

      return {
        valid: true,
        badge
      };

    } catch (error) {
      logger.error('[CertificationService] Error verifying badge:', error);
      return {
        valid: false,
        reason: 'Error verifying badge'
      };
    }
  }

  /**
   * Revoke a certification badge
    */
  async revokeBadge(badgeId: string, reason: string): Promise<void> {
    const db = await this.initialize();

    try {
      await db.collection('badge_certifications').doc(badgeId).update({
        status: 'revoked',
        revokedAt: new Date(),
        'metadata.revocationReason': reason
      });

      logger.info(`[CertificationService] Revoked badge ${badgeId}: ${reason}`);

    } catch (error) {
      logger.error(`[CertificationService] Error revoking badge ${badgeId}:`, error);
      throw error;
    }
  }

  /**
   * Get available badge types
    */
  async getAvailableBadgeTypes(): Promise<Array<{
    type: BadgeType;
    name: string;
    description: string;
    criteria: any;
    icon: string;
    color: string;
  }>> {
    const db = await this.initialize();

    try {
      const snapshot = await db.collection('badge_definitions').get();

      return snapshot.docs.map(doc => {
        const def = doc.data() as BadgeDefinition;
        return {
          type: def.type,
          name: def.name,
          description: def.description,
          criteria: def.criteria,
          icon: def.icon,
          color: def.color
        };
      });

    } catch (error) {
      logger.error('[CertificationService] Error getting badge types:', error);
      throw error;
    }
  }

  /**
   * Check if user qualifies for a badge
    */
  async checkBadgeEligibility(userId: string, badgeType: BadgeType): Promise<{
    eligible: boolean;
    progress?: number;
    missingCriteria?: string[];
  }> {
    const db = await this.initialize();

    try {
      const badgeDefinition = await this.getBadgeDefinition(badgeType);

      if (!badgeDefinition) {
        return {
          eligible: false,
          missingCriteria: ['Badge type not found']
        };
      }

      // Get user data and activity
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return {
          eligible: false,
          missingCriteria: ['User not found']
        };
      }

      const missingCriteria: string[] = [];
      let metCriteria = 0;
      const totalCriteria = badgeDefinition.criteria.requirements.length;

      // Check each requirement
      for (const requirement of badgeDefinition.criteria.requirements) {
        const isMet = await this.checkRequirement(userId, requirement);

        if (!isMet) {
          missingCriteria.push(`${requirement.type}: ${requirement.value}`);
        } else {
          metCriteria++;
        }
      }

      const progress = totalCriteria > 0 ? (metCriteria / totalCriteria) * 100 : 0;
      const eligible = badgeDefinition.criteria.combinationType === 'all'
        ? missingCriteria.length === 0
        : metCriteria > 0;

      return {
        eligible,
        progress,
        missingCriteria: missingCriteria.length > 0 ? missingCriteria : undefined
      };

    } catch (error) {
      logger.error(`[CertificationService] Error checking eligibility for ${badgeType}:`, error);
      return {
        eligible: false,
        missingCriteria: ['Error checking eligibility']
      };
    }
  }

  /**
   * Generate badge verification URL
    */
  async generateVerificationUrl(badgeId: string): Promise<string> {
    const db = await this.initialize();

    try {
      const badge = await this.getBadge(badgeId);

      if (!badge) {
        throw new Error(`Badge ${badgeId} not found`);
      }

      if (badge.verificationUrl) {
        return badge.verificationUrl;
      }

      // Generate new verification code and URL
      const verificationCode = this.generateVerificationCode();
      const verificationUrl = `https://cvplus.com/verify/${verificationCode}`;

      await db.collection('badge_certifications').doc(badgeId).update({
        verificationCode,
        verificationUrl
      });

      // Update verification mapping
      await db.collection('badge_verifications').doc(verificationCode).set({
        badgeId,
        userId: badge.userId,
        createdAt: new Date()
      });

      return verificationUrl;

    } catch (error) {
      logger.error(`[CertificationService] Error generating verification URL:`, error);
      throw error;
    }
  }

  /**
   * Get badge statistics for a user
    */
  async getUserBadgeStatistics(userId: string): Promise<{
    totalBadges: number;
    badgesByType: Record<BadgeType, number>;
    recentBadges: CertificationBadge[];
    badgeProgress: Array<{
      badgeType: BadgeType;
      progress: number;
    }>;
  }> {
    const db = await this.initialize();

    try {
      const userBadges = await this.getUserBadges(userId);

      const badgesByType: Record<string, number> = {};
      userBadges.forEach(badge => {
        badgesByType[badge.badgeType] = (badgesByType[badge.badgeType] || 0) + 1;
      });

      // Get all available badge types
      const allBadgeTypes = await this.getAvailableBadgeTypes();
      const badgeProgress: Array<{ badgeType: BadgeType; progress: number }> = [];

      for (const badgeTypeInfo of allBadgeTypes) {
        const eligibility = await this.checkBadgeEligibility(userId, badgeTypeInfo.type);
        if (!eligibility.eligible && eligibility.progress && eligibility.progress > 0) {
          badgeProgress.push({
            badgeType: badgeTypeInfo.type,
            progress: eligibility.progress
          });
        }
      }

      return {
        totalBadges: userBadges.length,
        badgesByType: badgesByType as Record<BadgeType, number>,
        recentBadges: userBadges.slice(0, 5),
        badgeProgress: badgeProgress.sort((a, b) => b.progress - a.progress).slice(0, 5)
      };

    } catch (error) {
      logger.error(`[CertificationService] Error getting user badge statistics:`, error);
      throw error;
    }
  }

  /**
   * Get certification leaderboard
    */
  async getCertificationLeaderboard(badgeType?: BadgeType, limit: number = 10): Promise<Array<{
    userId: string;
    username: string;
    badgeCount: number;
    latestBadge?: CertificationBadge;
  }>> {
    const db = await this.initialize();

    try {
      let query = db.collection('badge_certifications');

      if (badgeType) {
        query = query.where('badgeType', '==', badgeType) as any;
      }

      const snapshot = await query.get();

      // Group by user
      const userBadgeCounts: Record<string, { count: number; latestBadge: CertificationBadge }> = {};

      snapshot.docs.forEach(doc => {
        const badge = doc.data() as CertificationBadge;
        if (!userBadgeCounts[badge.userId]) {
          userBadgeCounts[badge.userId] = { count: 0, latestBadge: badge };
        }

        userBadgeCounts[badge.userId].count++;

        if (!userBadgeCounts[badge.userId].latestBadge ||
            badge.issuedAt > userBadgeCounts[badge.userId].latestBadge.issuedAt) {
          userBadgeCounts[badge.userId].latestBadge = badge;
        }
      });

      // Get user names and create leaderboard
      const leaderboard = await Promise.all(
        Object.entries(userBadgeCounts).map(async ([userId, data]) => {
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.data();

          return {
            userId,
            username: userData?.displayName || userData?.email || 'Anonymous',
            badgeCount: data.count,
            latestBadge: data.latestBadge
          };
        })
      );

      // Sort by badge count and limit
      return leaderboard
        .sort((a, b) => b.badgeCount - a.badgeCount)
        .slice(0, limit);

    } catch (error) {
      logger.error('[CertificationService] Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Export badges for a user (for external verification)
    */
  async exportUserBadges(userId: string, format: 'json' | 'pdf' | 'blockchain'): Promise<string | Buffer> {
    const db = await this.initialize();

    try {
      const badges = await this.getUserBadges(userId);

      if (format === 'json') {
        return JSON.stringify(badges, null, 2);
      }

      if (format === 'pdf') {
        // In production, this would generate a PDF
        // For now, return JSON representation
        return Buffer.from(JSON.stringify(badges, null, 2));
      }

      if (format === 'blockchain') {
        // In production, this would create a blockchain record
        // For now, return verification hashes
        const blockchainData = badges.map(badge => ({
          badgeId: badge.id,
          userId: badge.userId,
          badgeType: badge.badgeType,
          issuedAt: badge.issuedAt,
          verificationCode: badge.verificationCode,
          hash: this.generateHash(badge)
        }));

        return JSON.stringify(blockchainData, null, 2);
      }

      throw new Error(`Unsupported export format: ${format}`);

    } catch (error) {
      logger.error(`[CertificationService] Error exporting badges for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get certification analytics
    */
  async getCertificationAnalytics(): Promise<{
    totalBadgesIssued: number;
    badgesByType: Record<BadgeType, number>;
    averageBadgesPerUser: number;
    topBadgeTypes: Array<{
      type: BadgeType;
      count: number;
    }>;
    monthlyIssuanceStats: Array<{
      month: string;
      count: number;
    }>;
  }> {
    const db = await this.initialize();

    try {
      const snapshot = await db.collection('badge_certifications').get();

      const totalBadgesIssued = snapshot.size;
      const badgesByType: Record<string, number> = {};
      const userSet = new Set<string>();
      const monthlyIssuance: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const badge = doc.data() as CertificationBadge;

        badgesByType[badge.badgeType] = (badgesByType[badge.badgeType] || 0) + 1;
        userSet.add(badge.userId);

        // Track monthly issuance
        const month = badge.issuedAt instanceof Date
          ? `${badge.issuedAt.getFullYear()}-${String(badge.issuedAt.getMonth() + 1).padStart(2, '0')}`
          : new Date().toISOString().slice(0, 7);

        monthlyIssuance[month] = (monthlyIssuance[month] || 0) + 1;
      });

      const averageBadgesPerUser = userSet.size > 0 ? totalBadgesIssued / userSet.size : 0;

      const topBadgeTypes = Object.entries(badgesByType)
        .map(([type, count]) => ({ type: type as BadgeType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const monthlyIssuanceStats = Object.entries(monthlyIssuance)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        totalBadgesIssued,
        badgesByType: badgesByType as Record<BadgeType, number>,
        averageBadgesPerUser,
        topBadgeTypes,
        monthlyIssuanceStats
      };

    } catch (error) {
      logger.error('[CertificationService] Error getting analytics:', error);
      throw error;
    }
  }

  // Helper methods

  private async getBadgeDefinition(badgeType: BadgeType): Promise<BadgeDefinition | null> {
    const db = await this.initialize();

    try {
      const doc = await db.collection('badge_definitions').doc(badgeType).get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as BadgeDefinition;

    } catch (error) {
      logger.error(`[CertificationService] Error getting badge definition for ${badgeType}:`, error);
      return null;
    }
  }

  private async validateBadgeCriteria(userId: string, badgeType: BadgeType, criteria: any): Promise<boolean> {
    const eligibility = await this.checkBadgeEligibility(userId, badgeType);
    return eligibility.eligible;
  }

  private async checkRequirement(userId: string, requirement: any): Promise<boolean> {
    const db = await this.initialize();

    try {
      // This is a simplified implementation
      // In production, this would check various metrics based on requirement.type

      switch (requirement.type) {
        case 'feature_completion':
          const completedFeatures = await db
            .collection('completed_features')
            .where('userId', '==', userId)
            .get();
          return completedFeatures.size >= requirement.value;

        case 'template_usage':
          const templateUsage = await db
            .collection('template_usage')
            .where('userId', '==', userId)
            .get();
          return templateUsage.size >= requirement.value;

        case 'time_spent':
          // Would check time tracking data
          return true;

        case 'social_sharing':
          const shares = await db
            .collection('social_shares')
            .where('userId', '==', userId)
            .get();
          return shares.size >= requirement.value;

        case 'premium_feature':
          const userDoc = await db.collection('users').doc(userId).get();
          return userDoc.exists && userDoc.data()?.isPremium === true;

        default:
          return false;
      }

    } catch (error) {
      logger.error('[CertificationService] Error checking requirement:', error);
      return false;
    }
  }

  private generateVerificationCode(): string {
    // Generate a secure random verification code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateHash(badge: CertificationBadge): string {
    // In production, this would use a proper hashing algorithm
    const data = `${badge.id}${badge.userId}${badge.badgeType}${badge.issuedAt}`;
    return Buffer.from(data).toString('base64').slice(0, 32);
  }
}

// Export singleton instance
export const certificationService = new CertificationService();
