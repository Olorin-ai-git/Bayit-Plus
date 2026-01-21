/**
 * T009: Authentication logging test in packages/auth/src/__tests__/auth-logging.integration.test.ts
 * CRITICAL: This test MUST FAIL before implementation
  */

import { AuthLogger } from '../logging/AuthLogger';
import { LogLevel, LogDomain } from '@cvplus/logging/backend';

describe('AuthLogger Integration', () => {
  let authLogger: AuthLogger;

  beforeEach(() => {
    authLogger = new AuthLogger();
  });

  describe('authentication events', () => {
    it('should log successful login with user context', () => {
      const mockUserId = 'user-123';
      const mockIpAddress = '192.168.1.100';
      const mockUserAgent = 'Mozilla/5.0 Chrome/91.0';

      authLogger.logLoginSuccess(mockUserId, {
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        provider: 'email',
        correlationId: 'auth-success-123'
      });

      // This should create a log entry with:
      // - Level: INFO
      // - Domain: SECURITY
      // - Message: 'User login successful'
      // - Context: userId, ipAddress, userAgent, provider
      // - No PII in plain text (email should be redacted if present)
      expect(authLogger.getLastLogEntry()).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.SECURITY,
        message: 'User login successful',
        context: {
          userId: mockUserId,
          ipAddress: mockIpAddress,
          provider: 'email',
          outcome: 'success'
        }
      });
    });

    it('should log failed login attempt with security context', () => {
      const mockEmail = 'user@example.com';
      const mockIpAddress = '10.0.0.1';
      const mockFailureReason = 'invalid_password';

      authLogger.logLoginFailure(mockEmail, mockFailureReason, {
        ipAddress: mockIpAddress,
        attempts: 3,
        correlationId: 'auth-fail-456'
      });

      expect(authLogger.getLastLogEntry()).toMatchObject({
        level: LogLevel.WARN,
        domain: LogDomain.SECURITY,
        message: 'User login failed',
        context: {
          email: '[EMAIL_REDACTED]', // PII should be redacted
          ipAddress: mockIpAddress,
          failureReason: mockFailureReason,
          attempts: 3,
          outcome: 'failure'
        }
      });
    });

    it('should log password reset events', () => {
      const mockUserId = 'user-789';
      const mockTokenId = 'reset-token-456';

      authLogger.logPasswordReset(mockUserId, {
        tokenId: mockTokenId,
        initiatedBy: 'user',
        expiresAt: '2023-12-01T12:00:00Z',
        correlationId: 'reset-789'
      });

      expect(authLogger.getLastLogEntry()).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.AUDIT,
        message: 'Password reset initiated',
        context: {
          userId: mockUserId,
          tokenId: mockTokenId,
          initiatedBy: 'user',
          outcome: 'initiated'
        }
      });
    });
  });

  describe('session management', () => {
    it('should log session creation', () => {
      const mockUserId = 'user-456';
      const mockSessionId = 'session-abc123';

      authLogger.logSessionCreate(mockUserId, mockSessionId, {
        expiresAt: '2023-12-01T18:00:00Z',
        deviceInfo: 'iOS 15.0',
        correlationId: 'session-create-123'
      });

      expect(authLogger.getLastLogEntry()).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.AUDIT,
        message: 'User session created',
        context: {
          userId: mockUserId,
          sessionId: mockSessionId,
          deviceInfo: 'iOS 15.0',
          action: 'session_create'
        }
      });
    });

    it('should log session termination', () => {
      const mockSessionId = 'session-def456';

      authLogger.logSessionTerminate(mockSessionId, {
        reason: 'logout',
        userId: 'user-789',
        correlationId: 'session-end-456'
      });

      expect(authLogger.getLastLogEntry()).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.AUDIT,
        message: 'User session terminated',
        context: {
          sessionId: mockSessionId,
          reason: 'logout',
          userId: 'user-789',
          action: 'session_terminate'
        }
      });
    });
  });

  describe('security events', () => {
    it('should log suspicious activity with high severity', () => {
      const mockIpAddress = '192.168.1.200';
      const mockPattern = 'multiple_failed_attempts';

      authLogger.logSuspiciousActivity(mockPattern, {
        ipAddress: mockIpAddress,
        attempts: 10,
        timeWindow: '5min',
        riskScore: 85,
        correlationId: 'suspicious-123'
      });

      expect(authLogger.getLastLogEntry()).toMatchObject({
        level: LogLevel.ERROR,
        domain: LogDomain.SECURITY,
        message: 'Suspicious authentication activity detected',
        context: {
          pattern: mockPattern,
          ipAddress: mockIpAddress,
          attempts: 10,
          riskScore: 85,
          severity: 'high'
        }
      });
    });

    it('should log privilege escalation attempts', () => {
      const mockUserId = 'user-123';
      const mockTargetRole = 'admin';

      authLogger.logPrivilegeEscalation(mockUserId, mockTargetRole, {
        currentRole: 'user',
        approved: false,
        requestId: 'privilege-req-789',
        correlationId: 'privilege-escalation-456'
      });

      expect(authLogger.getLastLogEntry()).toMatchObject({
        level: LogLevel.WARN,
        domain: LogDomain.SECURITY,
        message: 'Privilege escalation attempted',
        context: {
          userId: mockUserId,
          targetRole: mockTargetRole,
          currentRole: 'user',
          approved: false,
          outcome: 'attempted'
        }
      });
    });
  });

  describe('correlation and context', () => {
    it('should maintain correlation ID across auth operations', () => {
      const correlationId = 'auth-flow-123';

      authLogger.withCorrelationId(correlationId, () => {
        authLogger.logLoginAttempt('user@example.com', {
          provider: 'google'
        });
      });

      expect(authLogger.getLastLogEntry().correlationId).toBe(correlationId);
    });

    it('should include package identifier in all log entries', () => {
      authLogger.logLoginSuccess('user-123', {
        provider: 'email'
      });

      expect(authLogger.getLastLogEntry().package).toBe('@cvplus/auth');
    });
  });

  describe('performance tracking', () => {
    it('should track authentication operation duration', () => {
      const startTime = Date.now();

      authLogger.logAuthPerformance('login', {
        duration: 250,
        provider: 'oauth2',
        steps: ['validate', 'authenticate', 'create_session'],
        correlationId: 'auth-perf-123'
      });

      expect(authLogger.getLastLogEntry()).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.PERFORMANCE,
        message: 'Authentication operation completed',
        performance: {
          duration: 250
        },
        context: {
          operation: 'login',
          provider: 'oauth2',
          steps: ['validate', 'authenticate', 'create_session']
        }
      });
    });
  });
});