/**
 * Audible Login Button Component
 *
 * Premium Feature: Initiates OAuth flow to link user's Audible account.
 * Only visible to Premium/Family tier users.
 * Allows access to their Audible library within Bayit+.
 */

import { useState } from 'react';
import { GlassButton, GlassSpinner } from '@bayit/glass';
import { useAuth } from '@/hooks/useAuth';

interface AudibleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function AudibleLoginButton({
  onSuccess,
  onError,
  className = '',
}: AudibleLoginButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Hide Audible integration from basic tier users
  // Premium feature: only Premium/Family subscribers can use
  const isPremiumUser = user?.subscription_tier && ['premium', 'family'].includes(user.subscription_tier);
  if (!isPremiumUser) {
    return null;
  }

  const handleAudibleLogin = async () => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/audible/callback`;

      const response = await fetch('/api/v1/user/audible/oauth/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redirect_uri: redirectUri }),
      });

      if (!response.ok) {
        throw new Error('Failed to get Audible authorization URL');
      }

      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      onError?.(errorMessage);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/user/audible/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Audible account');
      }

      setIsConnected(false);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnection failed';
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <GlassSpinner size="sm" />
        <span className="text-sm text-white/60">Processing...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <GlassButton
        variant="secondary"
        onPress={handleDisconnect}
        className={className}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        </svg>
        Disconnect Audible
      </GlassButton>
    );
  }

  return (
    <GlassButton
      variant="primary"
      onPress={handleAudibleLogin}
      className={`bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 ${className}`}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
      </svg>
      Connect Audible
    </GlassButton>
  );
}
