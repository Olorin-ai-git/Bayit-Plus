/**
 * User Profile Types
 *
 * Shared TypeScript types for CVPlus user management and authentication.
 * Based on data-model.md specification.
 *
 * @fileoverview Core user types including UserProfile, SubscriptionTier, and PrivacySettings
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Core User Profile Interface
// ============================================================================

/**
 * Represents platform users with authentication and subscription management
 */
export interface UserProfile {
  // Identity
  /** UUID primary key */
  id: string;
  /** Unique, validated email address */
  email: string;
  /** Display name (2-100 characters) */
  name: string;

  // Authentication
  /** Firebase Auth provider identifier */
  providerId: string;
  /** Last activity tracking for security */
  lastLoginAt: Timestamp;

  // Subscription & Billing
  /** Current subscription tier */
  subscription: SubscriptionTier;
  /** Available processing credits (cannot be negative) */
  credits: number;
  /** Subscription end date for paid tiers */
  subscriptionEndsAt?: Timestamp;

  // Preferences
  /** ISO 639-1 language code (default: 'en') */
  language: string;
  /** IANA timezone identifier */
  timezone: string;
  /** User privacy preferences */
  privacySettings: PrivacySettings;

  // Audit
  /** Account creation timestamp */
  createdAt: Timestamp;
  /** Last profile update timestamp */
  updatedAt: Timestamp;

  // Data Retention (GDPR Compliance)
  /** Last user activity for retention policy */
  lastActivityAt: Timestamp;
  /** Scheduled deletion date if account marked for deletion */
  deletionScheduledAt?: Timestamp;
}

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Available subscription tiers with progressive feature access
 */
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

/**
 * Type guard to check if value is a valid SubscriptionTier
 */
export function isSubscriptionTier(value: string): value is SubscriptionTier {
  return Object.values(SubscriptionTier).includes(value as SubscriptionTier);
}

/**
 * Subscription tier feature limits and allowances
 */
export interface SubscriptionLimits {
  /** Monthly processing credit allowance */
  monthlyCredits: number;
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Maximum number of public profiles */
  maxPublicProfiles: number;
  /** Data retention period in days */
  dataRetentionDays: number;
  /** Available feature types */
  availableFeatures: string[];
  /** Priority processing queue access */
  priorityProcessing: boolean;
  /** Custom branding options */
  customBranding: boolean;
}

/**
 * Get subscription limits for a given tier
 */
export function getSubscriptionLimits(tier: SubscriptionTier): SubscriptionLimits {
  switch (tier) {
    case SubscriptionTier.FREE:
      return {
        monthlyCredits: 3,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxPublicProfiles: 1,
        dataRetentionDays: 30,
        availableFeatures: ['ats_optimization'],
        priorityProcessing: false,
        customBranding: false
      };
    case SubscriptionTier.PREMIUM:
      return {
        monthlyCredits: 25,
        maxFileSize: 25 * 1024 * 1024, // 25MB
        maxPublicProfiles: 5,
        dataRetentionDays: 365,
        availableFeatures: [
          'ats_optimization',
          'personality_insights',
          'ai_podcast',
          'video_introduction',
          'interactive_timeline'
        ],
        priorityProcessing: true,
        customBranding: false
      };
    case SubscriptionTier.ENTERPRISE:
      return {
        monthlyCredits: 100,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxPublicProfiles: 20,
        dataRetentionDays: 1095, // 3 years
        availableFeatures: [
          'ats_optimization',
          'personality_insights',
          'ai_podcast',
          'video_introduction',
          'interactive_timeline',
          'portfolio_gallery',
          'custom_branding'
        ],
        priorityProcessing: true,
        customBranding: true
      };
    default:
      throw new Error(`Unknown subscription tier: ${tier}`);
  }
}

// ============================================================================
// Privacy Settings
// ============================================================================

/**
 * User privacy preferences and GDPR compliance settings
 */
export interface PrivacySettings {
  /** Allow creation and sharing of public profiles */
  allowPublicProfiles: boolean;
  /** Allow analytics tracking for platform improvement */
  allowAnalyticsTracking: boolean;
  /** Allow marketing and promotional emails */
  allowMarketingEmails: boolean;
  /** Custom data retention period (overrides default for premium+) */
  dataRetentionDays: number;
}

