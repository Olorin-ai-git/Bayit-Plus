/**
 * BiometricAuthModule.ts - TypeScript Bridge for Biometric Authentication
 * Provides unified biometric API across Android/iOS
 * Supports: Fingerprint, Face, Iris recognition
 * Fallback: Device PIN/Pattern
 *
 * Emits events:
 * - authentication_started: Auth prompt opened
 * - authentication_succeeded: Auth successful
 * - authentication_failed: Auth failed (user rejected)
 * - authentication_error: Auth error (hardware, lockout, etc)
 */

import { NativeModules, NativeEventEmitter } from 'react-native';

const BiometricAuthModuleNative = NativeModules.BiometricAuthModule;

export interface BiometricCheckResult {
  canAuthenticate: boolean;
  deviceSecure: boolean;
  availableTypes: string[];
  hasStrongBiometric: boolean;
  hasWeakBiometric: boolean;
}

export interface BiometricAuthEvent {
  status?: string;
  authenticator?: string;
  code?: number;
  message?: string;
  token?: string;
  expiresAt?: number;
}

export interface SessionToken {
  token: string;
  expiresAt: number;
  authenticator: string;
}

export interface SessionValidation {
  isValid: boolean;
  expiresIn: number;
  shouldRefresh: boolean;
}

export interface LockoutStatus {
  isLocked: boolean;
  timeRemainingMs: number;
}

export class BiometricAuthModule {
  private eventEmitter: NativeEventEmitter;
  private listeners: Map<string, ((data: BiometricAuthEvent) => void)[]> = new Map();

  constructor() {
    this.eventEmitter = new NativeEventEmitter(BiometricAuthModuleNative);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const events = [
      'authentication_started',
      'authentication_succeeded',
      'authentication_failed',
      'authentication_error',
      'onBiometricAuthSuccess',
      'onBiometricAuthFailed',
      'onBiometricAuthError',
      'onLogout'
    ];

    events.forEach(event => {
      this.eventEmitter.addListener(event, (data: BiometricAuthEvent) => {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
      });
    });
  }

  /**
   * Check if device supports biometric authentication
   * @returns Promise with biometric capability details
   */
  async canAuthenticate(): Promise<BiometricCheckResult> {
    return BiometricAuthModuleNative.canAuthenticate();
  }

  /**
   * Start biometric authentication prompt
   * @param title Prompt title (default: "Biometric Authentication")
   * @param subtitle Prompt subtitle (default: "Authenticate to continue")
   * @returns Promise resolving on successful authentication
   */
  async authenticate(title?: string, subtitle?: string): Promise<{ status: string; authenticator: string }> {
    return BiometricAuthModuleNative.authenticate(
      title || 'Biometric Authentication',
      subtitle || 'Authenticate to continue'
    );
  }

  /**
   * Cancel ongoing biometric authentication
   * @returns Promise when cancelled
   */
  async cancel(): Promise<{ status: string }> {
    return BiometricAuthModuleNative.cancel();
  }

  /**
   * Validate if current session is still valid
   * @returns Promise with session validity and expiration info
   */
  async validateSession(): Promise<SessionValidation> {
    return BiometricAuthModuleNative.validateSession();
  }

  /**
   * Logout - clear session and token
   * @returns Promise when logged out
   */
  async logout(): Promise<{ status: string }> {
    return BiometricAuthModuleNative.logout();
  }

  /**
   * Register event listener
   */
  addEventListener(event: string, callback: (data: BiometricAuthEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: (data: BiometricAuthEvent) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Register callback for authentication success
   * @param callback Called when authentication succeeds with token
   */
  onAuthSuccess(callback: (token: SessionToken) => void): void {
    this.addEventListener('onBiometricAuthSuccess', (data: any) => {
      if (data.sessionToken && data.expiresAt) {
        callback({
          token: data.sessionToken,
          expiresAt: data.expiresAt,
          authenticator: data.authenticator || 'unknown'
        });
      }
    });
  }

  /**
   * Register callback for authentication failure
   * @param callback Called when authentication fails with lockout info
   */
  onAuthFailed(callback: (isLocked: boolean, lockoutTimeMs: number) => void): void {
    this.addEventListener('onBiometricAuthFailed', (data: any) => {
      callback(data.isLocked || false, data.lockoutTimeMs || 0);
    });
  }

  /**
   * Register callback for authentication error
   * @param callback Called on authentication error with error details
   */
  onAuthError(callback: (errorCode: number, message: string) => void): void {
    this.addEventListener('onBiometricAuthError', (data: any) => {
      callback(data.errorCode || -1, data.message || 'Unknown error');
    });
  }

  /**
   * Register callback for logout
   * @param callback Called when user logs out
   */
  onLogout(callback: () => void): void {
    this.addEventListener('onLogout', () => {
      callback();
    });
  }
}

export const biometricAuthModule = new BiometricAuthModule();
export default biometricAuthModule;
