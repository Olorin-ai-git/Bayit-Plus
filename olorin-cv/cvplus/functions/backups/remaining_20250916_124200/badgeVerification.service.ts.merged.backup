// @ts-ignore - Export conflicts/**
 * Badge Verification Service
 * Integrates with digital badge providers for certification verification
 * Author: Gil Klainert
 * Date: 2025-08-22
 */

import { https } from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

interface Badge {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  imageUrl: string;
  verificationUrl: string;
  provider: 'credly' | 'accredible' | 'badgr' | 'custom';
  verified: boolean;
  metadata?: Record<string, any>;
}

interface VerificationResult {
  verified: boolean;
  badge: Badge;
  verificationDate: string;
  details?: {
    issuerVerified: boolean;
    dateValid: boolean;
    signatureValid: boolean;
    revoked: boolean;
  };
}

export class BadgeVerificationService {
  private db = admin.firestore();

  /**
   * Verify a badge with its provider
   */
  async verifyBadge(badgeUrl: string, provider: string): Promise<VerificationResult> {
    try {
      let result: VerificationResult;

      switch (provider) {
        case 'credly':
          result = await this.verifyCredlyBadge(badgeUrl);
          break;
        case 'accredible':
          result = await this.verifyAccredibleBadge(badgeUrl);
          break;
        case 'badgr':
          result = await this.verifyBadgrBadge(badgeUrl);
          break;
        default:
          result = await this.verifyCustomBadge(badgeUrl);
      }

      // Store verification result
      await this.storeVerificationResult(result);

      return result;
    } catch (error) {
      console.error('Badge verification error:', error);
      throw new https.HttpsError('internal', 'Failed to verify badge');
    }
  }

  /**
   * Verify Credly badge
   */
  private async verifyCredlyBadge(badgeUrl: string): Promise<VerificationResult> {
    try {
      // Extract badge ID from URL
      const badgeId = this.extractBadgeId(badgeUrl, 'credly');
      
      // Call Credly API
      const response = await axios.get(
        `https://api.credly.com/v1/badges/${badgeId}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env.CREDLY_API_KEY}`
          }
        }
      );

      const badgeData = response.data;

