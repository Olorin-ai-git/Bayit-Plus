import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Trophy, TrendingUp } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useMissionsStore } from '@/stores/missionsStore';

type Scope = 'global' | 'friends' | 'family';
type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';

export function LeaderboardPanel() {
  const { leaderboard, loadingLeaderboard, fetchLeaderboard } = useMissionsStore();
  const [scope, setScope] = useState<Scope>('global');
  const [period, setPeriod] = useState<Period>('weekly');

  useEffect(() => {
    fetchLeaderboard(scope, period, 1);
  }, [scope, period]);

  const renderScopeChip = (value: Scope, label: string) => {
    const isActive = scope === value;
    return (
      <Pressable
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => setScope(value)}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderPeriodChip = (value: Period, label: string) => {
    const isActive = period === value;
    return (
      <Pressable
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => setPeriod(value)}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Scope</Text>
          <View style={styles.chipGroup}>
            {renderScopeChip('global', 'Global')}
            {renderScopeChip('friends', 'Friends')}
            {renderScopeChip('family', 'Family')}
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Period</Text>
          <View style={styles.chipGroup}>
            {renderPeriodChip('daily', 'Daily')}
            {renderPeriodChip('weekly', 'Weekly')}
            {renderPeriodChip('monthly', 'Monthly')}
            {renderPeriodChip('all_time', 'All Time')}
          </View>
        </View>
      </View>

      {loadingLeaderboard ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : leaderboard && leaderboard.entries.length > 0 ? (
        <>
          <ScrollView style={styles.entriesList}>
            {leaderboard.entries.map((entry) => (
              <View
                key={entry.user_id}
                style={[
                  styles.entryCard,
                  entry.is_current_user && styles.entryCardHighlight,
                ]}
              >
                <View style={styles.rankContainer}>
                  {getRankIcon(entry.rank) ? (
                    <Text style={styles.rankIcon}>{getRankIcon(entry.rank)}</Text>
                  ) : (
                    <Text style={styles.rankNumber}>{entry.rank}</Text>
                  )}
                </View>

                <View style={styles.entryContent}>
                  <Text style={styles.entryName}>{entry.display_name}</Text>
                  <View style={styles.entryStats}>
                    <View style={styles.statItem}>
                      <Trophy size={14} color={colors.gold} />
                      <Text style={styles.statText}>{entry.total_points}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <TrendingUp size={14} color={colors.success[500]} />
                      <Text style={styles.statText}>{entry.streak} days</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {leaderboard.my_rank && leaderboard.my_rank > 10 && (
            <View style={styles.myRankSection}>
              <Text style={styles.myRankLabel}>Your Rank</Text>
              <Text style={styles.myRankValue}>#{leaderboard.my_rank}</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No leaderboard entries yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filtersContainer: { gap: spacing[3], marginBottom: spacing[4] },
  filterRow: { gap: spacing[2] },
  filterLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.bgMedium,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[500] },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  loadingContainer: { padding: spacing[8], alignItems: 'center' },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },
  entriesList: { flex: 1 },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.glass.bgMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  entryCardHighlight: { borderColor: colors.primary[600], backgroundColor: colors.glass.purpleLight },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.bgStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankIcon: { fontSize: fontSize['2xl'] },
  rankNumber: { fontSize: fontSize.lg, color: colors.text, fontWeight: '700' },
  entryContent: { flex: 1, gap: spacing[1] },
  entryName: { fontSize: fontSize.base, color: colors.text, fontWeight: '600' },
  entryStats: { flexDirection: 'row', gap: spacing[4] },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  statText: { fontSize: fontSize.xs, color: colors.textSecondary },
  myRankSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.glass.purpleLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[600],
  },
  myRankLabel: { fontSize: fontSize.base, color: colors.text, fontWeight: '600' },
  myRankValue: { fontSize: fontSize.xl, color: colors.primary[400], fontWeight: '700' },
  emptyContainer: { padding: spacing[8], alignItems: 'center' },
  emptyText: { fontSize: fontSize.base, color: colors.textMuted },
});
