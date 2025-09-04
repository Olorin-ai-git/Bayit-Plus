/**
 * Authentication Guard Component
 * Ensures user is authenticated before accessing protected content
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, autoLoginDev, user } = useAuth();
  const [hasTriedAutoLogin, setHasTriedAutoLogin] = useState(false);

  useEffect(() => {
    // Auto-login for development if not authenticated
    const tryAutoLogin = async () => {
      if (!isAuthenticated && !isLoading && !hasTriedAutoLogin) {
        setHasTriedAutoLogin(true);
        try {
          console.log('🔐 Attempting auto-login for development...');
          await autoLoginDev();
        } catch (error) {
          console.error('Auto-login failed:', error);
        }
      }
    };

    tryAutoLogin();
  }, [isAuthenticated, isLoading, hasTriedAutoLogin, autoLoginDev]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authentication Required
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we authenticate you...
            </p>
            {hasTriedAutoLogin && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">
                  Auto-login failed. Please check if the backend server is running on port 8090.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Development indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <p className="text-green-800 text-sm">
            🔐 Authenticated as: {user?.username} ({user?.scopes?.join(', ')})
          </p>
        </div>
      )}
      {children}
    </div>
  );
};