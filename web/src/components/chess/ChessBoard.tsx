/**
 * Chess board component with interactive piece movement.
 * Uses chess.js for game logic and move validation.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Platform } from 'react-native';
import { Chess } from 'chess.js';
import { colors, spacing } from '@bayit/shared/theme';

interface ChessBoardProps {
  game: any;
  onMove: (from: string, to: string, promotion?: string) => void;
  isFlipped?: boolean;
  isPlayerTurn?: boolean;
}

// Unicode chess pieces
const PIECE_SYMBOLS: Record<string, string> = {
  'wp': '♙', 'wn': '♘', 'wb': '♗', 'wr': '♖', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'bn': '♞', 'bb': '♝', 'br': '♜', 'bq': '♛', 'bk': '♚',
};

export default function ChessBoard({
  game,
  onMove,
  isFlipped = false,
  isPlayerTurn = true
}: ChessBoardProps) {
  const { width } = useWindowDimensions();
  const [chess] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{from: string; to: string} | null>(null);

  // Update chess instance when game state changes
  useEffect(() => {
    if (game?.board_fen) {
      try {
        chess.load(game.board_fen);
      } catch (err) {
        console.error('[ChessBoard] Failed to load FEN:', err);
      }
    }
  }, [game?.board_fen, chess]);

  // Track last move for highlighting
  useEffect(() => {
    if (game?.move_history && game.move_history.length > 0) {
      const lastMoveData = game.move_history[game.move_history.length - 1];
      setLastMove({
        from: lastMoveData.from_square,
        to: lastMoveData.to_square
      });
    }
  }, [game?.move_history]);

  const handleSquarePress = (square: string) => {
    if (!isPlayerTurn) {
      return; // Not player's turn
    }

    if (selectedSquare) {
      // Attempting to make a move
      try {
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q' // Auto-promote to queen
        });

        if (move) {
          // Valid move
          onMove(selectedSquare, square, move.promotion);
          setSelectedSquare(null);
          setLegalMoves([]);
        } else {
          // Invalid move - try selecting new piece
          selectSquare(square);
        }
      } catch (err) {
        // Move failed, try selecting new square
        selectSquare(square);
      }
    } else {
      // Selecting a piece
      selectSquare(square);
    }
  };

  const selectSquare = (square: string) => {
    const piece = chess.get(square);

    // Only select pieces of the current turn color
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);

      // Get legal moves for this piece
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(moves.map(m => m.to));
    } else {
      // Deselect
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const renderSquare = (row: number, col: number) => {
    const file = String.fromCharCode(97 + col); // a-h
    const rank = isFlipped ? row + 1 : 8 - row; // 1-8
    const square = `${file}${rank}`;

    const piece = chess.get(square);
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare === square;
    const isLegalMove = legalMoves.includes(square);
    const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);

    // Calculate responsive square size
    const boardSize = Math.min(width * 0.9, 600);
    const squareSize = boardSize / 8;

    return (
      <Pressable
        key={square}
        style={[
          styles.square,
          { width: squareSize, height: squareSize },
          isLight ? styles.lightSquare : styles.darkSquare,
          isSelected && styles.selectedSquare,
          isLastMoveSquare && styles.lastMoveSquare,
        ]}
        onPress={() => handleSquarePress(square)}
      >
        {/* Piece */}
        {piece && (
          <Text style={[
            styles.piece,
            { fontSize: squareSize * 0.7 },
            piece.color === 'w' ? styles.whitePiece : styles.blackPiece
          ]}>
            {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
          </Text>
        )}

        {/* Legal move indicator */}
        {isLegalMove && (
          <View style={[
            styles.legalMoveIndicator,
            { width: squareSize * 0.3, height: squareSize * 0.3, borderRadius: squareSize * 0.15 },
            piece ? styles.captureMoveIndicator : null
          ]} />
        )}

        {/* Square label (coordinates) */}
        {row === 7 && (
          <Text style={[styles.fileLabel, { fontSize: squareSize * 0.15 }]}>
            {file}
          </Text>
        )}
        {col === 0 && (
          <Text style={[styles.rankLabel, { fontSize: squareSize * 0.15 }]}>
            {rank}
          </Text>
        )}
      </Pressable>
    );
  };

  const renderBoard = () => {
    const rows = [];
    for (let row = 0; row < 8; row++) {
      const cols = [];
      for (let col = 0; col < 8; col++) {
        cols.push(renderSquare(row, col));
      }
      rows.push(
        <View key={row} style={styles.row}>
          {cols}
        </View>
      );
    }
    return rows;
  };

  return (
    <View style={styles.container}>
      <View style={styles.board}>
        {renderBoard()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  board: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.dark,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(168, 85, 247, 0.3)',
      },
    }),
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lightSquare: {
    backgroundColor: '#f0d9b5',
  },
  darkSquare: {
    backgroundColor: '#b58863',
  },
  selectedSquare: {
    backgroundColor: 'rgba(168, 85, 247, 0.5)',
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 0 10px rgba(168, 85, 247, 0.8)',
      },
    }),
  },
  lastMoveSquare: {
    backgroundColor: 'rgba(255, 255, 0, 0.3)',
  },
  piece: {
    fontWeight: '400',
    textAlign: 'center',
    ...Platform.select({
      web: {
        userSelect: 'none',
        cursor: 'pointer',
      },
    }),
  },
  whitePiece: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: '#000000',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  legalMoveIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 255, 0, 0.4)',
  },
  captureMoveIndicator: {
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    borderWidth: 3,
    borderColor: 'rgba(255, 0, 0, 0.8)',
  },
  fileLabel: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    color: 'rgba(0, 0, 0, 0.5)',
    fontWeight: '600',
  },
  rankLabel: {
    position: 'absolute',
    top: 2,
    left: 2,
    color: 'rgba(0, 0, 0, 0.5)',
    fontWeight: '600',
  },
});
