/**
 * Comprehensive Policy Enforcement Service
 * Migrated from cv-processing submodule for proper domain boundaries.
 *
 * This service provides extensive admin policy logic, usage monitoring, and violation tracking.
 * It has been adapted for the admin submodule with appropriate dependency management.
  */

import { logger } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
// Premium service temporarily unavailable during cleanup
// import { PremiumService } from '@cvplus/premium';

// NOTE: These services would need to be provided via dependency injection
// or imported from appropriate submodules in a real implementation
interface CVHashService {
  generateCVHash(content: string): Promise<string>;
  checkForDuplicates(hash: string, userId: string): Promise<DuplicateCheckResult>;
  recordCVUpload(hash: string, userId: string, metadata: CVMetadata, requestInfo?: any): Promise<void>;
  flagPolicyViolation(hash: string, userId: string, type: string, details: any): Promise<void>;
}

interface NameVerificationService {
  extractNameFromCV(content: string): Promise<NameExtractionResult>;
  verifyNameMatch(extraction: NameExtractionResult, accountData: AccountNameData): Promise<NameVerificationResult>;
}

interface DuplicateCheckResult {
  shouldFlag: boolean;
  violationType?: string;
  confidence?: number;
  originalUserId?: string;
  originalUploadDate?: string;
}

interface CVMetadata {
  extractedName: string;
  fileSize: number;
  fileType: string;
  wordCount: number;
  contentPreview: string;
}

interface NameExtractionResult {
  extractedNames: string[];
}

interface NameVerificationResult {
  shouldFlag: boolean;
  extractedName: string;
  accountName: string;
  confidence: number;
  matchType: string;
  suggestions?: string[];
}

interface AccountNameData {
  firstName: string;
  lastName: string;
  fullName: string;
  displayName?: string;
  email: string;
}

interface ExternalDataSecurityAudit {
  userId: string;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  premiumStatus: boolean;
  errorCode: string;
  metadata: any;
}

interface RateLimitStatus {
  userId: string;
  currentHour: {
    requests: number;
    limit: number;
    remaining: number;
    resetTime: Date;
  };
  currentDay: {
    requests: number;
    limit: number;
    remaining: number;
    resetTime: Date;
  };
  isLimited: boolean;
  nextAllowedRequest?: Date;
}

