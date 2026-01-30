/**
 * useBetaFeatureGate Hook
 *
 * Reusable hook for gating AI features behind Beta 500 enrollment.
 * Shows enrollment modal when users try to access Beta features without access.
 */

import { useState, useCallback, useEffect } from 'react';

export type BetaFeature = 'live_dubbing' | 'ai_search' | 'ai_recommendations';

interface UseBetaFeatureGateOptions {
  /** Feature being accessed */
  feature: BetaFeature;
  /** User's Beta 500 enrollment status */
  isEnrolled: boolean;
  /** Callback when user should enroll */
  onEnrollmentRequired?: (feature: BetaFeature) => void;
  /** Skip gate check (for testing) */
  skipGate?: boolean;
}

interface UseBetaFeatureGateReturn {
  /** Whether user can access the feature */
  canAccess: boolean;
  /** Whether to show enrollment modal */
  showEnrollmentPrompt: boolean;
  /** Function to trigger feature access */
  requestFeatureAccess: () => void;
  /** Function to dismiss enrollment prompt */
  dismissPrompt: () => void;
  /** Remaining credits (if enrolled) */
  remainingCredits?: number;
}

/**
 * Hook to gate AI features behind Beta 500 enrollment
 *
 * @example
 * ```tsx
 * const { canAccess, showEnrollmentPrompt, requestFeatureAccess, dismissPrompt } = useBetaFeatureGate({
 *   feature: 'live_dubbing',
 *   isEnrolled: user?.betaStatus?.isEnrolled ?? false,
 *   onEnrollmentRequired: (feature) => {
 *     analytics.track('beta_enrollment_prompt', { feature });
 *   }
 * });
 *
 * const handleStartDubbing = () => {
 *   requestFeatureAccess(); // Shows modal if not enrolled
 *   if (canAccess) {
 *     startDubbing();
 *   }
 * };
 *
 * return (
 *   <>
 *     <Button onPress={handleStartDubbing}>Start Live Dubbing</Button>
 *     <BetaEnrollmentModal
 *       visible={showEnrollmentPrompt}
 *       onClose={dismissPrompt}
 *       onEnroll={handleEnroll}
 *     />
 *   </>
 * );
 * ```
 */
export const useBetaFeatureGate = ({
  feature,
  isEnrolled,
  onEnrollmentRequired,
  skipGate = false,
}: UseBetaFeatureGateOptions): UseBetaFeatureGateReturn => {
  const [showEnrollmentPrompt, setShowEnrollmentPrompt] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | undefined>();

  // Check if user can access the feature
  const canAccess = skipGate || isEnrolled;

  /**
   * Request access to the feature
   * Shows enrollment modal if user is not enrolled
   */
  const requestFeatureAccess = useCallback(() => {
    if (!canAccess) {
      setShowEnrollmentPrompt(true);
      onEnrollmentRequired?.(feature);
    }
  }, [canAccess, feature, onEnrollmentRequired]);

  /**
   * Dismiss the enrollment prompt
   */
  const dismissPrompt = useCallback(() => {
    setShowEnrollmentPrompt(false);
  }, []);

  return {
    canAccess,
    showEnrollmentPrompt,
    requestFeatureAccess,
    dismissPrompt,
    remainingCredits,
  };
};

/**
 * Hook variant that automatically checks feature access on mount
 * and shows enrollment prompt if needed
 */
export const useBetaFeatureGateWithAutoPrompt = (
  options: UseBetaFeatureGateOptions
): UseBetaFeatureGateReturn => {
  const result = useBetaFeatureGate(options);

  useEffect(() => {
    // Auto-prompt on mount if not enrolled
    if (!result.canAccess) {
      result.requestFeatureAccess();
    }
  }, []);

  return result;
};

export default useBetaFeatureGate;
