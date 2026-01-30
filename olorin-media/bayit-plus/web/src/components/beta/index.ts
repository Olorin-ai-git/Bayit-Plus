/**
 * Beta 500 Web Components
 *
 * Export all Beta 500 components for web platform.
 */

export { AISearchModal } from './AISearchModal';
export type { AISearchModalProps, AISearchResult, AISearchResponse } from './AISearchModal';

export { AIRecommendationsPanel } from './AIRecommendationsPanel';
export type {
  AIRecommendationsPanelProps,
  AIRecommendation,
  AIRecommendationsResponse,
} from './AIRecommendationsPanel';

export { BetaCreditBalance } from './BetaCreditBalance';
export type { BetaCreditBalanceProps } from './BetaCreditBalance';

// Re-export shared components (already work with web)
export { BetaEnrollmentModal } from '../../../../shared/components/beta/BetaEnrollmentModal';
export { BetaProgramsSettings } from '../../../../shared/components/beta/BetaProgramsSettings';
export { BetaPostSignupWelcome } from '../../../../shared/components/beta/BetaPostSignupWelcome';

// Re-export hooks
export { useBetaFeatureGate } from '../../../../shared/hooks/useBetaFeatureGate';
export type { BetaFeature } from '../../../../shared/hooks/useBetaFeatureGate';
