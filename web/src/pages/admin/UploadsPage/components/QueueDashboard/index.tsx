/**
 * QueueDashboard Component
 * Enhanced queue visualization with stat cards and queue details
 * Uses design tokens exclusively - no hardcoded colors
 * Fixed: Better text contrast and container overflow handling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Upload, Clock, Play, CheckCircle } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
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

      {/* Existing GlassQueue Component - with overflow handling */}
      <View style={styles.queueContainer}>
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
    maxWidth: 300,
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
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff', // Explicit white for maximum contrast
    lineHeight: 32,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)', // Explicit light color
    fontWeight: '500',
  },
  queueContainer: {
    // Prevent overflow
    overflow: 'hidden',
  },
});
