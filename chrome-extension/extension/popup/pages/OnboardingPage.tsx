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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassSelect } from '@bayit/glass';
import { SUPPORTED_LANGUAGES } from '../../config/constants';
import { useSettingsStore } from '../stores/settingsStore';
import { logger } from '../../lib/logger';

interface OnboardingPageProps {
  onComplete: () => void;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

/**
 * Onboarding Page Component
 */
export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { t } = useTranslation();
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

      {/* Step 1: Welcome */}
      {currentStep === 1 && (
        <WelcomeStep onNext={handleNext} onSkip={handleSkip} />
      )}

      {/* Step 2: Permissions */}
      {currentStep === 2 && (
        <PermissionsStep onNext={handleNext} />
      )}

      {/* Step 3: Language Selection */}
      {currentStep === 3 && (
        <LanguageStep
          onNext={handleNext}
          currentLanguage={settingsStore.targetLanguage}
          onLanguageChange={(lang) =>
            settingsStore.updateSettings({ targetLanguage: lang as 'en' | 'es' })
          }
        />
      )}

      {/* Step 4: Feature Selection */}
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

      {/* Step 5: Try It Out */}
      {currentStep === 5 && (
        <TryItStep onFinish={onComplete} />
      )}
    </div>
  );
}

/**
 * Step 1: Welcome
 */
function WelcomeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-8 max-w-md text-center">
      <div className="mb-6">
        <div className="text-6xl mb-4">🎬</div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {t('onboarding.welcome.title', 'Welcome to Bayit+ Translator')}
        </h1>
        <p className="text-white/80 text-base leading-relaxed">
          {t(
            'onboarding.welcome.subtitle',
            'Real-time Hebrew dubbing for Israeli TV. Watch your favorite shows in English or Spanish with zero audio sync issues.'
          )}
        </p>
      </div>

      <div className="space-y-3">
        <GlassButton
          variant="primary"
          onPress={onNext}
          className="w-full"
          aria-label={t('common.getStarted', 'Get Started')}
        >
          {t('common.getStarted', 'Get Started')}
        </GlassButton>

        <button
          onClick={onSkip}
          className="w-full text-white/60 hover:text-white/80 text-sm transition-colors"
          aria-label={t('onboarding.skipTutorial', 'Skip tutorial')}
        >
          {t('onboarding.skipTutorial', 'Skip tutorial')}
        </button>
      </div>
    </GlassCard>
  );
}

/**
 * Step 2: Permissions Explanation
 */
function PermissionsStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-8 max-w-md">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        {t('onboarding.permissions.title', 'Required Permissions')}
      </h2>

      <div className="space-y-4 mb-8">
        <PermissionItem
          icon="🔊"
          title={t('onboarding.permissions.tabCapture.title', 'Audio Capture')}
          description={t(
            'onboarding.permissions.tabCapture.description',
            'Capture audio from video tabs to process for dubbing. Only when you activate dubbing.'
          )}
        />

        <PermissionItem
          icon="💾"
          title={t('onboarding.permissions.storage.title', 'Storage')}
          description={t(
            'onboarding.permissions.storage.description',
            'Save your preferences and usage data locally.'
          )}
        />

        <PermissionItem
          icon="🌐"
          title={t('onboarding.permissions.sites.title', 'Site Access')}
          description={t(
            'onboarding.permissions.sites.description',
            'Access screenil.com, mako.co.il, and 13tv.co.il to provide dubbing controls.'
          )}
        />
      </div>

      <GlassButton
        variant="primary"
        onPress={onNext}
        className="w-full"
        aria-label={t('common.continue', 'Continue')}
      >
        {t('common.continue', 'Continue')}
      </GlassButton>
    </GlassCard>
  );
}

function PermissionItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl">
      <div className="text-3xl flex-shrink-0" aria-hidden="true">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-medium mb-1">{title}</h3>
        <p className="text-white/70 text-sm">{description}</p>
      </div>
    </div>
  );
}

/**
 * Step 3: Language Selection
 */
function LanguageStep({
  onNext,
  currentLanguage,
  onLanguageChange,
}: {
  onNext: () => void;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}) {
  const { t } = useTranslation();

  const languageOptions = SUPPORTED_LANGUAGES.map((lang) => ({
    value: lang.code,
    label: `${lang.flag} ${lang.name}`,
  }));

  return (
    <GlassCard className="p-8 max-w-md">
      <h2 className="text-2xl font-bold text-white mb-2 text-center">
        {t('onboarding.language.title', 'Choose Target Language')}
      </h2>
      <p className="text-white/70 text-sm text-center mb-6">
        {t(
          'onboarding.language.description',
          'Select the language you want Hebrew content dubbed into'
        )}
      </p>

      <div className="mb-8">
        <GlassSelect
          label={t('onboarding.language.targetLabel', 'Target Language')}
          options={languageOptions}
          value={currentLanguage}
          onChange={onLanguageChange}
          aria-label={t('onboarding.language.targetLabel', 'Target Language')}
        />
      </div>

      <GlassButton
        variant="primary"
        onPress={onNext}
        className="w-full"
        aria-label={t('common.continue', 'Continue')}
      >
        {t('common.continue', 'Continue')}
      </GlassButton>
    </GlassCard>
  );
}

