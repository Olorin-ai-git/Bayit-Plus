/**
 * Session Service
 * 
 * Manages user sessions, activity tracking, and cross-tab synchronization.
  */

import type { 
  AuthSession, 
  SessionState, 
  AuthenticatedUser,
  SessionDeviceInfo,
  AuthError,
  AuthConfig,
  SessionConfig
} from '../types';
import { createAuthError } from '../utils/errors';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants/auth.constants';

export class SessionService {
  private config: AuthConfig['session'] & { 
    maxConcurrentSessions?: number;
    requireRecentAuth?: number;
    sessionStorageKey?: string;
    gracePeriod?: number;
    encryptStorage?: boolean;
    enforceSessionLimit?: boolean;
    trackActivity?: boolean;
  };
  private state: SessionState = {
    isAuthenticated: false,
    isLoading: false,
    session: null,
    currentSession: null,
    isActive: false,
    lastActivity: null,
    sessions: new Map(),
    syncTimer: null,
    tokens: { accessToken: null, refreshToken: null },
    error: null,
    lastSyncAt: 0
  };
  private eventHandlers = new Map<string, Set<Function>>();

  constructor(config: Partial<AuthConfig['session']> & { 
    maxConcurrentSessions?: number;
    requireRecentAuth?: number;
    sessionStorageKey?: string;
    gracePeriod?: number;
    encryptStorage?: boolean;
    enforceSessionLimit?: boolean;
    trackActivity?: boolean;
  } = {}) {
    // Set default config values
    const defaultConfig = {
      timeout: 24 * 60 * 60 * 1000, // 24 hours default
      refreshThreshold: 5 * 60 * 1000, // 5 minutes default
      maxConcurrentSessions: 5,
      requireRecentAuth: 10 * 60 * 1000, // 10 minutes default
      enableCrossTabSync: true,
      persistSession: true,
      sessionStorageKey: 'cvplus_session_storage',
      storageType: 'localStorage' as const,
      idleTimeout: 30 * 60 * 1000, // 30 minutes default
      syncInterval: 30 * 1000, // 30 seconds default
      gracePeriod: 2 * 60 * 1000, // 2 minutes default
      encryptStorage: true,
      enforceSessionLimit: false,
      trackActivity: true
    };

    this.config = {
      ...defaultConfig,
      ...config
    };
    
    this.initializeEventHandlers();
  }

  /**
   * Initialize a new session for an authenticated user
    */
  async initializeSession(user: AuthenticatedUser): Promise<void> {
    try {
      const deviceInfo = this.getDeviceInfo();
      const sessionId = this.generateSessionId();
      const locationInfo = await this.getLocationInfo();
      
      const session: AuthSession = {
        sessionId,
        uid: user.uid,
        startTime: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.config.timeout,
        deviceInfo,
        ...(locationInfo && { location: locationInfo }),
        flags: {
          isActive: true,
          isVerified: user.emailVerified,
          requiresReauth: false,
          hasElevatedAccess: false,
          suspicious: false
        }
      };

      // Store session
      await this.storeSession(session);
      
      // Update internal state
      this.state.currentSession = session;
      this.state.isActive = true;
      this.state.lastActivity = Date.now();
      this.state.sessions.set(sessionId, session);

      // Start activity tracking
      if (this.config.trackActivity) {
        this.startActivityTracking();
      }

      // Start cross-tab sync
      if (this.config.enableCrossTabSync) {
        this.startCrossTabSync();
      }

      // Emit session started event
      this.emit('session:started', session);
      
      logger.info('Session initialized', { sessionId, uid: user.uid });
      
    } catch (error) {
      logger.error('Failed to initialize session', error);
      throw createAuthError('session-init-failed', 'Failed to initialize session');
    }
  }

