import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Trophy, TrendingUp, TrendingDown, Gamepad2, UserPlus, Swords, Award,
  Calendar, Target, Zap
} from 'lucide-react';
import { useStatsStore } from '../stores/statsStore';
import { useFriendsStore } from '../stores/friendsStore';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassView, GlassButton, GlassCard, GlassTabs, GlassModal, GlassStatCard } from '@bayit/shared/ui';

type TabId = 'stats' | 'history' | 'headtohead';

export default function PlayerProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<TabId>('stats');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'error' | 'warning' | 'success' | 'info'>('info');

  const isOwnProfile = userId === currentUser?.id;

  const {
    myStats,
    viewedPlayerStats,
    matchHistory,
    headToHead,
    loading,
    error,
    fetchMyStats,
    fetchPlayerStats,
    fetchMatchHistory,
    fetchHeadToHead,
    clearViewedPlayer,
    clearHeadToHead,
  } = useStatsStore();

  const {
    friends,
    incomingRequests,
    outgoingRequests,
    sendFriendRequest,
    fetchFriends,
    fetchRequests,
  } = useFriendsStore();

  const stats = isOwnProfile ? myStats : viewedPlayerStats;

  useEffect(() => {
    if (isOwnProfile) {
      fetchMyStats();
      fetchMatchHistory();
    } else if (userId) {
      fetchPlayerStats(userId);
      fetchMatchHistory();
      fetchHeadToHead(userId);
      fetchFriends();
      fetchRequests();
    }

    return () => {
      if (!isOwnProfile) {
        clearViewedPlayer();
        clearHeadToHead();
      }
    };
  }, [userId, isOwnProfile]);

  const showModal = (message: string, type: 'error' | 'warning' | 'success' | 'info' = 'info') => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  // Check friend relationship
  const getFriendStatus = () => {
    if (isOwnProfile || !userId) return null;

    const isFriend = friends.some(f => f.user_id === userId);
    if (isFriend) return 'friend';

    const hasIncoming = incomingRequests.some(r => r.sender_id === userId);
    if (hasIncoming) return 'request_received';

    const hasOutgoing = outgoingRequests.some(r => r.receiver_id === userId);
    if (hasOutgoing) return 'request_sent';

    return 'none';
  };

  const friendStatus = getFriendStatus();

  // Handle add friend
  const handleAddFriend = async () => {
    if (!userId) return;

    try {
      await sendFriendRequest(userId);
      showModal(t('friends.requestSent', 'Friend request sent!'), 'success');
      fetchRequests();
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.requestFailed', 'Failed to send request'), 'error');
    }
  };

  // Handle challenge
  const handleChallenge = () => {
    navigate('/chess', { state: { inviteFriend: stats?.user_id } });
  };

  // Tab configuration
  const tabs = [
    { id: 'stats' as TabId, label: t('stats.statistics', 'Statistics') },
    { id: 'history' as TabId, label: t('stats.matchHistory', 'Match History') },
  ];

  if (!isOwnProfile && headToHead) {
    tabs.push({ id: 'headtohead' as TabId, label: t('stats.headToHead', 'Head to Head') });
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Get result display
  const getResultDisplay = (game: any, userId: string) => {
    if (game.result === 'draw') {
      return { text: t('stats.draw', 'Draw'), color: colors.textMuted };
    }

    const isWinner = game.winner_id === userId;
    return {
      text: isWinner ? t('stats.won', 'Won') : t('stats.lost', 'Lost'),
      color: isWinner ? colors.success : colors.error,
    };
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <GlassButton
          label={t('common.goBack', 'Go Back')}
          onPress={() => navigate(-1)}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <GlassView style={styles.profileHeader} intensity="medium">
        <View style={[styles.headerContent, isRTL && styles.headerContentRTL]}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {currentUser?.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Player Info */}
          <View style={[styles.playerInfo, isRTL && styles.playerInfoRTL]}>
            <Text style={[styles.playerName, isRTL && styles.textRTL]}>
              {currentUser?.name || t('profile.unknown', 'Unknown Player')}
            </Text>

            {stats && (
              <View style={[styles.ratingBadge, isRTL && styles.ratingBadgeRTL]}>
                <Award size={16} color={colors.warning} />
                <Text style={styles.ratingText}>
                  {t('stats.rating', 'Rating')}: {stats.chess_rating}
                </Text>
                {stats.peak_rating > stats.chess_rating && (
                  <Text style={styles.peakRating}>
                    ({t('stats.peak', 'Peak')}: {stats.peak_rating})
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Actions */}
          {!isOwnProfile && (
            <View style={[styles.headerActions, isRTL && styles.headerActionsRTL]}>
              {friendStatus === 'none' && (
                <GlassButton
                  label={t('friends.add', 'Add Friend')}
                  onPress={handleAddFriend}
                  icon={UserPlus}
                  size="small"
                />
              )}
              <GlassButton
                label={t('chess.challenge', 'Challenge')}
                onPress={handleChallenge}
                icon={Swords}
                size="small"
                variant="secondary"
              />
            </View>
          )}
        </View>
      </GlassView>

      {/* Quick Stats */}
      {stats && (
        <View style={styles.quickStats}>
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
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <GlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {/* Statistics Tab */}
        {activeTab === 'stats' && stats && (
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('stats.performance', 'Performance')}
              </Text>
              <View style={styles.statRows}>
                <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
                  <Text style={styles.statLabel}>{t('stats.totalGames', 'Total Games')}</Text>
                  <Text style={styles.statValue}>{stats.chess_games_played}</Text>
                </View>
                <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
                  <View style={[styles.statLabelWithIcon, isRTL && styles.statLabelWithIconRTL]}>
                    <Trophy size={16} color={colors.success} />
                    <Text style={styles.statLabel}>{t('stats.wins', 'Wins')}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.success }]}>{stats.chess_wins}</Text>
                </View>
                <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
                  <View style={[styles.statLabelWithIcon, isRTL && styles.statLabelWithIconRTL]}>
                    <TrendingDown size={16} color={colors.error} />
                    <Text style={styles.statLabel}>{t('stats.losses', 'Losses')}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.error }]}>{stats.chess_losses}</Text>
                </View>
                <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
                  <Text style={styles.statLabel}>{t('stats.draws', 'Draws')}</Text>
                  <Text style={styles.statValue}>{stats.chess_draws}</Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard style={styles.statSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('stats.achievements', 'Achievements')}
              </Text>
              <View style={styles.statRows}>
                <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
                  <View style={[styles.statLabelWithIcon, isRTL && styles.statLabelWithIconRTL]}>
                    <Award size={16} color={colors.warning} />
                    <Text style={styles.statLabel}>{t('stats.currentRating', 'Current Rating')}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.warning }]}>{stats.chess_rating}</Text>
                </View>
                <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
                  <View style={[styles.statLabelWithIcon, isRTL && styles.statLabelWithIconRTL]}>
                    <Target size={16} color={colors.primary} />
                    <Text style={styles.statLabel}>{t('stats.peakRating', 'Peak Rating')}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{stats.peak_rating}</Text>
                </View>
                <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
                  <View style={[styles.statLabelWithIcon, isRTL && styles.statLabelWithIconRTL]}>
                    <Zap size={16} color={colors.error} />
                    <Text style={styles.statLabel}>{t('stats.currentStreak', 'Current Streak')}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.error }]}>{stats.current_win_streak}</Text>
                </View>
                <View style={[styles.statRow, isRTL && styles.statRowRTL]}>
                  <View style={[styles.statLabelWithIcon, isRTL && styles.statLabelWithIconRTL]}>
                    <TrendingUp size={16} color={colors.success} />
                    <Text style={styles.statLabel}>{t('stats.bestStreak', 'Best Streak')}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.success }]}>{stats.best_win_streak}</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Match History Tab */}
        {activeTab === 'history' && (
          <View style={styles.historyList}>
            {matchHistory.length === 0 ? (
              <GlassView style={styles.emptyState}>
                <Gamepad2 size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{t('stats.noGames', 'No games played yet')}</Text>
              </GlassView>
            ) : (
              matchHistory.map((game) => {
                const result = getResultDisplay(game, userId || currentUser?.id || '');
                const isWhite = game.white_player_id === (userId || currentUser?.id);
                const opponent = isWhite ? game.black_player_name : game.white_player_name;

                return (
                  <GlassCard key={game.game_id} style={styles.gameCard}>
                    <View style={[styles.gameContent, isRTL && styles.gameContentRTL]}>
                      {/* Result Badge */}
                      <View style={[styles.resultBadge, { backgroundColor: `${result.color}20` }]}>
                        <Text style={[styles.resultText, { color: result.color }]}>
                          {result.text}
                        </Text>
                      </View>

                      {/* Game Info */}
                      <View style={styles.gameInfo}>
                        <Text style={[styles.opponentName, isRTL && styles.textRTL]}>
                          vs {opponent}
                        </Text>
                        <View style={[styles.gameDetails, isRTL && styles.gameDetailsRTL]}>
                          <Text style={styles.gameDetail}>
                            {isWhite ? t('chess.white', 'White') : t('chess.black', 'Black')}
                          </Text>
                          <Text style={styles.gameDetail}>•</Text>
                          <Text style={styles.gameDetail}>
                            {game.move_count} {t('stats.moves', 'moves')}
                          </Text>
                          <Text style={styles.gameDetail}>•</Text>
                          <Text style={styles.gameDetail}>
                            {formatTimestamp(game.played_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                );
              })
            )}
          </View>
        )}

        {/* Head to Head Tab */}
        {activeTab === 'headtohead' && headToHead && (
          <View style={styles.h2hContainer}>
            {/* Summary */}
            <GlassCard style={styles.h2hSummary}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('stats.overall', 'Overall Record')}
              </Text>
              <View style={styles.h2hStats}>
                <View style={styles.h2hStat}>
                  <Text style={[styles.h2hValue, { color: colors.success }]}>
                    {headToHead.user1_wins}
                  </Text>
                  <Text style={styles.h2hLabel}>{t('stats.yourWins', 'Your Wins')}</Text>
                </View>
                <View style={styles.h2hStat}>
                  <Text style={[styles.h2hValue, { color: colors.textMuted }]}>
                    {headToHead.draws}
                  </Text>
                  <Text style={styles.h2hLabel}>{t('stats.draws', 'Draws')}</Text>
                </View>
                <View style={styles.h2hStat}>
                  <Text style={[styles.h2hValue, { color: colors.error }]}>
                    {headToHead.user2_wins}
                  </Text>
                  <Text style={styles.h2hLabel}>{t('stats.theirWins', 'Their Wins')}</Text>
                </View>
              </View>
              <Text style={[styles.h2hTotal, isRTL && styles.textRTL]}>
                {t('stats.totalGamesPlayed', 'Total: {{count}} games', { count: headToHead.total_games })}
              </Text>
            </GlassCard>

            {/* Recent Games */}
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL, styles.recentGamesTitle]}>
              {t('stats.recentGames', 'Recent Games')}
            </Text>
            {headToHead.recent_games.length === 0 ? (
              <GlassView style={styles.emptyState}>
                <Text style={styles.emptyText}>{t('stats.noGames', 'No games played yet')}</Text>
              </GlassView>
            ) : (
              headToHead.recent_games.map((game: any) => {
                const result = getResultDisplay(game, currentUser?.id || '');
                const isWhite = game.white_player_id === currentUser?.id;

                return (
                  <GlassCard key={game.game_id} style={styles.gameCard}>
                    <View style={[styles.gameContent, isRTL && styles.gameContentRTL]}>
                      <View style={[styles.resultBadge, { backgroundColor: `${result.color}20` }]}>
                        <Text style={[styles.resultText, { color: result.color }]}>
                          {result.text}
                        </Text>
                      </View>
                      <View style={styles.gameInfo}>
                        <Text style={[styles.opponentName, isRTL && styles.textRTL]}>
                          {isWhite ? t('chess.playedAsWhite', 'Played as White') : t('chess.playedAsBlack', 'Played as Black')}
                        </Text>
                        <View style={[styles.gameDetails, isRTL && styles.gameDetailsRTL]}>
                          <Text style={styles.gameDetail}>
                            {game.move_count} {t('stats.moves', 'moves')}
                          </Text>
                          <Text style={styles.gameDetail}>•</Text>
                          <Text style={styles.gameDetail}>
                            {formatTimestamp(game.played_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                );
              })
            )}
          </View>
        )}
      </View>

      {/* Modal */}
      <GlassModal
        visible={modalVisible}
        type={modalType}
        title={
          modalType === 'error'
            ? t('common.error', 'Error')
            : modalType === 'success'
            ? t('common.success', 'Success')
            : t('common.info', 'Info')
        }
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        buttons={[{ text: t('common.ok', 'OK'), style: 'default' }]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: colors.error.DEFAULT,
    textAlign: 'center',
  },
  // Profile Header
  profileHeader: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerContentRTL: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  playerInfo: {
    flex: 1,
  },
  playerInfoRTL: {
    alignItems: 'flex-end',
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingBadgeRTL: {
    flexDirection: 'row-reverse',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning.DEFAULT,
  },
  peakRating: {
    fontSize: 12,
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionsRTL: {
    flexDirection: 'row-reverse',
  },
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  // Tabs
  tabsContainer: {
    marginBottom: spacing.lg,
  },
  tabContent: {
    gap: spacing.lg,
  },
  // Stats
  statsGrid: {
    gap: spacing.lg,
  },
  statSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  statRows: {
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statRowRTL: {
    flexDirection: 'row-reverse',
  },
  statLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabelWithIconRTL: {
    flexDirection: 'row-reverse',
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  // Match History
  historyList: {
    gap: spacing.md,
  },
  gameCard: {
    padding: spacing.md,
  },
  gameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gameContentRTL: {
    flexDirection: 'row-reverse',
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gameInfo: {
    flex: 1,
  },
  opponentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  gameDetails: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  gameDetailsRTL: {
    flexDirection: 'row-reverse',
  },
  gameDetail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  // Head to Head
  h2hContainer: {
    gap: spacing.lg,
  },
  h2hSummary: {
    padding: spacing.lg,
  },
  h2hStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  h2hStat: {
    alignItems: 'center',
  },
  h2hValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  h2hLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  h2hTotal: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  recentGamesTitle: {
    marginTop: spacing.md,
  },
  // Empty State
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  // RTL
  textRTL: {
    textAlign: 'right',
  },
});
