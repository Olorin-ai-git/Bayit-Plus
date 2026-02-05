import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/glass';

interface PermissionsStepProps {
  onNext: () => void;
}

function PermissionItem({
  iconType,
  title,
  description,
}: {
  iconType: 'audio' | 'storage' | 'globe';
  title: string;
  description: string;
}) {
  const iconPaths: Record<string, string> = {
    audio: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
    storage: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
    globe: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
  };

  return (
    <div className="flex gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl">
      <div className="flex-shrink-0" aria-hidden="true">
        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPaths[iconType]} />
        </svg>
      </div>
      <div>
        <h3 className="text-white font-medium mb-1">{title}</h3>
        <p className="text-white/70 text-sm">{description}</p>
      </div>
    </div>
  );
}

export function PermissionsStep({ onNext }: PermissionsStepProps) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-8 max-w-md">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        {t('onboarding.permissions.title', 'Required Permissions')}
      </h2>

      <div className="space-y-4 mb-8">
        <PermissionItem
          iconType="audio"
          title={t('onboarding.permissions.tabCapture.title', 'Audio Capture')}
          description={t(
            'onboarding.permissions.tabCapture.description',
            'Capture audio from video tabs to process for dubbing. Only when you activate dubbing.'
          )}
        />
        <PermissionItem
          iconType="storage"
          title={t('onboarding.permissions.storage.title', 'Storage')}
          description={t(
            'onboarding.permissions.storage.description',
            'Save your preferences and usage data locally.'
          )}
        />
        <PermissionItem
          iconType="globe"
          title={t('onboarding.permissions.sites.title', 'Site Access')}
          description={t(
            'onboarding.permissions.sites.description',
            'Access screenil.com, mako.co.il, 13tv.co.il, and kan.org.il to provide dubbing controls.'
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
