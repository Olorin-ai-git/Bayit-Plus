/**
 * Onboarding Page
 *
 * 5-screen guided onboarding flow:
 * 1. Welcome
 * 2. Permissions explanation
 * 3. Language selection
 * 4. Authentication
 * 5. Try it out
 */

import { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import {
  WelcomeStep,
  PermissionsStep,
  LanguageStep,
  FeaturesStep,
  TryItStep,
} from './onboarding';

interface OnboardingPageProps {
  onComplete: () => void;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

/**
 * Onboarding Page Component
 */
export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const settingsStore = useSettingsStore();

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-6">
      {/* Progress Indicator */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`h-2 w-12 rounded-full transition-colors ${
              step <= currentStep
                ? 'bg-white/80'
                : 'bg-white/20'
            }`}
            aria-label={`Step ${step} of 5${step === currentStep ? ' (current)' : ''}`}
          />
        ))}
      </div>

      {currentStep === 1 && (
        <WelcomeStep onNext={handleNext} onSkip={handleSkip} />
      )}
      {currentStep === 2 && (
        <PermissionsStep onNext={handleNext} />
      )}
      {currentStep === 3 && (
        <LanguageStep
          onNext={handleNext}
          currentLanguage={settingsStore.targetLanguage}
          onLanguageChange={(lang) =>
            settingsStore.updateSettings({ targetLanguage: lang as 'en' | 'es' })
          }
        />
      )}
      {currentStep === 4 && (
        <FeaturesStep
          onNext={handleNext}
          audioDubbing={settingsStore.audioDubbing}
          liveSubtitles={settingsStore.liveSubtitles}
          onToggleAudioDubbing={(enabled) =>
            settingsStore.updateSettings({ audioDubbing: enabled })
          }
          onToggleLiveSubtitles={(enabled) =>
            settingsStore.updateSettings({ liveSubtitles: enabled })
          }
        />
      )}
      {currentStep === 5 && (
        <TryItStep onFinish={onComplete} />
      )}
    </div>
  );
}
