/**
 * ChessPiece - Renders an individual chess piece using Unicode symbols.
 *
 * Maps standard algebraic piece notation (K, Q, R, B, N, P) to Unicode
 * chess characters for both white and black pieces.
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';

type PieceColor = 'white' | 'black';

interface ChessPieceProps {
  piece: string;
  color: PieceColor;
  size: number;
}

const WHITE_PIECES: Record<string, string> = {
  K: '\u2654',
  Q: '\u2655',
  R: '\u2656',
  B: '\u2657',
  N: '\u2658',
  P: '\u2659',
};

const BLACK_PIECES: Record<string, string> = {
  K: '\u265A',
  Q: '\u265B',
  R: '\u265C',
  B: '\u265D',
  N: '\u265E',
  P: '\u265F',
};

export const ChessPiece: React.FC<ChessPieceProps> = ({
  piece,
  color,
  size,
}) => {
  const pieceMap = color === 'white' ? WHITE_PIECES : BLACK_PIECES;
  const symbol = pieceMap[piece.toUpperCase()];

  if (!symbol) return null;

  return (
    <Text
      style={[styles.piece, { fontSize: size * 0.7, lineHeight: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${color} ${piece}`}
    >
      {symbol}
    </Text>
  );
};

const styles = StyleSheet.create({
  piece: {
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
  },
});
