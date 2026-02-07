/**
 * Secure Storage Types - tvOS
 *
 * Type definitions for the secure storage service,
 * covering OAuth credential structures used with tvOS Keychain.
 */

/**
 * Interface for stored OAuth credentials
 */
export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
}
