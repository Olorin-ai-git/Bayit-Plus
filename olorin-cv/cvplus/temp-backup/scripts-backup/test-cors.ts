/**
 * CORS Testing Script for CVPlus Firebase Functions
 * 
 * This script tests CORS configuration for both onCall and onRequest functions
 * to ensure proper frontend communication.
 * 
 * @author Gil Klainert
 * @created 2025-08-22
 */

import { onRequest, onCall } from 'firebase-functions/v2/https';
import { requestCorsOptions, corsOptions, corsMiddleware, isOriginAllowed } from '../config/cors';

/**
 * Test CORS for onRequest functions (HTTP endpoints)
 */
export const testCorsHTTP = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    ...requestCorsOptions
  },
  async (request, response) => {
    // Apply CORS middleware
    corsMiddleware(request, response);
    
    const origin = request.headers.origin || 'unknown';
    const method = request.method;
    const userAgent = request.headers['user-agent'] || 'unknown';
    
    
    const testResults = {
      success: true,
      timestamp: new Date().toISOString(),
      test_type: 'HTTP (onRequest)',
      origin: origin,
      method: method,
      user_agent: userAgent,
      origin_allowed: isOriginAllowed(origin),
      headers_received: {
        'content-type': request.headers['content-type'],
        'authorization': request.headers.authorization ? 'present' : 'missing',
        'cache-control': request.headers['cache-control']
      },
      cors_headers_set: {
        'access-control-allow-origin': response.get('Access-Control-Allow-Origin'),
        'access-control-allow-methods': response.get('Access-Control-Allow-Methods'),
        'access-control-allow-headers': response.get('Access-Control-Allow-Headers'),
        'access-control-allow-credentials': response.get('Access-Control-Allow-Credentials')
      }
    };
    
    response.json(testResults);
  }
);

/**
 * Test CORS for onCall functions (Firebase Callable)
 */
export const testCorsCallable = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    ...corsOptions
  },
  async (request) => {
    const testResults = {
      success: true,
      timestamp: new Date().toISOString(),
      test_type: 'Callable (onCall)',
      auth_present: !!request.auth,
      user_id: request.auth?.uid || null,
      request_data: request.data,
      rawRequest: {
        instanceIdToken: request.instanceIdToken || 'missing',
        app: request.app || 'missing'
      }
    };
    
    
    return testResults;
  }
);

/**
 * Comprehensive CORS validation function for debugging
 */
export const validateCorsConfiguration = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    ...requestCorsOptions
  },
  async (request, response) => {
    corsMiddleware(request, response);
    
    const origin = request.headers.origin || '';
    
    const validation = {
      timestamp: new Date().toISOString(),
      request_details: {
        method: request.method,
        origin: origin,
        headers: {
          'user-agent': request.headers['user-agent'],
          'content-type': request.headers['content-type'],
          'referer': request.headers.referer,
          'host': request.headers.host
        }
      },
      cors_validation: {
        origin_provided: !!origin,
        origin_allowed: origin ? isOriginAllowed(origin) : false,
        is_localhost: origin.includes('localhost') || origin.includes('127.0.0.1'),
        is_production: origin.includes('cvplus') || origin.includes('getmycv-ai'),
        is_development: origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')
      },
      response_headers: {
        'access-control-allow-origin': response.get('Access-Control-Allow-Origin'),
        'access-control-allow-methods': response.get('Access-Control-Allow-Methods'),
        'access-control-allow-headers': response.get('Access-Control-Allow-Headers'),
        'access-control-allow-credentials': response.get('Access-Control-Allow-Credentials'),
        'access-control-max-age': response.get('Access-Control-Max-Age')
      },
      recommendations: []
    };
    
    // Add recommendations based on validation
    if (!validation.cors_validation.origin_provided) {
      validation.recommendations.push('No Origin header provided - this may indicate a direct request rather than browser CORS request');
    }
    
    if (!validation.cors_validation.origin_allowed && validation.cors_validation.origin_provided) {
      validation.recommendations.push(`Origin ${origin} is not in the allowed list - add it to corsOptions in src/config/cors.ts`);
    }
    
    if (validation.cors_validation.is_localhost) {
      validation.recommendations.push('Development environment detected - ensure production origins are also configured');
    }
    
    
    response.json(validation);
  }
);