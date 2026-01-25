/**
 * Subscription Plan Types
 *
 * Comprehensive type definitions for subscription tiers and plan features
 * Used across web, mobile, and TV platforms
 */

export enum PlanTier {
  NON_REGISTERED = 'non_registered',
  REGISTERED_FREE = 'registered_free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  FAMILY = 'family',
}

export type FeatureCategory =
  | 'content'
  | 'quality'
  | 'devices'
  | 'features'
  | 'support';

export type FeatureValue = boolean | string;

export interface PlanFeatureAvailability {
  [PlanTier.NON_REGISTERED]: FeatureValue;
  [PlanTier.REGISTERED_FREE]: FeatureValue;
  [PlanTier.BASIC]: FeatureValue;
  [PlanTier.PREMIUM]: FeatureValue;
  [PlanTier.FAMILY]: FeatureValue;
}

export interface PlanFeature {
  id: string;
  category: FeatureCategory;
  translationKey: string;
  availability: PlanFeatureAvailability;
}

export interface PlanConfig {
  id: PlanTier;
  price: string;
  popular?: boolean;
}

export interface SubscriptionMetadata {
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
}
