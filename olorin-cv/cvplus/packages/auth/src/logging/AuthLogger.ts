/**
 * T028: Auth package logging integration in packages/auth/src/logging/AuthLogger.ts
 *
 * Specialized logger for authentication and authorization events
 * Provides domain-specific logging methods for security and audit compliance
  */

// Import logging directly from Layer 0 (correct architectural dependency)
import {
  LoggerFactory,
  AuditTrail,
  AuditAction,
  AuditEventType,
  LogLevel,
  LogDomain,
  globalAuditTrail,
  type ILogger
} from '@cvplus/logging/backend';

// Helper function for correlation ID
function getCurrentCorrelationId(): string | null {
  // Simple placeholder - correlation tracking to be implemented
  return null;
}

/**
 * Authentication event types
  */
export enum AuthEventType {
  LOGIN_ATTEMPT = 'auth.login.attempt',
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  TOKEN_REFRESH = 'auth.token.refresh',
  PASSWORD_CHANGE = 'auth.password.change',
  PASSWORD_RESET = 'auth.password.reset',
  MFA_SETUP = 'auth.mfa.setup',
  MFA_VERIFY = 'auth.mfa.verify',
  SESSION_CREATE = 'auth.session.create',
  SESSION_DESTROY = 'auth.session.destroy',
  PERMISSION_CHECK = 'auth.permission.check',
  ROLE_ASSIGN = 'auth.role.assign',
  ACCOUNT_LOCK = 'auth.account.lock',
  ACCOUNT_UNLOCK = 'auth.account.unlock',
  SUSPICIOUS_ACTIVITY = 'auth.suspicious.activity'
}

/**
 * Login attempt result
  */
export enum LoginResult {
  SUCCESS = 'success',
  INVALID_CREDENTIALS = 'invalid_credentials',
  ACCOUNT_LOCKED = 'account_locked',
  MFA_REQUIRED = 'mfa_required',
  PASSWORD_EXPIRED = 'password_expired',
  RATE_LIMITED = 'rate_limited',
  ACCOUNT_DISABLED = 'account_disabled'
}

/**
 * Authentication context interface
  */
export interface AuthContext {
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: 'email' | 'oauth' | 'sso' | 'api_key';
  provider?: string;
  mfaEnabled?: boolean;
  roles?: string[];
  permissions?: string[];
  loginAttempts?: number;
  lastLoginAt?: Date;
  deviceFingerprint?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  result?: any; // Login result
  granted?: boolean; // Permission granted status
}

/**
 * Specialized authentication logger using CVPlus logging system
  */
export class AuthLogger {
  private readonly logger: ILogger;
  private readonly packageName = '@cvplus/auth';

  constructor() {
    this.logger = LoggerFactory.createLogger(this.packageName, {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFirebase: true
    }) as ILogger;
  }

  /**
   * Log authentication events
    */
  logAuthEvent(eventType: AuthEventType, context: Partial<AuthContext>, details?: any): void {
    const correlationId = getCurrentCorrelationId();
    const auditAction = this.mapEventTypeToAuditAction(eventType);

    const metadata = {
      ...context,
      details,
      correlationId,
      eventType,
      auditAction
    };

    // Log to standard logger
    switch (eventType) {
      case AuthEventType.LOGIN_SUCCESS:
      case AuthEventType.LOGOUT:
      case AuthEventType.TOKEN_REFRESH:
        this.logger.info(`Auth Event: ${eventType}`, metadata);
        break;
      case AuthEventType.LOGIN_FAILURE:
      case AuthEventType.ACCOUNT_LOCK:
      case AuthEventType.SUSPICIOUS_ACTIVITY:
        this.logger.warn(`Security Event: ${eventType}`, metadata);
        break;
      default:
        this.logger.info(`Auth Event: ${eventType}`, metadata);
    }

    // Note: Future enhancement - add to audit trail for security events
    // The globalAuditTrail API needs to be updated to support addEvent method
    // if (auditAction && context.userId) {
    //   globalAuditTrail.addEvent({
    //     userId: context.userId,
    //     action: auditAction,
    //     resourceType: 'authentication',
    //     resourceId: context.sessionId || 'unknown',
    //     metadata: {
    //       eventType,
    //       ...details
    //     },
    //     correlationId
    //   });
    // }
  }

