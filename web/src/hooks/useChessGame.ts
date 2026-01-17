/**
 * Chess game hook for managing WebSocket connection and game state.
 * Handles real-time chess moves, chat messages, and game lifecycle.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';

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
}

export default function useChessGame() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [game, setGame] = useState<ChessGame | null>(null);
  const [chatMessages, setChatMessages] = useState<ChessChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
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

    return `${wsProtocol}//${cleanHost}/api/v1/ws/chess/${gameCode}?token=${token}`;
  }, [token]);

  const connectWebSocket = useCallback((gameCode: string) => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      const wsUrl = getWebSocketUrl(gameCode);
      console.log('[Chess] Connecting to WebSocket:', wsUrl.replace(token, 'TOKEN_HIDDEN'));
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[Chess] WebSocket connected successfully');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.current.onclose = (event) => {
        console.log('[Chess] WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        setIsConnected(false);

        // Attempt reconnection if not intentional disconnect
        if (game && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);

          console.log(`[Chess] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

          reconnectTimeout.current = setTimeout(() => {
            connectWebSocket(gameCode);
          }, delay);
        }
      };

      ws.current.onerror = (event) => {
        console.error('[Chess] WebSocket error:', event);
        console.error('[Chess] WebSocket readyState:', ws.current?.readyState);
        console.error('[Chess] Game code:', gameCode);
        setError('Connection error - check console for details');
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'game_state':
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
              console.warn('[Chess] Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('[Chess] Failed to parse message:', err);
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
      console.error('[Chess] Failed to connect:', err);
      setError('Failed to connect to game');
    }
  }, [token, game, getWebSocketUrl]);

  const createGame = async (color: 'white' | 'black', timeControl?: number) => {
    if (!token) {
      setError('Not authenticated');
      throw new Error('Not authenticated');
    }

    try {
      const response = await axios.post('/api/v1/chess/create', {
        color,
        time_control: timeControl
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const newGame = response.data.game;
      setGame(newGame);
      connectWebSocket(newGame.game_code);

      return newGame;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to create game';
      setError(message);
      throw new Error(message);
    }
  };

  const joinGame = async (gameCode: string) => {
    if (!token) {
      setError('Not authenticated');
      throw new Error('Not authenticated');
    }

    try {
      const response = await axios.post('/api/v1/chess/join', {
        game_code: gameCode
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const joinedGame = response.data.game;
      setGame(joinedGame);
      connectWebSocket(joinedGame.game_code);

      return joinedGame;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to join game';
      setError(message);
      throw new Error(message);
    }
  };

  const makeMove = (from: string, to: string, promotion?: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'move',
        from,
        to,
        promotion
      }));
    } else {
      setError('Not connected to game');
    }
  };

  const sendChatMessage = (message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'chat',
        message
      }));
    } else {
      setError('Not connected to game');
    }
  };

  const resign = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'resign'
      }));
    } else {
      setError('Not connected to game');
    }
  };

  const offerDraw = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'offer_draw'
      }));
    } else {
      setError('Not connected to game');
    }
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
