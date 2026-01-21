import { Request, Response, NextFunction } from 'express';
import { logger } from 'firebase-functions';

/**
 * Security Headers Middleware
 * 
 * Implements comprehensive security headers to protect against common
 * web vulnerabilities and enhance overall security posture.
 */

export interface SecurityHeadersOptions {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN';
  contentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  crossOriginEmbedderPolicy?: 'require-corp' | 'unsafe-none';
  crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';
}

/**
 * Default security headers configuration
 */
const defaultSecurityConfig: Required<SecurityHeadersOptions> = {
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.openai.com https://api.anthropic.com https://*.googleapis.com https://*.firebase.googleapis.com wss://*.firebase.googleapis.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  strictTransportSecurity: true,
  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'payment=()',
    'usb=()'
  ].join(', '),
  crossOriginEmbedderPolicy: 'unsafe-none', // Allow for API integrations
  crossOriginOpenerPolicy: 'same-origin-allow-popups', // Allow for OAuth popups
  crossOriginResourcePolicy: 'cross-origin' // Allow for API calls
};

/**
 * Security headers middleware with customizable configuration
 */
export function securityHeaders(options: SecurityHeadersOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const config = { ...defaultSecurityConfig, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Content Security Policy
      res.setHeader('Content-Security-Policy', config.contentSecurityPolicy);
      
      // Strict Transport Security (HTTPS enforcement)
      if (config.strictTransportSecurity) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }

      // X-Frame-Options (clickjacking protection)
      res.setHeader('X-Frame-Options', config.frameOptions);

      // X-Content-Type-Options (MIME type sniffing protection)
      if (config.contentTypeOptions) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      // Referrer Policy
      res.setHeader('Referrer-Policy', config.referrerPolicy);

      // Permissions Policy (feature access control)
      res.setHeader('Permissions-Policy', config.permissionsPolicy);

      // Cross-Origin Embedder Policy
      res.setHeader('Cross-Origin-Embedder-Policy', config.crossOriginEmbedderPolicy);

      // Cross-Origin Opener Policy
      res.setHeader('Cross-Origin-Opener-Policy', config.crossOriginOpenerPolicy);

      // Cross-Origin Resource Policy
      res.setHeader('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy);

      // X-XSS-Protection (legacy browsers)
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Remove server identification headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Cache control for sensitive endpoints
      if (req.path.includes('/api/premium') || req.path.includes('/api/admin')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // Security event logging for suspicious requests
      if (isSuspiciousRequest(req)) {
        logSuspiciousRequest(req);
      }

      next();

    } catch (error) {
      logger.error('Error applying security headers:', error);
      // Continue processing even if security headers fail
      // Don't block requests due to header issues
      next();
    }
  };
}

/**
 * Detect suspicious request patterns
 */
function isSuspiciousRequest(req: Request): boolean {
  const url = req.url.toLowerCase();
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  // Referer header available for future validation if needed
  // const referer = (req.headers['referer'] || '').toLowerCase();

  // Suspicious URL patterns
  const suspiciousUrlPatterns = [
    /\.\./,                     // Path traversal
    /<script/,                  // XSS attempts
    /javascript:/,              // JavaScript injection
    /vbscript:/,                // VBScript injection
    /onload=/,                  // Event handler injection
    /onerror=/,                 // Event handler injection
    /onclick=/,                 // Event handler injection
    /union.*select/,            // SQL injection
    /exec\s*\(/,                // Code execution
    /eval\s*\(/,                // Code evaluation
    /base64/,                   // Encoded payloads
    /\/etc\/passwd/,            // System file access
    /\/proc\//,                 // System process access
    /\.php$/,                   // PHP file access attempts
    /\.asp$/,                   // ASP file access attempts
    /\.jsp$/,                   // JSP file access attempts
    /admin/,                    // Admin panel probing
    /wp-admin/,                 // WordPress admin
    /phpmyadmin/,               // Database admin
    /\.git/,                    // Git repository access
    /\.env/,                    // Environment file access
    /swagger/,                  // API documentation access
    /api\/v\d+\/docs/           // API docs enumeration
  ];

  // Suspicious User-Agent patterns
  const suspiciousUserAgentPatterns = [
    /bot/,
    /crawler/,
    /spider/,
    /scraper/,
    /curl/,
    /wget/,
    /python/,
    /php/,
    /perl/,
    /java/,
    /^$/,                       // Empty user agent
    /scanner/,
    /exploit/,
    /injection/
  ];

  // Check URL patterns
  const hasSuspiciousUrl = suspiciousUrlPatterns.some(pattern => pattern.test(url));
  
  // Check User-Agent patterns
  const hasSuspiciousUserAgent = suspiciousUserAgentPatterns.some(pattern => pattern.test(userAgent));

  // Check for suspicious headers
  const hasSuspiciousHeaders = (
    req.headers['x-forwarded-for']?.includes('127.0.0.1') ||
    req.headers['x-real-ip']?.includes('localhost') ||
    req.headers['x-injection'] !== undefined ||
    req.headers['x-exploit'] !== undefined
  );

  // Check for unusual request methods
  const unusualMethods = ['TRACE', 'TRACK', 'DEBUG', 'OPTIONS'];
  const hasUnusualMethod = unusualMethods.includes(req.method.toUpperCase());

  return hasSuspiciousUrl || hasSuspiciousUserAgent || hasSuspiciousHeaders || hasUnusualMethod;
}

/**
 * Log suspicious request details
 */
function logSuspiciousRequest(req: Request): void {
  const suspiciousRequestDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: {
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
      origin: req.headers['origin'],
      xForwardedFor: req.headers['x-forwarded-for'],
      xRealIp: req.headers['x-real-ip'],
      authorization: req.headers['authorization'] ? '[REDACTED]' : undefined
    },
    ip: req.ip,
    body: req.method === 'POST' ? '[SANITIZED]' : undefined
  };

  logger.warn('SUSPICIOUS_REQUEST_DETECTED', {
    event: 'SUSPICIOUS_REQUEST',
    severity: 'MEDIUM',
    details: suspiciousRequestDetails
  });

  // In production, also send to security monitoring
  if (process.env.NODE_ENV === 'production') {
    console.log('SECURITY_MONITOR_SUSPICIOUS_REQUEST', JSON.stringify(suspiciousRequestDetails));
  }
}

/**
 * High-security headers for admin endpoints
 */
export const adminSecurityHeaders = securityHeaders({
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  frameOptions: 'DENY',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin'
});

/**
 * API-specific security headers
 */
export const apiSecurityHeaders = securityHeaders({
  contentSecurityPolicy: "default-src 'none'",
  frameOptions: 'DENY',
  crossOriginResourcePolicy: 'cross-origin'
});

/**
 * Public content security headers (more permissive)
 */
export const publicContentSecurityHeaders = securityHeaders({
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https:",
    "media-src 'self' blob: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ].join('; '),
  frameOptions: 'SAMEORIGIN',
  crossOriginResourcePolicy: 'cross-origin'
});

export default securityHeaders;