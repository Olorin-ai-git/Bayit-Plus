/**
 * Beta 500 Mobile Components (iOS/Android)
 *
 * Export all Beta 500 components for mobile platforms.
 * All components use StyleSheet for React Native compatibility.
 */

export { CreditBalanceWidget } from './CreditBalanceWidget';
export { AISearchModal } from './AISearchModal';
export type { AISearchModalProps, AISearchResult, AISearchResponse } from './AISearchModal';
export { AIRecommendationsScreen } from './AIRecommendationsScreen';
export type {
  AIRecommendationsScreenProps,
  AIRecommendation,
  AIRecommendationsResponse,
} from './AIRecommendationsScreen';

// Re-export shared components (already React Native compatible)
export { BetaEnrollmentModal } from '../../../../shared/components/beta/BetaEnrollmentModal';
export { BetaProgramsSettings } from '../../../../shared/components/beta/BetaProgramsSettings';
export { BetaPostSignupWelcome } from '../../../../shared/components/beta/BetaPostSignupWelcome';

// Re-export hooks
export { useBetaFeatureGate } from '../../../../shared/hooks/useBetaFeatureGate';
export type { BetaFeature } from '../../../../shared/hooks/useBetaFeatureGate';