/**
 * Default privacy settings for new users
 */
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  allowPublicProfiles: true,
  allowAnalyticsTracking: true,
  allowMarketingEmails: false, // GDPR-compliant default
  dataRetentionDays: 30 // Free tier default
};

/**
 * Validate privacy settings object
 */
export function validatePrivacySettings(settings: Partial<PrivacySettings>): string[] {
  const errors: string[] = [];

  if (settings.dataRetentionDays !== undefined) {
    if (settings.dataRetentionDays < 1 || settings.dataRetentionDays > 3650) {
      errors.push('Data retention days must be between 1 and 3650');
    }
  }

  return errors;
}

// ============================================================================
// Validation and Utilities
// ============================================================================

/**
 * Validate UserProfile data before database operations
 */
export function validateUserProfile(profile: Partial<UserProfile>): string[] {
  const errors: string[] = [];

  // Email validation
  if (profile.email && !isValidEmail(profile.email)) {
    errors.push('Invalid email format');
  }

  // Name validation
  if (profile.name) {
    if (profile.name.length < 2 || profile.name.length > 100) {
      errors.push('Name must be 2-100 characters');
    }
  }

  // Credits validation
  if (profile.credits !== undefined && profile.credits < 0) {
    errors.push('Credits cannot be negative');
  }

  // Language validation
  if (profile.language && !isValidLanguageCode(profile.language)) {
    errors.push('Invalid ISO 639-1 language code');
  }

  // Subscription tier validation
  if (profile.subscription && !isSubscriptionTier(profile.subscription)) {
    errors.push('Invalid subscription tier');
  }

  // Privacy settings validation
  if (profile.privacySettings) {
    const privacyErrors = validatePrivacySettings(profile.privacySettings);
    errors.push(...privacyErrors);
  }

  return errors;
}

/**
 * Email format validation using RFC 5322 compliant regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validate ISO 639-1 language code
 */
export function isValidLanguageCode(code: string): boolean {
  const validCodes = [
    'en', 'es', 'fr', 'de', 'zh', 'pt', 'it', 'ja', 'ar', 'hi',
    'nl', 'ru', 'ko', 'pl', 'tr'
  ];
  return validCodes.includes(code.toLowerCase());
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if an object is a UserProfile
 */
export function isUserProfile(obj: any): obj is UserProfile {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.providerId === 'string' &&
    obj.lastLoginAt instanceof Timestamp &&
    isSubscriptionTier(obj.subscription) &&
    typeof obj.credits === 'number' &&
    typeof obj.language === 'string' &&
    typeof obj.timezone === 'string' &&
    typeof obj.privacySettings === 'object' &&
    obj.createdAt instanceof Timestamp &&
    obj.updatedAt instanceof Timestamp &&
    obj.lastActivityAt instanceof Timestamp
  );
}

/**
 * Create a new UserProfile with default values
 */
export function createUserProfile(
  id: string,
  email: string,
  name: string,
  providerId: string
): UserProfile {
  const now = Timestamp.now();

  return {
    id,
    email,
    name,
    providerId,
    lastLoginAt: now,
    subscription: SubscriptionTier.FREE,
    credits: 3, // Free tier starting credits
    language: 'en',
    timezone: 'UTC',
    privacySettings: DEFAULT_PRIVACY_SETTINGS,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now
  };
}

/**
 * Check if user has sufficient credits for an operation
 */
export function hasSufficientCredits(profile: UserProfile, required: number): boolean {
  return profile.credits >= required;
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(profile: UserProfile, feature: string): boolean {
  const limits = getSubscriptionLimits(profile.subscription);
  return limits.availableFeatures.includes(feature);
}

/**
 * Calculate days until subscription expires
 */
export function getDaysUntilExpiry(profile: UserProfile): number | null {
  if (!profile.subscriptionEndsAt) return null;

  const now = new Date();
  const expiry = profile.subscriptionEndsAt.toDate();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Check if user account is scheduled for deletion
 */
export function isScheduledForDeletion(profile: UserProfile): boolean {
  return profile.deletionScheduledAt !== undefined;
}

/**
 * Get days until account deletion
 */
export function getDaysUntilDeletion(profile: UserProfile): number | null {
  if (!profile.deletionScheduledAt) return null;

  const now = new Date();
  const deletion = profile.deletionScheduledAt.toDate();
  const diffTime = deletion.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}