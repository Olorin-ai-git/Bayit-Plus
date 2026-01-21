import axios from 'axios';
import { Platform } from 'react-native';

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://api.bayit.tv/api/v1';
  }
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api/v1';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error.response?.data || error)
);

export interface InitPairingResponse {
  session_id: string;
  qr_code_data: string;
  expires_at: string;
  ws_url: string;
}

export interface VerifySessionResponse {
  valid: boolean;
  session_id: string;
  status: string;
  expires_at: string;
}

export interface SessionStatus {
  session_id: string;
  status: 'waiting' | 'scanning' | 'authenticating' | 'success' | 'failed' | 'expired';
  is_expired: boolean;
  expires_at: string;
  has_companion: boolean;
  companion_device: {
    device_type: string;
    browser: string;
  } | null;
}

export interface CompleteAuthResponse {
  access_token: string;
  user: {
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
    created_at: string;
    last_login?: string;
  };
}

/**
 * Device Pairing Service
 * Handles QR-based authentication for TV apps
 */
export const devicePairingService = {
  /**
   * Initialize a new pairing session (called by TV)
   * Returns QR code data and WebSocket URL
   */
  initPairing: (): Promise<InitPairingResponse> =>
    api.post('/auth/device-pairing/init'),

  /**
   * Verify a session token from QR scan (called by companion)
   */
  verifySession: (sessionId: string, token: string): Promise<VerifySessionResponse> =>
    api.post('/auth/device-pairing/verify', { session_id: sessionId, token }),

  /**
   * Register companion device connection (called by companion)
   */
  connectCompanion: (
    sessionId: string,
    deviceType: string,
    browser?: string
  ): Promise<{ status: string }> =>
    api.post('/auth/device-pairing/companion-connect', {
      session_id: sessionId,
      device_type: deviceType,
      browser,
    }),

  /**
   * Complete authentication with credentials (called by companion)
   */
  completeAuth: (
    sessionId: string,
    email: string,
    password: string
  ): Promise<CompleteAuthResponse> =>
    api.post('/auth/device-pairing/complete', {
      session_id: sessionId,
      email,
      password,
    }),

  /**
   * Get current session status
   */
  getSessionStatus: (sessionId: string): Promise<SessionStatus> =>
    api.get(`/auth/device-pairing/status/${sessionId}`),

  /**
   * Cancel a pairing session
   */
  cancelSession: (sessionId: string): Promise<{ status: string }> =>
    api.delete(`/auth/device-pairing/${sessionId}`),
};

export default devicePairingService;
