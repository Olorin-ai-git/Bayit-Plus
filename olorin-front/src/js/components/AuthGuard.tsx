/**
 * Authentication Guard Component
 * Shows full UI with popup notification when user is not authenticated
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, autoLoginDev, user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [hasTriedAutoLogin, setHasTriedAutoLogin] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

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
          // Show authentication dialog instead of blocking UI
          setShowAuthDialog(true);
        }
      }
    };

    tryAutoLogin();
  }, [isAuthenticated, isLoading, hasTriedAutoLogin, autoLoginDev]);

  const handleTryAgain = async () => {
    setIsRetrying(true);
    try {
      console.log('🔐 Retrying authentication...');
      await autoLoginDev();
      setShowAuthDialog(false);
    } catch (error) {
      console.error('Authentication retry failed:', error);
      // Keep dialog open, user can try again
    } finally {
      setIsRetrying(false);
    }
  };


  // Show loading state only briefly
  if (isLoading && !hasTriedAutoLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Always show the app UI
  return (
    <div>
      {/* Development Status Bar */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {isAuthenticated && (
            <div className="bg-green-50 border-b border-green-200 px-4 py-2">
              <p className="text-green-800 text-sm">
                🔐 Authenticated as: {user?.username} ({user?.scopes?.join(', ')})
              </p>
            </div>
          )}
          
          {isDemoMode && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
              <p className="text-blue-800 text-sm">
                🎭 Demo Mode Active - Using mock data (Press Ctrl+Shift+D to exit)
              </p>
            </div>
          )}
        </>
      )}

      {/* Authentication Dialog */}
      <Dialog 
        open={showAuthDialog} 
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>
          <div className="flex items-center">
            <svg className="h-6 w-6 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Authentication Required
          </div>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            You are not currently logged in. Please ensure the backend server is running on port 8090 and try again.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            If the problem persists, please contact your system administrator.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleTryAgain} 
            color="primary" 
            variant="contained"
            disabled={isRetrying}
          >
            {isRetrying ? 'Trying...' : 'Try Again'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main App Content - Always Shown */}
      <div className={!isAuthenticated && showAuthDialog ? 'filter blur-sm pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
};