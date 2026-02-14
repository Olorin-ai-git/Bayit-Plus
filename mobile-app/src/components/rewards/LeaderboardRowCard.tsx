/**
 * LeaderboardRowCard - Single leaderboard entry row
 *
 * Features:
 * - Rank display with medal for top 3
 * - Avatar, username, score
 * - Current user highlight
 * - RTL support, accessibility
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';

interface LeaderboardRowCardProps {
  rank: number;
  userName: string;
  score: number;
  avatar?: string;
  isCurrentUser: boolean;
}

const RANK_COLORS: Record<number, string> = {
  1: Colors.Special.gold,
  2: Colors.Dark.d300,
  3: Colors.Warning.w600,
};

export const LeaderboardRowCard: React.FC<LeaderboardRowCardProps> = ({
  rank,
  userName,
  score,
  avatar,
  isCurrentUser,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const medalColor = RANK_COLORS[rank];
  const isTopThree = rank <= 3;

  return (
    <View
      style={[
        styles.container,
        isCurrentUser && styles.containerHighlighted,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      accessibilityRole="text"
      accessibilityLabel={t('rewards.leaderboard.entryLabel', {
        rank,
        name: userName,
        score: score.toLocaleString(),
      })}
    >
      <View style={styles.rankSection}>
        {isTopThree && medalColor ? (
          <View style={[styles.medalBadge, { backgroundColor: `${medalColor}30` }]}>
            <NativeIcon name="trophy" size="sm" color={medalColor} />
          </View>
        ) : (
          <Text style={styles.rankText}>{rank}</Text>
        )}
      </View>

      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={styles.avatar}
          accessibilityLabel={t('rewards.leaderboard.avatarLabel', { name: userName })}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.nameSection}>
        <Text
          style={[styles.userName, isCurrentUser && styles.userNameHighlighted, { textAlign }]}
          numberOfLines={1}
        >
          {userName}
        </Text>
        {isCurrentUser && (
          <Text style={[styles.youBadge, { textAlign }]}>
            {t('rewards.leaderboard.you')}
          </Text>
        )}
      </View>

      <Text style={[styles.score, isCurrentUser && styles.scoreHighlighted]}>
        {score.toLocaleString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[1.5],
    gap: spacing[3],
  },
  containerHighlighted: {
    backgroundColor: Colors.Glass.purpleLight,
    borderWidth: 1,
    borderColor: Colors.Primary.p500,
  },
  rankSection: {
    width: spacing[10],
    alignItems: 'center',
  },
  medalBadge: {
    width: spacing[8],
    height: spacing[8],
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: Colors.Text.secondary,
  },
  avatar: {
    width: spacing[10],
    height: spacing[10],
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    width: spacing[10],
    height: spacing[10],
    borderRadius: borderRadius.full,
    backgroundColor: Colors.Primary.p800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: Colors.Text.primary,
  },
  nameSection: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: Colors.Text.primary,
  },
  userNameHighlighted: {
    fontWeight: '700',
    color: Colors.Primary.p300,
  },
  youBadge: {
    fontSize: fontSize.xs,
    color: Colors.Primary.p400,
    fontWeight: '500',
    marginTop: spacing[0.5],
  },
  score: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: Colors.Text.secondary,
  },
  scoreHighlighted: {
    color: Colors.Special.gold,
  },
});

export default LeaderboardRowCard;
