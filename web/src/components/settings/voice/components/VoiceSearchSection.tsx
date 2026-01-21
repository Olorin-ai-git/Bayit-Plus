/**
 * Voice Search Section Component
 * Voice search settings
 */

import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { VoiceSettingRow } from './VoiceSettingRow';

interface VoiceSearchSectionProps {
  voiceSearchEnabled: boolean;
  isRTL: boolean;
  onToggle: () => void;
}

export function VoiceSearchSection({
  voiceSearchEnabled,
  isRTL,
  onToggle,
}: VoiceSearchSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView className="p-6 gap-4">
      <Text className={`text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-1 ${isRTL ? 'text-right' : ''}`}>
        {t('profile.voice.voiceSearch', 'Voice Search')}
      </Text>

      <VoiceSettingRow
        label={t('profile.voice.voiceSearchEnabled', 'Enable voice search')}
        description={t('profile.voice.voiceSearchEnabledDesc', 'Search for content using your voice')}
        value={voiceSearchEnabled}
        onToggle={onToggle}
        isRTL={isRTL}
      />
    </GlassView>
  );
}
