/**
 * Service Discovery and Routing Adapter
 * 
 * Provides dynamic service routing between legacy violation services and 
 * package services during progressive migration. Enables seamless switching
 * based on feature flags and health status.
 * 
 * Features:
 * - Dynamic service discovery and routing
 * - Health-based service selection
 * - Circuit breaker integration
 * - Performance monitoring and comparison
 * - Automatic failover and recovery
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @date 2025-08-27
  */

import * as admin from 'firebase-admin';

// Initialize Firebase if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Service health status
  */
interface ServiceHealth {
  serviceId: string;
  implementation: 'LEGACY' | 'PACKAGE';
  healthy: boolean;
  lastCheck: Date;
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

/**
 * Service routing decision
  */
interface RoutingDecision {
  serviceId: string;
  implementation: 'LEGACY' | 'PACKAGE';
  reason: string;
  confidence: number;
  fallbackAvailable: boolean;
}

/**
 * Performance comparison result
  */
interface PerformanceComparison {
  serviceId: string;
  legacyMetrics?: ServiceHealth['metrics'];
  packageMetrics?: ServiceHealth['metrics'];
  recommendation: 'LEGACY' | 'PACKAGE' | 'MIXED';
  confidence: number;
}

/**
 * Service Discovery and Routing Adapter
  */
export class ServiceDiscoveryAdapter {
  private serviceHealth = new Map<string, ServiceHealth>();
  private routingCache = new Map<string, RoutingDecision>();
  private performanceHistory = new Map<string, PerformanceComparison[]>();
  
  private readonly HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds
  private readonly CACHE_TTL = 60 * 1000; // 1 minute
  private readonly CIRCUIT_BREAKER_THRESHOLD = 0.5; // 50% error rate threshold
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60 * 1000; // 1 minute timeout