export interface PolicyCheckRequest {
  userId: string;
  cvContent: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  requestInfo?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface ExternalDataPolicyCheckRequest {
  userId: string;
  sources: string[];
  requestInfo?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface PolicyCheckResult {
  allowed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  actions: PolicyAction[];
  metadata: {
    cvHash: string;
    extractedNames: string[];
    usageStats: UsageStats;
  };
}

export interface PolicyViolation {
  type: 'duplicate_cv' | 'name_mismatch' | 'usage_limit_exceeded' | 'account_sharing' | 'premium_required' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  requiresAction: boolean;
  suggestedActions: string[];
}

export interface PolicyWarning {
  type: 'approaching_limit' | 'name_similarity' | 'unusual_activity';
  message: string;
  details: any;
}

export interface PolicyAction {
  type: 'block_upload' | 'require_verification' | 'flag_account' | 'send_notification';
  priority: 'immediate' | 'high' | 'medium' | 'low';
  payload: any;
}

export interface UsageStats {
  currentMonthUploads: number;
  uniqueCVsThisMonth: number;
  remainingUploads: number;
  subscriptionStatus: 'free' | 'premium';
  lifetimeAccess: boolean;
}

export class ComprehensivePolicyEnforcementService {
  private readonly db = getFirestore();

  // These would be injected in a real implementation
  private cvHashService!: CVHashService;
  private nameVerificationService!: NameVerificationService;

  private readonly FREE_PLAN_LIMITS = {
    monthlyUploads: 3,
    uniqueCVs: 1
  };

  private readonly PREMIUM_PLAN_LIMITS = {
    monthlyUploads: Infinity,
    uniqueCVs: 3
  };

  private readonly EXTERNAL_DATA_RATE_LIMITS = {
    free: {
      requestsPerHour: 3,
      requestsPerDay: 10,
      burstLimit: 1
    },
    premium: {
      requestsPerHour: 100,
      requestsPerDay: 500,
      burstLimit: 10
    }
  };

  /**
   * Set dependencies - would be handled by dependency injection in a real implementation
    */
  setDependencies(cvHashService: CVHashService, nameVerificationService: NameVerificationService) {
    this.cvHashService = cvHashService;
    this.nameVerificationService = nameVerificationService;
  }

  /**
   * Comprehensive policy check for CV upload
    */
  async checkUploadPolicy(request: PolicyCheckRequest): Promise<PolicyCheckResult> {
    try {
      // Skip policy checks in development/emulator environment
      const isDevelopment = process.env.FUNCTIONS_EMULATOR === 'true' ||
                           process.env.NODE_ENV === 'development' ||
                           process.env.FIRESTORE_EMULATOR_HOST;

      if (isDevelopment) {
        logger.info('Skipping policy checks in development environment', {
          userId: request.userId,
          FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR,
          NODE_ENV: process.env.NODE_ENV,
          FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST
        });

        // Return allowed result with minimal metadata
        return {
          allowed: true,
          violations: [],
          warnings: [],
          actions: [],
          metadata: {
            cvHash: 'dev-hash-' + Date.now(),
            extractedNames: [],
            usageStats: {
              currentMonthUploads: 0,
              uniqueCVsThisMonth: 0,
              remainingUploads: 999,
              subscriptionStatus: 'free' as const,
              lifetimeAccess: false
            }
          }
        };
      }

      logger.info('Starting policy check', {
        userId: request.userId,
        fileName: request.fileName,
        fileSize: request.fileSize
      });

      const violations: PolicyViolation[] = [];
      const warnings: PolicyWarning[] = [];
      const actions: PolicyAction[] = [];

      // Step 1: Get user account and subscription info
      const [userAccount, subscriptionData] = await Promise.all([
        this.getUserAccountInfo(request.userId),
        this.getUserSubscriptionData(request.userId)
      ]);

      // Step 2: Check usage limits
      const usageStats = await this.checkUsageLimits(request.userId, subscriptionData);
      if (usageStats.remainingUploads <= 0) {
        violations.push({
          type: 'usage_limit_exceeded',
          severity: 'high',
          message: 'Monthly upload limit exceeded',
          details: { usageStats },
          requiresAction: true,
          suggestedActions: ['upgrade_to_premium', 'wait_for_next_month']
        });

        actions.push({
          type: 'block_upload',
          priority: 'immediate',
          payload: { reason: 'usage_limit_exceeded', usageStats }
        });
      } else if (usageStats.remainingUploads <= 1) {
        warnings.push({
          type: 'approaching_limit',
          message: 'Approaching monthly upload limit',
          details: { usageStats }
        });
      }

      // Step 3: Generate CV hash and check for duplicates (if service available)
      let cvHash = 'hash-' + Date.now();
      if (this.cvHashService) {
        cvHash = await this.cvHashService.generateCVHash(request.cvContent);
        const duplicateCheck = await this.cvHashService.checkForDuplicates(cvHash, request.userId);

        if (duplicateCheck.shouldFlag) {
          violations.push({
            type: 'duplicate_cv',
            severity: duplicateCheck.violationType === 'exact_duplicate' ? 'critical' : 'high',
            message: 'Duplicate CV detected',
            details: {
              violationType: duplicateCheck.violationType,
              confidence: duplicateCheck.confidence,
              originalUserId: duplicateCheck.originalUserId,
              originalUploadDate: duplicateCheck.originalUploadDate
            },
            requiresAction: true,
            suggestedActions: ['verify_ownership', 'use_original_cv', 'contact_support']
          });

          actions.push({
            type: 'require_verification',
            priority: 'high',
            payload: { verificationType: 'cv_ownership', duplicateCheck }
          });
        }
      }

      // Step 4: Extract and verify name (if service available)
      let nameExtraction: NameExtractionResult = { extractedNames: [] };
      if (this.nameVerificationService) {
        nameExtraction = await this.nameVerificationService.extractNameFromCV(request.cvContent);

        if (nameExtraction.extractedNames.length > 0) {
          const nameVerification = await this.nameVerificationService.verifyNameMatch(
            nameExtraction,
            userAccount
          );

          if (nameVerification.shouldFlag) {
            violations.push({
              type: 'name_mismatch',
              severity: nameVerification.confidence < 0.3 ? 'critical' : 'high',
              message: 'Name in CV does not match account name',
              details: {
                extractedName: nameVerification.extractedName,
                accountName: nameVerification.accountName,
                confidence: nameVerification.confidence,
                matchType: nameVerification.matchType,
                suggestions: nameVerification.suggestions || []
              },
              requiresAction: true,
              suggestedActions: ['verify_name', 'update_account_name', 'explain_difference']
            });

            actions.push({
              type: 'require_verification',
              priority: 'high',
              payload: { verificationType: 'name_mismatch', nameVerification }
            });
          }
        }
      }

      // Step 5: Record the check results
      await this.recordPolicyCheck(request.userId, {
        violations,
        warnings,
        cvHash,
        nameExtraction,
        usageStats,
        requestInfo: request.requestInfo
      });

      const result: PolicyCheckResult = {
        allowed: violations.every(v => !v.requiresAction),
        violations,
        warnings,
        actions,
        metadata: {
          cvHash,
          extractedNames: nameExtraction.extractedNames,
          usageStats
        }
      };

      logger.info('Policy check completed', {
        userId: request.userId,
        allowed: result.allowed,
        violationsCount: violations.length,
        warningsCount: warnings.length,
        actionsCount: actions.length
      });

      return result;

    } catch (error) {
      logger.error('Error during policy check', { error, userId: request.userId });
      throw new Error('Policy check failed');
    }
  }

  /**
   * Check user's monthly usage limits
    */
  private async checkUsageLimits(userId: string, subscriptionData: any): Promise<UsageStats> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get user's uploads this month
      const uploadsQuery = await this.db
        .collection('userPolicyRecords')
        .doc(userId)
        .collection('uploadHistory')
        .where('uploadDate', '>=', startOfMonth)
        .get();

      const currentMonthUploads = uploadsQuery.size;
      const uniqueCVHashes = new Set(
        uploadsQuery.docs.map(doc => doc.data().cvHash)
      ).size;

      const isLifetimeAccess = subscriptionData.lifetimeAccess === true;
      const isPremium = subscriptionData.subscriptionStatus === 'premium' || isLifetimeAccess;

      const limits = isPremium ? this.PREMIUM_PLAN_LIMITS : this.FREE_PLAN_LIMITS;

      return {
        currentMonthUploads,
        uniqueCVsThisMonth: uniqueCVHashes,
        remainingUploads: Math.max(0, limits.monthlyUploads - currentMonthUploads),
        subscriptionStatus: isPremium ? 'premium' : 'free',
        lifetimeAccess: isLifetimeAccess
      };

    } catch (error) {
      logger.error('Error checking usage limits', { error, userId });
      throw new Error('Failed to check usage limits');
    }
  }

