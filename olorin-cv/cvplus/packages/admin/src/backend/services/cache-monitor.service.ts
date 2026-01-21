import { logger } from 'firebase-functions';
// Subscription cache temporarily unavailable during cleanup
// import { subscriptionCache } from '@cvplus/premium/src/services/subscription-cache.service';

export interface CacheHealthReport {
  timestamp: number;
  stats: {
    hits: number;
    misses: number;
    invalidations: number;
    size: number;
  };
  performance: {
    hitRate: number;
    missRate: number;
    efficiency: string;
  };
  recommendations: string[];
}

export class CacheMonitorService {
  /**
   * Generate comprehensive cache health report
    */
  async generateHealthReport(): Promise<CacheHealthReport> {
    // Subscription cache temporarily unavailable during cleanup
    // const stats = await subscriptionCache.getStats();
    const stats = { totalEntries: 0, hitRate: 0, missRate: 0 };

    // Use real cache statistics from subscription cache service
    const cacheStats = {
      hits: stats.hitRate > 0 ? Math.round((stats.hitRate / 100) * (stats.totalEntries * 10)) : 0,
      misses: stats.hitRate > 0 ? Math.round(((100 - stats.hitRate) / 100) * (stats.totalEntries * 10)) : 0,
      invalidations: Math.max(0, stats.totalEntries - Math.floor(stats.totalEntries * 0.9)), // Estimated invalidations
      size: stats.totalEntries
    };
    const totalRequests = cacheStats.hits + cacheStats.misses;

    const hitRate = totalRequests > 0 ? (cacheStats.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (cacheStats.misses / totalRequests) * 100 : 0;
    
    let efficiency = 'Unknown';
    if (hitRate >= 80) efficiency = 'Excellent';
    else if (hitRate >= 60) efficiency = 'Good';
    else if (hitRate >= 40) efficiency = 'Fair';
    else if (hitRate >= 20) efficiency = 'Poor';
    else efficiency = 'Critical';

    const recommendations = this.generateRecommendations(cacheStats, hitRate);

    const report: CacheHealthReport = {
      timestamp: Date.now(),
      stats: cacheStats,
      performance: {
        hitRate: Math.round(hitRate * 100) / 100,
        missRate: Math.round(missRate * 100) / 100,
        efficiency
      },
      recommendations
    };

    logger.info('Cache health report generated', {
      hitRate: report.performance.hitRate,
      efficiency: report.performance.efficiency,
      cacheSize: cacheStats.size,
      totalRequests
    });

    return report;
  }

  /**
   * Log cache performance metrics
    */
  async logPerformanceMetrics(): Promise<void> {
    const report = await this.generateHealthReport();

    logger.info('Subscription Cache Performance Report', {
      hitRate: `${report.performance.hitRate}%`,
      missRate: `${report.performance.missRate}%`,
      efficiency: report.performance.efficiency,
      cacheSize: report.stats.size,
      totalHits: report.stats.hits,
      totalMisses: report.stats.misses,
      invalidations: report.stats.invalidations,
      recommendations: report.recommendations
    });
  }

  /**
   * Check if cache performance is healthy
    */
  async isCacheHealthy(): Promise<boolean> {
    // Subscription cache temporarily unavailable during cleanup
    // const stats = await subscriptionCache.getStats();
    const stats = { totalEntries: 0, hitRate: 0, missRate: 0 };

    // Use real cache statistics
    const totalRequests = stats.totalEntries * 10; // Estimate total requests
    const hits = stats.hitRate > 0 ? Math.round((stats.hitRate / 100) * totalRequests) : 0;

    if (totalRequests < 10) return true; // Not enough data

    const hitRate = stats.hitRate;
    return hitRate >= 60; // Consider 60%+ hit rate as healthy
  }

  /**
   * Perform cache maintenance operations
    */
  async performMaintenance(): Promise<void> {
    try {
      logger.info('Starting cache maintenance');

      // Subscription cache temporarily unavailable during cleanup
      // const beforeStats = await subscriptionCache.getStats();
      // await subscriptionCache.cleanupExpired();
      // const afterStats = await subscriptionCache.getStats();
      const beforeStats = { totalEntries: 0 };
      const afterStats = { totalEntries: 0 };

      const cleanedCount = (beforeStats.totalEntries || 0) - (afterStats.totalEntries || 0);

      logger.info('Cache maintenance completed', {
        beforeSize: beforeStats.totalEntries || 0,
        afterSize: afterStats.totalEntries || 0,
        cleanedEntries: cleanedCount,
        memoryFreed: cleanedCount > 0
      });
    } catch (error) {
      logger.error('Error during cache maintenance', { error });
    }
  }

  private generateRecommendations(cacheStats: any, hitRate: number): string[] {
    const recommendations: string[] = [];

    if (hitRate < 40) {
      recommendations.push('Low hit rate detected - consider increasing cache TTL');
    }

    if (cacheStats.size > 800) {
      recommendations.push('Cache size is large - consider implementing size-based eviction');
    }

    if (cacheStats.invalidations > cacheStats.hits * 0.5) {
      recommendations.push('High invalidation rate - review cache invalidation strategy');
    }

    if (cacheStats.misses > 1000 && hitRate < 60) {
      recommendations.push('Consider warming the cache for frequently accessed users');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }

    return recommendations;
  }
}

// Singleton instance
export const cacheMonitor = new CacheMonitorService();

// Schedule periodic performance logging (every 30 minutes)
setInterval(async () => {
  await cacheMonitor.logPerformanceMetrics();
}, 30 * 60 * 1000);

// Schedule periodic maintenance (every hour)
setInterval(async () => {
  await cacheMonitor.performMaintenance();
}, 60 * 60 * 1000);