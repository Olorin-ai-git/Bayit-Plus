/**
 * GlassQueue Component
 * Real-time upload queue display with glass morphism design
 * Main orchestrator component that composes all queue sub-components
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import {
  QueueHeader,
  ActiveJobCard,
  QueuedItemsList,
  RecentCompletedList,
  QueuePausedWarning,
} from './components';
import { GlassQueueProps } from './types';
import { isDuplicate } from './utils';

const GlassQueue: React.FC<GlassQueueProps> = ({
  stats,
  activeJob,
  queue = [],
  recentCompleted = [],
  queuePaused = false,
  pauseReason = null,
  loading = false,
  onResumeQueue,
  onClearCompleted,
  onCancelJob,
  clearingCompleted = false,
  cancellingJob = false,
  noCard = false,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection: directionFlex } = useDirection();

  const skippedCount = stats.skipped ?? (recentCompleted || []).filter(job => isDuplicate(job)).length;
  const actualFailures = stats.failed - skippedCount;

  if (loading) {
    const loadingContent = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );

    if (noCard) return loadingContent;
    return <GlassCard style={styles.cardPadding}>{loadingContent}</GlassCard>;
  }

  const queueContent = (
    <View style={noCard ? undefined : styles.contentPadding}>
      {!hideHeader && (
        <QueueHeader
          stats={stats}
          isRTL={isRTL}
          textAlign={textAlign}
          directionFlex={directionFlex}
          skippedCount={skippedCount}
          actualFailures={actualFailures}
        />
      )}

      {queuePaused && (
        <QueuePausedWarning
          pauseReason={pauseReason}
          isRTL={isRTL}
          onResumeQueue={onResumeQueue}
        />
      )}

      {activeJob && (
        <ActiveJobCard
          job={activeJob}
          isRTL={isRTL}
          textAlign={textAlign}
          onCancelJob={onCancelJob}
          cancellingJob={cancellingJob}
        />
      )}

      <QueuedItemsList
        queue={queue}
        isRTL={isRTL}
        textAlign={textAlign}
      />

      <RecentCompletedList
        recentCompleted={recentCompleted}
        isRTL={isRTL}
        textAlign={textAlign}
        onClearCompleted={onClearCompleted}
        clearingCompleted={clearingCompleted}
      />
    </View>
  );

  if (noCard) return queueContent;
  return <GlassCard style={styles.cardPadding}>{queueContent}</GlassCard>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  cardPadding: {
    padding: 24,
  },
  contentPadding: {
    padding: 24,
  },
});

export default GlassQueue;
