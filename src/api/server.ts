/**
 * Recovery API Server
 * Express server setup for the Level 2 module recovery system
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createRecoveryRouter } from './routes/recovery';
import { checkServiceHealth } from '../services';

export interface ServerOptions {
  workspacePath: string;
  port?: number;
  host?: string;
  enableCors?: boolean;
  enableSecurity?: boolean;
  enableCompression?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class RecoveryAPIServer {
  private app: Application;
  private workspacePath: string;
  private port: number;
  private host: string;
  private server: any;

  constructor(options: ServerOptions) {
    this.app = express();
    this.workspacePath = options.workspacePath;
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';

    this.setupMiddleware(options);
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(options: ServerOptions): void {
    // Security middleware
    if (options.enableSecurity !== false) {
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        crossOriginEmbedderPolicy: false
      }));
    }

    // CORS middleware
    if (options.enableCors !== false) {
      this.app.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-ID']
      }));
    }

    // Compression middleware
    if (options.enableCompression !== false) {
      this.app.use(compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        }
      }));
    }

    // Body parsing middleware
    this.app.use(express.json({
      limit: '10mb',
      strict: true,
      type: ['application/json']
    }));

    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb',
      parameterLimit: 1000
    }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add request ID to request and response
      (req as any).requestId = requestId;
      res.setHeader('X-Request-ID', requestId);

      if (options.logLevel !== 'error') {
        console.log(`[${new Date().toISOString()}] ${requestId} ${req.method} ${req.url} - ${req.ip}`);
      }

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        if (!options.logLevel || ['debug', 'info'].includes(options.logLevel) ||
            (options.logLevel === 'warn' && logLevel !== 'info') ||
            (options.logLevel === 'error' && logLevel === 'error')) {
          console.log(`[${new Date().toISOString()}] ${requestId} ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        }
      });

      next();
    });

    // Health check middleware (runs before all other routes)
    this.app.use('/health', async (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && req.url === '/') {
        try {
          const serviceHealth = await checkServiceHealth(this.workspacePath);

          const response = {
            status: serviceHealth.overall ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            workspacePath: this.workspacePath,
            services: serviceHealth,
            uptime: process.uptime(),
            memory: {
              used: process.memoryUsage().heapUsed,
              total: process.memoryUsage().heapTotal,
              external: process.memoryUsage().external,
              rss: process.memoryUsage().rss
            },
            environment: {
              nodeVersion: process.version,
              platform: process.platform,
              arch: process.arch
            }
          };

          res.status(serviceHealth.overall ? 200 : 503).json(response);
          return;
        } catch (error) {
          res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Health check failed'
          });
          return;
        }
      }

      next();
    });
  }

  private setupRoutes(): void {
    // API versioning
    const apiV1 = '/api/v1';
    const apiCurrent = '/api/recovery';

    // Mount recovery routes
    const recoveryRouter = createRecoveryRouter(this.workspacePath);
    this.app.use(apiV1 + '/recovery', recoveryRouter);
    this.app.use(apiCurrent, recoveryRouter);

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'CVPlus Recovery API',
        version: '1.0.0',
        description: 'API for Level 2 module recovery operations',
        workspace: this.workspacePath,
        endpoints: {
          current: apiCurrent,
          v1: apiV1 + '/recovery',
          health: '/health',
          docs: '/docs'
        },
        timestamp: new Date().toISOString()
      });
    });

    // API documentation route
    this.app.get('/docs', (req: Request, res: Response) => {
      res.json({
        openapi: '3.0.3',
        info: {
          title: 'CVPlus Recovery API',
          version: '1.0.0',
          description: 'API for managing Level 2 module recovery operations'
        },
        servers: [
          {
            url: `http://${this.host}:${this.port}${apiCurrent}`,
            description: 'Recovery API Server'
          }
        ],
        paths: {
          '/modules': {
            get: {
              summary: 'Get all module states',
              responses: {
                '200': { description: 'Success' }
              }
            }
          },
          '/modules/{moduleId}': {
            get: {
              summary: 'Get specific module state',
              parameters: [
                {
                  name: 'moduleId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                }
              ]
            },
            put: {
              summary: 'Update module state',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['healthy', 'critical', 'recovering', 'recovered', 'failed'] },
                        notes: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          '/phases': {
            get: {
              summary: 'Get all recovery phases'
            }
          },
          '/phases/{phaseId}': {
            post: {
              summary: 'Execute recovery phase',
              parameters: [
                {
                  name: 'phaseId',
                  in: 'path',
                  required: true,
                  schema: { type: 'integer', minimum: 1, maximum: 5 }
                }
              ]
            }
          }
        }
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      const requestId = (req as any).requestId || 'unknown';

      console.error(`[${new Date().toISOString()}] ${requestId} Global error handler:`, {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body
      });

      // Don't expose internal errors in production
      const isDevelopment = process.env.NODE_ENV === 'development';

      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: {
          requestId,
          timestamp: new Date().toISOString(),
          ...(isDevelopment && {
            error: error.message,
            stack: error.stack
          })
        }
      });
    });

    // 404 handler for unmatched routes
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.url} not found`,
        details: {
          method: req.method,
          url: req.url,
          timestamp: new Date().toISOString(),
          availableRoutes: [
            'GET /',
            'GET /health',
            'GET /docs',
            'GET /api/recovery/modules',
            'GET /api/recovery/phases'
          ]
        }
      });
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          console.log(`[${new Date().toISOString()}] CVPlus Recovery API Server started`);
          console.log(`[${new Date().toISOString()}] Listening on http://${this.host}:${this.port}`);
          console.log(`[${new Date().toISOString()}] Workspace: ${this.workspacePath}`);
          console.log(`[${new Date().toISOString()}] API Endpoint: http://${this.host}:${this.port}/api/recovery`);
          console.log(`[${new Date().toISOString()}] Health Check: http://${this.host}:${this.port}/health`);
          console.log(`[${new Date().toISOString()}] Documentation: http://${this.host}:${this.port}/docs`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error(`[${new Date().toISOString()}] Server error:`, error);
          reject(error);
        });

        // Graceful shutdown handlers
        process.on('SIGTERM', () => this.shutdown('SIGTERM'));
        process.on('SIGINT', () => this.shutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
          console.error(`[${new Date().toISOString()}] Uncaught exception:`, error);
          this.shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
          console.error(`[${new Date().toISOString()}] Unhandled rejection at:`, promise, 'reason:', reason);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        console.log(`[${new Date().toISOString()}] Stopping CVPlus Recovery API Server...`);
        this.server.close(() => {
          console.log(`[${new Date().toISOString()}] Server stopped`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async shutdown(signal: string): Promise<void> {
    console.log(`[${new Date().toISOString()}] Received ${signal}. Starting graceful shutdown...`);

    try {
      await this.stop();
      console.log(`[${new Date().toISOString()}] Graceful shutdown completed`);
      process.exit(0);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error during shutdown:`, error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }

  public getServerInfo(): {
    host: string;
    port: number;
    workspacePath: string;
    baseUrl: string;
    apiUrl: string;
    healthUrl: string;
    docsUrl: string;
  } {
    return {
      host: this.host,
      port: this.port,
      workspacePath: this.workspacePath,
      baseUrl: `http://${this.host}:${this.port}`,
      apiUrl: `http://${this.host}:${this.port}/api/recovery`,
      healthUrl: `http://${this.host}:${this.port}/health`,
      docsUrl: `http://${this.host}:${this.port}/docs`
    };
  }
}

// Utility function to create and start server
export const createRecoveryServer = async (options: ServerOptions): Promise<RecoveryAPIServer> => {
  const server = new RecoveryAPIServer(options);
  await server.start();
  return server;
};

export default RecoveryAPIServer;