/**
 * ChessControls - Game control buttons for the chess game.
 *
 * Provides resign, offer draw, request undo, and flip board actions.
 * Buttons are disabled when it is not the player's turn (except flip board).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/glass-ui/native';
import { spacing } from '@olorin/design-tokens';

interface ChessControlsProps {
  onResign: () => void;
  onOfferDraw: () => void;
  onUndoRequest: () => void;
  onFlipBoard: () => void;
  isMyTurn: boolean;
}

export const ChessControls: React.FC<ChessControlsProps> = ({
  onResign,
  onOfferDraw,
  onUndoRequest,
  onFlipBoard,
  isMyTurn,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <GlassButton
          variant="destructive"
          size="small"
          onPress={onResign}
          style={styles.button}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('chess.resign')}
          accessibilityHint={t('chess.resignHint')}
        >
          {t('chess.resign')}
        </GlassButton>

        <GlassButton
          variant="secondary"
          size="small"
          onPress={onOfferDraw}
          disabled={!isMyTurn}
          style={styles.button}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('chess.offerDraw')}
          accessibilityHint={t('chess.offerDrawHint')}
        >
          {t('chess.offerDraw')}
        </GlassButton>
      </View>

      <View style={styles.row}>
        <GlassButton
          variant="secondary"
          size="small"
          onPress={onUndoRequest}
          disabled={!isMyTurn}
          style={styles.button}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('chess.requestUndo')}
          accessibilityHint={t('chess.requestUndoHint')}
        >
          {t('chess.requestUndo')}
        </GlassButton>

        <GlassButton
          variant="ghost"
          size="small"
          onPress={onFlipBoard}
          style={styles.button}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('chess.flipBoard')}
          accessibilityHint={t('chess.flipBoardHint')}
        >
          {t('chess.flipBoard')}
        </GlassButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
