/**
 * Auth Services - Authentication and verification API endpoints
 */

import { Platform } from 'react-native';
import { api } from './client';

// Auth Service (API)
export const apiAuthService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (userData: { email: string; name: string; password: string }) =>
    api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  getGoogleAuthUrl: async () => {
    const redirectUri = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/auth/google/callback`
      : undefined;
    const response: any = await api.get('/auth/google/url', { params: { redirect_uri: redirectUri } });

    if (Platform.OS === 'web' && typeof window !== 'undefined' && response.state) {
      sessionStorage.setItem('oauth_state', response.state);
    }

    return response;
  },
  googleCallback: (code: string, redirectUri?: string, state?: string) => {
    let finalState = state;
    if (!finalState && Platform.OS === 'web' && typeof window !== 'undefined') {
      finalState = sessionStorage.getItem('oauth_state') || undefined;
      if (finalState) {
        sessionStorage.removeItem('oauth_state');
      }
    }

    return api.post('/auth/google/callback', {
      code,
      redirect_uri: redirectUri,
      state: finalState,
    });
  },
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
