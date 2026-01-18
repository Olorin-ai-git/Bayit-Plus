import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Star } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
import { useAuthStore } from '@/stores/authStore';
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
          <Text style={[styles.infoValue, { textAlign: 'left' }]}>{value}</Text>
          <Text style={[styles.infoLabel, { textAlign: 'right' }]}>{label}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.infoLabel, { textAlign: 'left' }]}>{label}</Text>
          <Text style={[styles.infoValue, { textAlign: 'right' }]}>{value}</Text>
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
    <View style={styles.sectionGrid}>
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('profile.recentActivity', 'Recent Activity')}
        </Text>
        <View style={styles.activityList}>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                {isRTL ? (
                  <>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityTitle, { textAlign: 'right' }]} numberOfLines={1}>
                        {activity.title}
                      </Text>
                      <Text style={[styles.activityTime, { textAlign: 'right' }]}>
                        {formatTimestamp(activity.timestamp)}
                      </Text>
                    </View>
                    {activity.type === 'watched' ? (
                      <PlayCircle size={20} color={colors.primary} />
                    ) : (
                      <Star size={20} color={colors.warning} />
                    )}
                  </>
                ) : (
                  <>
                    {activity.type === 'watched' ? (
                      <PlayCircle size={20} color={colors.primary} />
                    ) : (
                      <Star size={20} color={colors.warning} />
                    )}
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityTitle, { textAlign: 'left' }]} numberOfLines={1}>
                        {activity.title}
                      </Text>
                      <Text style={[styles.activityTime, { textAlign: 'left' }]}>
                        {formatTimestamp(activity.timestamp)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('profile.noRecentActivity', 'No recent activity')}
            </Text>
          )}
        </View>
      </GlassView>

      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
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
  sectionGrid: {
    gap: spacing.lg,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: 14,
    color: colors.text,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  infoList: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'left',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'right',
  },
});
