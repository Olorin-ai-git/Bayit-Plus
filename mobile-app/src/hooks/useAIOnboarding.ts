/**
 * useAIOnboarding - AI features onboarding state management hook
 *
 * Tracks completion status, current step, and user preferences
 * for the AI onboarding flow. Persists completion via service API.
 */
import { useState, useEffect, useCallback } from 'react';
import { onboardingService } from '@bayit/shared-services/api';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('useAIOnboarding');

export type AIOnboardingStep = 'dubbing' | 'subtitles' | 'talkback' | 'companion';

const ONBOARDING_STEPS: AIOnboardingStep[] = [
  'dubbing',
  'subtitles',
  'talkback',
  'companion',
];

interface AIOnboardingPreferences {
  enableDubbing: boolean;
  enableSmartSubtitles: boolean;
  enableTalkBack: boolean;
  enableCompanion: boolean;
}

interface AIOnboardingState {
  currentStep: number;
  currentStepId: AIOnboardingStep;
  totalSteps: number;
  isCompleted: boolean;
  isLoading: boolean;
  preferences: AIOnboardingPreferences;
  goToNext: () => void;
  goToPrevious: () => void;
  skipOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updatePreference: (key: keyof AIOnboardingPreferences, value: boolean) => void;
}

export const useAIOnboarding = (): AIOnboardingState => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<AIOnboardingPreferences>({
    enableDubbing: true,
    enableSmartSubtitles: true,
    enableTalkBack: true,
    enableCompanion: true,
  });

  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    setIsLoading(true);
    try {
      const state = await onboardingService.getAIOnboardingStatus();
      if (state?.completed) {
        setIsCompleted(true);
      }
      if (state?.preferences) {
        setPreferences((prev) => ({ ...prev, ...state.preferences }));
      }
      if (typeof state?.lastStep === 'number') {
        setCurrentStep(state.lastStep);
      }
    } catch (err) {
      moduleLogger.warn('Failed to load onboarding state, starting fresh', { error: err });
    } finally {
      setIsLoading(false);
    }
  };

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await onboardingService.completeAIOnboarding({ preferences });
      setIsCompleted(true);
      moduleLogger.info('AI onboarding completed', { preferences });
    } catch (err) {
      moduleLogger.error('Failed to complete onboarding', { error: err });
      throw err;
    }
  }, [preferences]);

  const skipOnboarding = useCallback(async () => {
    try {
      await onboardingService.skipAIOnboarding();
      setIsCompleted(true);
      moduleLogger.info('AI onboarding skipped');
    } catch (err) {
      moduleLogger.error('Failed to skip onboarding', { error: err });
      throw err;
    }
  }, []);

  const updatePreference = useCallback(
    (key: keyof AIOnboardingPreferences, value: boolean) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return {
    currentStep,
    currentStepId: ONBOARDING_STEPS[currentStep],
    totalSteps: ONBOARDING_STEPS.length,
    isCompleted,
    isLoading,
    preferences,
    goToNext,
    goToPrevious,
    skipOnboarding,
    completeOnboarding,
    updatePreference,
  };
};
