/**
 * T013: Security event logging test in packages/auth/src/__tests__/security-logging.integration.test.ts
 * CRITICAL: This test MUST FAIL before implementation
  */

import { SecurityLogger } from '../logging/SecurityLogger';
import { LogLevel, LogDomain } from '@cvplus/logging/backend';

describe('SecurityLogger Integration', () => {
  let securityLogger: SecurityLogger;

  beforeEach(() => {
    securityLogger = new SecurityLogger('security-service-test');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Security Events', () => {
    it('should log brute force attack detection', async () => {
      const mockBruteForceDetection = {
        ipAddress: '192.168.1.200',
        targetEmail: 'user@example.com',
        attemptCount: 15,
        timeWindow: '5min',
        firstAttempt: '2023-11-15T12:00:00Z',
        lastAttempt: '2023-11-15T12:05:00Z',
        userAgent: 'Mozilla/5.0 (automated-attack)',
        actionTaken: 'ip_blocked',
        blockDuration: 3600 // 1 hour
      };

      const correlationId = securityLogger.bruteForceDetected(mockBruteForceDetection);

      expect(correlationId).toBeDefined();
      expect(correlationId).toMatch(/^[a-zA-Z0-9\-_]{21}$/);

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.ERROR,
        domain: LogDomain.SECURITY,
        message: 'Brute force attack detected',
        context: {
          event: 'BRUTE_FORCE_DETECTED',
          ipAddress: '192.168.1.200',
          targetEmail: '[EMAIL_REDACTED]', // PII should be redacted
          attemptCount: 15,
          timeWindow: '5min',
          actionTaken: 'ip_blocked',
          blockDuration: 3600,
          severity: 'critical'
        },
        correlationId: expect.any(String)
      });
    });

    it('should log account takeover attempts', async () => {
      const mockAccountTakeover = {
        userId: 'user-takeover-test',
        suspiciousActivities: [
          'login_from_new_device',
          'password_change_attempt',
          'email_change_attempt',
          'unusual_location'
        ],
        riskScore: 95,
        ipAddress: '10.0.0.1',
        deviceFingerprint: 'fp-suspicious-123',
        geoLocation: 'Unknown/VPN',
        userAgent: 'Chrome/91.0 (suspicious patterns)',
        actionTaken: 'account_locked',
        notificationSent: true
      };

      const correlationId = securityLogger.accountTakeoverAttempt(mockAccountTakeover);

      expect(correlationId).toBeDefined();

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.ERROR,
        domain: LogDomain.SECURITY,
        message: 'Account takeover attempt detected',
        context: {
          event: 'ACCOUNT_TAKEOVER_ATTEMPT',
          userId: 'user-takeover-test',
          suspiciousActivities: [
            'login_from_new_device',
            'password_change_attempt',
            'email_change_attempt',
            'unusual_location'
          ],
          riskScore: 95,
          actionTaken: 'account_locked',
          notificationSent: true,
          severity: 'critical'
        }
      });

      // Ensure sensitive device data is not logged in plain text
      expect(logEntry.context).not.toHaveProperty('deviceFingerprint');
      expect(logEntry.context).not.toHaveProperty('userAgent');
    });

    it('should log multi-factor authentication bypass attempts', async () => {
      const mockMFABypass = {
        userId: 'user-mfa-bypass',
        bypassMethod: 'social_engineering',
        attemptedFactors: ['backup_codes', 'sms_interception'],
        ipAddress: '172.16.0.1',
        deviceId: 'device-bypass-attempt',
        geoLocation: 'Different Country',
        timeFromLastLogin: 3600000, // 1 hour
        suspicionLevel: 'high',
        actionTaken: 'mfa_enforcement',
        alertLevel: 'immediate'
      };

      const correlationId = securityLogger.mfaBypassAttempt(mockMFABypass);

      expect(correlationId).toBeDefined();

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.ERROR,
        domain: LogDomain.SECURITY,
        message: 'MFA bypass attempt detected',
        context: {
          event: 'MFA_BYPASS_ATTEMPT',
          userId: 'user-mfa-bypass',
          bypassMethod: 'social_engineering',
          attemptedFactors: ['backup_codes', 'sms_interception'],
          suspicionLevel: 'high',
          actionTaken: 'mfa_enforcement',
          alertLevel: 'immediate',
          severity: 'critical'
        }
      });
    });
  });

  describe('Authorization and Access Control', () => {
    it('should log privilege escalation attempts', async () => {
      const mockPrivilegeEscalation = {
        userId: 'user-privilege-test',
        currentRole: 'user',
        attemptedRole: 'admin',
        method: 'direct_role_modification',
        endpoint: '/api/admin/users/update-role',
        ipAddress: '192.168.1.50',
        sessionId: 'session-privilege-123',
        timestamp: '2023-11-15T14:30:00Z',
        actionTaken: 'request_blocked',
        alertSent: true
      };

      const correlationId = securityLogger.privilegeEscalationAttempt(mockPrivilegeEscalation);

      expect(correlationId).toBeDefined();

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.ERROR,
        domain: LogDomain.SECURITY,
        message: 'Privilege escalation attempt detected',
        context: {
          event: 'PRIVILEGE_ESCALATION_ATTEMPT',
          userId: 'user-privilege-test',
          currentRole: 'user',
          attemptedRole: 'admin',
          method: 'direct_role_modification',
          endpoint: '/api/admin/users/update-role',
          actionTaken: 'request_blocked',
          alertSent: true,
          severity: 'high'
        }
      });

      // Ensure session IDs are not logged for security
      expect(logEntry.context).not.toHaveProperty('sessionId');
    });

    it('should log unauthorized API access attempts', async () => {
      const mockUnauthorizedAccess = {
        userId: 'user-unauth-test',
        endpoint: '/api/premium/features',
        method: 'GET',
        userTier: 'free',
        requiredTier: 'premium',
        ipAddress: '203.0.113.1',
        userAgent: 'PostmanRuntime/7.32.3',
        referer: null,
        timestamp: '2023-11-15T15:45:00Z',
        responseCode: 403,
        actionTaken: 'access_denied'
      };

      const correlationId = securityLogger.unauthorizedAPIAccess(mockUnauthorizedAccess);

      expect(correlationId).toBeDefined();

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.WARN,
        domain: LogDomain.SECURITY,
        message: 'Unauthorized API access attempt',
        context: {
          event: 'UNAUTHORIZED_API_ACCESS',
          userId: 'user-unauth-test',
          endpoint: '/api/premium/features',
          method: 'GET',
          userTier: 'free',
          requiredTier: 'premium',
          responseCode: 403,
          actionTaken: 'access_denied'
        }
      });
    });
  });

  describe('Data Protection and Privacy', () => {
    it('should log sensitive data access events', async () => {
      const mockSensitiveDataAccess = {
        userId: 'user-data-access',
        adminUserId: 'admin-viewer-123',
        dataType: 'personal_information',
        accessReason: 'customer_support_ticket',
        ticketId: 'ticket-12345',
        accessedFields: [
          'email_address',
          'phone_number',
          'billing_address'
        ],
        ipAddress: '10.0.0.10',
        timestamp: '2023-11-15T16:00:00Z',
        duration: 300000, // 5 minutes
        complianceNote: 'GDPR_Article_6_legitimate_interest'
      };

      const correlationId = securityLogger.sensitiveDataAccess(mockSensitiveDataAccess);

      expect(correlationId).toBeDefined();

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.AUDIT,
        message: 'Sensitive data accessed',
        context: {
          event: 'SENSITIVE_DATA_ACCESS',
          userId: 'user-data-access',
          adminUserId: 'admin-viewer-123',
          dataType: 'personal_information',
          accessReason: 'customer_support_ticket',
          accessedFieldsCount: 3,
          complianceNote: 'GDPR_Article_6_legitimate_interest'
        },
        performance: {
          duration: 300000
        }
      });

      // Ensure accessed fields are not logged in detail for privacy
      expect(logEntry.context).not.toHaveProperty('accessedFields');
    });

    it('should log data export and deletion requests', async () => {
      const mockDataRequest = {
        userId: 'user-gdpr-request',
        requestType: 'data_export',
        requestId: 'gdpr-req-789',
        requestedData: [
          'profile_information',
          'cv_data',
          'generated_content',
          'analytics_data'
        ],
        legalBasis: 'GDPR_Article_15',
        processingTime: 86400000, // 24 hours
        status: 'completed',
        deliveryMethod: 'secure_download',
        ipAddress: '198.51.100.1'
      };

      const correlationId = securityLogger.dataPrivacyRequest(mockDataRequest);

      expect(correlationId).toBeDefined();

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.AUDIT,
        message: 'Data privacy request processed',
        context: {
          event: 'DATA_PRIVACY_REQUEST',
          userId: 'user-gdpr-request',
          requestType: 'data_export',
          requestId: 'gdpr-req-789',
          legalBasis: 'GDPR_Article_15',
          status: 'completed',
          deliveryMethod: 'secure_download',
          requestedDataTypes: 4
        },
        performance: {
          duration: 86400000
        }
      });
    });
  });

  describe('System Security Monitoring', () => {
    it('should log suspicious system activity patterns', async () => {
      const mockSystemSuspiciousActivity = {
        pattern: 'unusual_api_usage_spike',
        metrics: {
          normalBaseline: 150,
          currentRate: 2500,
          percentageIncrease: 1567
        },
        timeWindow: '15min',
        affectedEndpoints: [
          '/api/cv/analyze',
          '/api/multimedia/generate',
          '/api/premium/features'
        ],
        potentialThreat: 'ddos_or_abuse',
        riskLevel: 'high',
        actionTaken: 'rate_limiting_increased',
        alertsSent: ['security_team', 'on_call_engineer']
      };

      const correlationId = securityLogger.systemSuspiciousActivity(mockSystemSuspiciousActivity);

      expect(correlationId).toBeDefined();

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.ERROR,
        domain: LogDomain.SECURITY,
        message: 'Suspicious system activity detected',
        context: {
          event: 'SYSTEM_SUSPICIOUS_ACTIVITY',
          pattern: 'unusual_api_usage_spike',
          timeWindow: '15min',
          percentageIncrease: 1567,
          affectedEndpointsCount: 3,
          potentialThreat: 'ddos_or_abuse',
          riskLevel: 'high',
          actionTaken: 'rate_limiting_increased',
          severity: 'high'
        }
      });
    });

    it('should log security configuration changes', async () => {
      const mockConfigChange = {
        adminUserId: 'admin-config-123',
        configType: 'firebase_security_rules',
        changedSettings: [
          {
            setting: 'allow_anonymous_read',
            oldValue: 'false',
            newValue: 'true'
          },
          {
            setting: 'max_upload_size',
            oldValue: '10MB',
            newValue: '50MB'
          }
        ],
        changeReason: 'feature_enhancement_request',
        approvalId: 'approval-456',
        ipAddress: '10.0.0.20',
        timestamp: '2023-11-15T17:30:00Z',
        rollbackPlan: 'automatic_after_24h'
      };

      const correlationId = securityLogger.securityConfigurationChange(mockConfigChange);

      expect(correlationId).toBeDefined();

      const logEntry = securityLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.WARN,
        domain: LogDomain.AUDIT,
        message: 'Security configuration changed',
        context: {
          event: 'SECURITY_CONFIGURATION_CHANGE',
          adminUserId: 'admin-config-123',
          configType: 'firebase_security_rules',
          changedSettingsCount: 2,
          changeReason: 'feature_enhancement_request',
          approvalId: 'approval-456',
          rollbackPlan: 'automatic_after_24h'
        }
      });
    });
  });

  describe('Correlation and Context Tracking', () => {
    it('should maintain correlation ID across security event chain', async () => {
      const initialCorrelationId = securityLogger.suspiciousLoginAttempt({
        userId: 'user-correlation-security',
        ipAddress: '192.168.1.100',
        reason: 'unusual_location'
      });

      // Subsequent security events should use same correlation ID
      const escalationCorrelationId = securityLogger.withCorrelation(initialCorrelationId, () => {
        return securityLogger.accountLocked({
          userId: 'user-correlation-security',
          reason: 'multiple_suspicious_attempts',
          duration: 3600000
        });
      });

      const notificationCorrelationId = securityLogger.withCorrelation(initialCorrelationId, () => {
        return securityLogger.securityNotificationSent({
          userId: 'user-correlation-security',
          notificationType: 'account_locked',
          channels: ['email', 'sms']
        });
      });

      expect(escalationCorrelationId).toBe(initialCorrelationId);
      expect(notificationCorrelationId).toBe(initialCorrelationId);

      const allLogs = securityLogger.getAllLogEntries();
      expect(allLogs).toHaveLength(3);

      // All logs should have the same correlation ID
      allLogs.forEach(log => {
        expect(log.correlationId).toBe(initialCorrelationId);
      });
    });

    it('should include security context in all log entries', () => {
      securityLogger.bruteForceDetected({
        ipAddress: '192.168.1.200',
        targetEmail: 'test@example.com',
        attemptCount: 5,
        timeWindow: '1min'
      });

      expect(securityLogger.getLastLogEntry().package).toBe('@cvplus/auth');
      expect(securityLogger.getLastLogEntry().service).toBe('security-service-test');
    });
  });
});