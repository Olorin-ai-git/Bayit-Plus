import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/glass';

interface TryItStepProps {
  onFinish: () => void;
}

function NumberedStep({ step, text }: { step: number; text: string }) {
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

export function TryItStep({ onFinish }: TryItStepProps) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-8 max-w-md text-center">
      <div className="mb-6">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {t('onboarding.tryIt.title', 'You\'re All Set!')}
        </h2>
        <p className="text-white/80 text-base mb-6">
          {t('onboarding.tryIt.subtitle', 'Here\'s how to get started:')}
        </p>
      </div>

      <div className="space-y-3 mb-8 text-left">
        <NumberedStep
          step={1}
          text={t('onboarding.tryIt.step1', 'Visit screenil.com, mako.co.il, 13tv.co.il, or kan.org.il')}
        />
        <NumberedStep
          step={2}
          text={t('onboarding.tryIt.step2', 'Start playing a video')}
        />
        <NumberedStep
          step={3}
          text={t('onboarding.tryIt.step3', 'Click the dubbing controls overlay and select your language')}
        />
        <NumberedStep
          step={4}
          text={t('onboarding.tryIt.step4', 'Enjoy real-time dubbing with zero sync issues!')}
        />
      </div>

      <GlassButton
        variant="primary"
        onPress={onFinish}
        className="w-full"
        aria-label={t('onboarding.tryIt.finish', 'Start Using Bayit+ Companion')}
      >
        {t('onboarding.tryIt.finish', 'Start Using Bayit+ Companion')}
      </GlassButton>
    </GlassCard>
  );
}