/**
 * Step 4: Features Selection
 */
function FeaturesStep({
  onNext,
  audioDubbing,
  liveSubtitles,
  onToggleAudioDubbing,
  onToggleLiveSubtitles,
}: {
  onNext: () => void;
  audioDubbing: boolean;
  liveSubtitles: boolean;
  onToggleAudioDubbing: (enabled: boolean) => void;
  onToggleLiveSubtitles: (enabled: boolean) => void;
}) {
  const { t } = useTranslation();

  const canProceed = audioDubbing || liveSubtitles;

  return (
    <GlassCard className="p-8 max-w-md">
      <h2 className="text-2xl font-bold text-white mb-2 text-center">
        {t('onboarding.features.title', 'Choose Features')}
      </h2>
      <p className="text-white/70 text-sm text-center mb-6">
        {t(
          'onboarding.features.description',
          'Select which features you want to use (you can change this later)'
        )}
      </p>

      <div className="space-y-4 mb-8">
        <FeatureToggle
          icon="🎙️"
          title={t('onboarding.features.audioDubbing', 'Audio Dubbing')}
          description={t(
            'onboarding.features.audioDubbingDesc',
            'Replace original audio with dubbed voice in your language'
          )}
          enabled={audioDubbing}
          onToggle={onToggleAudioDubbing}
        />

        <FeatureToggle
          icon="📝"
          title={t('onboarding.features.liveSubtitles', 'Live Subtitles')}
          description={t(
            'onboarding.features.liveSubtitlesDesc',
            'Real-time translated subtitles as text overlay'
          )}
          enabled={liveSubtitles}
          onToggle={onToggleLiveSubtitles}
        />
      </div>

      <GlassButton
        variant="primary"
        onPress={onNext}
        className="w-full"
        disabled={!canProceed}
        aria-label={t('common.continue', 'Continue')}
      >
        {t('common.continue', 'Continue')}
      </GlassButton>

      {!canProceed && (
        <p className="text-red-400 text-sm text-center mt-2">
          {t('onboarding.features.selectAtLeastOne', 'Please select at least one feature')}
        </p>
      )}
    </GlassCard>
  );
}

function FeatureToggle({
  icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`w-full flex items-start gap-4 p-4 rounded-xl transition-all ${
        enabled
          ? 'bg-white/10 backdrop-blur-sm border-2 border-white/30'
          : 'bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-white/20'
      }`}
      aria-pressed={enabled}
      aria-label={`${title}: ${enabled ? 'enabled' : 'disabled'}`}
    >
      <div className="text-3xl flex-shrink-0" aria-hidden="true">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h3 className="text-white font-medium mb-1">{title}</h3>
        <p className="text-white/70 text-sm">{description}</p>
      </div>
      <div
        className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-green-500' : 'bg-white/20'
        }`}
        aria-hidden="true"
      >
        <div
          className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${
            enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

/**
 * Step 5: Try It Out
 */
function TryItStep({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-8 max-w-md text-center">
      <div className="mb-6">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {t('onboarding.tryIt.title', 'You\'re All Set!')}
        </h2>
        <p className="text-white/80 text-base mb-6">
          {t(
            'onboarding.tryIt.subtitle',
            'Here\'s how to get started:'
          )}
        </p>
      </div>

      <div className="space-y-3 mb-8 text-left">
        <TryItStep
          step={1}
          text={t(
            'onboarding.tryIt.step1',
            'Visit screenil.com, mako.co.il, or 13tv.co.il'
          )}
        />
        <TryItStep
          step={2}
          text={t('onboarding.tryIt.step2', 'Start playing a video')}
        />
        <TryItStep
          step={3}
          text={t(
            'onboarding.tryIt.step3',
            'Click the dubbing controls overlay and select your language'
          )}
        />
        <TryItStep
          step={4}
          text={t(
            'onboarding.tryIt.step4',
            'Enjoy real-time dubbing with zero sync issues!'
          )}
        />
      </div>

      <GlassButton
        variant="primary"
        onPress={onFinish}
        className="w-full"
        aria-label={t('onboarding.tryIt.finish', 'Start Using Bayit+ Translator')}
      >
        {t('onboarding.tryIt.finish', 'Start Using Bayit+ Translator')}
      </GlassButton>
    </GlassCard>
  );
}

function TryItStep({ step, text }: { step: number; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-lg">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold"
        aria-label={`Step ${step}`}
      >
        {step}
      </div>
      <p className="text-white/90 text-sm">{text}</p>
    </div>
  );
}
