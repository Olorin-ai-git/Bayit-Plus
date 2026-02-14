/**
 * LeaderboardMobile - Rankings list with user avatars and scores
 *
 * Features:
 * - Full rankings list
 * - Highlights current user position
 * - Top 3 podium styling
 * - RTL support, accessibility
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';
import { LeaderboardRowCard } from './LeaderboardRowCard';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  score: number;
  avatar_url?: string;
}

interface LeaderboardMobileProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export const LeaderboardMobile: React.FC<LeaderboardMobileProps> = ({
  entries,
  currentUserId,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  if (entries.length === 0) {
    return (
      <View
        style={styles.emptyContainer}
        accessibilityRole="text"
        accessibilityLabel={t('rewards.leaderboard.empty')}
      >
        <Text style={[styles.emptyText, { textAlign }]}>
          {t('rewards.leaderboard.empty')}
        </Text>
      </View>
    );
  }

  const currentUserEntry = entries.find((e) => e.user_id === currentUserId);
  const currentUserInTopEntries = entries.some((e) => e.user_id === currentUserId);

  return (
    <View
      style={styles.container}
      accessibilityRole="list"
      accessibilityLabel={t('rewards.leaderboard.title')}
    >
      {entries.map((entry) => (
        <LeaderboardRowCard
          key={`lb-${entry.rank}-${entry.user_id}`}
          rank={entry.rank}
          userName={entry.user_name}
          score={entry.score}
          avatar={entry.avatar_url}
          isCurrentUser={entry.user_id === currentUserId}
        />
      ))}

      {!currentUserInTopEntries && currentUserEntry && (
        <>
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>...</Text>
            <View style={styles.separatorLine} />
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
    gap: 0,
  },
  emptyContainer: {
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: Colors.Text.muted,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[2],
    gap: spacing[2],
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.Glass.borderLight,
  },
  separatorText: {
    fontSize: fontSize.sm,
    color: Colors.Text.muted,
  },
});

export default LeaderboardMobile;
