/**
 * ChessScreenMobile - Chess game screen with board, controls, and move history.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassCard } from '@olorin/glass-ui/native';
import { spacing } from '@olorin/design-tokens';
import { logger } from '../utils/logger';
import Colors from '../theme/colors';
import { ChessBoard } from '../components/chess/ChessBoard';
import { ChessControls } from '../components/chess/ChessControls';
import { ChessMoveHistory } from '../components/chess/ChessMoveHistory';
import { OnlineStatusBadge } from '../components/social/OnlineStatusBadge';
import { useChessGame } from '../hooks/useChessGame';

const log = logger.scope('ChessScreen');
type ChessRouteParams = { Chess: { gameId?: string; opponentId?: string } };
const GAME_OVER_STATES = ['checkmate', 'stalemate', 'draw', 'resigned'];

export const ChessScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<ChessRouteParams, 'Chess'>>();
  const { gameId, opponentId } = route.params || {};
  const game = useChessGame(gameId, opponentId);

  if (game.isLoading) {
    return (
      <View style={styles.loadingContainer}><GlassLoadingSpinner size="large" /></View>
    );
  }

  const topPlayer = game.flipped ? game.whitePlayer : game.blackPlayer;
  const bottomPlayer = game.flipped ? game.blackPlayer : game.whitePlayer;
  const topColor = game.flipped ? 'white' : 'black';
  const bottomColor = game.flipped ? 'black' : 'white';
  const isGameOver = GAME_OVER_STATES.includes(game.gameStatus);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t('chess.title')}</Text>
      {game.isCheck && (
        <GlassCard style={styles.alertBanner}>
          <Text style={styles.alertText} accessible accessibilityRole="alert"
            accessibilityLabel={t('chess.checkAlert')}>{t('chess.check')}</Text>
        </GlassCard>
      )}
      {isGameOver && (
        <GlassCard style={styles.statusBanner}>
          <Text style={styles.statusText} accessible accessibilityRole="alert"
            accessibilityLabel={t(`chess.status.${game.gameStatus}`)}>
            {t(`chess.status.${game.gameStatus}`)}
          </Text>
        </GlassCard>
      )}
      <PlayerRow name={topPlayer?.name} color={topColor}
        isActive={topColor !== game.playerColor ? !game.isMyTurn : game.isMyTurn} />
      <ChessBoard board={game.board} selectedSquare={game.selectedSquare}
        validMoves={game.validMoves} onSquarePress={game.onSquarePress} flipped={game.flipped} />
      <PlayerRow name={bottomPlayer?.name} color={bottomColor}
        isActive={bottomColor === game.playerColor && game.isMyTurn} />
      {!isGameOver && (
        <View style={styles.turnIndicator}>
          <Text style={styles.turnText}>
            {game.isMyTurn ? t('chess.yourTurn') : t('chess.opponentTurn')}
          </Text>
        </View>
      )}
      <ChessMoveHistory moves={game.moves} currentMoveIndex={game.currentMoveIndex} />
      {!isGameOver && (
        <ChessControls onResign={game.resign} onOfferDraw={game.offerDraw}
          onUndoRequest={game.requestUndo} onFlipBoard={game.flipBoard}
          isMyTurn={game.isMyTurn} />
      )}
    </ScrollView>
  );
};

interface PlayerRowProps {
  name?: string; color: 'white' | 'black'; isActive: boolean;
}

const PlayerRow: React.FC<PlayerRowProps> = ({ name, color, isActive }) => {
  const { t } = useTranslation();
  const icon = color === 'white' ? '\u2654' : '\u265A';
  const displayName = name || (color === 'white' ? t('chess.whitePlayer') : t('chess.blackPlayer'));
  return (
    <View style={[styles.playerRow, isActive && styles.playerRowActive]}
      accessible accessibilityRole="text"
      accessibilityLabel={`${displayName}, ${t(`chess.${color}`)}`}
      accessibilityHint={isActive ? t('chess.activePlayer') : undefined}>
      <Text style={styles.playerPiece}>{icon}</Text>
      <Text style={styles.playerName} numberOfLines={1}>{displayName}</Text>
      {isActive && <OnlineStatusBadge status="online" size="sm" />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  content: { paddingVertical: spacing.lg },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.Background.primary,
  },
  title: {
    fontSize: 24, fontWeight: 'bold', color: Colors.Text.primary,
    textAlign: 'center', marginBottom: spacing.md,
  },
  alertBanner: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm,
    alignItems: 'center', backgroundColor: Colors.Warning.default,
  },
  alertText: { fontSize: 16, fontWeight: '700', color: Colors.Dark.d950 },
  statusBanner: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md,
    alignItems: 'center',
  },
  statusText: { fontSize: 18, fontWeight: '700', color: Colors.Text.primary },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  playerRowActive: { backgroundColor: Colors.Glass.whiteSubtle },
  playerPiece: { fontSize: 22 },
  playerName: { fontSize: 16, fontWeight: '600', color: Colors.Text.primary, flex: 1 },
  turnIndicator: { alignItems: 'center', paddingVertical: spacing.sm },
  turnText: { fontSize: 15, fontWeight: '600', color: Colors.Primary.p400 },
});
