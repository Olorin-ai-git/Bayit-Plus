/**
 * GlassQueue Component
 * Real-time upload queue display with glass morphism design
 * Main orchestrator component that composes all queue sub-components
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
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
import { EmptyState } from '@/pages/admin/UploadsPage/components/EmptyState';
import { SkeletonCard, SkeletonStatCard } from '@/pages/admin/UploadsPage/components/Shared/SkeletonLoader';
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
        <View style={styles.skeletonStats}>
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </View>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
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

      {activeJob ? (
        <ActiveJobCard
          job={activeJob}
          isRTL={isRTL}
          textAlign={textAlign}
          onCancelJob={onCancelJob}
          cancellingJob={cancellingJob}
        />
      ) : (
        <View style={styles.activeJobSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('admin.uploads.queueDashboard.activeJob')}
          </Text>
          <EmptyState
            icon={Upload}
            iconColor="rgba(139, 92, 246, 0.4)"
            title={t('admin.uploads.queueDashboard.noActiveJob')}
            description={t('admin.uploads.queueDashboard.noActiveJobDescription')}
          />
        </View>
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
    padding: 24,
  },
  skeletonStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
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
  activeJobSection: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
});

export default GlassQueue;
