/**
 * CVPlus Premium Module - Main Export
 *
 * Premium subscription and billing management for CVPlus
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

// =============================================================================
// TYPES (Primary exports during build)
// =============================================================================

// Core types with migrated premium features
// Temporarily disabled - all types excluded due to complex dependencies
// export * from './types/subscription.types';
// export * from './types/billing.types';
// export * from './types/usage.types';

// Tier Management Types (temporarily disabled)
// export type {
//   UserTier,
//   TierConfig,
//   ...
// } from './services/tier-management/types';

// =============================================================================
// CONSTANTS (temporarily disabled)
// =============================================================================

// export * from './constants/premium.constants';

// =============================================================================
// SERVICES (temporarily disabled - require refactoring)
// =============================================================================

// NOTE: Services disabled during build - require dependency fixes
// export { StripeService } from './services/stripe.service';
// export { SubscriptionService } from './services/subscription.service';
// export { BillingService } from './services/billing.service';
// export { FeatureService } from './services/features.service';
// export { UsageService } from './services/usage.service';

// Tier Management Services (temporarily disabled)
// export { TierManager } from './services/tier-management/TierManager';

// Phase 2 Consolidated Services (temporarily disabled)
// export {
//   FeatureAccessService,
//   TierValidationService,
//   SubscriptionUtilsService,
//   ...
// } from './services';

// Backend services and functions (temporarily disabled)
// export { ... } from './backend';

// Middleware (temporarily disabled)
// export { PremiumGuardService, ... } from './middleware/premium-guard';

// Feature registry service (temporarily disabled)
// export { FeatureRegistry, featureRegistry } from './services/feature-registry';

// Core integration services (temporarily disabled)
// export {
//   CoreIntegrationServiceFactory,
//   coreIntegrationFactory,
//   ...
// } from './services/core-integration';

// =============================================================================
// REACT COMPONENTS (temporarily disabled)
// =============================================================================

// export { SubscriptionPlans } from './components/SubscriptionPlans';
// export { BillingHistory } from './components/BillingHistory';
// export { FeatureGate, InlineFeatureGate } from './components/FeatureGate';
// export { UpgradePrompt, CompactUpgradePrompt } from './components/UpgradePrompt';

// =============================================================================
// REACT HOOKS (temporarily disabled)
// =============================================================================

// export {
//   useSubscription,
//   useSubscriptionStatus,
//   useFeatureAccess,
//   useSubscriptionMetrics
// } from './hooks/useSubscription';

// export {
//   useBilling,
//   useBillingStats,
//   useRecentBillingActivity,
//   usePaymentMethods
// } from './hooks/useBilling';

// Feature gate hooks (temporarily disabled)
// export {
//   useFeatureGate,
//   useMultipleFeatureGates,
//   useFeatureGateWithRetry,
//   useConditionalFeature,
//   useFeatureGateAnalytics
// } from './hooks/useFeatureGate';

// =============================================================================
// UTILITY FUNCTIONS (temporarily disabled)
// =============================================================================

// export const formatCurrency = (
//   amount: number,
//   currency: string = 'USD',
//   locale: string = 'en-US'
// ): string => {
//   return new Intl.NumberFormat(locale, {
//     style: 'currency',
//     currency,
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2
//   }).format(amount / 100);
// };

// export const formatBillingDate = (
//   date: Date,
//   locale: string = 'en-US'
// ): string => {
//   return new Intl.DateTimeFormat(locale, {
//     year: 'numeric',
//     month: 'short',
//     day: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit'
//   }).format(date);
// };

// ============================================================================
// UTILITY FUNCTIONS (temporarily disabled - all commented out during build)
// ============================================================================

// export const validateEmail = (email: string): boolean => { ... };
// export const getSubscriptionAge = (createdAt: Date): number => { ... };
// export const getFeatureUtilization = (features: Record<string, boolean>): number => { ... };
// export const createIdempotencyKey = (operation: string, params: any): string => { ... };
// export const isStripeError = (error: any): boolean => { ... };

// =============================================================================
// VERSION INFO
// =============================================================================

export const PREMIUM_MODULE_VERSION = '1.0.0';
export const PREMIUM_MODULE_NAME = '@cvplus/premium';