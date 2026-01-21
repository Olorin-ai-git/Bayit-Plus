/**
 * Token Service
 * 
 * Manages authentication tokens, caching, and validation.
  */

import { getIdToken, type User as FirebaseUser } from 'firebase/auth';
import type { AuthConfig, SessionToken, AuthValidationResult, AuthTokenInfo } from '../types';
import { createAuthError } from '../utils/errors';
import { validateJWT } from '../utils/validation';
import { logger } from '../utils/logger';
import { TOKEN_DEFAULTS } from '../constants/auth.constants';

interface TokenCache {
  token: string;
  expiresAt: number;
  scopes: string[];
  userId: string;
}

export class TokenService {
  private tokenCache: Map<string, TokenCache> = new Map();
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    // Use config for token management settings
    logger.info('TokenService initialized', { 
      maxAge: TOKEN_DEFAULTS.MAX_AGE 
    });
  }

  /**
   * Gets a fresh authentication token from Firebase Auth
    */
  async getAuthToken(user: FirebaseUser, forceRefresh = false): Promise<string | null> {
    try {
      if (!user) {
        logger.warn('No user provided for token retrieval');
        return null;
      }

      const userId = user.uid;
      
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cached = this.tokenCache.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
          logger.debug('Using cached auth token', { userId });
          return cached.token;
        }
      }

      // Get fresh token from Firebase
      const token = await getIdToken(user, forceRefresh);
      
      if (token) {
        // Cache the token - JWT tokens typically expire in 1 hour
        const expiresAt = Date.now() + TOKEN_DEFAULTS.MAX_AGE;
        const cacheEntry: TokenCache = {
          token,
          expiresAt,
          scopes: [],
          userId
        };
        
        this.tokenCache.set(userId, cacheEntry);
        this.persistTokenToStorage(userId, cacheEntry);
        
        logger.debug('Retrieved fresh auth token', { userId, forceRefresh });
      }
      
      return token;
    } catch (error) {
      logger.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Validates a token and returns user information
    */
  async validateToken(token: string): Promise<AuthValidationResult> {
    try {
      if (!validateJWT(token)) {
        return {
          isValid: false,
          user: null,
          error: createAuthError('auth/invalid-credential', 'Invalid token format')
        };
      }

      // Parse JWT token
      const tokenInfo = this.parseJWT(token);
      if (!tokenInfo) {
        return {
          isValid: false,
          user: null,
          error: createAuthError('auth/invalid-credential', 'Unable to parse token')
        };
      }

      // Check expiration
      if (tokenInfo.expiresAt <= Date.now()) {
        return {
          isValid: false,
          user: null,
          error: createAuthError('auth/timeout', 'Token has expired')
        };
      }

      // For client-side validation, we trust Firebase's token if it passes basic validation
      // Server-side validation would require Firebase Admin SDK
      // Note: We return null for user as this is just token validation,
      // the caller should create the full AuthenticatedUser object if needed
      return {
        isValid: true,
        user: null,
        error: null,
        tokenInfo
      };

    } catch (error) {
      return {
        isValid: false,
        user: null,
        error: createAuthError('auth/invalid-credential', 'Token validation failed')
      };
    }
  }

  /**
   * Clears the token cache
    */
  clearTokenCache(): void {
    this.tokenCache.clear();
    logger.debug('Token cache cleared');
  }

  /**
   * Creates a new session token
    */
  createSessionToken(_userId: string, scopes: string[]): SessionToken {
    const now = Date.now();
    const expiresAt = now + TOKEN_DEFAULTS.MAX_AGE;

    return {
      token: this.generateTokenId(),
      type: 'access',
      expiresAt,
      scopes,
      audience: 'cvplus-api'
    };
  }

  /**
   * Parses a JWT token
    */
  private parseJWT(token: string): AuthTokenInfo | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1] || ''));
      
      return {
        token,
        expiresAt: payload.exp * 1000,
        issuedAt: payload.iat * 1000,
        scopes: payload.scopes || [],
        claims: payload
      };
    } catch {
      return null;
    }
  }

  /**
   * Generates a unique token ID
    */
  private generateTokenId(): string {
    return `cvplus_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Checks if a token is expired
    */
  isTokenExpired(token: string): boolean {
    const tokenInfo = this.parseJWT(token);
    if (!tokenInfo) return true;
    
    return tokenInfo.expiresAt <= Date.now();
  }

  /**
   * Gets time until token expiration
    */
  getTimeToExpiration(token: string): number {
    const tokenInfo = this.parseJWT(token);
    if (!tokenInfo) return 0;
    
    return Math.max(0, tokenInfo.expiresAt - Date.now());
  }

  /**
   * Clears all cached tokens
    */
  clearCache(): void {
    this.tokenCache.clear();
    // Also clear from localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cvplus_token_')) {
            localStorage.removeItem(key);
          }
        });
        logger.debug('Token cache cleared from localStorage');
      } catch (error) {
        logger.warn('Failed to clear token cache from localStorage:', error);
      }
    }
  }

  /**
   * Persists token to localStorage for cross-tab access
    */
  private persistTokenToStorage(userId: string, cache: TokenCache): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const storageKey = `cvplus_token_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        ...cache,
        // Don't store the actual token for security, just metadata
        token: 'stored_separately',
        storedAt: Date.now()
      }));
    } catch (error) {
      logger.warn('Failed to persist token metadata to localStorage:', error);
    }
  }

  /**
   * Loads token metadata from localStorage
    */
  private _loadTokenFromStorage(userId: string): TokenCache | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    
    try {
      const storageKey = `cvplus_token_${userId}`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      
      const cache = JSON.parse(stored) as TokenCache & { storedAt: number };
      
      // Check if stored token is too old (security measure)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours max storage
      if (Date.now() - cache.storedAt > maxAge) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return cache;
    } catch (error) {
      logger.warn('Failed to load token metadata from localStorage:', error);
      return null;
    }
  }

  /**
   * Refreshes token with exponential backoff retry
    */
  async refreshTokenWithRetry(user: FirebaseUser, maxRetries = 3): Promise<string | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Token refresh attempt ${attempt}/${maxRetries}`, { userId: user.uid });
        
        const token = await this.getAuthToken(user, true);
        if (token) {
          logger.info('Token refresh successful', { userId: user.uid, attempt });
          return token;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown refresh error');
        logger.warn(`Token refresh attempt ${attempt} failed:`, lastError);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error('All token refresh attempts failed', { 
      userId: user.uid, 
      maxRetries,
      lastError: lastError?.message 
    });
    
    return null;
  }

  /**
   * Checks if token needs refresh (within threshold)
    */
  needsRefresh(token: string, thresholdMinutes = 5): boolean {
    const timeToExpiration = this.getTimeToExpiration(token);
    const thresholdMs = thresholdMinutes * 60 * 1000;
    
    return timeToExpiration <= thresholdMs;
  }
}