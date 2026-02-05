import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/glass';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-8 max-w-md text-center">
      <div className="mb-6">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {t('onboarding.welcome.title', 'Welcome to Bayit+ Companion')}
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

        <GlassButton
          variant="ghost"
          onPress={onSkip}
          className="w-full text-white/60 text-sm"
          aria-label={t('onboarding.skipTutorial', 'Skip tutorial')}
        >
          {t('onboarding.skipTutorial', 'Skip tutorial')}
        </GlassButton>
      </div>
    </GlassCard>
  );
}
