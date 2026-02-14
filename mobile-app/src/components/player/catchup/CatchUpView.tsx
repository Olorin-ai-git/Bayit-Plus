/**
 * CatchUpView - Catch-up interface for late-joining viewers
 *
 * Shows an AI-generated summary of missed content with options
 * to view the full catch-up or seek to the beginning.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
import { GlassView } from '@bayit/shared';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { catchUpService } from '@bayit/shared-services/api';
import { Colors } from '../../../theme/colors';
import { CatchUpSummary } from './CatchUpSummary';
import logger from '@/utils/logger';

const log = logger.scope('CatchUpView');

interface CatchUpViewProps {
  contentId: string;
  missedDuration: number;
  onDismiss: () => void;
  onSeekToStart: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  if (mins < 1) {
    return `${Math.floor(seconds)}s`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins % 60}m`;
  }
  return `${mins}m`;
};

export const CatchUpView: React.FC<CatchUpViewProps> = ({
  contentId,
  missedDuration,
  onDismiss,
  onSeekToStart,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [summary, setSummary] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      log.info('Fetching catch-up summary', { contentId, missedDuration });
      const response = await catchUpService.getSummary(contentId, missedDuration);
      setSummary(response.events);
    } catch (err: unknown) {
      log.error('Failed to fetch catch-up summary', { contentId, error: err });
      setSummary([]);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, missedDuration]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <GlassView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconRow}>
          <NativeIcon name="clock" size="md" color={Colors.Primary.p400} />
          <Text
            style={[styles.title, { textAlign }]}
            accessible
            accessibilityRole="header"
          >
            {t('catchUp.title')}
          </Text>
        </View>
        <Text
          style={[styles.missedLabel, { textAlign }]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={t('catchUp.missedDuration', {
            duration: formatDuration(missedDuration),
          })}
        >
          {t('catchUp.missedDuration', {
            duration: formatDuration(missedDuration),
          })}
        </Text>
      </View>

      <CatchUpSummary summary={summary} isLoading={isLoading} />

      <View style={styles.actions}>
        <GlassButton
          variant="primary"
          onPress={onSeekToStart}
          style={styles.actionButton}
          accessibilityLabel={t('catchUp.watchFromBeginning')}
          accessibilityHint={t('catchUp.seekToStartHint')}
          accessibilityRole="button"
        >
          <View style={styles.buttonContent}>
            <NativeIcon name="skipBack" size="sm" color={Colors.white} />
            <Text style={styles.actionText}>
              {t('catchUp.watchFromBeginning')}
            </Text>
          </View>
        </GlassButton>

        <GlassButton
          variant="secondary"
          onPress={onDismiss}
          style={styles.actionButton}
          accessibilityLabel={t('catchUp.continueWatching')}
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>
            {t('catchUp.continueWatching')}
          </Text>
        </GlassButton>
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    margin: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  missedLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
  dismissText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
