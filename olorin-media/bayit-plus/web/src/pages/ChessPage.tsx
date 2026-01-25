/**
 * Chess game page - Multiplayer chess with AI assistance and voice chat.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, useWindowDimensions, ScrollView, Image, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useDirection } from '../hooks/useDirection';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { GlassResizablePanel } from '@bayit/shared/ui';
import { Gamepad2 } from 'lucide-react';
import logger from '@/utils/logger';
import axios from 'axios';

// Chess components
import ChessBoard from '../components/chess/ChessBoard';
import ChessChat from '../components/chess/ChessChat';
import ChessControls from '../components/chess/ChessControls';
import MoveHistory from '../components/chess/MoveHistory';
import PlayerCard from '../components/chess/PlayerCard';
import CreateGameModal from '../components/chess/CreateGameModal';
import JoinGameModal from '../components/chess/JoinGameModal';
import useChessGame from '../hooks/useChessGame';

// Navigation state interface for voice command invites
interface ChessPageState {
  startGame?: boolean;
  inviteFriend?: string;
}

export default function ChessPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const navigationState = location.state as ChessPageState | undefined;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteProcessed, setInviteProcessed] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const {
    game,
    chatMessages,
    isConnected,
    error,
    createGame,
    joinGame,
    makeMove,
    sendChatMessage,
    resign,
    offerDraw,
    leaveGame,
  } = useChessGame();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  // Handle voice command game invite
  useEffect(() => {
    const handleVoiceInvite = async () => {
      if (navigationState?.startGame && navigationState?.inviteFriend && !inviteProcessed && token) {
        setInviteProcessed(true);
        setInviteStatus(t('chess.sendingInvite', { name: navigationState.inviteFriend }));

        try {
          const response = await axios.post('/api/v1/chess/invite', {
            friend_name: navigationState.inviteFriend,
            color: 'white',
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success) {
            setInviteStatus(t('chess.inviteSent', {
              name: response.data.friend.name,
              code: response.data.game_code
            }));

            // Connect to the game
            await joinGame(response.data.game_code);
          } else {
            setInviteStatus(t('chess.inviteFailed'));
          }
        } catch (err: any) {
          const errorMessage = err.response?.data?.detail || t('chess.inviteFailed');
          setInviteStatus(errorMessage);
          logger.error('Failed to send invite', 'ChessPage', err);
        }

        // Clear status after 5 seconds
        setTimeout(() => setInviteStatus(null), 5000);
      }
    };

    handleVoiceInvite();
  }, [navigationState, inviteProcessed, token, t, joinGame]);

  // Show splash screen for at least 3 seconds on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // Determine if it's the current user's turn
  const isPlayerTurn = () => {
    if (!game || !user) return false;

    const isWhitePlayer = game.white_player?.user_id === user.id;
    const isBlackPlayer = game.black_player?.user_id === user.id;

    if (!isWhitePlayer && !isBlackPlayer) return false;

    return (
      (isWhitePlayer && game.current_turn === 'white') ||
      (isBlackPlayer && game.current_turn === 'black')
    );
  };

  // Determine board orientation (flip for black player)
  const isBoardFlipped = () => {
    if (!game || !user) return false;
    return game.black_player?.user_id === user.id;
  };

  const handleCreateGame = async (
    color: 'white' | 'black',
    timeControl?: number,
    gameMode?: 'pvp' | 'bot',
    botDifficulty?: 'easy' | 'medium' | 'hard'
  ) => {
    await createGame(color, timeControl, gameMode, botDifficulty);
  };

  const handleJoinGame = async (gameCode: string) => {
    await joinGame(gameCode);
  };

  const handleNewGame = () => {
    leaveGame();
    setShowCreateModal(true);
  };

  // Dynamic styles based on direction
  const headerStyle = [
    styles.header,
    flexDirection === 'row-reverse' ? styles.headerRTL : styles.headerLTR,
  ];

  const titleStyle = [
    styles.title,
    textAlign === 'right' ? styles.textRight : null,
  ];

  const welcomeTitleStyle = [
    styles.welcomeTitle,
    textAlign === 'right' ? styles.textRight : null,
  ];

  const subtitleStyle = [
    styles.subtitle,
    textAlign === 'right' ? styles.textRight : null,
  ];

  const layoutStyle = [
    styles.layout,
    isMobile ? styles.layoutMobile : styles.layoutDesktop,
  ];

  // Show splash screen on initial load
  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
        <Image
          source={{ uri: '/assets/games/chess/splash.png' }}
          style={styles.splashImage}
          resizeMode="cover"
        />
      </Animated.View>
    );
  }

  // No active game - show lobby
  if (!game) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={headerStyle}>
          <View style={styles.headerIcon}>
            <Gamepad2 size={32} color={colors.primary} />
          </View>
          <Text style={titleStyle}>
            {t('chess.title')}
          </Text>
        </View>

        {/* Voice Invite Status */}
        {inviteStatus && (
          <View style={styles.inviteStatusContainer}>
            <Text style={styles.inviteStatusText}>{inviteStatus}</Text>
          </View>
        )}

        {/* Lobby */}
        <View style={styles.lobbyContainer}>
          <View style={styles.lobbyCard}>
            <Text style={welcomeTitleStyle}>
              {t('chess.welcome')}
            </Text>
            <Text style={subtitleStyle}>
              {t('chess.subtitle')}
            </Text>

            <View style={styles.buttonGroup}>
              <View
                style={styles.createButton}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => setShowCreateModal(true)}
              >
                <Text style={styles.createButtonText}>{t('chess.createGame')}</Text>
              </View>

              <View
                style={styles.joinButton}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => setShowJoinModal(true)}
              >
                <Text style={styles.joinButtonText}>
                  {t('chess.joinGame')}
                </Text>
              </View>
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>
        </View>

        {/* Modals */}
        <CreateGameModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGame}
        />

        <JoinGameModal
          visible={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinGame}
        />
      </View>
    );
  }

  // Active game layout
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollViewContent}
    >
      {/* Game code display */}
      <View style={styles.gameCodeContainer}>
        <Text style={styles.gameCodeLabel}>{t('chess.gameCode')}:</Text>
        <Text style={styles.gameCode}>{game.game_code}</Text>
        {!isConnected && (
          <Text style={styles.reconnectingText}>{t('chess.reconnecting')}</Text>
        )}
      </View>

      <View style={layoutStyle}>
        {/* Left Panel - Board */}
        <View style={styles.boardPanel}>
          {/* Opponent Card */}
          <PlayerCard
            player={isBoardFlipped() ? game.white_player : game.black_player}
            isCurrentTurn={!isPlayerTurn()}
          />

          {/* Chess Board */}
          <ChessBoard
            game={game}
            onMove={makeMove}
            isFlipped={isBoardFlipped()}
            isPlayerTurn={isPlayerTurn()}
            showHints={showHints}
          />

          {/* Player Card */}
          <PlayerCard
            player={isBoardFlipped() ? game.black_player : game.white_player}
            isCurrentTurn={isPlayerTurn()}
            isHost={game.white_player?.user_id === user?.id || game.black_player?.user_id === user?.id}
          />

          {/* Controls */}
          <ChessControls
            game={game}
            onResign={resign}
            onOfferDraw={offerDraw}
            onNewGame={handleNewGame}
            showHints={showHints}
            onToggleHints={setShowHints}
          />

          {/* Game status */}
          {game.status !== 'active' && game.status !== 'waiting' && (
            <View style={styles.gameStatusContainer}>
              <Text style={styles.gameStatusText}>
                {game.status === 'checkmate' && t('chess.checkmate')}
                {game.status === 'stalemate' && t('chess.stalemate')}
                {game.status === 'draw' && t('chess.draw')}
                {game.status === 'resigned' && t('chess.resigned')}
              </Text>
            </View>
          )}

          {error && (
            <Text style={styles.gameErrorText}>{error}</Text>
          )}
        </View>

        {/* Right Panel - Chat & History */}
        <GlassResizablePanel
          defaultWidth={400}
          minWidth={320}
          maxWidth={600}
          position="right"
        >
          <MoveHistory moves={game.move_history} />
          <ChessChat
            gameCode={game.game_code}
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            voiceEnabled={game.voice_enabled}
          />
        </GlassResizablePanel>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Splash screen
  splashContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },

  // Container
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  headerLTR: {
    flexDirection: 'row',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: borderRadius['2xl'],
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.white,
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
  },
  textRight: {
    textAlign: 'right',
  },

  // Voice invite status
  inviteStatusContainer: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  inviteStatusText: {
    color: colors.white,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },

  // Lobby
  lobbyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  lobbyCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(48px)',
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  welcomeTitle: {
    color: colors.white,
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.gray[400],
    fontSize: fontSize.base,
    marginBottom: spacing['2xl'],
  },
  buttonGroup: {
    width: '100%',
    gap: spacing.md,
  },
  createButton: {
    backgroundColor: colors.purple[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.black,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  joinButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  errorText: {
    color: colors.red[500],
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Game layout
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  gameCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: borderRadius.xl,
    marginVertical: spacing.md,
  },
  gameCodeLabel: {
    color: colors.gray[400],
    fontSize: fontSize.sm,
  },
  gameCode: {
    color: colors.purple[600],
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  reconnectingText: {
    color: colors.yellow[500],
    fontSize: fontSize.xs,
    fontStyle: 'italic',
  },

  // Layout
  layout: {
    gap: spacing.xl,
  },
  layoutMobile: {
    flexDirection: 'column',
  },
  layoutDesktop: {
    flexDirection: 'row',
  },

  // Board panel
  boardPanel: {
    flex: 2,
  },
  gameStatusContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  gameStatusText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  gameErrorText: {
    color: colors.red[500],
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
