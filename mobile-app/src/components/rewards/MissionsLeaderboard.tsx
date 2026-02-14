/**
 * MissionsLeaderboard - Mission-specific leaderboard
 *
 * Features:
 * - Mission ID context for filtered rankings
 * - Current user position highlight
 * - Empty state for missions with no participants
 * - RTL support, accessibility
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';
import { LeaderboardRowCard } from './LeaderboardRowCard';

interface MissionLeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  score: number;
  avatar_url?: string;
}

interface MissionsLeaderboardProps {
  missionId: string;
  entries: MissionLeaderboardEntry[];
  currentUserId: string;
}

export const MissionsLeaderboard: React.FC<MissionsLeaderboardProps> = ({
  missionId,
  entries,
  currentUserId,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  if (entries.length === 0) {
    return (
      <View
        style={styles.emptyContainer}
        accessibilityRole="text"
        accessibilityLabel={t('rewards.missionLeaderboard.empty')}
      >
        <View style={styles.emptyIconCircle}>
          <NativeIcon name="trophy" size="lg" color={Colors.Text.muted} />
        </View>
        <Text style={[styles.emptyTitle, { textAlign }]}>
          {t('rewards.missionLeaderboard.emptyTitle')}
        </Text>
        <Text style={[styles.emptyDescription, { textAlign }]}>
          {t('rewards.missionLeaderboard.emptyDescription')}
        </Text>
      </View>
    );
  }

  const currentUserInList = entries.some((e) => e.user_id === currentUserId);
  const currentUserEntry = entries.find((e) => e.user_id === currentUserId);

  return (
    <View
      style={styles.container}
      accessibilityRole="list"
      accessibilityLabel={t('rewards.missionLeaderboard.title')}
    >
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <NativeIcon name="flag" size="sm" color={Colors.Primary.p400} />
        <Text style={[styles.headerTitle, { textAlign }]}>
          {t('rewards.missionLeaderboard.title')}
        </Text>
      </View>

      {entries.map((entry) => (
        <LeaderboardRowCard
          key={`mlb-${missionId}-${entry.rank}-${entry.user_id}`}
          rank={entry.rank}
          userName={entry.user_name}
          score={entry.score}
          avatar={entry.avatar_url}
          isCurrentUser={entry.user_id === currentUserId}
        />
      ))}

      {!currentUserInList && currentUserEntry && (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerDots}>...</Text>
            <View style={styles.dividerLine} />
          </View>
          <LeaderboardRowCard
            rank={currentUserEntry.rank}
            userName={currentUserEntry.user_name}
            score={currentUserEntry.score}
            avatar={currentUserEntry.avatar_url}
            isCurrentUser={true}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[2],
  },
  header: {
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: Colors.Text.primary,
  },
  emptyContainer: {
    padding: spacing[6],
    alignItems: 'center',
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.md,
  },
  emptyIconCircle: {
    width: spacing[12],
    height: spacing[12],
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Glass.whiteMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: spacing[1],
  },
  emptyDescription: {
    fontSize: fontSize.sm,
    color: Colors.Text.muted,
    lineHeight: fontSize.sm * 1.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[2],
    gap: spacing[2],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.Glass.borderLight,
  },
  dividerDots: {
    fontSize: fontSize.sm,
    color: Colors.Text.muted,
  },
});

export default MissionsLeaderboard;
