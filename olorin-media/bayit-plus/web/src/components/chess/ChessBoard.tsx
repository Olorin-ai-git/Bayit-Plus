/**
 * Chess board component with interactive piece movement.
 * Uses chess.js for game logic and move validation.
 * Features 3D glassmorphic chess pieces and board design.
 * Fully localized with RTL/LTR support.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions, Platform, Image, Animated, StyleSheet } from 'react-native';
import { Chess } from 'chess.js';
import { colors, spacing } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { isRTL as checkIsRTL } from '@bayit/shared-i18n';
import logger from '@/utils/logger';

interface ChessBoardProps {
  game: any;
  onMove: (from: string, to: string, promotion?: string) => void;
  isFlipped?: boolean;
  isPlayerTurn?: boolean;
  showHints?: boolean;
}

interface AnimatingPiece {
  from: string;
  to: string;
  piece: { type: string; color: string };
}

// 3D Chess piece individual asset paths (from shared assets)
const PIECE_IMAGES: Record<string, string> = {
  'wk': '/assets/games/chess/pieces/King-white.png',
  'wq': '/assets/games/chess/pieces/Queen-white.png',
  'wr': '/assets/games/chess/pieces/Rook-white.png',
  'wb': '/assets/games/chess/pieces/Bishop-white.png',
  'wn': '/assets/games/chess/pieces/Knight-white.png',
  'wp': '/assets/games/chess/pieces/Pawn-white.png',
  'bk': '/assets/games/chess/pieces/King-black.png',
  'bq': '/assets/games/chess/pieces/Queen-black.png',
  'br': '/assets/games/chess/pieces/Rook-black.png',
  'bb': '/assets/games/chess/pieces/Bishop-black.png',
  'bn': '/assets/games/chess/pieces/Knight-black.png',
  'bp': '/assets/games/chess/pieces/Pawn-black.png',
};

// Not using background image - will create programmatic board

export default function ChessBoard({
  game,
  onMove,
  isFlipped = false,
  isPlayerTurn = true,
  showHints = false
}: ChessBoardProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [chess] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{from: string; to: string} | null>(null);
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);
  const animationProgress = useRef(new Animated.Value(0)).current;
  const [checkState, setCheckState] = useState<{
    isInCheck: boolean;
    kingSquare: string | null;
    attackingSquares: string[];
  }>({ isInCheck: false, kingSquare: null, attackingSquares: [] });
  const [illegalMoveSquare, setIllegalMoveSquare] = useState<string | null>(null);
  const illegalMoveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRTL = checkIsRTL();

  // Clear illegal move indicator after timeout
  const showIllegalMove = useCallback((square: string) => {
    if (illegalMoveTimeout.current) {
      clearTimeout(illegalMoveTimeout.current);
    }
    setIllegalMoveSquare(square);
    illegalMoveTimeout.current = setTimeout(() => {
      setIllegalMoveSquare(null);
    }, 500);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (illegalMoveTimeout.current) {
        clearTimeout(illegalMoveTimeout.current);
      }
    };
  }, []);

  // Check if path between two squares is blocked
  const isPathBlocked = useCallback((
    fromFile: number, fromRank: number,
    toFile: number, toRank: number,
    board: ({ type: string; color: string } | null)[][]
  ): boolean => {
    const fileStep = toFile > fromFile ? 1 : toFile < fromFile ? -1 : 0;
    const rankStep = toRank > fromRank ? 1 : toRank < fromRank ? -1 : 0;

    let file = fromFile + fileStep;
    let rank = fromRank + rankStep;

    while (file !== toFile || rank !== toRank) {
      if (board[7 - rank][file] !== null) {
        return true; // Path is blocked
      }
      file += fileStep;
      rank += rankStep;
    }

    return false;
  }, []);

  // Helper function to check if a piece can attack a target square
  const canPieceAttackSquare = useCallback((
    pieceType: string,
    fromSquare: string,
    toSquare: string,
    board: ({ type: string; color: string } | null)[][]
  ): boolean => {
    const fromFile = fromSquare.charCodeAt(0) - 97;
    const fromRank = parseInt(fromSquare[1]) - 1;
    const toFile = toSquare.charCodeAt(0) - 97;
    const toRank = parseInt(toSquare[1]) - 1;

    const fileDiff = Math.abs(toFile - fromFile);
    const rankDiff = Math.abs(toRank - fromRank);

    switch (pieceType) {
      case 'p': // Pawn attacks diagonally
        const pawnColor = board[7 - fromRank][fromFile]?.color;
        const pawnDirection = pawnColor === 'w' ? 1 : -1;
        return fileDiff === 1 && (toRank - fromRank) === pawnDirection;

      case 'n': // Knight
        return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);

      case 'b': // Bishop - diagonal
        if (fileDiff !== rankDiff) return false;
        return !isPathBlocked(fromFile, fromRank, toFile, toRank, board);

      case 'r': // Rook - horizontal/vertical
        if (fileDiff !== 0 && rankDiff !== 0) return false;
        return !isPathBlocked(fromFile, fromRank, toFile, toRank, board);

      case 'q': // Queen - diagonal or straight
        if (fileDiff !== rankDiff && fileDiff !== 0 && rankDiff !== 0) return false;
        return !isPathBlocked(fromFile, fromRank, toFile, toRank, board);

      case 'k': // King
        return fileDiff <= 1 && rankDiff <= 1;

      default:
        return false;
    }
  }, [isPathBlocked]);

  // Detect check and find attacking pieces
  const updateCheckState = useCallback(() => {
    if (!chess.isCheck()) {
      setCheckState({ isInCheck: false, kingSquare: null, attackingSquares: [] });
      return;
    }

    // Find the king's position (the player whose turn it is - they are in check)
    const currentTurn = chess.turn();
    const opponentColor = currentTurn === 'w' ? 'b' : 'w';
    const board = chess.board();
    let kingSquare: string | null = null;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'k' && piece.color === currentTurn) {
          const file = String.fromCharCode(97 + col); // a-h
          const rank = 8 - row; // 1-8
          kingSquare = `${file}${rank}`;
          break;
        }
      }
      if (kingSquare) break;
    }

    if (!kingSquare) {
      setCheckState({ isInCheck: false, kingSquare: null, attackingSquares: [] });
      return;
    }

    // Find all opponent pieces that could be attacking the king
    // We use isAttacked to check if the king square is attacked, then find the attackers
    const attackingSquares: string[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === opponentColor) {
          const file = String.fromCharCode(97 + col);
          const rank = 8 - row;
          const square = `${file}${rank}`;

          // Check if this piece type can attack the king from this position
          if (canPieceAttackSquare(piece.type, square, kingSquare, board)) {
            attackingSquares.push(square);
          }
        }
      }
    }

    logger.debug('Check detected! King at', 'ChessBoard', { kingSquare, attackingSquares });
    setCheckState({ isInCheck: true, kingSquare, attackingSquares });
  }, [chess, canPieceAttackSquare]);

  // Update chess instance when game state changes
  useEffect(() => {
    if (game?.board_fen) {
      try {
        chess.load(game.board_fen);
        updateCheckState();
      } catch (err) {
        logger.error('Failed to load FEN', 'ChessBoard', { error: err });
      }
    }
  }, [game?.board_fen, chess, updateCheckState]);

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

  // Log check state changes for debugging
  useEffect(() => {
    if (checkState.isInCheck) {
      logger.debug('Check detected! King at', 'ChessBoard', { kingSquare: checkState.kingSquare, attackingSquares: checkState.attackingSquares });
    }
  }, [checkState]);

  // Helper function to animate piece movement
  const animateMove = (from: string, to: string, piece: { type: string; color: string }, callback: () => void) => {
    setAnimatingPiece({ from, to, piece });
    animationProgress.setValue(0);

    Animated.timing(animationProgress, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setAnimatingPiece(null);
      callback();
    });
  };

  const handleSquarePress = (square: string) => {
    if (!isPlayerTurn) {
      return; // Not player's turn
    }

    if (selectedSquare) {
      // Attempting to make a move
      try {
        const piece = chess.get(selectedSquare);
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q' // Auto-promote to queen
        });

        if (move && piece) {
          // Valid move - animate it
          const fromSquare = selectedSquare;
          animateMove(fromSquare, square, piece, () => {
            onMove(fromSquare, square, move.promotion);
          });
          setSelectedSquare(null);
          setLegalMoves([]);
        } else {
          // Invalid move - show red border and try selecting new piece
          showIllegalMove(square);
          selectSquare(square);
        }
      } catch (err) {
        // Move failed - show red border and try selecting new square
        showIllegalMove(square);
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

  // Helper to get square coordinates
  const getSquareCoordinates = (square: string) => {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1; // 1=0, 2=1, etc.

    const row = isFlipped ? rank : 7 - rank;
    const col = isRTL ? 7 - file : file;

    return { row, col };
  };

  const renderSquare = (row: number, col: number, playableSize: number) => {
    const file = String.fromCharCode(97 + col); // a-h
    const rank = isFlipped ? row + 1 : 8 - row; // 1-8
    const square = `${file}${rank}`;

    const piece = chess.get(square);

    // Don't render piece if it's currently being animated from this square
    const isAnimatingFrom = animatingPiece?.from === square;
    const shouldRenderPiece = piece && !isAnimatingFrom;

    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare === square;
    const isLegalMove = legalMoves.includes(square);
    const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);

    // Check if this square is part of the check scenario
    const isKingInCheck = checkState.isInCheck && checkState.kingSquare === square;
    const isAttackingPiece = checkState.isInCheck && checkState.attackingSquares.includes(square);
    const isIllegalMoveTarget = illegalMoveSquare === square;

    // Calculate square size based on playable area (94% of board)
    const squareSize = playableSize / 8;

    return (
      <Pressable
        key={square}
        className="justify-end items-center relative overflow-visible"
        style={[
          { width: squareSize, height: squareSize },
          isLight ? styles.squareLight : styles.squareDark,
          isSelected && styles.squareSelected,
          isLastMoveSquare && styles.squareLastMove,
          isIllegalMoveTarget && styles.squareIllegal,
          isKingInCheck && styles.squareKingCheck,
          isAttackingPiece && styles.squareAttacking,
        ]}
        onPress={() => handleSquarePress(square)}
      >
        {/* 3D Glass Chess Piece - Allow overflow to show full detail */}
        {shouldRenderPiece && (() => {
          const pieceKey = `${piece.color}${piece.type}`;
          const pieceImage = PIECE_IMAGES[pieceKey];

          // Size pieces by importance: King/Queen largest, then others, then pawns
          const isPawn = piece.type === 'p';
          const isKingOrQueen = piece.type === 'k' || piece.type === 'q';

          let pieceWidth, pieceHeight;

          if (isKingOrQueen) {
            // King and Queen are largest and most prominent
            pieceWidth = squareSize * 1.5;
            pieceHeight = squareSize * 1.8;
          } else if (isPawn) {
            // Pawns are smallest
            pieceWidth = squareSize * 1.4;
            pieceHeight = squareSize * 1.2;
          } else {
            // Rooks, Knights, Bishops are medium
            pieceWidth = squareSize * 1.4;
            pieceHeight = squareSize * 1.6;
          }

          // All pieces anchor from bottom of square
          const bottomOffset = squareSize * 0.05; // Small lift from bottom edge

          return (
            <View className="z-[15]" style={[(isKingInCheck || isAttackingPiece) && styles.pieceCheckGlow]}>
              <Image
                source={{ uri: pieceImage }}
                className="z-10 select-none cursor-pointer"
                style={{
                  width: pieceWidth,
                  height: pieceHeight,
                  marginBottom: bottomOffset,
                  filter: Platform.OS === 'web'
                    ? 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.8)) drop-shadow(0 5px 15px rgba(168, 85, 247, 0.4)) drop-shadow(0 2px 8px rgba(79, 70, 229, 0.5))'
                    : undefined
                }}
                resizeMode="contain"
              />
            </View>
          );
        })()}

        {/* Legal move indicator - only show if hints enabled */}
        {showHints && isLegalMove && (
          <View
            className="absolute"
            style={[
              {
                width: squareSize * 0.3,
                height: squareSize * 0.3,
                borderRadius: squareSize * 0.15
              },
              piece ? styles.hintCapture : styles.hintMove
            ]}
          />
        )}
      </Pressable>
    );
  };

  const renderBoard = (playableSize: number) => {
    const rows = [];
    for (let row = 0; row < 8; row++) {
      const cols = [];
      for (let col = 0; col < 8; col++) {
        // Reverse column order for RTL
        const actualCol = isRTL ? 7 - col : col;
        cols.push(renderSquare(row, actualCol, playableSize));
      }
      rows.push(
        <View key={row} className="flex-row">
          {cols}
        </View>
      );
    }
    return rows;
  };

  // Render the animating piece that moves across the board
  const renderAnimatingPiece = (playableSize: number) => {
    if (!animatingPiece) return null;

    const fromCoords = getSquareCoordinates(animatingPiece.from);
    const toCoords = getSquareCoordinates(animatingPiece.to);
    const squareSize = playableSize / 8;

    // Calculate positions
    const fromLeft = fromCoords.col * squareSize;
    const fromTop = fromCoords.row * squareSize;
    const toLeft = toCoords.col * squareSize;
    const toTop = toCoords.row * squareSize;

    // Interpolate position based on animation progress
    const animatedLeft = animationProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [fromLeft, toLeft],
    });

    const animatedTop = animationProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [fromTop, toTop],
    });

    const pieceKey = `${animatingPiece.piece.color}${animatingPiece.piece.type}`;
    const pieceImage = PIECE_IMAGES[pieceKey];

    // Size pieces by importance: King/Queen largest, then others, then pawns
    const isPawn = animatingPiece.piece.type === 'p';
    const isKingOrQueen = animatingPiece.piece.type === 'k' || animatingPiece.piece.type === 'q';

    let pieceWidth, pieceHeight;

    if (isKingOrQueen) {
      // King and Queen are largest and most prominent
      pieceWidth = squareSize * 1.5;
      pieceHeight = squareSize * 1.8;
    } else if (isPawn) {
      // Pawns are smallest
      pieceWidth = squareSize * 1.4;
      pieceHeight = squareSize * 1.2;
    } else {
      // Rooks, Knights, Bishops are medium
      pieceWidth = squareSize * 1.4;
      pieceHeight = squareSize * 1.6;
    }

    // All pieces anchor from bottom of square
    const bottomOffset = squareSize * 0.05;

    return (
      <Animated.View
        className="absolute z-[100] justify-end items-center"
        style={{
          left: animatedLeft,
          top: animatedTop,
          width: squareSize,
          height: squareSize,
        }}
        pointerEvents="none"
      >
        <Image
          source={{ uri: pieceImage }}
          className="z-[100]"
          style={{
            width: pieceWidth,
            height: pieceHeight,
            marginBottom: bottomOffset,
            filter: Platform.OS === 'web'
              ? 'drop-shadow(0 15px 35px rgba(0, 0, 0, 0.9)) drop-shadow(0 8px 25px rgba(168, 85, 247, 0.6)) drop-shadow(0 4px 15px rgba(79, 70, 229, 0.7))'
              : undefined
          }}
          resizeMode="contain"
        />
      </Animated.View>
    );
  };

  // Calculate responsive board size
  const boardSize = Math.min(width * 0.95, 800);

  return (
    <View className="items-center justify-center p-4">
      <View
        className="rounded-[20px] border border-purple-500/30 bg-black/40 backdrop-blur-[30px] shadow-chess-board"
        style={{ width: boardSize, height: boardSize }}
      >
        {renderBoard(boardSize)}
        {renderAnimatingPiece(boardSize)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  squareLight: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    backdropFilter: 'blur(4px)',
    borderWidth: 0.5,
    borderColor: 'rgba(168, 85, 247, 0.15)',
  },
  squareDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    borderWidth: 0.5,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  squareSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.5)',
    backdropFilter: 'blur(8px)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.8)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  squareLastMove: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    backdropFilter: 'blur(4px)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  squareIllegal: {
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    backdropFilter: 'blur(8px)',
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.9)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  squareKingCheck: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
  },
  squareAttacking: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  pieceCheckGlow: {
    // Animation would be handled by CSS or Animated API
    opacity: 1,
  },
  hintCapture: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    backdropFilter: 'blur(4px)',
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.9)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  hintMove: {
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
    backdropFilter: 'blur(4px)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.7)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
