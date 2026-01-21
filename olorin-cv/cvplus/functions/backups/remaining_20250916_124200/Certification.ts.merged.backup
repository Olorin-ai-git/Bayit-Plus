// @ts-ignore - Export conflicts/**
 * Certification-related type definitions for the CVPlus Workflow module
 */

export type BadgeType = 
  | 'cv-completion'
  | 'feature-master'
  | 'template-expert'
  | 'premium-user'
  | 'social-sharer'
  | 'multimedia-creator'
  | 'analytics-pro'
  | 'collaboration-champion'
  | 'early-adopter'
  | 'power-user';

export type BadgeStatus = 
  | 'active'
  | 'revoked'
  | 'expired'
  | 'pending';

export interface CertificationBadge {
  id: string;
  userId: string;
  badgeType: BadgeType;
  name: string;
  description?: string;
  status: BadgeStatus;
  issuedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  verificationCode?: string;
  verificationUrl?: string;
  issuer: string;
  criteria: {
    requirements: string[];
    thresholds: Record<string, number>;
    timeframe?: string;
  };
  evidence: {
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

export interface BadgeDefinition {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'achievement' | 'milestone' | 'engagement' | 'expertise';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  criteria: {
    requirements: Array<{
      type: 'feature_completion' | 'template_usage' | 'time_spent' | 'social_sharing' | 'premium_feature';
      value: number;
      operator: 'gte' | 'lte' | 'eq' | 'in';
      timeframe?: 'day' | 'week' | 'month' | 'year' | 'all_time';
    }>;
    combinationType: 'all' | 'any';
  };
  rewards?: {
    premiumDays?: number;
    templateAccess?: string[];
    featureUnlocks?: string[];
    discounts?: Array<{
      type: 'percentage' | 'fixed';
      value: number;
      validFor: string;
    }>;
  };
}

export interface BadgeProgress {
  userId: string;
  badgeType: BadgeType;
  progress: number; // 0-100
  currentValues: Record<string, number>;
  requiredValues: Record<string, number>;
  estimatedCompletion?: Date;
  lastUpdated: Date;
}

export interface CertificationVerification {
  badgeId: string;
  verificationCode: string;
  verifiedAt: Date;
  verifiedBy?: string;
  verificationMethod: 'code' | 'url' | 'blockchain' | 'api';
  isValid: boolean;
  errors?: string[];
}

export interface BadgeStatistics {
  totalBadges: number;
  badgesByType: Record<BadgeType, number>;
  badgesByStatus: Record<BadgeStatus, number>;
  issuanceRate: number;
  averageBadgesPerUser: number;
  topBadgeTypes: Array<{
    type: BadgeType;
    count: number;
    percentage: number;
  }>;
  monthlyIssuance: Array<{
    month: string;
    count: number;
    types: Record<BadgeType, number>;
  }>;
}

export interface BadgeCollection {
  userId: string;
  badges: CertificationBadge[];
  totalBadges: number;
  badgesByCategory: Record<string, number>;
  completionRate: number;
  nextAvailableBadges: Array<{
    badgeType: BadgeType;
    progress: number;
    requirements: string[];
  }>;
  achievements: {
    firstBadge?: Date;
    latestBadge?: Date;
    streakDays?: number;
    raresBadges: number;
  };
}