  /**
   * Log login attempts
    */
  logLoginAttempt(userEmail: string, result: LoginResult, context: Partial<AuthContext> = {}): void {
    const eventType = result === LoginResult.SUCCESS ? AuthEventType.LOGIN_SUCCESS : AuthEventType.LOGIN_FAILURE;

    this.logAuthEvent(eventType, {
      ...context,
      userEmail,
      result: result as any // Renamed from loginResult to avoid type error
    });
  }

  /**
   * Log session events
    */
  logSessionEvent(eventType: AuthEventType.SESSION_CREATE | AuthEventType.SESSION_DESTROY, context: Partial<AuthContext>): void {
    this.logAuthEvent(eventType, context);
  }

  /**
   * Log permission checks
    */
  logPermissionCheck(userId: string, permission: string, granted: boolean, context: Partial<AuthContext> = {}): void {
    this.logAuthEvent(AuthEventType.PERMISSION_CHECK, {
      ...context,
      userId,
      permissions: [permission], // Changed to match AuthContext interface
      granted: granted as any // Add granted to metadata
    });
  }

  /**
   * Log suspicious activity
    */
  logSuspiciousActivity(description: string, context: Partial<AuthContext>): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.warn(`Suspicious Activity: ${description}`, {
      ...context,
      correlationId
    });

    // Note: Future enhancement - add to audit trail - need to update API
    // if (context.userId) {
    //   globalAuditTrail.addEvent({
    //     userId: context.userId,
    //     action: AuditAction.ACCESS, // Using available action
    //     resourceType: 'authentication',
    //     resourceId: context.sessionId || 'unknown',
    //     metadata: {
    //       description,
    //       ...context
    //     },
    //     correlationId
    //   });
    // }
  }

  /**
   * Log security events
    */
  logSecurityEvent(message: string, context: Partial<AuthContext> = {}): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.warn(`Security Event: ${message}`, {
      ...context,
      correlationId
    });

    // Note: Future enhancement - add to audit trail - need to update API
    // if (context.userId) {
    //   globalAuditTrail.addEvent({
    //     userId: context.userId,
    //     action: AuditAction.ACCESS,
    //     resourceType: 'authentication',
    //     resourceId: context.sessionId || 'unknown',
    //     metadata: {
    //       message,
    //       ...context
    //     },
    //     correlationId
    //   });
    // }
  }

  /**
   * Log errors with context
    */
  logError(error: Error, context: Partial<AuthContext> = {}): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.error(`Auth Error: ${error.message}`, {
      ...context,
      error: error.stack,
      correlationId
    });
  }

  /**
   * Map authentication event types to audit actions
    */
  private mapEventTypeToAuditAction(eventType: AuthEventType): AuditAction | null {
    // Map to available AuditAction values: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, ACCESS, EXPORT, IMPORT, CONFIGURE
    switch (eventType) {
      case AuthEventType.LOGIN_SUCCESS:
        return AuditAction.LOGIN;
      case AuthEventType.LOGOUT:
        return AuditAction.LOGOUT;
      case AuthEventType.LOGIN_FAILURE:
        return AuditAction.ACCESS; // Map to ACCESS since LOGIN_FAILED doesn't exist
      case AuthEventType.PASSWORD_CHANGE:
        return AuditAction.UPDATE; // Map to UPDATE since PASSWORD_CHANGE doesn't exist
      case AuthEventType.ACCOUNT_LOCK:
      case AuthEventType.ACCOUNT_UNLOCK:
        return AuditAction.UPDATE; // Map to UPDATE since ACCOUNT_LOCK/UNLOCK don't exist
      case AuthEventType.ROLE_ASSIGN:
        return AuditAction.UPDATE; // Map to UPDATE since ROLE_ASSIGNMENT doesn't exist
      case AuthEventType.SUSPICIOUS_ACTIVITY:
        return AuditAction.ACCESS; // Map to ACCESS since SECURITY_VIOLATION doesn't exist
      default:
        return null;
    }
  }
}

// Default auth logger instance
export const authLogger = new AuthLogger();