/**
 * Move history component displaying chess moves in Standard Algebraic Notation (SAN).
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { useTranslation } from 'react-i18next';

interface Move {
  san: string;
  player: 'white' | 'black';
}

interface MoveHistoryProps {
  moves: Move[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const { t } = useTranslation();
  // Group moves into pairs (white, black)
  const movePairs: Array<{ moveNumber: number; white?: Move; black?: Move }> = [];

  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('chess.moveHistory')}</Text>

      <ScrollView style={styles.movesList} contentContainerStyle={styles.movesListContent}>
        {movePairs.map((pair, idx) => (
          <View key={idx} style={styles.moveRow}>
            <Text style={styles.moveNumber}>{pair.moveNumber}.</Text>
            <Text style={[styles.move, styles.whiteMove]}>{pair.white?.san || ''}</Text>
            <Text style={[styles.move, styles.blackMove]}>{pair.black?.san || '...'}</Text>
          </View>
        ))}

        {moves.length === 0 && (
          <Text style={styles.emptyText}>{t('chess.noMoves')}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10, 10, 20, 0.3)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    flex: 1,
    maxHeight: 300,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  movesList: {
    flex: 1,
  },
  movesListContent: {
    paddingBottom: spacing.sm,
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  moveNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 30,
  },
  move: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  whiteMove: {
    color: colors.text,
  },
  blackMove: {
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
});
