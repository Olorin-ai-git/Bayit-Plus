/**
 * Passkey (WebAuthn) API Services
 *
 * Handles passkey registration, authentication, and session management
 * for accessing passkey-protected content.
 */

import { api } from './client';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

// ============================================
// Types
// ============================================

export interface PasskeyCredential {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface RegistrationOptionsResponse {
  options: PublicKeyCredentialCreationOptionsJSON;
  challenge_id: string;
}

export interface AuthenticationOptionsResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  challenge_id: string;
  qr_session_id?: string;
}

export interface AuthenticationResult {
  session_token: string;
  expires_at: string;
  user_id: string;
}

export interface QRStatus {
  status: 'pending' | 'authenticated' | 'expired';
  session_token?: string;
  user_id?: string;
}

export interface SessionStatus {
  valid: boolean;
  user_id?: string;
  expires_at?: string;
}

// ============================================
// Registration (Passkey Setup)
// ============================================

/**
 * Check if the browser supports WebAuthn passkeys.
 */
export const checkPasskeySupport = (): boolean => {
  return browserSupportsWebAuthn();
};

/**
 * Get registration options from the server.
 */
export const getRegistrationOptions = async (
  deviceName?: string
): Promise<RegistrationOptionsResponse> => {
  const response = await api.post('/webauthn/register/options', {
    device_name: deviceName,
  });
  return response as unknown as RegistrationOptionsResponse;
};

/**
 * Register a new passkey.
 *
 * This will prompt the user to create a passkey using their device's
 * biometric authentication (Face ID, Touch ID, Windows Hello, etc.).
 */
export const registerPasskey = async (
  deviceName?: string
): Promise<PasskeyCredential> => {
  // Get registration options from server
  const { options } = await getRegistrationOptions(deviceName);

  // Prompt user to create credential
  const credential = await startRegistration({ optionsJSON: options });

  // Verify with server and store credential
  const response = await api.post('/webauthn/register/verify', {
    credential,
    device_name: deviceName,
  });

  return response as unknown as PasskeyCredential;
};

// ============================================
// Authentication (Unlock Content)
// ============================================

/**
 * Get authentication options from the server.
 */
export const getAuthenticationOptions = async (
  isQRFlow: boolean = false
): Promise<AuthenticationOptionsResponse> => {
  const response = await api.post('/webauthn/authenticate/options', {
    is_qr_flow: isQRFlow,
  });
  return response as unknown as AuthenticationOptionsResponse;
};

/**
 * Authenticate with a passkey.
 *
 * This will prompt the user to verify their identity using their device's
 * biometric authentication (Face ID, Touch ID, Windows Hello, etc.).
 *
 * Returns a session token that should be stored and sent with subsequent
 * requests in the X-Passkey-Session header.
 */
export const authenticateWithPasskey = async (): Promise<AuthenticationResult> => {
  // Get authentication options from server
  const { options, challenge_id } = await getAuthenticationOptions(false);

  // Prompt user to verify with passkey
  const credential = await startAuthentication({ optionsJSON: options });

  // Verify with server and get session token
  const response = await api.post('/webauthn/authenticate/verify', {
    credential,
    challenge_id,
  });

  return response as unknown as AuthenticationResult;
};

// ============================================
// Cross-Device (QR Flow)
// ============================================

/**
 * Generate a QR code authentication challenge.
 *
 * Used by TV/web devices to initiate cross-device authentication.
 * Returns a QR session ID that should be encoded in the QR code.
 */
export const generateQRAuthentication = async (): Promise<AuthenticationOptionsResponse> => {
  const response = await api.post('/webauthn/qr/generate');
  return response as unknown as AuthenticationOptionsResponse;
};

/**
 * Check if QR-based authentication has been completed.
 *
 * Poll this after displaying the QR code to detect when the user
 * has authenticated on their phone.
 */
export const checkQRStatus = async (qrSessionId: string): Promise<QRStatus> => {
  const response = await api.get(`/webauthn/qr/status/${qrSessionId}`);
  return response as unknown as QRStatus;
};

/**
 * Authenticate using a QR session (from phone side).
 *
 * Called after scanning the QR code on a phone to authenticate
 * for the TV/web device.
 */
export const authenticateForQRSession = async (
  qrSessionId: string
): Promise<AuthenticationResult> => {
  // Get authentication options for this QR session
  const { options } = await getAuthenticationOptions(true);

  // Prompt user to verify with passkey
  const credential = await startAuthentication({ optionsJSON: options });

  // Verify with server (links to QR session)
  const response = await api.post('/webauthn/authenticate/verify', {
    credential,
    qr_session_id: qrSessionId,
  });

  return response as unknown as AuthenticationResult;
};

// ============================================
// Credential Management
// ============================================

/**
 * List all registered passkeys for the current user.
 */
export const listPasskeys = async (): Promise<PasskeyCredential[]> => {
  const response = await api.get('/webauthn/credentials');
  return response as unknown as PasskeyCredential[];
};

/**
 * Remove a passkey.
 */
export const removePasskey = async (credentialId: string): Promise<void> => {
  await api.delete(`/webauthn/credentials/${credentialId}`);
};

// ============================================
// Session Management
// ============================================

/**
 * Check if the current passkey session is valid.
 *
 * Note: This uses the session token from the auth store,
 * which should be included in the X-Passkey-Session header.
 */
export const checkSessionStatus = async (): Promise<SessionStatus> => {
  const response = await api.get('/webauthn/session/status');
  return response as unknown as SessionStatus;
};

/**
 * Revoke the current passkey session.
 */
export const revokeSession = async (): Promise<void> => {
  await api.post('/webauthn/session/revoke');
};

/**
 * Revoke all passkey sessions for the current user.
 */
export const revokeAllSessions = async (): Promise<{ revoked_count: number }> => {
  const response = await api.post('/webauthn/session/revoke-all');
  return response as unknown as { revoked_count: number };
};

// Export all passkey services
export const passkeyService = {
  // Support check
  checkPasskeySupport,
  // Registration
  getRegistrationOptions,
  registerPasskey,
  // Authentication
  getAuthenticationOptions,
  authenticateWithPasskey,
  // QR flow
  generateQRAuthentication,
  checkQRStatus,
  authenticateForQRSession,
  // Credential management
  listPasskeys,
  removePasskey,
  // Session management
  checkSessionStatus,
  revokeSession,
  revokeAllSessions,
};

export default passkeyService;
