import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { env } from '@shared/config/env.config';
import { User, LoginResponse, RefreshTokenResponse } from '../types/auth';
import { createAxiosErrorInterceptor } from '@shared/utils/axiosErrorHandler';

class AuthServiceClass {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = env.api.baseUrl;
    this.api = axios.create({
      baseURL: `${this.baseURL}/api/auth`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with error notification handling
    this.api.interceptors.response.use(
      (response) => response,
      createAxiosErrorInterceptor(true)
    );
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.api.post('/login', {
        email,
        password,
      });

      return response.data;
    } catch (error) {
      console.error('Login request failed:', error);
      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local logout even if server request fails
    }
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const response: AxiosResponse<{ user: User }> = await this.api.get('/validate', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.user;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  async refreshToken(token: string): Promise<RefreshTokenResponse> {
    try {
      const response: AxiosResponse<RefreshTokenResponse> = await this.api.post('/refresh', {
        token,
      });

      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Session expired. Please log in again.');
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response: AxiosResponse<{ user: User }> = await this.api.put('/profile', updates);
      return response.data.user;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw new Error('Failed to update profile. Please try again.');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.api.put('/password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      console.error('Password change failed:', error);
      throw new Error('Failed to change password. Please check your current password.');
    }
  }

  // Mock implementation for development
  async mockLogin(email: string, password: string): Promise<LoginResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (password === 'password') {
      return {
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: '1',
          email,
          name: email.split('@')[0],
          role: 'investigator',
          avatar: null,
          permissions: ['read', 'write', 'investigate'],
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    throw new Error('Invalid credentials');
  }

  // Check if we're in development mode and backend is not available
  async checkBackendAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/api/health`, { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Auto-switch to mock mode if backend is not available in development
  async smartLogin(email: string, password: string): Promise<LoginResponse> {
    if (env.nodeEnv === 'development') {
      const isBackendAvailable = await this.checkBackendAvailability();
      if (!isBackendAvailable) {
        console.warn('Backend not available, using mock authentication');
        return this.mockLogin(email, password);
      }
    }

    return this.login(email, password);
  }
}

export const AuthService = new AuthServiceClass();