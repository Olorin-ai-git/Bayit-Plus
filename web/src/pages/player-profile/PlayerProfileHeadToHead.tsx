/**
 * PlayerProfileHeadToHead Component
 *
 * Head-to-head statistics and recent games between two players
 * Part of PlayerProfilePage migration to StyleSheet
 *
 * Features:
 * - Overall record summary (wins/draws/losses)
 * - Recent games list with results
 * - Game details display
 * - Empty state for no games
 * - RTL layout support
 */

import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';

const IS_TV_BUILD = Platform.isTV || false;

const GameSchema = z.object({
  game_id: z.string(),
  white_player_id: z.string(),
  black_player_id: z.string(),
  result: z.enum(['win', 'loss', 'draw']),
  winner_id: z.string().nullable(),
  move_count: z.number(),
  played_at: z.string(),
});

const HeadToHeadSchema = z.object({
  total_games: z.number(),
  user1_wins: z.number(),
  user2_wins: z.number(),
  draws: z.number(),
  recent_games: z.array(GameSchema),
});

const PlayerProfileHeadToHeadPropsSchema = z.object({
  headToHead: HeadToHeadSchema,
  currentUserId: z.string(),
  isRTL: z.boolean(),
});

type PlayerProfileHeadToHeadProps = z.infer<typeof PlayerProfileHeadToHeadPropsSchema>;

export default function PlayerProfileHeadToHead({
  headToHead,
  currentUserId,
  isRTL,
}: PlayerProfileHeadToHeadProps) {
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

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={[
          styles.sectionTitle,
          isRTL && styles.textRight,
        ]}>
          {t('stats.overall', 'Overall Record')}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statColumn}>
            <Text style={styles.statValueWins}>
              {headToHead.user1_wins}
            </Text>
            <Text style={styles.statLabel}>
              {t('stats.yourWins', 'Your Wins')}
            </Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statValueDraws}>
              {headToHead.draws}
            </Text>
            <Text style={styles.statLabel}>
              {t('stats.draws', 'Draws')}
            </Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statValueLosses}>
              {headToHead.user2_wins}
            </Text>
            <Text style={styles.statLabel}>
              {t('stats.theirWins', 'Their Wins')}
            </Text>
          </View>
        </View>
        <Text style={[
          styles.totalGamesText,
          isRTL && styles.textRight,
        ]}>
          {t('stats.totalGamesPlayed', 'Total: {{count}} games', { count: headToHead.total_games })}
        </Text>
      </View>

      {/* Recent Games */}
      <Text style={[
        styles.recentGamesTitle,
        isRTL && styles.textRight,
      ]}>
        {t('stats.recentGames', 'Recent Games')}
      </Text>

      {headToHead.recent_games.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateText}>
            {t('stats.noGames', 'No games played yet')}
          </Text>
        </View>
      ) : (
        <View style={styles.gamesListContainer}>
          {headToHead.recent_games.map((game) => {
            const result = getResultDisplay(game, currentUserId);
            const isWhite = game.white_player_id === currentUserId;

            return (
              <View
                key={game.game_id}
                style={styles.gameCard}
              >
                <View style={[
                  styles.gameRow,
                  isRTL && styles.gameRowRTL,
                ]}>
                  <View
                    style={[
                      styles.resultBadge,
                      { backgroundColor: `${result.color}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.resultText,
                        { color: result.color },
                      ]}
                    >
                      {result.text}
                    </Text>
                  </View>
                  <View style={styles.gameInfoContainer}>
                    <Text style={[
                      styles.gameInfoTitle,
                      isRTL && styles.textRight,
                    ]}>
                      {isWhite
                        ? t('chess.playedAsWhite', 'Played as White')
                        : t('chess.playedAsBlack', 'Played as Black')}
                    </Text>
                    <View style={[
                      styles.gameDetailsRow,
                      isRTL && styles.gameDetailsRowRTL,
                    ]}>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...Platform.select({
      web: {
        backdropFilter: IS_TV_BUILD ? undefined : 'blur(24px)',
      },
    }),
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },

  statColumn: {
    alignItems: 'center',
  },

  statValueWins: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 4,
  },

  statValueDraws: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 4,
  },

  statValueLosses: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  totalGamesText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Recent Games Section
  recentGamesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  // Empty State
  emptyStateCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...Platform.select({
      web: {
        backdropFilter: IS_TV_BUILD ? undefined : 'blur(24px)',
      },
    }),
  },

  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Games List
  gamesListContainer: {
    gap: 12,
  },

  gameCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    padding: 12,
    ...Platform.select({
      web: {
        backdropFilter: IS_TV_BUILD ? undefined : 'blur(24px)',
      },
    }),
  },

  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  gameRowRTL: {
    flexDirection: 'row-reverse',
  },

  // Result Badge
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },

  resultText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // Game Info
  gameInfoContainer: {
    flex: 1,
  },

  gameInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },

  gameDetailsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  gameDetailsRowRTL: {
    flexDirection: 'row-reverse',
  },

  gameDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // RTL Support
  textRight: {
    textAlign: 'right',
  },
});
