/**
 * QueueDashboard Component
 * Enhanced queue visualization with stat cards and queue details
 * Uses design tokens exclusively - no hardcoded colors
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Upload, Clock, Play, CheckCircle } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import GlassQueue from '@/components/admin/GlassQueue';
import type { QueueState } from '../../types';

interface QueueDashboardProps {
  queueState: QueueState;
  onRefresh: () => void;
  loading?: boolean;
}

export const QueueDashboard: React.FC<QueueDashboardProps> = ({
  queueState,
  onRefresh,
  loading = false,
}) => {
  const { t } = useTranslation();

  const stats = [
    {
      icon: Upload,
      label: t('admin.uploads.queueDashboard.total'),
      value: queueState.totalJobs || 0,
      color: colors.primary.DEFAULT,
    },
    {
      icon: Clock,
      label: t('admin.uploads.queueDashboard.queued'),
      value: queueState.queuedJobs || 0,
      color: colors.warning.DEFAULT,
    },
    {
      icon: Play,
      label: t('admin.uploads.queueDashboard.active'),
      value: queueState.activeJobs || 0,
      color: colors.info.DEFAULT,
    },
    {
      icon: CheckCircle,
      label: t('admin.uploads.queueDashboard.done'),
      value: queueState.completedToday || 0,
      color: colors.success.DEFAULT,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <GlassCard key={index} style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: `${stat.color}20` },
                ]}
              >
                <IconComponent size={24} color={stat.color} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </GlassCard>
          );
        })}
      </View>

      {/* Existing GlassQueue Component */}
      <GlassQueue
        stats={queueState.stats}
        activeJob={queueState.activeJob}
        queuedJobs={queueState.queuedJobs}
        recentCompleted={queueState.recentCompleted}
        queuePaused={queueState.queuePaused}
        pauseReason={queueState.pauseReason}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
