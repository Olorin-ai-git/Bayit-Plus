/**
 * ChessBoard - 8x8 chess board with alternating light/dark squares.
 *
 * Renders pieces from a 2D board array, highlights the selected square
 * and valid move targets. Supports board flipping for black perspective.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '@olorin/design-tokens';
import Colors from '../../theme/colors';
import { ChessPiece } from './ChessPiece';

const BOARD_SIZE = 8;
const BOARD_PADDING = spacing.md * 2;

interface ChessBoardProps {
  board: string[][];
  selectedSquare?: string | null;
  validMoves: string[];
  onSquarePress: (square: string) => void;
  flipped: boolean;
}

const LIGHT_SQUARE = Colors.Dark.d100;
const DARK_SQUARE = Colors.Dark.d500;
const SELECTED_HIGHLIGHT = Colors.Warning.default;
const VALID_MOVE_HIGHLIGHT = Colors.Success.s400;

function squareToNotation(row: number, col: number): string {
  const file = String.fromCharCode(97 + col);
  const rank = String(BOARD_SIZE - row);
  return `${file}${rank}`;
}

function parsePieceCell(cell: string): { piece: string; color: 'white' | 'black' } | null {
  if (!cell || cell === '') return null;
  const isWhite = cell === cell.toUpperCase();
  return { piece: cell.toUpperCase(), color: isWhite ? 'white' : 'black' };
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  selectedSquare,
  validMoves,
  onSquarePress,
  flipped,
}) => {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const boardWidth = screenWidth - BOARD_PADDING;
  const squareSize = boardWidth / BOARD_SIZE;

  const validMovesSet = useMemo(() => new Set(validMoves), [validMoves]);

  const renderSquare = useCallback(
    (displayRow: number, displayCol: number) => {
      const row = flipped ? BOARD_SIZE - 1 - displayRow : displayRow;
      const col = flipped ? BOARD_SIZE - 1 - displayCol : displayCol;
      const notation = squareToNotation(row, col);
      const isLight = (row + col) % 2 === 0;
      const isSelected = selectedSquare === notation;
      const isValidMove = validMovesSet.has(notation);
      const cellValue = board[row]?.[col] || '';
      const parsed = parsePieceCell(cellValue);

      let bgColor = isLight ? LIGHT_SQUARE : DARK_SQUARE;
      if (isSelected) bgColor = SELECTED_HIGHLIGHT;
      else if (isValidMove) bgColor = VALID_MOVE_HIGHLIGHT;

      const accessLabel = parsed
        ? t('chess.squareWithPiece', {
            square: notation,
            color: parsed.color,
            piece: parsed.piece,
          })
        : t('chess.emptySquare', { square: notation });

      return (
        <Pressable
          key={notation}
          style={[
            styles.square,
            {
              width: squareSize,
              height: squareSize,
              backgroundColor: bgColor,
            },
          ]}
          onPress={() => onSquarePress(notation)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={accessLabel}
          accessibilityHint={
            isValidMove
              ? t('chess.validMoveHint')
              : t('chess.selectSquareHint')
          }
        >
          {parsed && (
            <ChessPiece
              piece={parsed.piece}
              color={parsed.color}
              size={squareSize}
            />
          )}
          {isValidMove && !parsed && (
            <View
              style={[
                styles.moveIndicator,
                {
                  width: squareSize * 0.3,
                  height: squareSize * 0.3,
                  borderRadius: squareSize * 0.15,
                },
              ]}
            />
          )}
        </Pressable>
      );
    },
    [board, selectedSquare, validMovesSet, flipped, squareSize, onSquarePress, t],
  );

  const rows = useMemo(() => {
    const result = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const cols = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        cols.push(renderSquare(r, c));
      }
      result.push(
        <View key={r} style={styles.row}>
          {cols}
        </View>,
      );
    }
    return result;
  }, [renderSquare]);

  return (
    <View
      style={[styles.boardContainer, { width: boardWidth, height: boardWidth }]}
      accessible
      accessibilityRole="grid"
      accessibilityLabel={t('chess.boardLabel')}
    >
      {rows}
    </View>
  );
};

const styles = StyleSheet.create({
  boardContainer: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: Colors.Glass.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});
