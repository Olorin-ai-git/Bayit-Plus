/**
 * Authentication Service for Olorin Frontend
 * Handles login, token management, and authentication state
 */

import { apiEndpoints } from '../../config/environment';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  username: string;
  email?: string;
  full_name?: string;
  scopes: string[];
}

export class AuthService {
  private static readonly TOKEN_KEY = 'olorin_auth_token';
  private static readonly TOKEN_EXPIRY_KEY = 'olorin_auth_token_expiry';

  /**
   * Login with username and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthToken> {
    try {
      const response = await fetch(`${apiEndpoints.investigation.replace('/api/investigation', '/auth/login-json')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(errorData.detail || `Login failed: ${response.status}`);
      }

      const token: AuthToken = await response.json();
      
      // Store token and expiry time
      this.storeToken(token);
      
      return token;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      const response = await fetch(`${apiEndpoints.investigation.replace('/api/investigation', '/auth/me')}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get user error:', error);
      // If token is invalid, clear it
      this.clearToken();
      throw error;
    }
  }

  /**
   * Logout and clear token
   */
  static async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        // Call logout endpoint
        await fetch(`${apiEndpoints.investigation.replace('/api/investigation', '/auth/logout')}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.warn('Logout request failed:', error);
        // Continue with local logout even if server request fails
      }
    }

    this.clearToken();
  }

  /**
   * Store authentication token
   */
  private static storeToken(token: AuthToken): void {
    localStorage.setItem(this.TOKEN_KEY, token.access_token);
    
    // Calculate expiry time (current time + expires_in seconds)
    const expiryTime = Date.now() + (token.expires_in * 1000);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Get stored authentication token
   */
  static getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

    if (!token || !expiryTime) {
      return null;
    }

    // Check if token is expired
    if (Date.now() > parseInt(expiryTime, 10)) {
      this.clearToken();
      return null;
    }

    return token;
  }

  /**
   * Clear stored authentication token
   */
  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Auto-login for development (uses admin credentials)
   */
  static async autoLoginDev(): Promise<AuthToken> {
    console.log('🔐 Development auto-login with admin credentials');
    return this.login({
      username: 'admin',
      password: 'secret'
    });
  }

  /**
   * Get authorization header for API requests
   */
  static getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}