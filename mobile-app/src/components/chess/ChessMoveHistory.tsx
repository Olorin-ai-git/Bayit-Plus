/**
 * ChessMoveHistory - Scrollable move history list in algebraic notation.
 *
 * Displays moves in a numbered row format (1. e4 e5, 2. Nf3 Nc6, ...).
 * Highlights the move at the current index.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@olorin/design-tokens';
import Colors from '../../theme/colors';

interface ChessMoveHistoryProps {
  moves: string[];
  currentMoveIndex: number;
}

interface MovePair {
  moveNumber: number;
  whiteMove: string;
  blackMove: string | null;
  whiteIndex: number;
  blackIndex: number | null;
}

function buildMovePairs(moves: string[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      whiteMove: moves[i],
      blackMove: i + 1 < moves.length ? moves[i + 1] : null,
      whiteIndex: i,
      blackIndex: i + 1 < moves.length ? i + 1 : null,
    });
  }
  return pairs;
}

const MONO_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export const ChessMoveHistory: React.FC<ChessMoveHistoryProps> = ({
  moves,
  currentMoveIndex,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const pairs = buildMovePairs(moves);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [moves.length]);

  const isHighlighted = useCallback(
    (moveIndex: number) => moveIndex === currentMoveIndex,
    [currentMoveIndex],
  );

  if (moves.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('chess.noMoves')}</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="list"
      accessibilityLabel={t('chess.moveHistoryLabel')}
    >
      <Text style={styles.title}>{t('chess.moveHistory')}</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {pairs.map((pair) => (
          <View key={pair.moveNumber} style={styles.moveRow}>
            <Text style={styles.moveNumber}>{pair.moveNumber}.</Text>
            <View
              style={[
                styles.moveCell,
                isHighlighted(pair.whiteIndex) && styles.highlighted,
              ]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${pair.moveNumber}. ${pair.whiteMove}`}
            >
              <Text
                style={[
                  styles.moveText,
                  isHighlighted(pair.whiteIndex) && styles.highlightedText,
                ]}
              >
                {pair.whiteMove}
              </Text>
            </View>
            {pair.blackMove && pair.blackIndex !== null && (
              <View
                style={[
                  styles.moveCell,
                  isHighlighted(pair.blackIndex) && styles.highlighted,
                ]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${pair.moveNumber}... ${pair.blackMove}`}
              >
                <Text
                  style={[
                    styles.moveText,
                    isHighlighted(pair.blackIndex) && styles.highlightedText,
                  ]}
                >
                  {pair.blackMove}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 160,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Text.secondary,
    marginBottom: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.Text.muted,
    fontStyle: 'italic',
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  moveNumber: {
    fontSize: 13,
    color: Colors.Text.disabled,
    width: 28,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  moveCell: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 56,
  },
  highlighted: {
    backgroundColor: Colors.Primary.p700,
  },
  moveText: {
    fontSize: 14,
    color: Colors.Text.primary,
    fontFamily: MONO_FONT,
  },
  highlightedText: {
    fontWeight: '600',
  },
});
