export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'investigator' | 'analyst' | 'viewer';
  avatar?: string | null;
  permissions: string[];
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RefreshTokenResponse {
  token: string;
  user?: User;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}