  /**
   * Refresh the current session
    */
  async refreshSession(): Promise<AuthSession | null> {
    if (!this.state.currentSession) {
      return null;
    }

    try {
      const now = Date.now();
      const session = this.state.currentSession;
      
      // Check if session needs refresh
      if (!this.needsRefresh(session)) {
        return session;
      }

      // Create updated session
      const refreshedSession: AuthSession = {
        ...session,
        lastActivity: now,
        expiresAt: now + this.config.timeout
      };

      // Store updated session
      await this.storeSession(refreshedSession);
      
      // Update state
      this.state.currentSession = refreshedSession;
      this.state.lastActivity = now;
      this.state.sessions.set(session.sessionId, refreshedSession);

      // Emit refresh event
      this.emit('session:refreshed', refreshedSession);
      
      logger.debug('Session refreshed', { sessionId: session.sessionId });
      return refreshedSession;
      
    } catch (error) {
      logger.error('Failed to refresh session', error);
      throw createAuthError('session-refresh-failed', 'Failed to refresh session');
    }
  }

  /**
   * End the current session
    */
  async endSession(reason: SessionEndReason = 'manual'): Promise<void> {
    const session = this.state.currentSession;
    
    if (!session) {
      return;
    }

    try {
      // Update session flags
      const endedSession: AuthSession = {
        ...session,
        flags: {
          ...session.flags,
          isActive: false
        }
      };

      // Remove from storage
      await this.removeSession(session.sessionId);
      
      // Clear internal state
      this.state.currentSession = null;
      this.state.isActive = false;
      this.state.sessions.delete(session.sessionId);

      // Stop tracking
      this.stopActivityTracking();
      this.stopCrossTabSync();

      // Emit ended event
      this.emit('session:ended', { session: endedSession, reason });
      
      logger.info('Session ended', { sessionId: session.sessionId, reason });
      
    } catch (error) {
      logger.error('Failed to end session', error);
      throw createAuthError('session-end-failed', 'Failed to end session');
    }
  }

