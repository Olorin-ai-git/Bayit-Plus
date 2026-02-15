/**
 * Chess game hook for managing WebSocket connection and game state.
 * Handles real-time chess moves, chat messages, and game lifecycle.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '@/services/api';
import logger from '@/utils/logger';
import i18n from 'i18next';

interface ChessPlayer {
  user_id: string;
  user_name: string;
  color: 'white' | 'black';
  is_connected: boolean;
  time_remaining_ms?: number;
  joined_at: string;
}

interface ChessMove {
  from_square: string;
  to_square: string;
  piece: string;
  captured?: string;
  promotion?: string;
  is_castling: boolean;
  is_en_passant: boolean;
  san: string;
  timestamp: string;
  player: 'white' | 'black';
}

interface ChessChatMessage {
  user_id: string;
  user_name: string;
  message: string;
  is_bot_request: boolean;
  bot_response?: string;
  timestamp: string;
}

type GameMode = 'pvp' | 'bot';
type BotDifficulty = 'easy' | 'medium' | 'hard';

interface ChessGame {
  id: string;
  game_code: string;
  white_player?: ChessPlayer;
  black_player?: ChessPlayer;
  current_turn: 'white' | 'black';
  status: 'waiting' | 'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';
  board_fen: string;
  move_history: ChessMove[];
  chat_enabled: boolean;
  voice_enabled: boolean;
  game_mode?: GameMode;
  bot_difficulty?: BotDifficulty;
}

export default function useChessGame() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [game, setGame] = useState<ChessGame | null>(null);
  const [chatMessages, setChatMessages] = useState<ChessChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = useCallback((gameCode: string) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL ||
      (import.meta.env.PROD
        ? 'wss://api.bayit.plus'
        : `ws://${window.location.hostname}:8000`);

    // Remove protocol if present in VITE_WS_URL
    const cleanHost = wsHost.replace(/^wss?:\/\//, '');

    return `${wsProtocol}//${cleanHost}/api/v1/ws/chess/${gameCode}`;
  }, [token]);

  const connectWebSocket = useCallback((gameCode: string) => {
    if (!token) {
      setError(i18n.t('errors.auth.notAuthenticated'));
      return;
    }

    try {
      const wsUrl = getWebSocketUrl(gameCode);
      logger.debug('Connecting to WebSocket', 'useChessGame', { url: wsUrl.replace(token, 'TOKEN_HIDDEN') });
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        logger.debug('WebSocket connected, sending auth', 'useChessGame');
        setIsConnected(true);
        setIsAuthenticated(false);
        setError(null);
        reconnectAttempts.current = 0;

        ws.current?.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.current.onclose = (event) => {
        logger.debug('WebSocket disconnected', 'useChessGame', { code: event.code, reason: event.reason });
        setIsConnected(false);

        // Attempt reconnection if not intentional disconnect
        if (game && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);

          logger.debug('Reconnecting', 'useChessGame', { delay, attempt: reconnectAttempts.current });

          reconnectTimeout.current = setTimeout(() => {
            connectWebSocket(gameCode);
          }, delay);
        }
      };

      ws.current.onerror = (event) => {
        logger.error('WebSocket error', 'useChessGame', { event, readyState: ws.current?.readyState, gameCode });
        setError(i18n.t('errors.connection.failed'));
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'game_state':
              setIsAuthenticated(true);
              setGame(message.data);
              break;

            case 'move':
              setGame((prev) => prev ? {
                ...prev,
                board_fen: message.data.board_fen,
                current_turn: message.data.current_turn,
                status: message.data.status,
                move_history: [...prev.move_history, message.data.move]
              } : null);
              break;

            case 'chat':
              setChatMessages((prev) => [...prev, message.data]);
              break;

            case 'game_end':
              setGame((prev) => prev ? {
                ...prev,
                status: message.data.status
              } : null);
              break;

            case 'error':
              setError(message.message);
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              logger.warn('Unknown message type', 'useChessGame', { type: message.type });
          }
        } catch (err) {
          logger.error('Failed to parse message', 'useChessGame', err);
        }
      };

      // Send periodic ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Every 30 seconds

      // Cleanup ping interval on disconnect
      ws.current.addEventListener('close', () => {
        clearInterval(pingInterval);
      });

    } catch (err) {
      logger.error('Failed to connect', 'useChessGame', err);
      setError(i18n.t('errors.chess.connectFailed'));
    }
  }, [token, game, getWebSocketUrl]);

  const createGame = async (
    color: 'white' | 'black',
    timeControl?: number,
    gameMode: GameMode = 'pvp',
    botDifficulty?: BotDifficulty
  ) => {
    if (!token) {
      setError(i18n.t('errors.auth.notAuthenticated'));
      throw new Error(i18n.t('errors.auth.notAuthenticated'));
    }

    try {
      const response = await api.post('/chess/create', {
        color,
        time_control: timeControl,
        game_mode: gameMode,
        bot_difficulty: botDifficulty
      }) as { game: ChessGame };

      const newGame = response.game;
      setGame(newGame);
      connectWebSocket(newGame.game_code);

      return newGame;
    } catch (err: any) {
      const message = err?.detail || 'Failed to create game';
      setError(message);
      throw new Error(message);
    }
  };

  const joinGame = async (gameCode: string) => {
    if (!token) {
      setError(i18n.t('errors.auth.notAuthenticated'));
      throw new Error(i18n.t('errors.auth.notAuthenticated'));
    }

    try {
      const response = await api.post('/chess/join', {
        game_code: gameCode
      }) as { game: ChessGame };

      const joinedGame = response.game;
      setGame(joinedGame);
      connectWebSocket(joinedGame.game_code);

      return joinedGame;
    } catch (err: any) {
      const message = err?.detail || 'Failed to join game';
      setError(message);
      throw new Error(message);
    }
  };

  const sendIfReady = (payload: object) => {
    if (ws.current?.readyState !== WebSocket.OPEN) {
      setError(i18n.t('errors.chess.notConnected'));
      return false;
    }
    if (!isAuthenticated) {
      setError(i18n.t('errors.chess.notAuthenticated'));
      return false;
    }
    ws.current.send(JSON.stringify(payload));
    return true;
  };

  const makeMove = (from: string, to: string, promotion?: string) => {
    sendIfReady({ type: 'move', from, to, promotion });
  };

  const sendChatMessage = (message: string) => {
    sendIfReady({ type: 'chat', message });
  };

  const resign = () => {
    sendIfReady({ type: 'resign' });
  };

  const offerDraw = () => {
    sendIfReady({ type: 'offer_draw' });
  };

  const leaveGame = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    setGame(null);
    setChatMessages([]);
    setIsConnected(false);
    setIsAuthenticated(false);
    setError(null);
    reconnectAttempts.current = 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  return {
    game,
    chatMessages,
    isConnected,
    isAuthenticated,
    error,
    createGame,
    joinGame,
    makeMove,
    sendChatMessage,
    resign,
    offerDraw,
    leaveGame,
  };
}
