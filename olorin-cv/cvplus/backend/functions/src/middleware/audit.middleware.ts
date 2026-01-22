/**
 * Audit Logging Middleware
 * Automatically logs security-sensitive operations
 */

import { Request, Response, NextFunction } from 'express';
import { auditService, AuditEventType } from '../services/audit.service';

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    undefined
  );
}

/**
 * Get user agent from request
 */
function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}

/**
 * Middleware to audit all requests
 */
export function auditRequest(eventType: AuditEventType, action?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Capture original end function
    const originalEnd = res.end.bind(res);

    res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
      // Log after response is sent
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      const requestAction = action || `${req.method} ${req.path}`;

      auditService.log({
        eventType,
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        ipAddress,
        userAgent,
        action: requestAction,
        status,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          query: req.query,
          params: req.params,
        },
      }).catch(error => {
        console.error('Failed to log audit event:', error);
      });

      return originalEnd(chunk, encoding, callback);
    };

    next();
  };
}

/**
 * Middleware to audit authentication events
 */
export function auditAuth(eventType: AuditEventType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalEnd = res.end.bind(res);

    res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      const email = req.body?.email || req.user?.email;

      auditService.logAuth(
        eventType,
        req.user?.id,
        email,
        status,
        getClientIP(req),
        getUserAgent(req),
        {
          statusCode: res.statusCode,
        }
      ).catch(error => {
        console.error('Failed to log auth event:', error);
      });

      return originalEnd(chunk, encoding, callback);
    };

    next();
  };
}

/**
 * Middleware to audit data access
 */
export function auditDataAccess(
  eventType: AuditEventType,
  resourceType: string,
  getResourceId?: (req: Request) => string
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    const resourceId = getResourceId ? getResourceId(req) : req.params.id || 'unknown';

    await auditService.logDataAccess(
      eventType,
      req.user.id,
      req.user.email,
      resourceType,
      resourceId,
      `${req.method} ${resourceType}`,
      'success',
      {
        method: req.method,
        path: req.path,
      }
    ).catch(error => {
      console.error('Failed to log data access event:', error);
    });

    next();
  };
}

/**
 * Middleware to audit permission denials
 */
export function auditPermissionDenied(req: Request, res: Response, next: NextFunction): void {
  const originalStatus = res.status.bind(res);

  res.status = function (code: number): Response {
    if (code === 403) {
      auditService.logSecurity(
        AuditEventType.SECURITY_PERMISSION_DENIED,
        req.user?.id,
        req.user?.email,
        `Permission denied: ${req.method} ${req.path}`,
        getClientIP(req),
        getUserAgent(req),
        {
          requiredRole: (res as any).locals?.requiredRole,
          userRole: req.user?.role,
        }
      ).catch(error => {
        console.error('Failed to log permission denied event:', error);
      });
    }

    return originalStatus(code);
  };

  next();
}

/**
 * Middleware to audit rate limit violations
 */
export function auditRateLimit(req: Request, res: Response, next: NextFunction): void {
  const originalStatus = res.status.bind(res);

  res.status = function (code: number): Response {
    if (code === 429) {
      auditService.logSecurity(
        AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED,
        req.user?.id,
        req.user?.email,
        `Rate limit exceeded: ${req.method} ${req.path}`,
        getClientIP(req),
        getUserAgent(req),
        {
          endpoint: req.path,
        }
      ).catch(error => {
        console.error('Failed to log rate limit event:', error);
      });
    }

    return originalStatus(code);
  };

  next();
}

/**
 * Middleware to audit PII access
 */
export function auditPIIAccess(fields: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    const resourceId = req.params.id || req.body?.id || 'unknown';

    await auditService.logPIIAccess(
      AuditEventType.PII_ACCESSED,
      req.user.id,
      req.user.email,
      resourceId,
      fields,
      getClientIP(req)
    ).catch(error => {
      console.error('Failed to log PII access event:', error);
    });

    next();
  };
}

/**
 * Middleware to audit GDPR operations
 */
export function auditGDPR(eventType: AuditEventType, action: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    await auditService.logGDPR(
      eventType,
      req.user.id,
      req.user.email,
      action,
      {
        requestedAt: new Date(),
        ipAddress: getClientIP(req),
      }
    ).catch(error => {
      console.error('Failed to log GDPR event:', error);
    });

    next();
  };
}
