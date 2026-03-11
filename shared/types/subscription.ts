/**
 * Subscription Plan Types
 *
 * Two-tier model matching backend: Free and Plus.
 * Plus is the AI enhancement tier for Plex/IPTV content.
 */

export enum PlanTier {
  FREE = "free",
  PLUS = "plus",
}

export type FeatureCategory = "content" | "ai" | "streaming" | "support";

export type FeatureValue = boolean | string;

export interface PlanFeatureAvailability {
  [PlanTier.FREE]: FeatureValue;
  [PlanTier.PLUS]: FeatureValue;
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
  billingPeriod: "monthly" | "yearly";
  startDate: string;
  endDate?: string;
  status: "active" | "cancelled" | "expired" | "trial";
}
