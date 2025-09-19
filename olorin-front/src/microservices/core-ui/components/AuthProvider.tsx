import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService } from '../services/AuthService';
import { User, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const userData = await AuthService.validateToken(token);
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await AuthService.login(email, password);

      if (response.token && response.user) {
        localStorage.setItem('auth_token', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No token available');
      }

      const response = await AuthService.refreshToken(token);
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        if (response.user) {
          setUser(response.user);
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      const updatedUser = await AuthService.updateProfile(updates);
      setUser(updatedUser);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };