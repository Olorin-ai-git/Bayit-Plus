/**
 * OverviewTab Component
 *
 * Profile overview with recent activity and account information
 * Converted from TailwindCSS to StyleSheet for React Native Web compatibility
 *
 * Features:
 * - Recent activity list with timestamps
 * - Activity type icons (watched/favorite)
 * - Account information display
 * - RTL layout support
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Star } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import type { RecentActivity } from '../types';

interface OverviewTabProps {
  isRTL: boolean;
  recentActivity: RecentActivity[];
}

interface InfoRowProps {
  label: string;
  value: string;
  isRTL: boolean;
}

function InfoRow({ label, value, isRTL }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      {isRTL ? (
        <>
          <Text style={[styles.infoValue, styles.textRight]}>{value}</Text>
          <Text style={[styles.infoLabel, styles.textRight]}>{label}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.infoLabel, styles.textLeft]}>{label}</Text>
          <Text style={[styles.infoValue, styles.textLeft]}>{value}</Text>
        </>
      )}
    </View>
  );
}

export function OverviewTab({ isRTL, recentActivity }: OverviewTabProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('profile.justNow', 'Just now');
    if (diffHours < 24) return t('profile.hoursAgo', '{{hours}} hours ago', { hours: diffHours });
    if (diffDays === 1) return t('profile.yesterday', 'Yesterday');
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
          {t('profile.recentActivity', 'Recent Activity')}
        </Text>
        <View style={styles.activityList}>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                {isRTL ? (
                  <>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityTitle, styles.textRight]} numberOfLines={1}>
                        {activity.title}
                      </Text>
                      <Text style={[styles.activityTimestamp, styles.textRight]}>
                        {formatTimestamp(activity.timestamp)}
                      </Text>
                    </View>
                    {activity.type === 'watched' ? (
                      <PlayCircle size={20} color="#6B21A8" />
                    ) : (
                      <Star size={20} color="#F59E0B" />
                    )}
                  </>
                ) : (
                  <>
                    {activity.type === 'watched' ? (
                      <PlayCircle size={20} color="#6B21A8" />
                    ) : (
                      <Star size={20} color="#F59E0B" />
                    )}
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityTitle, styles.textLeft]} numberOfLines={1}>
                        {activity.title}
                      </Text>
                      <Text style={[styles.activityTimestamp, styles.textLeft]}>
                        {formatTimestamp(activity.timestamp)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, isRTL && styles.textRight]}>
              {t('profile.noRecentActivity', 'No recent activity')}
            </Text>
          )}
        </View>
      </GlassView>

      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
          {t('profile.accountInfo', 'Account Information')}
        </Text>
        <View style={styles.infoList}>
          <InfoRow label={t('profile.name', 'Name')} value={user?.name || '-'} isRTL={isRTL} />
          <InfoRow label={t('profile.email', 'Email')} value={user?.email || '-'} isRTL={isRTL} />
          <InfoRow label={t('profile.role', 'Role')} value={user?.role || 'user'} isRTL={isRTL} />
        </View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  activityList: {
    gap: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  activityTimestamp: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    textAlign: 'left',
  },
  infoList: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
