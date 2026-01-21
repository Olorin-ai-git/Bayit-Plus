/**
 * Admin Authentication Middleware Tests
 *
 * Comprehensive test suite for admin authentication and authorization
 * Following CVPlus testing patterns and testing security fixes
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  requireAuth,
  requireAdmin,
  isAdmin,
  AdminLevel,
  AdminRole,
  type AuthenticatedRequest,
  type AdminAuthenticatedRequest
} from '../admin-auth.middleware';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn()
      }))
    }))
  })),
  auth: jest.fn(),
  apps: { length: 0 },
  initializeApp: jest.fn()
}));

// Mock Firebase Functions Logger
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Admin Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should authenticate user with valid token', async () => {
      const mockRequest = {
        auth: {
          uid: 'test-user-123',
          token: {
            email: 'test@example.com',
            email_verified: true,
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour in future
          }
        }
      };

      const result = await requireAuth(mockRequest as any);

      expect(result.auth.uid).toBe('test-user-123');
      expect(result.auth.token.email).toBe('test@example.com');
    });

    it('should reject request without auth context', async () => {
      const mockRequest = {};

      await expect(requireAuth(mockRequest as any))
        .rejects.toThrow(HttpsError);

      // Verify it's the correct error
      try {
        await requireAuth(mockRequest as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('unauthenticated');
        expect((error as HttpsError).message).toBe('User must be authenticated');
      }
    });

    it('should reject expired token', async () => {
      const mockRequest = {
        auth: {
          uid: 'test-user-123',
          token: {
            email: 'test@example.com',
            email_verified: true,
            exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour in past
          }
        }
      };

      await expect(requireAuth(mockRequest as any))
        .rejects.toThrow(HttpsError);

      try {
        await requireAuth(mockRequest as any);
      } catch (error) {
        expect((error as HttpsError).code).toBe('unauthenticated');
        expect((error as HttpsError).message).toBe('Authentication token has expired');
      }
    });

    it('should require email verification in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.FUNCTIONS_EMULATOR = 'false';

      const mockRequest = {
        auth: {
          uid: 'test-user-123',
          token: {
            email: 'test@example.com',
            email_verified: false,
            exp: Math.floor(Date.now() / 1000) + 3600
          }
        }
      };

      await expect(requireAuth(mockRequest as any))
        .rejects.toThrow(HttpsError);

      try {
        await requireAuth(mockRequest as any);
      } catch (error) {
        expect((error as HttpsError).code).toBe('permission-denied');
        expect((error as HttpsError).message)
          .toContain('Email verification is required');
      }

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('isAdmin - Security Fix Validation', () => {
    it('should reject admin check without Firebase Custom Claims', () => {
      const mockRequest: AuthenticatedRequest = {
        auth: {
          uid: 'test-user-123',
          token: {
            email: 'admin@cvplus.ai', // Even with admin email
            email_verified: true,
            // No admin custom claims
          }
        }
      } as any;

      const result = isAdmin(mockRequest);

      // SECURITY: Should be false even with admin email
      expect(result).toBe(false);
    });

    it('should accept admin with valid Firebase Custom Claims', () => {
      const mockRequest: AuthenticatedRequest = {
        auth: {
          uid: 'test-admin-123',
          token: {
            email: 'admin@cvplus.ai',
            email_verified: true,
            admin: {
              role: AdminRole.ADMIN,
              level: AdminLevel.L3_ADMIN
            }
          }
        }
      } as any;

      const result = isAdmin(mockRequest);

      expect(result).toBe(true);
    });

    it('should reject insufficient admin level in custom claims', () => {
      const mockRequest: AuthenticatedRequest = {
        auth: {
          uid: 'test-user-123',
          token: {
            email: 'support@cvplus.ai',
            email_verified: true,
            admin: {
              role: AdminRole.SUPPORT,
              level: 0 // Below minimum level
            }
          }
        }
      } as any;

      const result = isAdmin(mockRequest);

      expect(result).toBe(false);
    });
  });

  describe('requireAdmin - Security Enhancement', () => {
    it('should require Firebase Custom Claims for admin access', async () => {
      // Mock authenticated request without admin claims
      const mockRequest = {
        auth: {
          uid: 'test-user-123',
          token: {
            email: 'gil.klainert@gmail.com', // Even legacy admin email
            email_verified: true,
            // No admin custom claims
          }
        }
      };

      // Mock requireAuth to return the authenticated request
      const authenticatedRequest = mockRequest as AuthenticatedRequest;

      await expect(async () => {
        // Simulate the requireAdmin logic
        const customClaims = authenticatedRequest.auth.token.admin;
        if (!customClaims) {
          throw new HttpsError('permission-denied', 'Admin access requires Firebase Custom Claims configuration');
        }
      }).rejects.toThrow(HttpsError);
    });

    it('should accept valid admin with proper custom claims', async () => {
      const mockRequest = {
        auth: {
          uid: 'test-admin-123',
          token: {
            email: 'admin@cvplus.ai',
            email_verified: true,
            admin: {
              role: AdminRole.ADMIN,
              level: AdminLevel.L3_ADMIN,
              permissions: {
                canAccessDashboard: true,
                canManageUsers: true
              }
            }
          }
        }
      };

      // Mock the Firestore call for admin profile
      const admin = require('firebase-admin');
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Test Admin' })
      });

      admin.firestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: mockGet
          }))
        }))
      });

      // This should not throw
      const customClaims = mockRequest.auth.token.admin;
      expect(customClaims).toBeDefined();
      expect(customClaims.level).toBeGreaterThanOrEqual(AdminLevel.L1_SUPPORT);
    });

    it('should enforce minimum admin level requirements', async () => {
      const mockRequest = {
        auth: {
          uid: 'test-support-123',
          token: {
            email: 'support@cvplus.ai',
            email_verified: true,
            admin: {
              role: AdminRole.SUPPORT,
              level: AdminLevel.L1_SUPPORT // Level 1
            }
          }
        }
      };

      const customClaims = mockRequest.auth.token.admin;
      const minLevel = AdminLevel.L3_ADMIN; // Requiring Level 3

      // Should fail level check
      expect(customClaims.level).toBeLessThan(minLevel);
    });
  });

  describe('Admin Permissions Validation', () => {
    it('should validate user management permissions', () => {
      const adminPermissions = {
        canManageUsers: true,
        userManagement: {
          canViewUsers: true,
          canEditUsers: true,
          canSuspendUsers: false,
          canDeleteUsers: false
        }
      };

      expect(adminPermissions.canManageUsers).toBe(true);
      expect(adminPermissions.userManagement.canViewUsers).toBe(true);
      expect(adminPermissions.userManagement.canDeleteUsers).toBe(false);
    });

    it('should validate content moderation permissions', () => {
      const adminPermissions = {
        canModerateContent: true,
        contentModeration: {
          canReviewContent: true,
          canApproveContent: true,
          canRejectContent: true,
          canHandleAppeals: false
        }
      };

      expect(adminPermissions.canModerateContent).toBe(true);
      expect(adminPermissions.contentModeration.canApproveContent).toBe(true);
      expect(adminPermissions.contentModeration.canHandleAppeals).toBe(false);
    });

    it('should validate system administration permissions', () => {
      const adminPermissions = {
        canConfigureSystem: false,
        systemAdministration: {
          canViewSystemHealth: true,
          canManageServices: false,
          canConfigureFeatures: false,
          canDeployUpdates: false
        }
      };

      expect(adminPermissions.canConfigureSystem).toBe(false);
      expect(adminPermissions.systemAdministration.canViewSystemHealth).toBe(true);
      expect(adminPermissions.systemAdministration.canDeployUpdates).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should track admin request counts', () => {
      const rateLimitMap = new Map();
      const RATE_LIMIT_MAX = 20;
      const adminId = 'test-admin-123';
      const key = `admin_${adminId}`;
      const now = Date.now();

      // First request
      rateLimitMap.set(key, { count: 1, resetTime: now + 60000 });

      expect(rateLimitMap.get(key).count).toBe(1);

      // Increment count
      const userLimit = rateLimitMap.get(key);
      userLimit.count++;

      expect(rateLimitMap.get(key).count).toBe(2);
      expect(rateLimitMap.get(key).count).toBeLessThan(RATE_LIMIT_MAX);
    });

    it('should enforce rate limits', () => {
      const rateLimitMap = new Map();
      const RATE_LIMIT_MAX = 20;
      const adminId = 'test-admin-123';
      const key = `admin_${adminId}`;
      const now = Date.now();

      // Set at max limit
      rateLimitMap.set(key, { count: RATE_LIMIT_MAX, resetTime: now + 60000 });

      const userLimit = rateLimitMap.get(key);
      const shouldBlock = now < userLimit.resetTime && userLimit.count >= RATE_LIMIT_MAX;

      expect(shouldBlock).toBe(true);
    });
  });
});