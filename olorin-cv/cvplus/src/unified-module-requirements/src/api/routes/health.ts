import { Router, Request, Response } from 'express';
import { getUnifiedModuleRequirementsService } from '../../lib/index';
import { asyncHandler } from '../middleware/asyncHandler';

export const healthRoutes = Router();
const service = getUnifiedModuleRequirementsService();

/**
 * GET /health
 * Basic health check endpoint
 */
healthRoutes.get('/',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Basic system checks
      const serviceStatus = service.getServiceStatus();
      const memoryUsage = process.memoryUsage();
      const responseTime = Date.now() - startTime;

      // Determine overall health
      const isHealthy = responseTime < 1000; // Response time under 1 second

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${responseTime}ms`,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: serviceStatus,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024)
          },
          cpu: {
            loadAverage: process.platform !== 'win32' ? require('os').loadavg() : 'N/A (Windows)'
          }
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${Date.now() - startTime}ms`
      });
    }
  })
);

/**
 * GET /health/detailed
 * Detailed health check with service diagnostics
 */
healthRoutes.get('/detailed',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const serviceStatus = service.getServiceStatus();
      const memoryUsage = process.memoryUsage();

      // Test each service briefly
      const serviceTests = {
        moduleValidator: await testService('moduleValidator'),
        templateManager: await testService('templateManager'),
        architecturalAnalysis: await testService('architecturalAnalysis'),
        reporting: await testService('reporting')
      };

      const allServicesHealthy = Object.values(serviceTests).every(test => test.healthy);
      const responseTime = Date.now() - startTime;
      const isHealthy = allServicesHealthy && responseTime < 2000;

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${responseTime}ms`,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          status: serviceStatus,
          tests: serviceTests
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
          },
          cpu: {
            loadAverage: process.platform !== 'win32' ? require('os').loadavg() : 'N/A (Windows)',
            uptime: require('os').uptime()
          }
        },
        endpoints: {
          validation: '/api/v1/validation',
          templates: '/api/v1/templates',
          architecture: '/api/v1/architecture',
          reporting: '/api/v1/reporting'
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${Date.now() - startTime}ms`
      });
    }
  })
);

/**
 * GET /health/ready
 * Readiness probe for Kubernetes/container orchestration
 */
healthRoutes.get('/ready',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check if all critical services are initialized
      const serviceStatus = service.getServiceStatus();
      const criticalServices = ['moduleValidator', 'reportingService'];

      const readinessChecks = criticalServices.map(serviceName => ({
        service: serviceName,
        ready: serviceStatus[serviceName] !== undefined
      }));

      const allReady = readinessChecks.every(check => check.ready);

      res.status(allReady ? 200 : 503).json({
        ready: allReady,
        timestamp: new Date().toISOString(),
        checks: readinessChecks,
        message: allReady ? 'Service is ready' : 'Service is not ready'
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /health/live
 * Liveness probe for Kubernetes/container orchestration
 */
healthRoutes.get('/live',
  asyncHandler(async (req: Request, res: Response) => {
    // Simple liveness check - if we can respond, we're alive
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
      message: 'Service is alive'
    });
  })
);

// Helper function to test individual services
async function testService(serviceName: string): Promise<{ healthy: boolean; message: string; responseTime: number }> {
  const startTime = Date.now();

  try {
    switch (serviceName) {
      case 'moduleValidator':
        // Quick validation test (doesn't actually validate, just checks if service is accessible)
        const validator = service.moduleValidator;
        return {
          healthy: !!validator,
          message: 'Module validator accessible',
          responseTime: Date.now() - startTime
        };

      case 'templateManager':
        const templateManager = service.templateManager;
        return {
          healthy: !!templateManager,
          message: 'Template manager accessible',
          responseTime: Date.now() - startTime
        };

      case 'architecturalAnalysis':
        const codeAnalyzer = service.codeSegregationAnalyzer;
        const distValidator = service.distributionValidator;
        const mockDetector = service.mockDetector;
        return {
          healthy: !!(codeAnalyzer && distValidator && mockDetector),
          message: 'Architectural analysis services accessible',
          responseTime: Date.now() - startTime
        };

      case 'reporting':
        const reporting = service.reportingService;
        return {
          healthy: !!reporting,
          message: 'Reporting service accessible',
          responseTime: Date.now() - startTime
        };

      default:
        return {
          healthy: false,
          message: `Unknown service: ${serviceName}`,
          responseTime: Date.now() - startTime
        };
    }
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Service test failed',
      responseTime: Date.now() - startTime
    };
  }
}