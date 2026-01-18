import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users, UserCheck, Clock } from 'lucide-react';
import { GlassView, GlassStatCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

interface StatsHeaderProps {
  friendsCount: number;
  pendingCount: number;
  isRTL: boolean;
}

export function StatsHeader({ friendsCount, pendingCount, isRTL }: StatsHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <GlassView style={styles.headerGlass} intensity="low">
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={styles.headerIcon}>
            <Users size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, isRTL && styles.textRTL]}>
              {t('friends.title', 'Friends & Opponents')}
            </Text>
            <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
              {t('friends.subtitle', 'Connect with players and challenge friends')}
            </Text>
          </View>
        </View>
      </GlassView>

      <View style={styles.statsRow}>
        <GlassStatCard
          icon={<UserCheck size={24} color={colors.success} />}
          iconColor={colors.success}
          label={t('friends.friendsLabel', 'Friends')}
          value={friendsCount}
          compact
          style={styles.statCard}
        />
        <GlassStatCard
          icon={<Clock size={24} color={colors.warning} />}
          iconColor={colors.warning}
          label={t('friends.pendingLabel', 'Pending')}
          value={pendingCount}
          compact
          style={styles.statCard}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerGlass: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glassPurpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
  },
  textRTL: {
    textAlign: 'right',
  },
});
