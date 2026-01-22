/**
 * Security Headers Middleware
 * Implements OWASP security headers: CSP, HSTS, X-Frame-Options, etc.
 */

import { Request, Response, NextFunction } from 'express';
import * as helmet from 'helmet';
import { getConfig } from '../config/schema';

/**
 * Apply security headers using Helmet
 */
export function securityHeaders() {
  const config = getConfig();
  const isProduction = config.app.env === 'production';

  return helmet.default({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for React
          "'unsafe-eval'", // Required for development
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for styled-components
          'https://fonts.googleapis.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
          'blob:',
          'https://storage.googleapis.com',
        ],
        connectSrc: [
          "'self'",
          'https://api.olorin.ai',
          'https://www.google-analytics.com',
          'wss://api.olorin.ai',
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
      ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny', // Prevent clickjacking
    },

    // X-Content-Type-Options
    noSniff: true, // Prevent MIME type sniffing

    // X-XSS-Protection
    xssFilter: true,

    // Referrer-Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false,
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,
  });
}

/**
 * CORS middleware with strict origin validation
 */
export function corsHeaders(req: Request, res: Response, next: NextFunction): void {
  const config = getConfig();
  const origin = req.headers.origin;

  // Allowed origins
  const allowedOrigins = [
    config.app.baseUrl,
    'https://cvplus.olorin.ai',
    'https://olorin.ai',
  ];

  // Add development origins in non-production
  if (config.app.env !== 'production') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

/**
 * Custom security headers
 */
export function customSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // X-Content-Security-Policy (legacy)
  res.setHeader('X-Content-Security-Policy', "default-src 'self'");

  // X-WebKit-CSP (legacy)
  res.setHeader('X-WebKit-CSP', "default-src 'self'");

  // Expect-CT (Certificate Transparency)
  res.setHeader('Expect-CT', 'max-age=86400, enforce');

  // Cross-Origin-Embedder-Policy
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // Cross-Origin-Opener-Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin-Resource-Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  next();
}

/**
 * Remove sensitive headers from responses
 */
export function removeSensitiveHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Remove headers that leak server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  res.removeHeader('X-AspNet-Version');
  res.removeHeader('X-AspNetMvc-Version');

  next();
}

/**
 * Cache control headers
 */
export function cacheControl(maxAge: number = 0, privacy: 'public' | 'private' = 'private') {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (maxAge === 0) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      res.setHeader('Cache-Control', `${privacy}, max-age=${maxAge}`);
    }

    next();
  };
}

/**
 * Apply all security headers
 */
export function applyAllSecurityHeaders() {
  return [
    securityHeaders(),
    corsHeaders,
    customSecurityHeaders,
    removeSensitiveHeaders,
    cacheControl(0, 'private'), // No cache by default
  ];
}
