/**
 * Audible OAuth Callback Handler
 *
 * Processes OAuth callback from Audible after user authorization.
 * Exchanges authorization code for access tokens and redirects back.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlassCard, GlassSpinner } from '@bayit/glass';
import { AlertCircle } from 'lucide-react';

export function AudibleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
          throw new Error('No authorization code received from Audible');
        }

        const response = await fetch('/api/v1/user/audible/oauth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Failed to connect Audible account');
        }

        setIsProcessing(false);
        setTimeout(() => {
          navigate('/audiobooks?audible=connected');
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-gray-900">
        <GlassCard className="p-8 max-w-md">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Connection Failed</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => navigate('/audiobooks')}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all"
            >
              Back to Audiobooks
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-gray-900">
        <GlassCard className="p-8 max-w-md">
          <div className="text-center">
            <GlassSpinner size="lg" className="mb-6" />
            <h1 className="text-2xl font-bold text-white mb-4">Connecting Audible...</h1>
            <p className="text-gray-300">Please wait while we link your account.</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-gray-900">
      <GlassCard className="p-8 max-w-md">
        <div className="text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-white mb-4">Connected!</h1>
          <p className="text-gray-300">Your Audible account is now linked to Bayit+</p>
        </div>
      </GlassCard>
    </div>
  );
}