  constructor() {
    // Start background health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Get optimal service implementation for a request
    */
  async getServiceImplementation(
    serviceId: string,
    userId?: string,
    forceImplementation?: 'LEGACY' | 'PACKAGE'
  ): Promise<RoutingDecision> {
    // Check for forced implementation (testing/debugging)
    if (forceImplementation) {
      return {
        serviceId,
        implementation: forceImplementation,
        reason: 'Forced implementation',
        confidence: 1.0,
        fallbackAvailable: true
      };
    }

    // Check routing cache first
    const cacheKey = `${serviceId}_${userId || 'anonymous'}`;
    const cachedDecision = this.routingCache.get(cacheKey);
    
    if (cachedDecision && this.isCacheValid(cacheKey)) {
      return cachedDecision;
    }

    // Make routing decision
    const decision = await this.makeRoutingDecision(serviceId, userId);
    
    // Cache the decision
    this.routingCache.set(cacheKey, decision);
    setTimeout(() => this.routingCache.delete(cacheKey), this.CACHE_TTL);
    
    return decision;
  }

  /**
   * Make intelligent routing decision based on multiple factors
    */
  private async makeRoutingDecision(
    serviceId: string,
    userId?: string
  ): Promise<RoutingDecision> {
    // Get current service health
    const legacyHealth = this.serviceHealth.get(`${serviceId}_LEGACY`);
    const packageHealth = this.serviceHealth.get(`${serviceId}_PACKAGE`);
    
    // Get feature flag configuration
    const featureFlags = await this.getFeatureFlags(serviceId);
    
    // Check if package implementation is enabled
    if (!featureFlags.enabled) {
      return {
        serviceId,
        implementation: 'LEGACY',
        reason: 'Package implementation disabled by feature flag',
        confidence: 1.0,
        fallbackAvailable: false
      };
    }

    // Check rollout percentage for user
    if (userId && !this.isUserInRollout(userId, featureFlags.rolloutPercentage)) {
      return {
        serviceId,
        implementation: 'LEGACY',
        reason: 'User not in rollout group',
        confidence: 1.0,
        fallbackAvailable: true
      };
    }

    // Health-based routing
    const healthDecision = this.makeHealthBasedDecision(
      serviceId,
      legacyHealth,
      packageHealth
    );
    
    if (healthDecision) {
      return healthDecision;
    }

    // Performance-based routing
    const performanceDecision = this.makePerformanceBasedDecision(serviceId);
    
    if (performanceDecision) {
      return performanceDecision;
    }

    // Default to package if enabled, legacy otherwise
    return {
      serviceId,
      implementation: featureFlags.enabled ? 'PACKAGE' : 'LEGACY',
      reason: 'Default routing based on feature flag',
      confidence: 0.7,
      fallbackAvailable: true
    };
  }

  /**
   * Make routing decision based on service health
    */
  private makeHealthBasedDecision(
    serviceId: string,
    legacyHealth?: ServiceHealth,
    packageHealth?: ServiceHealth
  ): RoutingDecision | null {
    // If package is unhealthy, route to legacy
    if (packageHealth && !packageHealth.healthy) {
      return {
        serviceId,
        implementation: 'LEGACY',
        reason: 'Package implementation unhealthy',
        confidence: 0.9,
        fallbackAvailable: false
      };
    }

    // If legacy is unhealthy but package is healthy, route to package
    if (legacyHealth && !legacyHealth.healthy && packageHealth && packageHealth.healthy) {
      return {
        serviceId,
        implementation: 'PACKAGE',
        reason: 'Legacy implementation unhealthy, package healthy',
        confidence: 0.9,
        fallbackAvailable: false
      };
    }

    // Circuit breaker logic
    if (packageHealth && packageHealth.circuitBreakerState === 'OPEN') {
      return {
        serviceId,
        implementation: 'LEGACY',
        reason: 'Package circuit breaker is open',
        confidence: 0.95,
        fallbackAvailable: false
      };
    }

    return null; // No health-based decision needed
  }

  /**
   * Make routing decision based on performance comparison
    */
  private makePerformanceBasedDecision(serviceId: string): RoutingDecision | null {
    const history = this.performanceHistory.get(serviceId);
    if (!history || history.length < 3) {
      return null; // Not enough data
    }

    const recentComparisons = history.slice(-5); // Last 5 comparisons
    const packageBetter = recentComparisons.filter(c => c.recommendation === 'PACKAGE').length;
    const legacyBetter = recentComparisons.filter(c => c.recommendation === 'LEGACY').length;

    // If package consistently performs better, route to package
    if (packageBetter >= 4) {
      return {
        serviceId,
        implementation: 'PACKAGE',
        reason: 'Package consistently outperforms legacy',
        confidence: 0.85,
        fallbackAvailable: true
      };
    }

    // If legacy consistently performs better, route to legacy
    if (legacyBetter >= 4) {
      return {
        serviceId,
        implementation: 'LEGACY',
        reason: 'Legacy consistently outperforms package',
        confidence: 0.85,
        fallbackAvailable: true
      };
    }

    return null; // No clear performance winner
  }

  /**
   * Compare performance between implementations
    */
  async compareServicePerformance(serviceId: string): Promise<PerformanceComparison> {
    const legacyHealth = this.serviceHealth.get(`${serviceId}_LEGACY`);
    const packageHealth = this.serviceHealth.get(`${serviceId}_PACKAGE`);

    let recommendation: 'LEGACY' | 'PACKAGE' | 'MIXED' = 'MIXED';
    let confidence = 0.5;

    if (legacyHealth && packageHealth) {
      // Compare metrics
      const legacyScore = this.calculatePerformanceScore(legacyHealth.metrics);
      const packageScore = this.calculatePerformanceScore(packageHealth.metrics);

      if (packageScore > legacyScore * 1.1) {
        recommendation = 'PACKAGE';
        confidence = Math.min(0.95, (packageScore / legacyScore - 1) * 2 + 0.5);
      } else if (legacyScore > packageScore * 1.1) {
        recommendation = 'LEGACY';
        confidence = Math.min(0.95, (legacyScore / packageScore - 1) * 2 + 0.5);
      }
    }

    const comparison: PerformanceComparison = {
      serviceId,
      legacyMetrics: legacyHealth?.metrics,
      packageMetrics: packageHealth?.metrics,
      recommendation,
      confidence
    };

    // Store in history
    const history = this.performanceHistory.get(serviceId) || [];
    history.push(comparison);
    if (history.length > 10) {
      history.shift(); // Keep only last 10 comparisons
    }
    this.performanceHistory.set(serviceId, history);

    return comparison;
  }

  /**
   * Calculate performance score from metrics
    */
  private calculatePerformanceScore(metrics: ServiceHealth['metrics']): number {
    // Weighted performance score (lower is better for response time and error rate)
    const responseScore = Math.max(0, 100 - metrics.responseTime / 10);
    const errorScore = Math.max(0, 100 - metrics.errorRate * 1000);
    const throughputScore = Math.min(100, metrics.throughput / 10);

    return (responseScore * 0.4 + errorScore * 0.4 + throughputScore * 0.2);
  }

  /**
   * Handle service failure and trigger circuit breaker
    */
  async handleServiceFailure(
    serviceId: string,
    implementation: 'LEGACY' | 'PACKAGE',
    error: Error
  ): Promise<void> {
    const healthKey = `${serviceId}_${implementation}`;
    const health = this.serviceHealth.get(healthKey);

    if (health) {
      // Update error metrics
      health.metrics.errorRate = Math.min(1.0, health.metrics.errorRate + 0.1);
      health.healthy = health.metrics.errorRate < this.CIRCUIT_BREAKER_THRESHOLD;
      health.lastCheck = new Date();

      // Open circuit breaker if error rate is too high
      if (health.metrics.errorRate >= this.CIRCUIT_BREAKER_THRESHOLD) {
        health.circuitBreakerState = 'OPEN';
        
        // Schedule circuit breaker recovery
        setTimeout(() => {
          health.circuitBreakerState = 'HALF_OPEN';
        }, this.CIRCUIT_BREAKER_TIMEOUT);
      }

      this.serviceHealth.set(healthKey, health);

      // Log failure event
      await this.logServiceFailure(serviceId, implementation, error);
    }
  }

  /**
   * Handle successful service call
    */
  async handleServiceSuccess(
    serviceId: string,
    implementation: 'LEGACY' | 'PACKAGE',
    responseTime: number
  ): Promise<void> {
    const healthKey = `${serviceId}_${implementation}`;
    const health = this.serviceHealth.get(healthKey) || this.createDefaultHealth(serviceId, implementation);

    // Update metrics with exponential moving average
    const alpha = 0.3; // Smoothing factor
    health.metrics.responseTime = (1 - alpha) * health.metrics.responseTime + alpha * responseTime;
    health.metrics.errorRate = Math.max(0, health.metrics.errorRate - 0.05); // Decay error rate
    health.metrics.throughput += 1; // Increment throughput counter
    health.healthy = true;
    health.lastCheck = new Date();

    // Close circuit breaker on successful calls
    if (health.circuitBreakerState === 'HALF_OPEN') {
      health.circuitBreakerState = 'CLOSED';
    }

    this.serviceHealth.set(healthKey, health);
  }

  /**
   * Start background health monitoring
    */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.performHealthChecks();
      await this.performPerformanceComparisons();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health checks on all services
    */
  private async performHealthChecks(): Promise<void> {
    const services = [
      'CVAnalyzer', 'ImprovementOrchestrator', 'CacheManager',
      'RecommendationGenerator', 'CircuitBreakerCore',
      'RecommendationOrchestrator', 'ActionOrchestrator'
    ];

    for (const serviceId of services) {
      await this.checkServiceHealth(`${serviceId}_LEGACY`);
      await this.checkServiceHealth(`${serviceId}_PACKAGE`);
    }
  }

  /**
   * Perform performance comparisons
    */
  private async performPerformanceComparisons(): Promise<void> {
    const services = [
      'CVAnalyzer', 'ImprovementOrchestrator', 'CacheManager',
      'RecommendationGenerator', 'CircuitBreakerCore',
      'RecommendationOrchestrator', 'ActionOrchestrator'
    ];

    for (const serviceId of services) {
      await this.compareServicePerformance(serviceId);
    }
  }

  /**
   * Check individual service health
    */
  private async checkServiceHealth(healthKey: string): Promise<void> {
    const [serviceId, implementation] = healthKey.split('_');
    
    try {
      // Simple health check - could be enhanced with actual service ping
      const startTime = Date.now();
      const isHealthy = await this.pingService(serviceId, implementation as 'LEGACY' | 'PACKAGE');
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        await this.handleServiceSuccess(serviceId, implementation as 'LEGACY' | 'PACKAGE', responseTime);
      } else {
        await this.handleServiceFailure(serviceId, implementation as 'LEGACY' | 'PACKAGE', new Error('Health check failed'));
      }
    } catch (error) {
      await this.handleServiceFailure(serviceId, implementation as 'LEGACY' | 'PACKAGE', error);
    }
  }

