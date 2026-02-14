/**
 * useChessGame - Chess game state management with WebSocket multiplayer support.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { chessService } from '@bayit/shared-services/api';
import { useAuthStore } from '@bayit/shared-stores';
import { logger } from '../utils/logger';

const log = logger.scope('useChessGame');
const BOARD_SIZE = 8;
const WS_RECONNECT_DELAY_MS = 3000;

type PieceColor = 'white' | 'black';

interface GameState {
  gameId: string; board: string[][]; currentTurn: PieceColor;
  playerColor: PieceColor; moves: string[];
  status: string; whitePlayer: PlayerInfo; blackPlayer: PlayerInfo; check: boolean;
}
interface PlayerInfo { id: string; name: string; }
interface MoveResult {
  valid: boolean; board: string[][]; move: string;
  currentTurn: PieceColor; status: string; check: boolean;
}

function createInitialBoard(): string[][] {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(''));
  const rank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < BOARD_SIZE; c++) {
    board[0][c] = rank[c].toLowerCase(); board[1][c] = 'p';
    board[6][c] = 'P'; board[7][c] = rank[c];
  }
  return board;
}

function toIndices(sq: string) {
  return { row: BOARD_SIZE - parseInt(sq[1], 10), col: sq.charCodeAt(0) - 97 };
}

function isOwnPiece(piece: string, color: PieceColor): boolean {
  if (!piece) return false;
  return color === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

export function useChessGame(gameId?: string, opponentId?: string) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [board, setBoard] = useState(createInitialBoard);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [moves, setMoves] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('white');
  const [playerColor, setPlayerColor] = useState<PieceColor>('white');
  const [gameStatus, setGameStatus] = useState('waiting');
  const [isCheck, setIsCheck] = useState(false);
  const [whitePlayer, setWhitePlayer] = useState<PlayerInfo | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<PlayerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [activeGameId, setActiveGameId] = useState(gameId);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const applyState = useCallback((s: GameState) => {
    setBoard(s.board); setCurrentTurn(s.currentTurn); setPlayerColor(s.playerColor);
    setMoves(s.moves); setGameStatus(s.status); setIsCheck(s.check);
    setWhitePlayer(s.whitePlayer); setBlackPlayer(s.blackPlayer);
    setActiveGameId(s.gameId);
    if (s.playerColor === 'black') setFlipped(true);
  }, []);

  const connectWS = useCallback((gId: string) => {
    if (wsRef.current) wsRef.current.close();
    try {
      const ws = chessService.connectGameSocket(gId) as WebSocket;
      ws.onmessage = (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data);
          if (d.type === 'move') {
            setBoard(d.board); setCurrentTurn(d.currentTurn);
            setMoves((p) => [...p, d.move]); setIsCheck(d.check); setGameStatus(d.status);
          } else if (d.type === 'gameOver') { setGameStatus(d.status); }
        } catch (err) { log.error('WS parse error', err); }
      };
      ws.onclose = () => {
        reconnectRef.current = setTimeout(() => connectWS(gId), WS_RECONNECT_DELAY_MS);
      };
      ws.onerror = (err) => { log.error('WS error', err); };
      wsRef.current = ws;
    } catch (err) { log.error('WS connect failed', err); }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        let state: GameState;
        if (activeGameId) {
          state = (await chessService.getGame(activeGameId)) as GameState;
        } else if (opponentId) {
          state = (await chessService.createGame(opponentId)) as GameState;
        } else { setIsLoading(false); return; }
        applyState(state); connectWS(state.gameId);
      } catch (err) { log.error('Init failed', err); }
      finally { setIsLoading(false); }
    };
    init();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [activeGameId, opponentId, applyState, connectWS]);

  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      if (next === 'active' && activeGameId) connectWS(activeGameId);
      else if (next === 'background' && wsRef.current) wsRef.current.close();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [activeGameId, connectWS]);

  const fetchValidMoves = useCallback(async (sq: string) => {
    if (!activeGameId) return;
    try {
      const r = (await chessService.getValidMoves(activeGameId, sq)) as { moves: string[] };
      setValidMoves(r.moves || []);
    } catch (err) { log.error('Valid moves fetch failed', err); setValidMoves([]); }
  }, [activeGameId]);

  const onSquarePress = useCallback(async (square: string) => {
    if (!['active', 'waiting'].includes(gameStatus) || currentTurn !== playerColor) return;
    const { row, col } = toIndices(square);
    const piece = board[row]?.[col] || '';
    if (selectedSquare) {
      if (validMoves.includes(square)) {
        try {
          const r = (await chessService.makeMove(activeGameId as string, selectedSquare, square)) as MoveResult;
          if (r.valid) {
            setBoard(r.board); setMoves((p) => [...p, r.move]);
            setCurrentTurn(r.currentTurn); setIsCheck(r.check); setGameStatus(r.status);
          }
        } catch (err) { log.error('Move failed', err); }
        setSelectedSquare(null); setValidMoves([]); return;
      }
      if (piece && isOwnPiece(piece, playerColor)) {
        setSelectedSquare(square); fetchValidMoves(square); return;
      }
      setSelectedSquare(null); setValidMoves([]); return;
    }
    if (piece && isOwnPiece(piece, playerColor)) {
      setSelectedSquare(square); fetchValidMoves(square);
    }
  }, [selectedSquare, validMoves, board, playerColor, currentTurn, gameStatus, activeGameId, fetchValidMoves]);

  const resign = useCallback(async () => {
    if (!activeGameId) return;
    try { await chessService.resign(activeGameId); setGameStatus('resigned'); }
    catch (err) { log.error('Resign failed', err); }
  }, [activeGameId]);

  const offerDraw = useCallback(async () => {
    if (!activeGameId) return;
    try { await chessService.offerDraw(activeGameId); log.info('Draw offered'); }
    catch (err) { log.error('Draw offer failed', err); }
  }, [activeGameId]);

  const requestUndo = useCallback(async () => {
    if (!activeGameId) return;
    try { await chessService.requestUndo(activeGameId); log.info('Undo requested'); }
    catch (err) { log.error('Undo request failed', err); }
  }, [activeGameId]);

  const flipBoard = useCallback(() => setFlipped((p) => !p), []);

  return {
    board, selectedSquare, validMoves, moves, currentMoveIndex: moves.length - 1,
    isMyTurn: currentTurn === playerColor, playerColor, gameStatus, isCheck,
    whitePlayer, blackPlayer, isLoading, flipped,
    onSquarePress, resign, offerDraw, requestUndo, flipBoard,
  };
}
