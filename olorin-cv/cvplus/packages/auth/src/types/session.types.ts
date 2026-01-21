/**
 * Session Types
 * 
 * Type definitions for session management and authentication state.
  */

export interface AuthSession {
  sessionId: string;
  uid: string;
  startTime: number;
  lastActivity: number;
  expiresAt: number;
  refreshTokenHash?: string;
  deviceInfo: SessionDeviceInfo;
  location?: SessionLocation;
  flags: SessionFlags;
}

export interface SessionDeviceInfo {
  userAgent: string;
  platform: 'web' | 'mobile' | 'desktop';
  browser?: string;
  os?: string;
  isMobile: boolean;
  fingerprint?: string;
  language?: string;
  timezone?: string;
  screen?: {
    width: number;
    height: number;
    colorDepth?: number;
  };
}

export interface SessionLocation {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface SessionFlags {
  isActive: boolean;
  isVerified: boolean;
  requiresReauth: boolean;
  hasElevatedAccess: boolean;
  suspicious: boolean;
}

export interface SessionToken {
  token: string;
  type: 'access' | 'refresh';
  expiresAt: number;
  scopes: string[];
  audience: string;
}

export interface SessionState {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  currentSession: AuthSession | null;
  isActive: boolean;
  lastActivity: number | null;
  sessions: Map<string, AuthSession>;
  syncTimer: NodeJS.Timeout | null;
  tokens: {
    accessToken: SessionToken | null;
    refreshToken: SessionToken | null;
  };
  error: import('./error.types').AuthError | null;
  lastSyncAt: number;
}

export interface SessionError {
  code: SessionErrorCode;
  message: string;
  details?: any;
  timestamp: number;
  retryable: boolean;
}

export type SessionErrorCode = 
  | 'session_expired'
  | 'session_invalid'
  | 'token_expired'
  | 'token_invalid'
  | 'refresh_failed'
  | 'sync_failed'
  | 'network_error'
  | 'permission_denied'
  | 'rate_limited'
  | 'unknown_error';

export interface SessionConfig {
  timeout: number;
  refreshThreshold: number;
  maxConcurrentSessions: number;
  requireRecentAuth: number;
  enableCrossTabSync: boolean;
  persistSession: boolean;
  sessionStorageKey: string;
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';
  idleTimeout?: number;
  syncInterval?: number;
  gracePeriod?: number;
  encryptStorage?: boolean;
  enforceSessionLimit?: boolean;
  trackActivity?: boolean;
}

export interface SessionEvents {
  sessionStarted: (session: AuthSession) => void;
  sessionEnded: (sessionId: string, reason: SessionEndReason) => void;
  sessionExtended: (session: AuthSession) => void;
  sessionSynced: (session: AuthSession) => void;
  tokenRefreshed: (tokens: SessionState['tokens']) => void;
  sessionError: (error: SessionError) => void;
}

export type SessionEndReason = 
  | 'logout'
  | 'timeout'
  | 'revoked'
  | 'expired'
  | 'security'
  | 'manual';

export interface SessionActivity {
  sessionId: string;
  type: SessionActivityType;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type SessionActivityType =
  | 'login'
  | 'logout'
  | 'token_refresh'
  | 'permission_grant'
  | 'permission_revoke'
  | 'profile_update'
  | 'security_event'
  | 'api_call';

export interface SessionStorageData {
  session: AuthSession;
  tokens: SessionState['tokens'];
  preferences: {
    rememberMe: boolean;
    autoLogin: boolean;
  };
  timestamp: number;
}