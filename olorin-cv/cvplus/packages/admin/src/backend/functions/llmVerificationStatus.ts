import { onRequest } from 'firebase-functions/v2/https';
import { adminCorsOptions } from '../config/cors';
import { llmMonitoringService } from '../services/llm-monitoring.service';
import { llmVerificationService } from '../services/llm-verification.service';
// import { verifiedClaudeService } from '../services/verified-claude.service';
import { llmVerificationConfig } from '../config/llm-verification.config';

/**
 * LLM Verification Status Endpoint
 * 
 * Provides comprehensive monitoring and health information for the LLM verification system.
 * This endpoint is useful for:
 * - System health monitoring
 * - Performance analytics
 * - Security audit reporting
 * - Operational dashboards
  */

interface StatusRequest {
  action: 'health' | 'metrics' | 'dashboard' | 'config' | 'alerts' | 'export';
  timeRange?: '1h' | '24h' | '7d';
  format?: 'json' | 'prometheus';
  limit?: number;
}

export const llmVerificationStatus = onRequest(
  { 
    ...adminCorsOptions,
    maxInstances: 10,
    timeoutSeconds: 60
  },
  async (req, res) => {
      try {
        const { action, timeRange = '24h', format = 'json', limit = 50 }: StatusRequest = req.body;

        if (!action) {
          return res.status(400).json({
            error: 'Missing required parameter: action',
            validActions: ['health', 'metrics', 'dashboard', 'config', 'alerts', 'export']
          });
        }

        switch (action) {
          case 'health':
            return await handleHealthCheck(res);

          case 'metrics':
            return await handleMetrics(res, timeRange);

          case 'dashboard':
            return await handleDashboard(res, timeRange);

          case 'config':
            return await handleConfig(res);

          case 'alerts':
            return await handleAlerts(res, limit);

          case 'export':
            return await handleExport(res, format);

          default:
            return res.status(400).json({
              error: `Unknown action: ${action}`,
              validActions: ['health', 'metrics', 'dashboard', 'config', 'alerts', 'export']
            });
        }

      } catch (error) {
        return res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
  }
);

/**
 * Handle system health check
  */
async function handleHealthCheck(res: any) {
  try {
    // Get comprehensive health status
    const verificationHealth = await llmVerificationService.healthCheck();
    // Health status not available in current API
    const claudeHealth = { service: 'unknown', components: {}, metrics: {} };

    const overallStatus = determineOverallHealth(verificationHealth, claudeHealth);

    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      components: {
        verification: {
          status: verificationHealth.status,
          healthy: verificationHealth.status === 'healthy',
          checks: []
        },
        claude: {
          status: claudeHealth.service,
          components: claudeHealth.components,
          metrics: claudeHealth.metrics
        }
      },
      configuration: {
        verificationEnabled: llmVerificationConfig.verification.enabled,
        environment: llmVerificationConfig.environment,
        confidenceThreshold: llmVerificationConfig.verification.confidenceThreshold,
        scoreThreshold: llmVerificationConfig.verification.scoreThreshold
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    return res.status(statusCode).json(healthResponse);

  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle metrics request
  */
async function handleMetrics(res: any, timeRange: '1h' | '24h' | '7d') {
  try {
    // Collect current metrics
    const currentMetrics = await llmMonitoringService.collectMetrics(timeRange);
    
    // Get detailed statistics
    // Note: These methods are not available in current API
    const detailedMetrics = {};
    const verificationStats = {};
    const serviceInfo = { version: '1.0.0', status: 'running' };

    const metricsResponse = {
      timestamp: new Date().toISOString(),
      timeRange,
      current: currentMetrics,
      detailed: detailedMetrics,
      verification: verificationStats,
      service: serviceInfo,
      trends: {
        description: `Metrics collected over ${timeRange} time window`,
        dataPoints: 1,
        nextCollection: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Next 5 minutes
      }
    };

    return res.status(200).json(metricsResponse);

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle dashboard data request
  */
async function handleDashboard(res: any, timeRange: '1h' | '24h' | '7d') {
  try {
    const dashboardData = llmMonitoringService.getDashboardData(timeRange);
    
    // Add additional context
    const enhancedDashboard = {
      ...dashboardData,
      metadata: {
        generatedAt: new Date().toISOString(),
        timeRange,
        dataSource: 'llm-verification-system',
        refreshInterval: '5 minutes'
      },
      recommendations: generateRecommendations(dashboardData)
    };

    return res.status(200).json(enhancedDashboard);

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to generate dashboard',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle configuration request
  */
async function handleConfig(res: any) {
  try {
    // Sanitize configuration (remove sensitive data)
    const sanitizedConfig = {
      verification: {
        enabled: llmVerificationConfig.verification.enabled,
        confidenceThreshold: llmVerificationConfig.verification.confidenceThreshold,
        scoreThreshold: llmVerificationConfig.verification.scoreThreshold,
        maxRetries: llmVerificationConfig.verification.maxRetries,
        timeoutMs: llmVerificationConfig.verification.timeoutMs
      },
      security: {
        rateLimiting: {
          enabled: llmVerificationConfig.security.rateLimiting.enabled,
          requestsPerMinute: llmVerificationConfig.security.rateLimiting.requestsPerMinute
        },
        auditLogging: {
          enabled: llmVerificationConfig.security.auditLogging.enabled,
          logLevel: llmVerificationConfig.security.auditLogging.logLevel,
          sanitizePII: llmVerificationConfig.security.auditLogging.sanitizePII
        }
      },
      environment: llmVerificationConfig.environment,
      monitoring: llmVerificationConfig.monitoring
    };

    return res.status(200).json({
      configuration: sanitizedConfig,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to retrieve configuration',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle alerts request
  */
async function handleAlerts(res: any, limit: number) {
  try {
    // In a full implementation, this would retrieve alerts from the monitoring service
    const alertsResponse = {
      active: [], // Would get from llmMonitoringService.getActiveAlerts()
      recent: [], // Would get from llmMonitoringService.getRecentAlerts(limit)
      rules: [], // Would get from llmMonitoringService.getAlertRules()
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(alertsResponse);

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle export request
  */
async function handleExport(res: any, format: 'json' | 'prometheus') {
  try {
    const exportedData = llmMonitoringService.exportMetrics(format);
    
    if (format === 'prometheus') {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(exportedData);
    }

    return res.status(200).json({
      format,
      data: JSON.parse(exportedData),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to export metrics',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Determine overall system health
  */
function determineOverallHealth(
  verificationHealth: any,
  claudeHealth: any
): 'healthy' | 'degraded' | 'unhealthy' {
  if (!verificationHealth.healthy || claudeHealth.service === 'unhealthy') {
    return 'unhealthy';
  }
  
  if (verificationHealth.status === 'degraded' || claudeHealth.service === 'degraded') {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * Generate operational recommendations
  */
function generateRecommendations(dashboardData: any): string[] {
  const recommendations: string[] = [];
  
  if (dashboardData.summary.successRate < 95) {
    recommendations.push('Success rate is below 95%. Consider reviewing verification thresholds or API stability.');
  }
  
  if (dashboardData.summary.averageResponseTime > 15000) {
    recommendations.push('Average response time is high. Consider optimizing prompts or increasing timeout limits.');
  }
  
  if (dashboardData.recentAlerts.length > 0) {
    recommendations.push('Active alerts detected. Review recent alerts and take corrective action.');
  }
  
  if (dashboardData.topServices.some((service: any) => service.successRate < 90)) {
    recommendations.push('Some services have low success rates. Review service-specific validation criteria.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System is operating normally. Continue monitoring for optimal performance.');
  }
  
  return recommendations;
}

export { handleHealthCheck, handleMetrics, handleDashboard };