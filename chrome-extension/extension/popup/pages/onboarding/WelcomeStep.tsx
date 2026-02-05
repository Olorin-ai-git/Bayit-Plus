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
          <img
            src="/assets/logo.png"
            alt="Bayit+"
            className="w-20 h-20 mx-auto"
          />
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
