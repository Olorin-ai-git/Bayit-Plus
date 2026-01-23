/**
 * QueuePausedWarning Component
 * Displays warning when queue is paused with resume option
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pause, Play } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';

interface QueuePausedWarningProps {
  pauseReason?: string | null;
  isRTL: boolean;
  onResumeQueue?: () => void;
}

export const QueuePausedWarning: React.FC<QueuePausedWarningProps> = ({
  pauseReason,
  isRTL,
  onResumeQueue,
}) => {
  const { t } = useTranslation();

  return (
    <View className="rounded-lg p-4 mb-6 border" style={{ backgroundColor: colors.error + '15', borderColor: colors.error + '40' }}>
      <View style={[styles.contentRow, isRTL && styles.rowReverse]}>
        <Pause size={20} color={colors.error} />
        <View className="flex-1">
          <Text className="text-base font-semibold mb-1" style={{ color: colors.error }}>
            {t('admin.uploads.queuePaused', 'Queue Paused')}
          </Text>
          <Text className="text-sm" style={{ color: colors.textSecondary }}>{pauseReason}</Text>
        </View>
        {onResumeQueue && (
          <GlassButton
            title={t('admin.uploads.resumeQueue', 'Resume')}
            variant="secondary"
            icon={<Play size={16} color={colors.success} />}
            onPress={onResumeQueue}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
