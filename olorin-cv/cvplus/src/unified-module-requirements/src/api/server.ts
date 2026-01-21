import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
// Removed proxy middleware import
import { getUnifiedModuleRequirementsService } from '../lib/index';
import { validationRoutes } from './routes/validation';
import { templateRoutes } from './routes/templates';
import { architectureRoutes } from './routes/architecture';
import { reportingRoutes } from './routes/reporting';
import { healthRoutes } from './routes/health';

export class ModuleRequirementsServer {
  private app: express.Application;
  private server: any;
  private service = getUnifiedModuleRequirementsService();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // Health check endpoint (no rate limiting)
    this.app.use('/health', healthRoutes);
  }

  private setupRoutes(): void {
    // API versioning
    const apiV1 = express.Router();

    // Mount route modules
    apiV1.use('/validation', validationRoutes);
    apiV1.use('/templates', templateRoutes);
    apiV1.use('/architecture', architectureRoutes);
    apiV1.use('/reporting', reportingRoutes);

    // Mount API version
    this.app.use('/api/v1', apiV1);

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'CVPlus Module Requirements API',
        version: '1.0.0',
        description: 'REST API for CVPlus module validation, analysis, and management',
        endpoints: {
          validation: '/api/v1/validation',
          templates: '/api/v1/templates',
          architecture: '/api/v1/architecture',
          reporting: '/api/v1/reporting',
          health: '/health'
        },
        documentation: '/api/docs',
        status: 'operational'
      });
    });

    // Serve static documentation if available
    this.app.use('/api/docs', express.static('docs', {
      index: 'index.html',
      fallthrough: true
    }));

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        message: `The endpoint ${req.method} ${req.path} does not exist`,
        availableEndpoints: [
          'GET /api',
          'GET /health',
          'POST /api/v1/validation/module',
          'POST /api/v1/validation/batch',
          'GET /api/v1/templates',
          'POST /api/v1/templates/generate',
          'POST /api/v1/architecture/analyze',
          'POST /api/v1/reporting/generate'
        ]
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';

      res.status(error.status || 500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: error.stack }),
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      this.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown(1);
    });
  }

  public async start(port: number = parseInt(process.env.PORT || '3001')): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`🚀 CVPlus Module Requirements API Server running on port ${port}`);
          console.log(`📚 API Documentation: http://localhost:${port}/api`);
          console.log(`❤️  Health Check: http://localhost:${port}/health`);
          console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${port} is already in use`);
            reject(new Error(`Port ${port} is already in use`));
          } else {
            console.error('❌ Server error:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('❌ Failed to start server:', error);
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    console.log('🛑 Stopping server...');

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          console.log('✅ Server stopped successfully');
          resolve();
        });
      });
    }

    // Reset service instances for clean shutdown
    this.service.resetServices();
  }

  public async shutdown(exitCode: number = 0): Promise<void> {
    await this.stop();
    console.log('👋 Goodbye!');
    process.exit(exitCode);
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getService() {
    return this.service;
  }
}

// Export singleton instance
export const moduleRequirementsServer = new ModuleRequirementsServer();

// Auto-start if this file is run directly
if (require.main === module) {
  moduleRequirementsServer.start()
    .catch((error) => {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    });
}