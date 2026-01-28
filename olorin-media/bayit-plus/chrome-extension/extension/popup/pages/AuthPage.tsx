/**
 * Authentication Page
 *
 * Handles login and registration with:
 * - Google OAuth (primary method)
 * - Email/Password (fallback)
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassInput } from '@bayit/glass';
import { storeToken } from '../../background/auth-manager';
import { CONFIG } from '../../config/constants';
import { logger } from '../../lib/logger';

interface AuthPageProps {
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register';

/**
 * Authentication Page Component
 */
export function AuthPage({ onSuccess }: AuthPageProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle Google OAuth login
   */
  const handleGoogleOAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.info('Initiating Google OAuth');

      // Use Chrome Identity API for OAuth
      const authUrl = `${CONFIG.API.BASE_URL}/api/v1/auth/google/authorize`;

      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError.message);
          }

          if (!redirectUrl) {
            throw new Error('OAuth flow cancelled');
          }

          // Extract token from redirect URL
          const url = new URL(redirectUrl);
          const token = url.searchParams.get('token');

          if (!token) {
            throw new Error('No token received from OAuth');
          }

          // Store token
          await storeToken(token);

          logger.info('Google OAuth successful');

          onSuccess();
        }
      );
    } catch (error) {
      logger.error('Google OAuth failed', { error: String(error) });
      setError(t('auth.errors.oauthFailed', 'Google login failed. Please try again.'));
      setIsLoading(false);
    }
  };

  /**
   * Handle email/password authentication
   */
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password) {
      setError(t('auth.errors.missingFields', 'Please fill in all fields'));
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch', 'Passwords do not match'));
      return;
    }

    try {
      setIsLoading(true);

      const endpoint =
        mode === 'login'
          ? '/api/v1/auth/login'
          : '/api/v1/auth/register';

      logger.info(`Attempting ${mode} with email`, { email });

      const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `${mode} failed`);
      }

      const data = await response.json();
      const token = data.access_token;

      if (!token) {
        throw new Error('No token received');
      }

      // Store token
      await storeToken(token);

      logger.info(`${mode} successful`);

      onSuccess();
    } catch (error) {
      logger.error(`${mode} failed`, { error: String(error) });
      setError(String(error));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-screen p-6">
      <GlassCard className="p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎬</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {mode === 'login'
              ? t('auth.signIn', 'Sign In')
              : t('auth.signUp', 'Sign Up')}
          </h1>
          <p className="text-white/70 text-sm">
            {mode === 'login'
              ? t('auth.signInDescription', 'Sign in to start dubbing')
              : t('auth.signUpDescription', 'Create an account to get started')}
          </p>
        </div>

        {/* Google OAuth (Primary) */}
        <GlassButton
          variant="primary"
          onPress={handleGoogleOAuth}
          disabled={isLoading}
          className="w-full mb-6"
          aria-label={t('auth.loginWithGoogle', 'Sign in with Google')}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('auth.loginWithGoogle', 'Sign in with Google')}
          </span>
        </GlassButton>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900/50 text-white/60">
              {t('auth.orContinueWith', 'Or continue with')}
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <GlassInput
            type="email"
            placeholder={t('auth.email', 'Email')}
            value={email}
            onChangeText={setEmail}
            disabled={isLoading}
            aria-label={t('auth.email', 'Email')}
          />

          <GlassInput
            type="password"
            placeholder={t('auth.password', 'Password')}
            value={password}
            onChangeText={setPassword}
            disabled={isLoading}
            aria-label={t('auth.password', 'Password')}
          />

          {mode === 'register' && (
            <GlassInput
              type="password"
              placeholder={t('auth.confirmPassword', 'Confirm Password')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              disabled={isLoading}
              aria-label={t('auth.confirmPassword', 'Confirm Password')}
            />
          )}

          {error && (
            <div
              className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <GlassButton
            type="submit"
            variant="secondary"
            disabled={isLoading}
            className="w-full"
            aria-label={
              mode === 'login'
                ? t('auth.signInWithEmail', 'Sign in with Email')
                : t('auth.signUpWithEmail', 'Sign up with Email')
            }
          >
            {isLoading
              ? t('common.loading', 'Loading...')
              : mode === 'login'
              ? t('auth.signInWithEmail', 'Sign in with Email')
              : t('auth.signUpWithEmail', 'Sign up with Email')}
          </GlassButton>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            disabled={isLoading}
            className="text-white/60 hover:text-white/80 text-sm transition-colors disabled:opacity-50"
          >
            {mode === 'login'
              ? t('auth.noAccount', "Don't have an account? Sign up")
              : t('auth.haveAccount', 'Already have an account? Sign in')}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
