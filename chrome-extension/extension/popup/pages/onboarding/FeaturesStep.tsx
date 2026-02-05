import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/glass';

interface FeaturesStepProps {
  onNext: () => void;
  audioDubbing: boolean;
  liveSubtitles: boolean;
  onToggleAudioDubbing: (enabled: boolean) => void;
  onToggleLiveSubtitles: (enabled: boolean) => void;
}

function FeatureToggle({
  iconType,
  title,
  description,
  enabled,
  onToggle,
}: {
  iconType: 'audio' | 'subtitles';
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const iconPaths: Record<string, string> = {
    audio: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
    subtitles: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
  };

  return (
    <GlassButton
      variant="ghost"
      onPress={() => onToggle(!enabled)}
      className={`w-full flex items-start gap-4 p-4 rounded-xl transition-all ${
        enabled
          ? 'bg-white/10 backdrop-blur-sm border-2 border-white/30'
          : 'bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-white/20'
      }`}
      aria-pressed={enabled}
      aria-label={`${title}: ${enabled ? 'enabled' : 'disabled'}`}
    >
      <div className="flex-shrink-0" aria-hidden="true">
        <svg className={`w-8 h-8 ${enabled ? 'text-blue-400' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPaths[iconType]} />
        </svg>
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
    </GlassButton>
  );
}

export function FeaturesStep({
  onNext,
  audioDubbing,
  liveSubtitles,
  onToggleAudioDubbing,
  onToggleLiveSubtitles,
}: FeaturesStepProps) {
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
          iconType="audio"
          title={t('onboarding.features.audioDubbing', 'Audio Dubbing')}
          description={t(
            'onboarding.features.audioDubbingDesc',
            'Replace original audio with dubbed voice in your language'
          )}
          enabled={audioDubbing}
          onToggle={onToggleAudioDubbing}
        />
        <FeatureToggle
          iconType="subtitles"
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
