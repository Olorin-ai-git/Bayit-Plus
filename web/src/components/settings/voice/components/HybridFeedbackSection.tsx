/**
 * Hybrid Feedback Section Component
 * Settings for voice feedback in hybrid mode
 */

import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { VoiceSettingRow } from './VoiceSettingRow';

interface HybridFeedbackSectionProps {
  voiceFeedbackEnabled: boolean;
  isRTL: boolean;
  onToggle: () => void;
}

export function HybridFeedbackSection({
  voiceFeedbackEnabled,
  isRTL,
  onToggle,
}: HybridFeedbackSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassView className="p-6 gap-4">
      <View className="flex-row items-center gap-2 mb-1" style={isRTL && styles.rowReverse}>
        <Zap size={16} color="#F59E0B" />
        <Text className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-0">
          {t('profile.voice.hybridFeedback', 'Interactive Feedback')}
        </Text>
      </View>

      <VoiceSettingRow
        label={t('profile.voice.voiceFeedback', 'Voice feedback on actions')}
        description={t('profile.voice.voiceFeedbackDesc', 'Get voice confirmation when you use the remote or click buttons')}
        value={voiceFeedbackEnabled}
        onToggle={onToggle}
        isRTL={isRTL}
      />

      <Text className="text-xs text-gray-500 italic pt-4 border-t border-white/5 mt-4" style={isRTL && styles.textRight}>
        {t('profile.voice.feedbackExample', 'Example: Click a movie → App says "Playing [Movie Name]"')}
      </Text>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
});
