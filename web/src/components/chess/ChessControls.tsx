/**
 * Chess game controls component (resign, offer draw, new game).
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { Flag, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChessControlsProps {
  game: any;
  onResign: () => void;
  onOfferDraw: () => void;
  onNewGame?: () => void;
}

export default function ChessControls({ game, onResign, onOfferDraw, onNewGame }: ChessControlsProps) {
  const { t } = useTranslation();
  const isGameActive = game?.status === 'active';

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, styles.resignButton, !isGameActive && styles.buttonDisabled]}
        onPress={onResign}
        disabled={!isGameActive}
      >
        <Flag size={16} color={colors.error} />
        <Text style={[styles.buttonText, styles.resignText]}>{t('chess.resign')}</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.drawButton, !isGameActive && styles.buttonDisabled]}
        onPress={onOfferDraw}
        disabled={!isGameActive}
      >
        <Text style={styles.drawIcon}>🤝</Text>
        <Text style={[styles.buttonText, styles.drawText]}>{t('chess.offerDraw')}</Text>
      </Pressable>

      {onNewGame && (
        <Pressable style={[styles.button, styles.newGameButton]} onPress={onNewGame}>
          <RotateCcw size={16} color={colors.success} />
          <Text style={[styles.buttonText, styles.newGameText]}>{t('chess.newGame')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      },
    }),
  },
  resignButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  drawButton: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  newGameButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resignText: {
    color: colors.error,
  },
  drawText: {
    color: colors.warning,
  },
  drawIcon: {
    fontSize: 16,
    marginEnd: spacing.xs,
  },
  newGameText: {
    color: colors.success,
  },
});
