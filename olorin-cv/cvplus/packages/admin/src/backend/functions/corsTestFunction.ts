/**
 * CORS Test Functions
 * 
 * Administrative functions for testing CORS configuration.
 * Includes both onRequest and onCall function types for comprehensive testing.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { onRequest, onCall } from 'firebase-functions/v2/https';

// CORS configuration for admin functions
const requestCorsOptions = {
  cors: true
};

const corsOptions = {
  cors: true
};

export const testCors = onRequest(
  {
    timeoutSeconds: 30,
    memory: '128MiB',
    ...requestCorsOptions,
  },
  async (req, res) => {
    // Set CORS headers explicitly for admin testing
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    res.json({ 
      success: true, 
      message: 'CORS test successful (onRequest)',
      origin: req.headers.origin,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
);

export const testCorsCall = onCall(
  {
    timeoutSeconds: 30,
    memory: '128MiB',
    ...corsOptions,
  },
  async (request) => {
    return {
      success: true,
      message: 'CORS test successful (onCall)',
      timestamp: new Date().toISOString(),
      auth: !!request.auth
    };
  }
);