  /**
   * Check if session is valid
    */
  isSessionValid(): boolean {
    const session = this.state.currentSession;
    
    if (!session || !session.flags.isActive) {
      return false;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > session.expiresAt) {
      return false;
    }

    // Check idle timeout
    if (this.config.idleTimeout && this.state.lastActivity) {
      const idleTime = now - this.state.lastActivity;
      if (idleTime > this.config.idleTimeout) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update session activity
    */
  updateActivity(): void {
    const now = Date.now();
    this.state.lastActivity = now;

    if (this.state.currentSession) {
      this.state.currentSession.lastActivity = now;
      
      // Store updated session (debounced)
      this.debouncedStoreSession();
      
      // Reset activity timeout
      this.resetActivityTimeout();
    }
  }

  /**
   * Get current session
    */
  getCurrentSession(): AuthSession | null {
    return this.state.currentSession;
  }

  /**
   * Get session state
    */
  getSessionState(): SessionState {
    return { ...this.state };
  }

  /**
   * Subscribe to session events
    */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from session events
    */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // Private methods
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error('Session event handler error', { event, error });
        }
      });
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo(): SessionDeviceInfo {
    const getPlatform = (): 'web' | 'mobile' | 'desktop' => {
      if (typeof navigator === 'undefined') return 'web';
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mobile')) return 'mobile';
      if (userAgent.includes('electron')) return 'desktop';
      return 'web';
    };

    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      platform: getPlatform(),
      isMobile: getPlatform() === 'mobile',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
      screen: typeof screen !== 'undefined' ? {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      } : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private async getLocationInfo(): Promise<import('../types').SessionLocation | undefined> {
    // Note: Location detection would require user permission and external service
    // This is a placeholder implementation
    try {
      // In a real implementation, this would use geolocation API or IP-based location
      return undefined;
    } catch (error) {
      logger.debug('Location detection failed', error);
      return undefined;
    }
  }

  private needsRefresh(session: AuthSession): boolean {
    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    return timeUntilExpiry <= this.config.refreshThreshold;
  }

  private async storeSession(session: AuthSession): Promise<void> {
    if (!this.config.persistSession) {
      return;
    }

    try {
      const storage = this.getStorage();
      const sessionData = this.config.encryptStorage 
        ? await this.encryptSessionData(session)
        : JSON.stringify(session);
      
      storage.setItem(`${STORAGE_KEYS.SESSION_PREFIX}${session.sessionId}`, sessionData);
      storage.setItem(STORAGE_KEYS.CURRENT_SESSION, session.sessionId);
      
    } catch (error) {
      logger.error('Failed to store session', error);
      throw createAuthError('session-storage-failed', 'Failed to store session');
    }
  }

  private async removeSession(sessionId: string): Promise<void> {
    try {
      const storage = this.getStorage();
      storage.removeItem(`${STORAGE_KEYS.SESSION_PREFIX}${sessionId}`);
      
      // Clear current session if it matches
      const currentSessionId = storage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      if (currentSessionId === sessionId) {
        storage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      }
      
    } catch (error) {
      logger.error('Failed to remove session', error);
    }
  }

  private getStorage(): Storage {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      };
    }

    return this.config.storageType === 'sessionStorage' 
      ? sessionStorage 
      : localStorage;
  }

  private async encryptSessionData(session: AuthSession): Promise<string> {
    // Placeholder for encryption - would use actual encryption in production
    return JSON.stringify(session);
  }

  private startActivityTracking(): void {
    if (typeof window === 'undefined') return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const throttledUpdate = this.throttle(() => this.updateActivity(), 1000);

    events.forEach(event => {
      document.addEventListener(event as keyof DocumentEventMap, throttledUpdate as EventListener, true);
    });
  }

  private stopActivityTracking(): void {
    // Implementation would remove event listeners
  }

  private startCrossTabSync(): void {
    if (typeof window === 'undefined') return;

    this.state.syncTimer = setInterval(() => {
      this.syncWithOtherTabs();
    }, this.config.syncInterval);

    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  private stopCrossTabSync(): void {
    if (this.state.syncTimer) {
      clearInterval(this.state.syncTimer);
      this.state.syncTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  private syncWithOtherTabs(): void {
    // Implementation for cross-tab session synchronization
  }

  private handleStorageChange(event: StorageEvent): void {
    // Handle storage changes from other tabs
  }

  private resetActivityTimeout(): void {
    // Implementation would reset idle timeout
  }

  private debouncedStoreSession(): void {
    // Implementation would debounce session storage updates
  }

  private throttle(func: Function, limit: number): Function {
    let inThrottle: boolean;
    return function(this: any) {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  private initializeEventHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateActivity();
      }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
      if (this.state.currentSession && this.config.trackActivity) {
        this.updateActivity();
      }
    });

    // Handle idle detection
    let idleTimer: NodeJS.Timeout;
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        logger.info('Session idle timeout reached');
        this.endSession('timeout');
      }, this.config.idleTimeout);
    };

    if (this.config.idleTimeout) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event as keyof DocumentEventMap, resetIdleTimer as EventListener, true);
      });
      
      resetIdleTimer();
    }
  }

  /**
   * Clear the current session
    */
  clearSession(): void {
    this.state = {
      isAuthenticated: false,
      isLoading: false,
      session: null,
      currentSession: null,
      isActive: false,
      lastActivity: null,
      sessions: new Map(),
      syncTimer: null,
      tokens: { accessToken: null, refreshToken: null },
      error: null,
      lastSyncAt: 0
    };
  }

  /**
   * Validate the current session
    */
  async validateSession(): Promise<boolean> {
    if (!this.state.currentSession) {
      return false;
    }

    const now = Date.now();
    if (now > this.state.currentSession.expiresAt) {
      await this.endSession('expired');
      return false;
    }

    // Check idle timeout
    if (this.config.idleTimeout && this.state.lastActivity) {
      const idleTime = now - this.state.lastActivity;
      if (idleTime > this.config.idleTimeout) {
        await this.endSession('timeout');
        return false;
      }
    }

    return true;
  }

  /**
   * Clean up resources when the service is destroyed
    */
  destroy(): void {
    if (this.state.syncTimer) {
      clearInterval(this.state.syncTimer);
      this.state.syncTimer = null;
    }
    this.eventHandlers.clear();
  }
}

/**
 * Session end reasons
  */
type SessionEndReason = 'logout' | 'timeout' | 'expired' | 'manual' | 'security';