/**
 * Chess game page - Multiplayer chess with AI assistance and voice chat.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing } from '@bayit/shared/theme';
import { Gamepad2 } from 'lucide-react';

// Chess components
import ChessBoard from '../components/chess/ChessBoard';
import ChessChat from '../components/chess/ChessChat';
import ChessControls from '../components/chess/ChessControls';
import MoveHistory from '../components/chess/MoveHistory';
import PlayerCard from '../components/chess/PlayerCard';
import CreateGameModal from '../components/chess/CreateGameModal';
import JoinGameModal from '../components/chess/JoinGameModal';
import useChessGame from '../hooks/useChessGame';

export default function ChessPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

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

  const handleCreateGame = async (color: 'white' | 'black', timeControl?: number) => {
    await createGame(color, timeControl);
  };

  const handleJoinGame = async (gameCode: string) => {
    await joinGame(gameCode);
  };

  const handleNewGame = () => {
    leaveGame();
    setShowCreateModal(true);
  };

  // No active game - show lobby
  if (!game) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection }]}>
          <View style={styles.headerIcon}>
            <Gamepad2 size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { textAlign }]}>
            {t('chess.title')}
          </Text>
        </View>

        {/* Lobby */}
        <View style={styles.lobby}>
          <View style={styles.lobbyCard}>
            <Text style={[styles.lobbyTitle, { textAlign }]}>
              {t('chess.welcome')}
            </Text>
            <Text style={[styles.lobbySubtitle, { textAlign }]}>
              {t('chess.subtitle')}
            </Text>

            <View style={styles.lobbyButtons}>
              <View
                style={styles.button}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => setShowCreateModal(true)}
              >
                <Text style={styles.buttonText}>{t('chess.createGame')}</Text>
              </View>

              <View
                style={[styles.button, styles.secondaryButton]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => setShowJoinModal(true)}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.gameContainer}>
      {/* Game code display */}
      <View style={styles.gameCodeBanner}>
        <Text style={styles.gameCodeLabel}>{t('chess.gameCode')}:</Text>
        <Text style={styles.gameCode}>{game.game_code}</Text>
        {!isConnected && (
          <Text style={styles.reconnectingText}>{t('chess.reconnecting')}</Text>
        )}
      </View>

      <View style={[
        styles.gameLayout,
        isMobile ? styles.gameLayoutMobile : styles.gameLayoutDesktop
      ]}>
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
          />

          {/* Game status */}
          {game.status !== 'active' && game.status !== 'waiting' && (
            <View style={styles.gameEndBanner}>
              <Text style={styles.gameEndText}>
                {game.status === 'checkmate' && t('chess.checkmate')}
                {game.status === 'stalemate' && t('chess.stalemate')}
                {game.status === 'draw' && t('chess.draw')}
                {game.status === 'resigned' && t('chess.resigned')}
              </Text>
            </View>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        {/* Right Panel - Chat & History */}
        <View style={styles.sidePanel}>
          <MoveHistory moves={game.move_history} />
          <ChessChat
            gameCode={game.game_code}
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            voiceEnabled={game.voice_enabled}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gameContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  lobby: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  lobbyCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(10, 10, 20, 0.5)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  lobbyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  lobbySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  lobbyButtons: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  secondaryButtonText: {
    color: colors.text,
  },
  gameCodeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 12,
    marginVertical: spacing.md,
  },
  gameCodeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  gameCode: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
  reconnectingText: {
    fontSize: 12,
    color: colors.warning,
    fontStyle: 'italic',
  },
  gameLayout: {
    gap: spacing.lg,
  },
  gameLayoutDesktop: {
    flexDirection: 'row',
  },
  gameLayoutMobile: {
    flexDirection: 'column',
  },
  boardPanel: {
    flex: 2,
  },
  sidePanel: {
    flex: 1,
    gap: spacing.md,
  },
  gameEndBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 12,
    alignItems: 'center',
  },
  gameEndText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
