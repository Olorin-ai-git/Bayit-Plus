/**
 * CORS Configuration
 *
 * Cross-Origin Resource Sharing configuration for CVPlus Admin module.
 * Handles CORS settings for admin API endpoints with appropriate security controls.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

// CORS options interface
export interface CorsOptions {
  origin: string[] | string | boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

// Default CORS configuration for admin endpoints
export const adminCorsOptions: CorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://cvplus.app',
        'https://admin.cvplus.app',
        'https://www.cvplus.app'
      ]
    : [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Admin-Token',
    'X-Request-ID',
    'X-Client-Version'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Strict CORS configuration for sensitive admin operations
export const strictAdminCorsOptions: CorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://admin.cvplus.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Admin-Token',
    'X-Request-ID'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Helper function to get appropriate CORS options based on endpoint
export function getCorsOptions(endpoint: 'admin' | 'strict'): CorsOptions {
  switch (endpoint) {
    case 'strict':
      return strictAdminCorsOptions;
    case 'admin':
    default:
      return adminCorsOptions;
  }
}

export default adminCorsOptions;