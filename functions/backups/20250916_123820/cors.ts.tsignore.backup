// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// CORS configuration for all allowed origins - Firebase v2 compatible with explicit types
const allowedOrigins: (string | RegExp)[] = [
  'https://getmycv-ai.firebaseapp.com',
  'https://getmycv-ai.web.app',
  'https://cvplus.firebaseapp.com',
  'https://cvplus.web.app',
  'https://cvplus.ai',
  'https://www.cvplus.ai',
  'http://localhost:3000', // React dev server (port 3000)
  'http://localhost:3001', // React dev server (port 3001)
  'http://localhost:3002', // React dev server (port 3002)
  'http://localhost:5173', // Vite dev server
  'http://localhost:5174', // Vite dev server (alt port)
  'http://localhost:5000', // Firebase emulator
  'http://localhost:5001', // Firebase Functions emulator
  'http://localhost:8080', // Firebase Hosting emulator
  'http://localhost:9000', // Firebase emulator suite UI
  'http://localhost:7860', // Gradio dev server
  'http://127.0.0.1:3000', // React dev server (127.0.0.1)
  'http://127.0.0.1:5000', // Firebase emulator (127.0.0.1)
  'http://127.0.0.1:5001', // Firebase Functions emulator (127.0.0.1)
  // HuggingFace Spaces domains for portal chat - SECURE: Specific origins only
  'https://huggingface.co',
  // SECURITY FIX: Replace wildcards with specific trusted origins
  // 'https://your-specific-app.hf.space', // Add specific HF Space URLs only when needed
  // 'https://your-gradio-app.gradio.app', // Add specific Gradio URLs only when needed
  // NO wildcard patterns - they create security vulnerabilities
];

// Firebase Functions v2 CORS options for onCall functions
export const corsOptions: { cors: (string | RegExp)[] } = {
  cors: allowedOrigins
};

// Firebase Functions v2 CORS options for onRequest functions
export const requestCorsOptions: { cors: (string | RegExp)[] } = {
  cors: allowedOrigins
};

// For v2 functions that need simple cors with explicit typing (less secure, use sparingly)
export const simpleCorsOptions: { cors: boolean } = {
  cors: true
};

// Enhanced CORS options - Firebase v2 compatible with explicit typing
export const enhancedCorsOptions: { cors: (string | RegExp)[] } = {
  cors: allowedOrigins
};

// Strict CORS options for production endpoints
export const strictCorsOptions: { cors: (string | RegExp)[] } = {
  cors: [
    'https://getmycv-ai.firebaseapp.com',
    'https://getmycv-ai.web.app',
    'https://cvplus.firebaseapp.com',
    'https://cvplus.web.app',
    'https://cvplus.ai',
    'https://www.cvplus.ai'
  ]
};

// Utility function to add CORS headers manually if needed
export function addCorsHeaders(response: any, origin?: string): void {
  if (!origin) {
    throw new Error('Origin is required');
  }
  
  // SECURITY FIX: Proper origin validation for string and RegExp types
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return allowedOrigin === origin;
    } else if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return false;
  });
  
  if (!isAllowed) {
    throw new Error(`Origin not allowed: ${origin}`);
  }
  
  response.set({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Firebase-Instance-ID-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  });
}

// Express-style CORS middleware for onRequest functions
export function corsMiddleware(req: any, res: any, next?: () => void): void {
  const origin = req.headers.origin;
  
  if (origin) {
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Firebase-Instance-ID-Token',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      });
    } else {
    }
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (next) {
    next();
  }
}

// Helper function to validate origin
export function isOriginAllowed(origin: string): boolean {
  return allowedOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return allowedOrigin === origin;
    } else if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return false;
  });
}