/**
 * QueuePausedWarning Component
 * Displays warning when queue is paused with resume option
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pause, Play } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

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
    <View style={[styles.container, { backgroundColor: colors.error.DEFAULT + '15', borderColor: colors.error.DEFAULT + '40' }]}>
      <View style={[styles.contentRow, isRTL && styles.rowReverse]}>
        <Pause size={20} color={colors.error.DEFAULT} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.error.DEFAULT }]}>
            {t('admin.uploads.queuePaused', 'Queue Paused')}
          </Text>
          <Text style={[styles.reason, { color: colors.textSecondary }]}>{pauseReason}</Text>
        </View>
        {onResumeQueue && (
          <GlassButton
            title={t('admin.uploads.resumeQueue', 'Resume')}
            variant="secondary"
            icon={<Play size={16} color={colors.success.DEFAULT} />}
            onPress={onResumeQueue}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reason: {
    fontSize: 14,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
