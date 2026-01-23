/**
 * PlayerProfileGames Component
 *
 * Match history display with game cards and result badges
 * Converted to StyleSheet for React Native Web compatibility
 *
 * Features:
 * - Game cards with result badges (Win/Loss/Draw)
 * - Opponent information
 * - Game details (color, moves, date)
 * - Empty state for no games
 * - RTL layout support
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Gamepad2 } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';

const IS_TV_BUILD = process.env.REACT_APP_PLATFORM === 'tv';

const GameSchema = z.object({
  game_id: z.string(),
  white_player_id: z.string(),
  black_player_id: z.string(),
  white_player_name: z.string(),
  black_player_name: z.string(),
  result: z.enum(['win', 'loss', 'draw']),
  winner_id: z.string().nullable(),
  move_count: z.number(),
  played_at: z.string(),
});

const PlayerProfileGamesPropsSchema = z.object({
  matchHistory: z.array(GameSchema),
  userId: z.string().optional(),
  currentUserId: z.string().optional(),
  isRTL: z.boolean(),
});

type PlayerProfileGamesProps = z.infer<typeof PlayerProfileGamesPropsSchema>;

export default function PlayerProfileGames({
  matchHistory,
  userId,
  currentUserId,
  isRTL,
}: PlayerProfileGamesProps) {
  const { t } = useTranslation();

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getResultDisplay = (game: z.infer<typeof GameSchema>, playerId: string) => {
    if (game.result === 'draw') {
      return { text: t('stats.draw', 'Draw'), color: colors.textMuted };
    }

    const isWinner = game.winner_id === playerId;
    return {
      text: isWinner ? t('stats.won', 'Won') : t('stats.lost', 'Lost'),
      color: isWinner ? colors.success : colors.error,
    };
  };

  if (matchHistory.length === 0) {
    return (
      <View style={IS_TV_BUILD ? styles.emptyContainerTV : styles.emptyContainer}>
        <Gamepad2 size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          {t('stats.noGames', 'No games played yet')}
        </Text>
      </View>
    );
  }

  const playerIdForResults = userId || currentUserId || '';

  return (
    <View style={styles.container}>
      {matchHistory.map((game) => {
        const result = getResultDisplay(game, playerIdForResults);
        const isWhite = game.white_player_id === playerIdForResults;
        const opponent = isWhite ? game.black_player_name : game.white_player_name;

        return (
          <View
            key={game.game_id}
            style={IS_TV_BUILD ? styles.gameCardTV : styles.gameCard}
          >
            <View style={[styles.gameCardContent, isRTL && styles.gameCardContentRTL]}>
              {/* Result Badge */}
              <View
                style={[
                  styles.resultBadge,
                  { backgroundColor: `${result.color}20` }
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    { color: result.color }
                  ]}
                >
                  {result.text}
                </Text>
              </View>

              {/* Game Info */}
              <View style={styles.gameInfo}>
                <Text style={[
                  styles.opponentName,
                  isRTL && styles.textRight
                ]}>
                  vs {opponent}
                </Text>
                <View style={[styles.gameDetailsRow, isRTL && styles.gameDetailsRowRTL]}>
                  <Text style={styles.gameDetailText}>
                    {isWhite ? t('chess.white', 'White') : t('chess.black', 'Black')}
                  </Text>
                  <Text style={styles.gameDetailText}>•</Text>
                  <Text style={styles.gameDetailText}>
                    {game.move_count} {t('stats.moves', 'moves')}
                  </Text>
                  <Text style={styles.gameDetailText}>•</Text>
                  <Text style={styles.gameDetailText}>
                    {formatTimestamp(game.played_at)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  emptyContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyContainerTV: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  gameCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  gameCardTV: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  gameCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gameCardContentRTL: {
    flexDirection: 'row-reverse',
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  resultText: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  gameInfo: {
    flex: 1,
  },
  opponentName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  textRight: {
    textAlign: 'right',
  },
  gameDetailsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gameDetailsRowRTL: {
    flexDirection: 'row-reverse',
  },
  gameDetailText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
