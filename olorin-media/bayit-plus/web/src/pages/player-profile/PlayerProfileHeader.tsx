/**
 * PlayerProfileHeader Component
 *
 * Profile header with avatar, name, rating, and action buttons
 * Converted from TailwindCSS to StyleSheet for React Native Web compatibility
 *
 * Features:
 * - Avatar with fallback placeholder
 * - Player name and rating display
 * - Peak rating badge
 * - Friend actions (Add Friend, Challenge)
 * - RTL layout support
 */

import { View, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Award, UserPlus, Swords } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
});

const StatsSchema = z.object({
  chess_rating: z.number(),
  peak_rating: z.number(),
});

const PlayerProfileHeaderPropsSchema = z.object({
  currentUser: UserSchema.nullable(),
  stats: StatsSchema.nullable(),
  isOwnProfile: z.boolean(),
  isRTL: z.boolean(),
  friendStatus: z.enum(['friend', 'request_received', 'request_sent', 'none']).nullable(),
  onAddFriend: z.function().returns(z.void()),
  onChallenge: z.function().returns(z.void()),
});

type PlayerProfileHeaderProps = z.infer<typeof PlayerProfileHeaderPropsSchema>;

export default function PlayerProfileHeader({
  currentUser,
  stats,
  isOwnProfile,
  isRTL,
  friendStatus,
  onAddFriend,
  onChallenge,
}: PlayerProfileHeaderProps) {
  const { t } = useTranslation();

  const initial = (currentUser?.name || 'U').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={[styles.innerContainer, isRTL && styles.innerContainerRTL]}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {currentUser?.avatar ? (
            <Image
              source={{ uri: currentUser.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {initial}
              </Text>
            </View>
          )}
        </View>

        {/* Player Info */}
        <View style={[styles.playerInfo, isRTL && styles.playerInfoRTL]}>
          <Text style={[styles.playerName, isRTL && styles.playerNameRTL]}>
            {currentUser?.name || t('profile.unknown', 'Unknown Player')}
          </Text>

          {stats && (
            <View style={[styles.statsContainer, isRTL && styles.statsContainerRTL]}>
              <Award size={16} color={colors.warning} />
              <Text style={styles.ratingText}>
                {t('stats.rating', 'Rating')}: {stats.chess_rating}
              </Text>
              {stats.peak_rating > stats.chess_rating && (
                <Text style={styles.peakText}>
                  ({t('stats.peak', 'Peak')}: {stats.peak_rating})
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Actions */}
        {!isOwnProfile && (
          <View style={[styles.actionsContainer, isRTL && styles.actionsContainerRTL]}>
            {friendStatus === 'none' && (
              <GlassButton
                label={t('friends.add', 'Add Friend')}
                onPress={onAddFriend}
                icon={UserPlus}
                size="small"
              />
            )}
            <GlassButton
              label={t('chess.challenge', 'Challenge')}
              onPress={onChallenge}
              icon={Swords}
              size="small"
              variant="secondary"
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  innerContainerRTL: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(126, 34, 206, 0.3)', // purple-700/30
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.primary.DEFAULT,
  },
  playerInfo: {
    flex: 1,
  },
  playerInfoRTL: {
    alignItems: 'flex-end',
  },
  playerName: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  playerNameRTL: {
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  ratingText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.warning.DEFAULT,
  },
  peakText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionsContainerRTL: {
    flexDirection: 'row-reverse',
  },
});