  /**
   * Ping service to check if it's responsive
    */
  private async pingService(serviceId: string, implementation: 'LEGACY' | 'PACKAGE'): Promise<boolean> {
    // Implementation would make actual service calls
    // For now, return true with some randomness to simulate real conditions
    const random = Math.random();
    
    // Package services have slightly better uptime in simulation
    const baseReliability = implementation === 'PACKAGE' ? 0.95 : 0.92;
    
    return random < baseReliability;
  }

  /**
   * Get feature flags for service
    */
  private async getFeatureFlags(serviceId: string): Promise<{enabled: boolean, rolloutPercentage: number}> {
    try {
      const flagName = `${serviceId.toLowerCase()}-package-enabled`;
      const doc = await db.collection('feature_flags').doc('migration_flags').get();
      
      if (doc.exists) {
        const flags = doc.data() || {};
        const flag = flags[flagName] || { enabled: false, rolloutPercentage: 0 };
        return {
          enabled: flag.enabled || false,
          rolloutPercentage: flag.rolloutPercentage || 0
        };
      }
    } catch (error) {
      logger.error(`Error fetching feature flags for ${serviceId}:`, error);
    }
    
    return { enabled: false, rolloutPercentage: 0 };
  }

  /**
   * Check if user is in rollout group
    */
  private isUserInRollout(userId: string, rolloutPercentage: number): boolean {
    if (rolloutPercentage >= 100) return true;
    if (rolloutPercentage <= 0) return false;
    
    // Hash user ID to get consistent assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const userPercentile = Math.abs(hash) % 100;
    return userPercentile < rolloutPercentage;
  }