  /**
   * Get user account information
    */
  private async getUserAccountInfo(userId: string): Promise<AccountNameData> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new Error('User account not found');
      }

      const userData = userDoc.data()!;

      return {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        fullName: userData.displayName || userData.fullName || `${userData.firstName} ${userData.lastName}`.trim(),
        displayName: userData.displayName,
        email: userData.email
      };

    } catch (error) {
      logger.error('Error getting user account info', { error, userId });
      throw new Error('Failed to get user account information');
    }
  }

  /**
   * Get user subscription data using real PremiumService
   */
  private async getUserSubscriptionData(userId: string): Promise<{ subscriptionStatus: string; lifetimeAccess: boolean }> {
    try {
      // Premium service temporarily unavailable during cleanup
      // const subscriptionData = await PremiumService.getUserSubscription(userId);
      const subscriptionData = { status: 'free', lifetimeAccess: false };
      return {
        subscriptionStatus: subscriptionData.status || 'free',
        lifetimeAccess: subscriptionData.lifetimeAccess || false
      };
    } catch (error) {
      logger.error('Failed to get user subscription data', { userId, error });
      // Fallback to free plan if subscription service fails
      return { subscriptionStatus: 'free', lifetimeAccess: false };
    }
  }

  /**
   * Record policy check results
    */
  private async recordPolicyCheck(userId: string, checkData: any): Promise<void> {
    try {
      // Skip recording in development environment
      const isDevelopment = process.env.FUNCTIONS_EMULATOR === 'true' ||
                           process.env.NODE_ENV === 'development' ||
                           process.env.FIRESTORE_EMULATOR_HOST;

      if (isDevelopment) {
        logger.info('Skipping policy check recording in development environment');
        return;
      }

      const policyRecordRef = this.db.collection('userPolicyRecords').doc(userId);
      const checkRecord = {
        userId,
        timestamp: new Date(),
        violations: checkData.violations || [],
        warnings: checkData.warnings || [],
        cvHash: checkData.cvHash || '',
        nameExtraction: checkData.nameExtraction || null,
        usageStats: checkData.usageStats || null,
        requestInfo: {
          ipAddress: checkData.requestInfo?.ipAddress || 'unknown',
          userAgent: checkData.requestInfo?.userAgent || 'unknown'
        }
      };

      // Get existing document to handle increment properly
      const existingDoc = await policyRecordRef.get();
      const existingData = existingDoc.exists ? existingDoc.data() : null;

      // Update user's policy record
      await policyRecordRef.set({
        userId,
        lastCheckDate: new Date(),
        totalChecks: (existingData?.totalChecks || 0) + 1,
        totalViolations: (existingData?.totalViolations || 0) + checkData.violations.length,
        totalWarnings: (existingData?.totalWarnings || 0) + checkData.warnings.length
      }, { merge: true });

      // Add to check history
      await policyRecordRef.collection('checkHistory').add(checkRecord);

      // Record violations separately for monitoring
      if (checkData.violations && checkData.violations.length > 0) {
        await this.db.collection('policyViolations').add({
          userId,
          violations: checkData.violations,
          cvHash: checkData.cvHash || '',
          createdAt: new Date(),
          metadata: {
            ipAddress: checkData.requestInfo?.ipAddress || 'unknown',
            userAgent: checkData.requestInfo?.userAgent || 'unknown'
          }
        });
      }

    } catch (error) {
      logger.error('Error recording policy check', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId
      });
      // Don't throw here - policy check should succeed even if logging fails
    }
  }

  /**
   * Get policy compliance statistics
    */
  async getPolicyStats(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalChecks: number;
    totalViolations: number;
    violationsByType: Record<string, number>;
    topViolatingUsers: string[];
  }> {
    try {
      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const violationsQuery = await this.db
        .collection('policyViolations')
        .where('createdAt', '>=', startDate)
        .get();

      const violationsByType: Record<string, number> = {};
      const userViolationCounts: Record<string, number> = {};

      violationsQuery.forEach(doc => {
        const data = doc.data();
        data.violations.forEach((violation: any) => {
          violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1;
        });
        userViolationCounts[data.userId] = (userViolationCounts[data.userId] || 0) + 1;
      });

      const topViolatingUsers = Object.entries(userViolationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId]) => userId);

      return {
        totalChecks: 0, // Would need separate tracking
        totalViolations: violationsQuery.size,
        violationsByType,
        topViolatingUsers
      };

    } catch (error) {
      logger.error('Error getting policy stats', { error, timeRange });
      throw new Error('Failed to get policy statistics');
    }
  }
}