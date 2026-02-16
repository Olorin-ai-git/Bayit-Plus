/**
 * Auth Services - Authentication and verification API endpoints
 * Platform-agnostic: works on web, iOS, Android, and tvOS
 */

import { api } from './client';
import { isWebPlatform } from '../../utils/storage';

// Auth Service (API)
export const apiAuthService = {
  login: (email: string, password: string) =>
    api.post('/auth/v2/login', { email, password }),
  register: (userData: { email: string; name: string; password: string }) =>
    api.post('/auth/v2/register', userData),
  me: () => api.get('/auth/me'),
  refreshToken: (_refreshToken: string) => {
    // Token refresh is no longer supported for RS256 tokens from auth.olorin.ai.
    // Users must re-authenticate to get new tokens.
    return Promise.reject(new Error('Token refresh not supported. Please re-authenticate.'));
  },
  getGoogleAuthUrl: async (redirectUri?: string) => {
    const uri = redirectUri || (isWebPlatform() && typeof window !== 'undefined'
      ? `${window.location.origin}/auth/google/callback`
      : undefined);
    const response: any = await api.get('/auth/google/url', { params: { redirect_uri: uri } });

    if (isWebPlatform() && typeof window !== 'undefined' && response.state) {
      sessionStorage.setItem('oauth_state', response.state);
    }

    return response;
  },
  googleCallback: (code: string, redirectUri?: string, state?: string) => {
    let finalState = state;
    if (!finalState && isWebPlatform() && typeof window !== 'undefined') {
      finalState = sessionStorage.getItem('oauth_state') || undefined;
      if (finalState) {
        sessionStorage.removeItem('oauth_state');
      }
    }

    return api.post('/auth/v2/google/callback', {
      code,
      redirect_uri: redirectUri,
      state: finalState,
    });
  },
  requestPasswordReset: (email: string) =>
    api.post('/auth/password-reset/request', { email }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    api.post('/auth/password-reset/confirm', { token, new_password: newPassword }),
};

// Verification Service (API)
export const apiVerificationService = {
  sendEmailVerification: () => api.post('/verification/email/send'),
  verifyEmail: (token: string) => api.post('/verification/email/verify', { token }),
  sendPhoneVerification: (phoneNumber: string) =>
    api.post('/verification/phone/send', { phone_number: phoneNumber }),
  verifyPhone: (code: string) =>
    api.post('/verification/phone/verify', { code }),
  getVerificationStatus: () => api.get('/verification/status'),
};
