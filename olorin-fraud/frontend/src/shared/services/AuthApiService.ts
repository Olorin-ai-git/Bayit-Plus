import { BaseApiService } from './BaseApiService';
import { env } from '../config/env.config';
import { User } from '../../microservices/core-ui/providers/AuthProvider';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  expiresAt: string;
}

export interface AuthValidationResponse {
  valid: boolean;
  user?: User;
}

export class AuthApiService extends BaseApiService {
  constructor() {
    super(env.apiBaseUrl);
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/api/auth/login', credentials);

    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout', {});
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
    }
  }

  async validateToken(): Promise<AuthValidationResponse> {
    try {
      return await this.get<AuthValidationResponse>('/api/auth/validate');
    } catch (error) {
      return { valid: false };
    }
  }

  async refreshToken(): Promise<LoginResponse> {
    return this.post<LoginResponse>('/api/auth/refresh', {});
  }
}

export const authApiService = new AuthApiService();
