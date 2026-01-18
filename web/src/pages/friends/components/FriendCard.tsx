import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassAvatar } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import type { UserCardProps } from '../types';

interface FriendCardProps extends UserCardProps {
  isRTL: boolean;
}

export function FriendCard({
  userId,
  name,
  avatar,
  friendCount,
  gamesPlayed,
  relationship,
  onAction,
  actionLabel,
  actionIcon: ActionIcon,
  actionColor = colors.primary,
  secondaryAction,
  secondaryLabel,
  secondaryIcon: SecondaryIcon,
  subtitle,
  isRTL,
}: FriendCardProps) {
  const navigate = useNavigate();

  const viewProfile = () => {
    navigate(`/player/${userId}`);
  };

  return (
    <GlassCard style={styles.userCard}>
      <Pressable
        onPress={viewProfile}
        style={[styles.userCardContent, isRTL && styles.userCardContentRTL]}
      >
        <GlassAvatar uri={avatar} name={name} size="medium" />

        <View style={styles.userInfo}>
          <Text style={[styles.userName, isRTL && styles.textRTL]}>{name}</Text>
          {subtitle && (
            <Text style={[styles.userSubtitle, isRTL && styles.textRTL]}>
              {subtitle}
            </Text>
          )}
          {(friendCount !== undefined || gamesPlayed !== undefined) && (
            <View style={[styles.userStats, isRTL && styles.userStatsRTL]}>
              {friendCount !== undefined && (
                <Text style={styles.userStat}>{friendCount} friends</Text>
              )}
              {gamesPlayed !== undefined && (
                <Text style={styles.userStat}>{gamesPlayed} games</Text>
              )}
            </View>
          )}
        </View>

        <View style={[styles.cardActions, isRTL && styles.cardActionsRTL]}>
          {secondaryAction && SecondaryIcon && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                secondaryAction();
              }}
              style={styles.iconButton}
            >
              <SecondaryIcon size={20} color={colors.textMuted} />
            </Pressable>
          )}
          {onAction && ActionIcon && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onAction();
              }}
              style={[styles.actionButton, { backgroundColor: `${actionColor}20` }]}
            >
              <ActionIcon size={18} color={actionColor} />
              {actionLabel && (
                <Text style={[styles.actionButtonText, { color: actionColor }]}>
                  {actionLabel}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  userCard: {
    padding: spacing.md,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userCardContentRTL: {
    flexDirection: 'row-reverse',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  userStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  userStatsRTL: {
    flexDirection: 'row-reverse',
  },
  userStat: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardActionsRTL: {
    flexDirection: 'row-reverse',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassBorderWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textRTL: {
    textAlign: 'right',
  },
});
