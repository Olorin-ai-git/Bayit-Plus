/**
 * Auth Services - Authentication and verification API endpoints
 * Platform-agnostic: works on web, iOS, Android, and tvOS
 */

import { api } from './client';
import { isWebPlatform } from '../../utils/storage';

// Auth Service (API)
export const apiAuthService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (userData: { email: string; name: string; password: string }) =>
    api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
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
