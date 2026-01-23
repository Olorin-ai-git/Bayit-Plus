/**
 * PlayerProfileStats Component
 *
 * Statistics display with quick stats grid and detailed sections
 * Part of PlayerProfilePage migration from TailwindCSS to StyleSheet
 *
 * Features:
 * - Quick stats grid (4 stat cards)
 * - Performance section (games, wins, losses, draws)
 * - Achievements section (rating, peak, streaks)
 * - Icon-enhanced stat rows
 * - RTL layout support
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Gamepad2,
  Award,
  Target,
  Zap,
} from 'lucide-react';
import { GlassStatCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';

const IS_TV_BUILD = process.env.REACT_APP_PLATFORM === 'tv';

const StatsSchema = z.object({
  chess_rating: z.number(),
  peak_rating: z.number(),
  chess_games_played: z.number(),
  chess_wins: z.number(),
  chess_losses: z.number(),
  chess_draws: z.number(),
  chess_win_rate: z.number(),
  current_win_streak: z.number(),
  best_win_streak: z.number(),
});

const PlayerProfileStatsPropsSchema = z.object({
  stats: StatsSchema,
  isRTL: z.boolean(),
});

type PlayerProfileStatsProps = z.infer<typeof PlayerProfileStatsPropsSchema>;

export default function PlayerProfileStats({
  stats,
  isRTL,
}: PlayerProfileStatsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Quick Stats */}
      <View style={styles.quickStatsRow}>
        <GlassStatCard
          icon={Gamepad2}
          iconColor={colors.primary}
          label={t('stats.gamesPlayed', 'Games Played')}
          value={stats.chess_games_played}
        />
        <GlassStatCard
          icon={Trophy}
          iconColor={colors.warning}
          label={t('stats.wins', 'Wins')}
          value={stats.chess_wins}
        />
        <GlassStatCard
          icon={TrendingUp}
          iconColor={colors.success}
          label={t('stats.winRate', 'Win Rate')}
          value={`${stats.chess_win_rate.toFixed(1)}%`}
        />
        <GlassStatCard
          icon={Zap}
          iconColor={colors.error}
          label={t('stats.winStreak', 'Win Streak')}
          value={stats.current_win_streak}
        />
      </View>

      {/* Performance Section */}
      <View style={IS_TV_BUILD ? styles.sectionContainerTV : styles.sectionContainer}>
        <Text style={[
          styles.sectionHeader,
          isRTL && styles.textRight,
        ]}>
          {t('stats.performance', 'Performance')}
        </Text>
        <View style={styles.statsGroup}>
          <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
            <Text style={styles.statLabel}>
              {t('stats.totalGames', 'Total Games')}
            </Text>
            <Text style={styles.statValue}>
              {stats.chess_games_played}
            </Text>
          </View>
          <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
            <View style={[styles.statRowWithIcon, isRTL && styles.statRowWithIconRTL]}>
              <Trophy size={16} color={colors.success} />
              <Text style={styles.statLabel}>
                {t('stats.wins', 'Wins')}
              </Text>
            </View>
            <Text style={styles.statValueGreen}>
              {stats.chess_wins}
            </Text>
          </View>
          <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
            <View style={[styles.statRowWithIcon, isRTL && styles.statRowWithIconRTL]}>
              <TrendingDown size={16} color={colors.error} />
              <Text style={styles.statLabel}>
                {t('stats.losses', 'Losses')}
              </Text>
            </View>
            <Text style={styles.statValueRed}>
              {stats.chess_losses}
            </Text>
          </View>
          <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
            <Text style={styles.statLabel}>
              {t('stats.draws', 'Draws')}
            </Text>
            <Text style={styles.statValue}>
              {stats.chess_draws}
            </Text>
          </View>
        </View>
      </View>

      {/* Achievements Section */}
      <View style={IS_TV_BUILD ? styles.sectionContainerTV : styles.sectionContainer}>
        <Text style={[
          styles.sectionHeader,
          isRTL && styles.textRight,
        ]}>
          {t('stats.achievements', 'Achievements')}
        </Text>
        <View style={styles.statsGroup}>
          <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
            <View style={[styles.statRowWithIcon, isRTL && styles.statRowWithIconRTL]}>
              <Award size={16} color={colors.warning} />
              <Text style={styles.statLabel}>
                {t('stats.currentRating', 'Current Rating')}
              </Text>
            </View>
            <Text style={styles.statValueYellow}>
              {stats.chess_rating}
            </Text>
          </View>
          <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
            <View style={[styles.statRowWithIcon, isRTL && styles.statRowWithIconRTL]}>
              <Target size={16} color={colors.primary} />
              <Text style={styles.statLabel}>
                {t('stats.peakRating', 'Peak Rating')}
              </Text>
            </View>
            <Text style={styles.statValuePurple}>
              {stats.peak_rating}
            </Text>
          </View>
          <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
            <View style={[styles.statRowWithIcon, isRTL && styles.statRowWithIconRTL]}>
              <Zap size={16} color={colors.error} />
              <Text style={styles.statLabel}>
                {t('stats.currentStreak', 'Current Streak')}
              </Text>
            </View>
            <Text style={styles.statValueRed}>
              {stats.current_win_streak}
            </Text>
          </View>
          <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
            <View style={[styles.statRowWithIcon, isRTL && styles.statRowWithIconRTL]}>
              <TrendingUp size={16} color={colors.success} />
              <Text style={styles.statLabel}>
                {t('stats.bestStreak', 'Best Streak')}
              </Text>
            </View>
            <Text style={styles.statValueGreen}>
              {stats.best_win_streak}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4, // 12px
    flexWrap: 'wrap',
  },
  sectionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(40px)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  sectionContainerTV: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm + 4, // 12px
  },
  textRight: {
    textAlign: 'right',
  },
  statsGroup: {
    gap: spacing.sm + 4, // 12px
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statRowRTL: {
    flexDirection: 'row-reverse',
  },
  statRowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statRowWithIconRTL: {
    flexDirection: 'row-reverse',
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  statValueGreen: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#10b981', // green-500
  },
  statValueRed: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#ef4444', // red-500
  },
  statValueYellow: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#eab308', // yellow-500
  },
  statValuePurple: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#a855f7', // purple-500
  },
});