      return {
        verified: badgeData.state === 'accepted',
        badge: {
          id: badgeData.id,
          name: badgeData.badge_template.name,
          issuer: badgeData.badge_template.issuer.name,
          issueDate: badgeData.issued_at,
          expiryDate: badgeData.expires_at,
          imageUrl: badgeData.badge_template.image_url,
          verificationUrl: badgeUrl,
          provider: 'credly',
          verified: true,
          metadata: {
            skills: badgeData.badge_template.skills,
            description: badgeData.badge_template.description
          }
        },
        verificationDate: new Date().toISOString(),
        details: {
          issuerVerified: true,
          dateValid: this.isDateValid(badgeData.expires_at),
          signatureValid: true,
          revoked: badgeData.state === 'revoked'
        }
      };
    } catch (error) {
      console.error('Credly verification error:', error);
      throw error;
    }
  }

  /**
   * Verify Accredible badge
   */
  private async verifyAccredibleBadge(badgeUrl: string): Promise<VerificationResult> {
    try {
      // Extract credential ID from URL
      const credentialId = this.extractBadgeId(badgeUrl, 'accredible');
      
      // Call Accredible API
      const response = await axios.get(
        `https://api.accredible.com/v1/credentials/${credentialId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.ACCREDIBLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const credential = response.data.credential;

      return {
        verified: !credential.expired && !credential.revoked,
        badge: {
          id: credential.id,
          name: credential.name,
          issuer: credential.issuer.name,
          issueDate: credential.issued_on,
          expiryDate: credential.expired_on,
          imageUrl: credential.badge_image_url,
          verificationUrl: badgeUrl,
          provider: 'accredible',
          verified: true,
          metadata: {
            course: credential.course,
            grade: credential.grade
          }
        },
        verificationDate: new Date().toISOString(),
        details: {
          issuerVerified: true,
          dateValid: !credential.expired,
          signatureValid: true,
          revoked: credential.revoked
        }
      };
    } catch (error) {
      console.error('Accredible verification error:', error);
      throw error;
    }
  }

  /**
   * Verify Badgr badge
   */
  private async verifyBadgrBadge(badgeUrl: string): Promise<VerificationResult> {
    try {
      // Extract assertion ID from URL
      const assertionId = this.extractBadgeId(badgeUrl, 'badgr');
      
      // Call Badgr API
      const response = await axios.get(
        `https://api.badgr.io/v2/assertions/${assertionId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.BADGR_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      const assertion = response.data.result[0];

      return {
        verified: assertion.revoked === false,
        badge: {
          id: assertion.entityId,
          name: assertion.badgeclass.name,
          issuer: assertion.badgeclass.issuer.name,
          issueDate: assertion.issuedOn,
          expiryDate: assertion.expires,
          imageUrl: assertion.image,
          verificationUrl: badgeUrl,
          provider: 'badgr',
          verified: true,
          metadata: {
            criteria: assertion.badgeclass.criteria,
            tags: assertion.badgeclass.tags
          }
        },
        verificationDate: new Date().toISOString(),
        details: {
          issuerVerified: true,
          dateValid: this.isDateValid(assertion.expires),
          signatureValid: true,
          revoked: assertion.revoked
        }
      };
    } catch (error) {
      console.error('Badgr verification error:', error);
      throw error;
    }
  }

  /**
   * Verify custom badge (generic verification)
   */
  private async verifyCustomBadge(badgeUrl: string): Promise<VerificationResult> {
    try {
      // Attempt to fetch badge metadata
      const response = await axios.get(badgeUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      // Basic verification based on response
      const isValid = response.status === 200 && response.data;

      return {
        verified: isValid,
        badge: {
          id: this.generateBadgeId(badgeUrl),
          name: response.data.name || 'Custom Badge',
          issuer: response.data.issuer || 'Unknown Issuer',
          issueDate: response.data.issueDate || new Date().toISOString(),
          imageUrl: response.data.image || '',
          verificationUrl: badgeUrl,
          provider: 'custom',
          verified: isValid,
          metadata: response.data
        },
        verificationDate: new Date().toISOString(),
        details: {
          issuerVerified: false,
          dateValid: true,
          signatureValid: false,
          revoked: false
        }
      };
    } catch (error) {
      console.error('Custom badge verification error:', error);
      throw error;
    }
  }

  /**
   * Extract badge ID from URL based on provider
   */
  private extractBadgeId(url: string, provider: string): string {
    const patterns: Record<string, RegExp> = {
      credly: /badges\/([a-f0-9-]+)/,
      accredible: /credentials\/([a-f0-9-]+)/,
      badgr: /public\/assertions\/([a-zA-Z0-9_-]+)/
    };

    const match = url.match(patterns[provider]);
    if (!match) {
      throw new Error(`Invalid ${provider} badge URL`);
    }

    return match[1];
  }

  /**
   * Generate badge ID for custom badges
   */
  private generateBadgeId(url: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(url).digest('hex');
  }

  /**
   * Check if expiry date is valid
   */
  private isDateValid(expiryDate?: string): boolean {
    if (!expiryDate) return true;
    return new Date(expiryDate) > new Date();
  }

  /**
   * Store verification result in Firestore
   */
  private async storeVerificationResult(result: VerificationResult): Promise<void> {
    const verificationDoc = {
      ...result,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    await this.db.collection('badge_verifications').add(verificationDoc);
  }

  /**
   * Get user's verified badges
   */
  async getUserBadges(userId: string): Promise<Badge[]> {
    const snapshot = await this.db
      .collection('users')
      .doc(userId)
      .collection('badges')
      .where('verified', '==', true)
      .get();

    return snapshot.docs.map(doc => doc.data() as Badge);
  }

  /**
   * Add badge to user profile
   */
  async addBadgeToProfile(userId: string, badge: Badge): Promise<void> {
    await this.db
      .collection('users')
      .doc(userId)
      .collection('badges')
      .doc(badge.id)
      .set({
        ...badge,
        addedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Remove badge from user profile
   */
  async removeBadgeFromProfile(userId: string, badgeId: string): Promise<void> {
    await this.db
      .collection('users')
      .doc(userId)
      .collection('badges')
      .doc(badgeId)
      .delete();
  }

  /**
   * Batch verify multiple badges
   */
  async batchVerifyBadges(badges: Array<{url: string, provider: string}>): Promise<VerificationResult[]> {
    const verificationPromises = badges.map(badge => 
      this.verifyBadge(badge.url, badge.provider)
    );

    return Promise.all(verificationPromises);
  }

  /**
   * Check if badge needs reverification
   */
  async needsReverification(badge: Badge): Promise<boolean> {
    // Check if last verification was more than 30 days ago
    const lastVerification = await this.db
      .collection('badge_verifications')
      .where('badge.id', '==', badge.id)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (lastVerification.empty) return true;

    const lastVerificationDate = lastVerification.docs[0].data().timestamp.toDate();
    const daysSinceVerification = (Date.now() - lastVerificationDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceVerification > 30;
  }
}

// Export singleton instance
export const badgeVerificationService = new BadgeVerificationService();