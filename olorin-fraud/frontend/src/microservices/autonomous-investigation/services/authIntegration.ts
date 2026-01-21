/**
 * Authentication and Authorization Integration for Autonomous Investigation Microservice
 * Handles JWT token management, role-based access control, and secure WebSocket authentication
 */

import { z } from 'zod';

// User role and permission schemas
const UserRoleSchema = z.enum(['admin', 'investigator', 'analyst', 'viewer']);
const PermissionSchema = z.enum([
  'investigation:create',
  'investigation:read',
  'investigation:update',
  'investigation:delete',
  'investigation:start',
  'investigation:stop',
  'investigation:escalate',
  'concept:power_grid',
  'concept:command_center',
  'concept:evidence_trail',
  'concept:network_explorer',
  'agent:configure',
  'agent:monitor',
  'export:pdf',
  'export:json',
  'export:csv'
]);

// Auth context schema
const AuthContextSchema = z.object({
  user_id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  permissions: z.array(PermissionSchema),
  token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
});

// JWT payload schema
const JWTPayloadSchema = z.object({
  sub: z.string(), // user_id
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  permissions: z.array(PermissionSchema),
  iat: z.number(),
  exp: z.number(),
});

// Types
type UserRole = z.infer<typeof UserRoleSchema>;
type Permission = z.infer<typeof PermissionSchema>;
type AuthContext = z.infer<typeof AuthContextSchema>;
type JWTPayload = z.infer<typeof JWTPayloadSchema>;

// Investigation concept access mapping
const CONCEPT_PERMISSIONS: Record<string, Permission> = {
  'power-grid': 'concept:power_grid',
  'command-center': 'concept:command_center',
  'evidence-trail': 'concept:evidence_trail',
  'network-explorer': 'concept:network_explorer',
};

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'investigation:create', 'investigation:read', 'investigation:update', 'investigation:delete',
    'investigation:start', 'investigation:stop', 'investigation:escalate',
    'concept:power_grid', 'concept:command_center', 'concept:evidence_trail', 'concept:network_explorer',
    'agent:configure', 'agent:monitor',
    'export:pdf', 'export:json', 'export:csv'
  ],
  investigator: [
    'investigation:create', 'investigation:read', 'investigation:update',
    'investigation:start', 'investigation:stop', 'investigation:escalate',
    'concept:power_grid', 'concept:command_center', 'concept:evidence_trail', 'concept:network_explorer',
    'agent:monitor',
    'export:pdf', 'export:json'
  ],
  analyst: [
    'investigation:read',
    'concept:power_grid', 'concept:evidence_trail', 'concept:network_explorer',
    'agent:monitor',
    'export:pdf'
  ],
  viewer: [
    'investigation:read',
    'concept:evidence_trail',
    'export:pdf'
  ]
};

/**
 * Authentication and Authorization Service for Autonomous Investigation
 */
export class AutonomousInvestigationAuth {
  private authContext: AuthContext | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private onAuthChange: ((context: AuthContext | null) => void) | null = null;

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initialize authentication from stored tokens
   */
  private initializeFromStorage(): void {
    try {
      const storedAuth = localStorage.getItem('olorin_auth_context');
      if (storedAuth) {
        const parsedAuth = JSON.parse(storedAuth);
        const validatedAuth = AuthContextSchema.parse(parsedAuth);

        // Check if token is still valid
        if (validatedAuth.expires_at > Date.now()) {
          this.authContext = validatedAuth;
          this.scheduleTokenRefresh();
          console.log('[AutonomousInvestigationAuth] Restored auth context from storage');
        } else {
          this.clearStoredAuth();
          console.log('[AutonomousInvestigationAuth] Stored token expired, cleared storage');
        }
      }
    } catch (error) {
      console.error('[AutonomousInvestigationAuth] Error restoring auth context:', error);
      this.clearStoredAuth();
    }
  }

  /**
   * Set authentication context after login
   */
  public setAuthContext(token: string, refreshToken: string): boolean {
    try {
      const payload = this.decodeJWT(token);
      const validatedPayload = JWTPayloadSchema.parse(payload);

      // Get permissions based on role
      const permissions = ROLE_PERMISSIONS[validatedPayload.role] || [];

      const authContext: AuthContext = {
        user_id: validatedPayload.sub,
        email: validatedPayload.email,
        name: validatedPayload.name,
        role: validatedPayload.role,
        permissions,
        token,
        refresh_token: refreshToken,
        expires_at: validatedPayload.exp * 1000, // Convert to milliseconds
      };

      AuthContextSchema.parse(authContext);

      this.authContext = authContext;
      this.storeAuthContext(authContext);
      this.scheduleTokenRefresh();

      if (this.onAuthChange) {
        this.onAuthChange(authContext);
      }

      console.log('[AutonomousInvestigationAuth] Authentication context set for user:', authContext.user_id);
      return true;
    } catch (error) {
      console.error('[AutonomousInvestigationAuth] Error setting auth context:', error);
      return false;
    }
  }

