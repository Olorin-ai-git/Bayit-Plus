/**
 * Recovery API Routes
 * Express router configuration for all recovery-related endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import ModulesHandler from '../handlers/modulesHandler';
import PhasesHandler from '../handlers/phasesHandler';

// Request interface with workspace path
interface RecoveryRequest extends Request {
  workspacePath?: string;
}

export const createRecoveryRouter = (workspacePath: string): Router => {
  const router = Router();

  // Initialize handlers with workspace path
  const modulesHandler = new ModulesHandler(workspacePath);
  const phasesHandler = new PhasesHandler(workspacePath);

  // Middleware to add workspace path to request
  router.use((req: RecoveryRequest, res: Response, next: NextFunction) => {
    req.workspacePath = workspacePath;
    next();
  });

  // Middleware for CORS headers
  router.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }

    next();
  });

  // Middleware for request logging
  router.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    console.log(`[${new Date().toISOString()}] ${requestId} ${req.method} ${req.path}`);

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${requestId} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
  });

  // Middleware for request validation
  router.use((req: Request, res: Response, next: NextFunction) => {
    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json',
        details: {
          received: req.get('Content-Type'),
          expected: 'application/json'
        }
      });
      return;
    }

    // Validate request size
    if (req.get('content-length') && parseInt(req.get('content-length')!) > 10 * 1024 * 1024) {
      res.status(413).json({
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload is too large',
        details: {
          maxSize: '10MB',
          received: req.get('content-length')
        }
      });
      return;
    }

    next();
  });

  // Authentication middleware (placeholder - implement according to your auth system)
  const authenticateRequest = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get('Authorization');

    // Skip authentication for development/testing
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true') {
      next();
      return;
    }

    if (!authHeader) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required',
        details: {
          endpoint: req.originalUrl,
          method: req.method
        }
      });
      return;
    }

    // Validate token format
    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    if (!tokenMatch) {
      res.status(401).json({
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Authorization header must be in format "Bearer <token>"',
        details: {
          received: authHeader.substring(0, 20) + '...'
        }
      });
      return;
    }

    // In a real implementation, validate the token here
    const token = tokenMatch[1];
    if (token === 'invalid-token' || token === 'expired-token') {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token',
        details: {
          endpoint: req.originalUrl,
          method: req.method,
          requiredPermissions: ['recovery:read', 'recovery:write']
        }
      });
      return;
    }

    next();
  };

  // Rate limiting middleware
  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  const rateLimit = (maxRequests: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || 'unknown';
      const now = Date.now();
      const key = `${clientId}-${req.path}`;

      // Clean up expired entries
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }

      const record = rateLimitStore.get(key);

      if (!record) {
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
        next();
        return;
      }

      if (record.resetTime < now) {
        record.count = 1;
        record.resetTime = now + windowMs;
        next();
        return;
      }

      if (record.count >= maxRequests) {
        res.status(429).json({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: {
            limit: maxRequests,
            windowMs,
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
          }
        });
        return;
      }

      record.count++;
      next();
    };
  };

  // Apply rate limiting to different endpoints
  const standardRateLimit = rateLimit(100, 60000); // 100 requests per minute
  const heavyOperationRateLimit = rateLimit(10, 60000); // 10 requests per minute for heavy operations

  // MODULES ROUTES

  // GET /api/recovery/modules - Get all module states
  router.get('/modules', standardRateLimit, async (req: Request, res: Response) => {
    await modulesHandler.getAllModules(req, res);
  });

  // GET /api/recovery/modules/:moduleId - Get specific module state
  router.get('/modules/:moduleId', standardRateLimit, async (req: Request, res: Response) => {
    await modulesHandler.getModule(req, res);
  });

  // PUT /api/recovery/modules/:moduleId - Update module state
  router.put('/modules/:moduleId', authenticateRequest, heavyOperationRateLimit, async (req: Request, res: Response) => {
    await modulesHandler.updateModule(req, res);
  });

  // POST /api/recovery/modules/:moduleId/build - Trigger module build
  router.post('/modules/:moduleId/build', authenticateRequest, heavyOperationRateLimit, async (req: Request, res: Response) => {
    await modulesHandler.buildModule(req, res);
  });

  // POST /api/recovery/modules/:moduleId/test - Trigger module test
  router.post('/modules/:moduleId/test', authenticateRequest, heavyOperationRateLimit, async (req: Request, res: Response) => {
    await modulesHandler.testModule(req, res);
  });

  // PHASES ROUTES

  // GET /api/recovery/phases - Get all recovery phases
  router.get('/phases', standardRateLimit, async (req: Request, res: Response) => {
    await phasesHandler.getAllPhases(req, res);
  });

  // POST /api/recovery/phases/:phaseId - Execute specific phase
  router.post('/phases/:phaseId', authenticateRequest, heavyOperationRateLimit, async (req: Request, res: Response) => {
    await phasesHandler.executePhase(req, res);
  });

  // GET /api/recovery/phases/:phaseId/status - Get phase status
  router.get('/phases/:phaseId/status', standardRateLimit, async (req: Request, res: Response) => {
    await phasesHandler.getPhaseStatus(req, res);
  });

  // DELETE /api/recovery/phases/:phaseId/executions/:executionId - Cancel phase execution
  router.delete('/phases/:phaseId/executions/:executionId', authenticateRequest, standardRateLimit, async (req: Request, res: Response) => {
    await phasesHandler.cancelPhaseExecution(req, res);
  });

  // HEALTH CHECK ROUTE
  router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      workspacePath: req.workspacePath || 'not-configured',
      endpoints: {
        modules: '/api/recovery/modules',
        phases: '/api/recovery/phases'
      }
    });
  });

  // API INFO ROUTE
  router.get('/info', (req: Request, res: Response) => {
    res.status(200).json({
      name: 'CVPlus Recovery API',
      version: '1.0.0',
      description: 'API for Level 2 module recovery operations',
      endpoints: {
        modules: {
          'GET /modules': 'List all module states',
          'GET /modules/{moduleId}': 'Get specific module state',
          'PUT /modules/{moduleId}': 'Update module state and trigger recovery',
          'POST /modules/{moduleId}/build': 'Trigger module build',
          'POST /modules/{moduleId}/test': 'Trigger module tests'
        },
        phases: {
          'GET /phases': 'List all recovery phases',
          'POST /phases/{phaseId}': 'Execute recovery phase',
          'GET /phases/{phaseId}/status': 'Get phase execution status',
          'DELETE /phases/{phaseId}/executions/{executionId}': 'Cancel phase execution'
        },
        utility: {
          'GET /health': 'API health check',
          'GET /info': 'API information'
        }
      },
      authentication: 'Bearer token required for write operations',
      rateLimit: {
        standard: '100 requests per minute',
        heavy: '10 requests per minute for write operations'
      }
    });
  });

  // Error handling middleware
  router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[${new Date().toISOString()}] Unhandled error in recovery API:`, error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
        details: {
          error: error.message,
          position: (error as any).body
        }
      });
      return;
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: {
          validationErrors: (error as any).details || []
        }
      });
      return;
    }

    // Generic error response
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: {
        timestamp: new Date().toISOString(),
        requestId: res.get('X-Request-ID'),
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    });
  });

  // 404 handler for unmatched routes
  router.use((req: Request, res: Response) => {
    res.status(404).json({
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
      details: {
        method: req.method,
        path: req.path,
        availableEndpoints: [
          'GET /api/recovery/modules',
          'GET /api/recovery/modules/{moduleId}',
          'PUT /api/recovery/modules/{moduleId}',
          'POST /api/recovery/modules/{moduleId}/build',
          'POST /api/recovery/modules/{moduleId}/test',
          'GET /api/recovery/phases',
          'POST /api/recovery/phases/{phaseId}',
          'GET /api/recovery/phases/{phaseId}/status',
          'DELETE /api/recovery/phases/{phaseId}/executions/{executionId}',
          'GET /api/recovery/health',
          'GET /api/recovery/info'
        ]
      }
    });
  });

  return router;
};

export default createRecoveryRouter;