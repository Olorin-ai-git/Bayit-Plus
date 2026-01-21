import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { FirebaseAuthService } from '../services/FirebaseAuthService';
import { AuthService } from '../services/AuthService';
import type { UserRole } from '@shared/types/core/user.types';
import type { AuthenticatedUser, FirebaseAuthContextType } from '../types/firebase-auth.types';

const AuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setIsAuthenticated(!!authUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const authUser = await FirebaseAuthService.signInWithGoogle();
      setUser(authUser);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sign in failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithEmailPassword = useCallback(async (
    email: string,
    password: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await AuthService.login(email, password);
      if (response.token && response.user) {
        localStorage.setItem('auth_token', response.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await FirebaseAuthService.signOut();
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      return await FirebaseAuthService.getIdToken(true);
    } catch (err) {
      console.error('Token refresh failed:', err);
      return null;
    }
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }, [user]);

  const value: FirebaseAuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    error,
    signInWithGoogle,
    signInWithEmailPassword,
    signOut,
    refreshToken,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): FirebaseAuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
