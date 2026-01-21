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
    <View style={styles.pausedWarning}>
      <View style={[styles.pausedContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pause size={20} color={colors.error} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pausedTitle}>
            {t('admin.uploads.queuePaused', 'Queue Paused')}
          </Text>
          <Text style={styles.pausedReason}>{pauseReason}</Text>
        </View>
        {onResumeQueue && (
          <GlassButton
            title={t('admin.uploads.resumeQueue', 'Resume')}
            variant="secondary"
            icon={<Play size={16} color={colors.success} />}
            onPress={onResumeQueue}
            style={styles.resumeButton}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pausedWarning: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pausedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pausedTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  pausedReason: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  resumeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
