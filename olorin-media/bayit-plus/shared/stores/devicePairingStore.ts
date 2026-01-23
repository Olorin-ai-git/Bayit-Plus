import { create } from 'zustand';
import { Platform } from 'react-native';
import { devicePairingService, InitPairingResponse } from '../services/devicePairingService';
import { useAuthStore } from './authStore';

// Get WebSocket URL based on platform
const getWsBaseUrl = () => {
  if (!__DEV__) {
    return 'wss://api.bayit.tv/api/v1';
  }
  if (Platform.OS === 'web') {
    return 'ws://localhost:8001/api/v1';
  }
  if (Platform.OS === 'android') {
    return 'ws://10.0.2.2:8001/api/v1';
  }
  return 'ws://localhost:8001/api/v1';
};

const WS_BASE_URL = getWsBaseUrl();

export type PairingStatus =
  | 'idle'
  | 'waiting'
  | 'scanning'
  | 'authenticating'
  | 'success'
  | 'failed'
  | 'expired';

interface CompanionDeviceInfo {
  deviceType: string;
  browser?: string;
  connectedAt: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  role: string;
  subscription?: {
    plan: string;
    status: string;
    end_date?: string;
  };
}

interface DevicePairingState {
  // Session data
  sessionId: string | null;
  sessionToken: string | null;
  qrCodeData: string | null;
  expiresAt: Date | null;

  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  pairingStatus: PairingStatus;
  error: string | null;

  // Companion device info
  companionDeviceInfo: CompanionDeviceInfo | null;

  // Authentication result
  authenticatedUser: AuthenticatedUser | null;
  accessToken: string | null;

  // WebSocket
  ws: WebSocket | null;

  // Actions
  initSession: () => Promise<InitPairingResponse | null>;
  connect: () => void;
  disconnect: () => void;
  reset: () => void;
  clearError: () => void;

  // Internal handlers
  handleMessage: (data: any) => void;
  sendPing: () => void;
  refreshQR: () => void;
}

export const useDevicePairingStore = create<DevicePairingState>((set, get) => ({
  // Initial state
  sessionId: null,
  sessionToken: null,
  qrCodeData: null,
  expiresAt: null,
  isConnected: false,
  isConnecting: false,
  pairingStatus: 'idle',
  error: null,
  companionDeviceInfo: null,
  authenticatedUser: null,
  accessToken: null,
  ws: null,

  initSession: async () => {
    set({ error: null, pairingStatus: 'idle' });

    try {
      const response = await devicePairingService.initPairing();

      set({
        sessionId: response.session_id,
        qrCodeData: response.qr_code_data,
        expiresAt: new Date(response.expires_at),
        pairingStatus: 'waiting',
      });

      return response;
    } catch (error: any) {
      set({
        error: error.detail || 'Failed to initialize pairing session',
        pairingStatus: 'failed',
      });
      return null;
    }
  },

  connect: () => {
    const { sessionId, ws: existingWs } = get();

    if (!sessionId) {
      set({ error: 'No session ID available' });
      return;
    }

    // Close existing connection
    if (existingWs) {
      existingWs.close();
    }

    set({ isConnecting: true, error: null });

    const ws = new WebSocket(
      `${WS_BASE_URL}/auth/device-pairing/ws/${sessionId}`
    );

    ws.onopen = () => {
      set({ isConnected: true, isConnecting: false });

      // Start ping interval to keep connection alive
      const pingInterval = setInterval(() => {
        const { ws: currentWs, isConnected } = get();
        if (currentWs && isConnected) {
          get().sendPing();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000); // Ping every 30 seconds
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        get().handleMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ error: 'Connection error', isConnecting: false });
    };

    ws.onclose = () => {
      set({ isConnected: false, ws: null });
    };

    set({ ws });
  },

  handleMessage: (data) => {
    const { type } = data;

    switch (type) {
      case 'connected':
        set({
          pairingStatus: 'waiting',
          expiresAt: new Date(data.expires_at),
        });
        break;

      case 'companion_connected':
        set({
          pairingStatus: 'scanning',
          companionDeviceInfo: {
            deviceType: data.device_info?.device_type || 'unknown',
            browser: data.device_info?.browser,
            connectedAt: data.device_info?.connected_at || new Date().toISOString(),
          },
        });
        break;

      case 'authenticating':
        set({ pairingStatus: 'authenticating' });
        break;

      case 'pairing_success':
        const user = data.user;
        const token = data.token;

        set({
          pairingStatus: 'success',
          authenticatedUser: user,
          accessToken: token,
        });

        // Update auth store with the received credentials
        useAuthStore.getState().setUser(user);
        useAuthStore.setState({
          token,
          isAuthenticated: true,
        });
        break;

      case 'pairing_failed':
        set({
          pairingStatus: 'failed',
          error: data.reason || 'Pairing failed',
        });
        break;

      case 'session_expired':
        set({
          pairingStatus: 'expired',
          error: 'Session expired. Please generate a new QR code.',
        });
        break;

      case 'pong':
        // Keepalive response received
        break;

      case 'error':
        set({ error: data.message });
        break;

      default:
        console.log('Unknown pairing message type:', type);
    }
  },

  sendPing: () => {
    const { ws, isConnected } = get();
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  },

  refreshQR: () => {
    const { ws, isConnected } = get();
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type: 'refresh' }));
    }
  },

  disconnect: () => {
    const { ws, sessionId } = get();

    if (ws) {
      ws.close();
    }

    // Cancel the session on the server
    if (sessionId) {
      devicePairingService.cancelSession(sessionId).catch(() => {});
    }

    set({
      isConnected: false,
      ws: null,
    });
  },

  reset: () => {
    const { ws, sessionId } = get();

    if (ws) {
      ws.close();
    }

    if (sessionId) {
      devicePairingService.cancelSession(sessionId).catch(() => {});
    }

    set({
      sessionId: null,
      sessionToken: null,
      qrCodeData: null,
      expiresAt: null,
      isConnected: false,
      isConnecting: false,
      pairingStatus: 'idle',
      error: null,
      companionDeviceInfo: null,
      authenticatedUser: null,
      accessToken: null,
      ws: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useDevicePairingStore;
