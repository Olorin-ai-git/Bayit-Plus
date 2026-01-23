/**
 * Voice Search Section Component
 * Voice search settings
 */

import { Text, StyleSheet } from 'react-native';
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
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
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

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  textRight: {
    textAlign: 'right',
  },
});