  /**
   * Check if routing cache is valid
    */
  private isCacheValid(cacheKey: string): boolean {
    // Simple TTL-based cache validation
    // In a real implementation, this would check cache timestamps
    return this.routingCache.has(cacheKey);
  }

  /**
   * Create default health status
    */
  private createDefaultHealth(serviceId: string, implementation: 'LEGACY' | 'PACKAGE'): ServiceHealth {
    return {
      serviceId: `${serviceId}_${implementation}`,
      implementation,
      healthy: true,
      lastCheck: new Date(),
      metrics: {
        responseTime: 300,
        errorRate: 0,
        throughput: 0
      },
      circuitBreakerState: 'CLOSED'
    };
  }

  /**
   * Log service failure event
    */
  private async logServiceFailure(
    serviceId: string,
    implementation: 'LEGACY' | 'PACKAGE',
    error: Error
  ): Promise<void> {
    try {
      await db.collection('service_failures').add({
        serviceId,
        implementation,
        error: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
    } catch (logError) {
      logger.error('Failed to log service failure:', logError);
    }
  }

  /**
   * Get current service health status
    */
  getServiceHealthStatus(serviceId?: string): Map<string, ServiceHealth> | ServiceHealth | undefined {
    if (serviceId) {
      return this.serviceHealth.get(serviceId);
    }
    return new Map(this.serviceHealth);
  }

  /**
   * Get performance history
    */
  getPerformanceHistory(serviceId?: string): Map<string, PerformanceComparison[]> | PerformanceComparison[] | undefined {
    if (serviceId) {
      return this.performanceHistory.get(serviceId);
    }
    return new Map(this.performanceHistory);
  }

  /**
   * Clear routing cache (useful for testing)
    */
  clearRoutingCache(): void {
    this.routingCache.clear();
  }

  /**
   * Reset service health (useful for testing)
    */
  resetServiceHealth(): void {
    this.serviceHealth.clear();
    this.performanceHistory.clear();
  }
}

// Export singleton instance
export const serviceDiscoveryAdapter = new ServiceDiscoveryAdapter();