  /**
   * Clear authentication context (logout)
   */
  public clearAuthContext(): void {
    this.authContext = null;
    this.clearStoredAuth();
    this.clearTokenRefreshTimer();

    if (this.onAuthChange) {
      this.onAuthChange(null);
    }

    console.log('[AutonomousInvestigationAuth] Authentication context cleared');
  }

  /**
   * Get current authentication context
   */
  public getAuthContext(): AuthContext | null {
    return this.authContext;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authContext !== null && this.authContext.expires_at > Date.now();
  }

  /**
   * Check if user has specific permission
   */
  public hasPermission(permission: Permission): boolean {
    if (!this.authContext) return false;
    return this.authContext.permissions.includes(permission);
  }

  /**
   * Check if user has access to investigation concept
   */
  public hasConceptAccess(concept: string): boolean {
    const permission = CONCEPT_PERMISSIONS[concept];
    return permission ? this.hasPermission(permission) : false;
  }

  /**
   * Check if user can perform investigation action
   */
  public canPerformAction(action: 'create' | 'read' | 'update' | 'delete' | 'start' | 'stop' | 'escalate'): boolean {
    const permission = `investigation:${action}` as Permission;
    return this.hasPermission(permission);
  }

  /**
   * Check if user can export data in specific format
   */
  public canExport(format: 'pdf' | 'json' | 'csv'): boolean {
    const permission = `export:${format}` as Permission;
    return this.hasPermission(permission);
  }

  /**
   * Get authorization headers for API requests
   */
  public getAuthHeaders(): Record<string, string> {
    if (!this.authContext) {
      throw new Error('No authentication context available');
    }

    return {
      'Authorization': `Bearer ${this.authContext.token}`,
      'X-User-ID': this.authContext.user_id,
      'X-User-Role': this.authContext.role,
    };
  }

  /**
   * Get WebSocket authentication parameters
   */
  public getWebSocketAuth(): { token: string; userId: string; role: string } | null {
    if (!this.authContext) return null;

    return {
      token: this.authContext.token,
      userId: this.authContext.user_id,
      role: this.authContext.role,
    };
  }

  /**
   * Validate and refresh token if needed
   */
  public async validateAndRefreshToken(): Promise<boolean> {
    if (!this.authContext) return false;

    // Check if token expires soon (within 5 minutes)
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    if (this.authContext.expires_at > fiveMinutesFromNow) {
      return true; // Token is still valid
    }

    try {
      const refreshed = await this.refreshToken();
      return refreshed;
    } catch (error) {
      console.error('[AutonomousInvestigationAuth] Token refresh failed:', error);
      this.clearAuthContext();
      return false;
    }
  }

  /**
   * Register authentication change callback
   */
  public onAuthenticationChange(callback: (context: AuthContext | null) => void): () => void {
    this.onAuthChange = callback;

    // Return unsubscribe function
    return () => {
      this.onAuthChange = null;
    };
  }

  /**
   * Decode JWT token
   */
  private decodeJWT(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = parts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload);
    } catch (error) {
      throw new Error(`Failed to decode JWT: ${error}`);
    }
  }

  /**
   * Store authentication context in localStorage
   */
  private storeAuthContext(context: AuthContext): void {
    try {
      localStorage.setItem('olorin_auth_context', JSON.stringify(context));
    } catch (error) {
      console.error('[AutonomousInvestigationAuth] Failed to store auth context:', error);
    }
  }

  /**
   * Clear stored authentication context
   */
  private clearStoredAuth(): void {
    try {
      localStorage.removeItem('olorin_auth_context');
    } catch (error) {
      console.error('[AutonomousInvestigationAuth] Failed to clear stored auth:', error);
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    this.clearTokenRefreshTimer();

    if (!this.authContext) return;

    // Schedule refresh 5 minutes before token expires
    const refreshTime = this.authContext.expires_at - Date.now() - (5 * 60 * 1000);

    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshToken().catch(error => {
          console.error('[AutonomousInvestigationAuth] Scheduled token refresh failed:', error);
          this.clearAuthContext();
        });
      }, refreshTime);
    }
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<boolean> {
    if (!this.authContext) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authContext.refresh_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      return this.setAuthContext(data.token, data.refresh_token);
    } catch (error) {
      console.error('[AutonomousInvestigationAuth] Token refresh error:', error);
      return false;
    }
  }

  /**
   * Cleanup on service destruction
   */
  public destroy(): void {
    this.clearTokenRefreshTimer();
    this.onAuthChange = null;
  }
}

// Singleton instance
export const autonomousInvestigationAuth = new AutonomousInvestigationAuth();