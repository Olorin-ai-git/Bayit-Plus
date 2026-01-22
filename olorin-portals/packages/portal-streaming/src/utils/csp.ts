/**
 * Content Security Policy configuration
 */

export const generateCSP = (): string => {
  const isDev = process.env.NODE_ENV === 'development';

  return [
    "default-src 'self'",
    `media-src 'self' https://*.cloudfront.net https://*.gcs.googleapis.com ${isDev ? 'http://localhost:*' : ''}`,
    `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : "'nonce-{NONCE}'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.olorin.ai",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');
};
