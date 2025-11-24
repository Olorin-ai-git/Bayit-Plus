import { ServiceConfig } from './ServiceDiscovery';

export interface HealthMetrics {
  service: string;
  timestamp: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'offline';
  responseTime: number;
  errorRate: number;
  uptime: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: {
    usage: number;
    load: number[];
  };
  requests?: {
    total: number;
    errors: number;
    rate: number;
  };
}

export interface HealthAlert {
  id: string;
  service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export class ServiceHealthMonitor {
  private services: ServiceConfig[] = [];
  private monitoring = false;
  private interval?: ReturnType<typeof setInterval>;
  private checkIntervalMs = 30000; // 30 seconds
  private alerts: HealthAlert[] = [];
  private metrics: HealthMetrics[] = [];
  private maxMetricsHistory = 100;
  private maxAlertsHistory = 50;

  constructor(checkIntervalMs?: number) {
    if (checkIntervalMs) {
      this.checkIntervalMs = checkIntervalMs;
    }
  }

  startMonitoring(services: ServiceConfig[]): void {
    this.services = services;
    this.monitoring = true;

    console.log(`[Health Monitor] Starting health monitoring for ${services.length} services`);

    // Perform initial health check
    this.performHealthChecks();

    // Set up periodic monitoring
    this.interval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkIntervalMs);

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupHistory();
    }, 300000); // 5 minutes
  }

  stopMonitoring(): void {
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    console.log('[Health Monitor] Stopped health monitoring');
  }

  private async performHealthChecks(): Promise<void> {
    if (!this.monitoring) return;

    const checkPromises = this.services.map(service => this.checkServiceHealth(service));
    await Promise.allSettled(checkPromises);

    // Emit health status update
    this.emitHealthUpdate();
  }

  private async checkServiceHealth(service: ServiceConfig): Promise<void> {
    const startTime = Date.now();
    let metrics: HealthMetrics;

    try {
      if (service.name === 'shell') {
        // Shell service is always considered healthy
        metrics = {
          service: service.name,
          timestamp: new Date().toISOString(),
          status: 'healthy',
          responseTime: 0,
          errorRate: 0,
          uptime: Date.now() - startTime
        };
      } else {
        metrics = await this.fetchServiceMetrics(service);
      }

      // Update service status based on metrics
      this.updateServiceStatus(service, metrics);

      // Store metrics
      this.addMetrics(metrics);

      // Check for alerts
      this.checkForAlerts(service, metrics);

    } catch (error) {
      console.error(`[Health Monitor] Failed to check health for ${service.name}:`, error);

      metrics = {
        service: service.name,
        timestamp: new Date().toISOString(),
        status: 'offline',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        uptime: 0
      };

      this.updateServiceStatus(service, metrics);
      this.addMetrics(metrics);
      this.createAlert(service.name, 'high', `Service health check failed: ${error}`);
    }
  }

  private async fetchServiceMetrics(service: ServiceConfig): Promise<HealthMetrics> {
    const startTime = Date.now();
    const metricsUrl = `${service.url}/metrics`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(metricsUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Health-Monitor': 'true'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          service: service.name,
          timestamp: new Date().toISOString(),
          status: this.determineHealthStatus(responseTime, data),
          responseTime,
          errorRate: data.errorRate || 0,
          uptime: data.uptime || responseTime,
          memory: data.memory,
          cpu: data.cpu,
          requests: data.requests
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Health check timeout');
      }

      throw error;
    }
  }

  private determineHealthStatus(responseTime: number, data: any): 'healthy' | 'unhealthy' | 'degraded' | 'offline' {
    // Service is offline if we can't reach it
    if (responseTime > 10000) return 'offline';

    // Service is unhealthy if error rate is too high
    if (data.errorRate && data.errorRate > 50) return 'unhealthy';

    // Service is degraded if response time is slow or moderate error rate
    if (responseTime > 2000 || (data.errorRate && data.errorRate > 10)) return 'degraded';

    // Service is degraded if memory usage is too high
    if (data.memory && data.memory.percentage > 90) return 'degraded';

    // Service is degraded if CPU usage is too high
    if (data.cpu && data.cpu.usage > 90) return 'degraded';

    return 'healthy';
  }

  private updateServiceStatus(service: ServiceConfig, metrics: HealthMetrics): void {
    const previousStatus = service.status;

    switch (metrics.status) {
      case 'healthy':
        service.status = 'ready';
        break;
      case 'degraded':
        service.status = 'ready'; // Still functional but performance issues
        break;
      case 'unhealthy':
      case 'offline':
        service.status = 'error';
        break;
    }

    // Update health information
    service.health = {
      lastCheck: metrics.timestamp,
      responseTime: metrics.responseTime,
      uptime: metrics.uptime
    };

    // Log status changes
    if (previousStatus !== service.status) {
      console.log(`[Health Monitor] ${service.name} status changed: ${previousStatus} -> ${service.status}`);
    }
  }

  private addMetrics(metrics: HealthMetrics): void {
    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  private checkForAlerts(service: ServiceConfig, metrics: HealthMetrics): void {
    const existingAlert = this.alerts.find(
      alert => alert.service === service.name && !alert.resolved
    );

    if (metrics.status === 'healthy') {
      // Resolve existing alerts if service is healthy
      if (existingAlert) {
        existingAlert.resolved = true;
        existingAlert.resolvedAt = new Date().toISOString();
        console.log(`[Health Monitor] Resolved alert for ${service.name}`);
      }
    } else {
      // Create new alert if none exists
      if (!existingAlert) {
        const severity = metrics.status === 'offline' ? 'critical' :
                        metrics.status === 'unhealthy' ? 'high' :
                        'medium';

        this.createAlert(
          service.name,
          severity,
          `Service is ${metrics.status}. Response time: ${metrics.responseTime}ms, Error rate: ${metrics.errorRate}%`
        );
      }
    }
  }

  private createAlert(service: string, severity: HealthAlert['severity'], message: string): void {
    const alert: HealthAlert = {
      id: `${service}-${Date.now()}`,
      service,
      severity,
      message,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);
    console.warn(`[Health Monitor] Alert created for ${service}: ${message}`);

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }
  }

  private emitHealthUpdate(): void {
    if (window.olorin?.eventBus) {
      const healthSummary = {
        timestamp: new Date().toISOString(),
        services: this.services.map(service => ({
          name: service.name,
          status: service.status,
          health: service.health
        })),
        alerts: this.getActiveAlerts(),
        metrics: this.getRecentMetrics()
      };

      // Note: 'health:update' event type not yet defined in EventBusEvents
      // window.olorin.eventBus.emit('health:update', healthSummary);
      console.log('[Health Monitor] Health update:', healthSummary);
    }
  }

  private cleanupHistory(): void {
    // Remove old metrics (keep last 24 hours)
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(
      metric => new Date(metric.timestamp).getTime() > cutoffTime
    );

    // Remove old resolved alerts (keep last 7 days)
    const alertCutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(
      alert => !alert.resolved || new Date(alert.timestamp).getTime() > alertCutoffTime
    );
  }

  getServiceMetrics(serviceName: string, limit?: number): HealthMetrics[] {
    const serviceMetrics = this.metrics.filter(metric => metric.service === serviceName);
    return limit ? serviceMetrics.slice(-limit) : serviceMetrics;
  }

  getRecentMetrics(minutes: number = 30): HealthMetrics[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(
      metric => new Date(metric.timestamp).getTime() > cutoffTime
    );
  }

  getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): HealthAlert[] {
    return [...this.alerts];
  }

  getHealthSummary(): {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    offlineServices: number;
    activeAlerts: number;
  } {
    const recentMetrics = this.getRecentMetrics(5); // Last 5 minutes
    const serviceStatuses = new Map<string, HealthMetrics>();

    // Get latest metrics for each service
    recentMetrics.forEach(metric => {
      const existing = serviceStatuses.get(metric.service);
      if (!existing || new Date(metric.timestamp) > new Date(existing.timestamp)) {
        serviceStatuses.set(metric.service, metric);
      }
    });

    const statuses = Array.from(serviceStatuses.values());

    return {
      totalServices: this.services.length,
      healthyServices: statuses.filter(s => s.status === 'healthy').length,
      degradedServices: statuses.filter(s => s.status === 'degraded').length,
      unhealthyServices: statuses.filter(s => s.status === 'unhealthy').length,
      offlineServices: statuses.filter(s => s.status === 'offline').length,
      activeAlerts: this.getActiveAlerts().length
    };
  }

  isMonitoring(): boolean {
    return this.monitoring;
  }

  getMonitoringInterval(): number {
    return this.checkIntervalMs;
  }

  setMonitoringInterval(intervalMs: number): void {
    this.checkIntervalMs = intervalMs;

    if (this.monitoring && this.interval) {
      clearInterval(this.interval);
      this.interval = setInterval(() => {
        this.performHealthChecks();
      }, this.checkIntervalMs);

      console.log(`[Health Monitor] Updated monitoring interval to ${intervalMs}ms`);
    }
  }
}