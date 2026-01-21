import { logger } from 'firebase-functions';

export interface ProviderPerformance {
  providerId: string;
  successRate: number;
  averageResponseTime: number;
  totalRequests: number;
  failureCount: number;
  lastUpdated: Date;
}

export class ProviderPerformanceTracker {
  private performanceData: Map<string, ProviderPerformance> = new Map();

  recordRequest(providerId: string, success: boolean, responseTime: number): void {
    const existing = this.performanceData.get(providerId) || {
      providerId,
      successRate: 0,
      averageResponseTime: 0,
      totalRequests: 0,
      failureCount: 0,
      lastUpdated: new Date()
    };

    existing.totalRequests += 1;
    if (!success) {
      existing.failureCount += 1;
    }

    existing.successRate = ((existing.totalRequests - existing.failureCount) / existing.totalRequests) * 100;
    existing.averageResponseTime = (existing.averageResponseTime + responseTime) / 2;
    existing.lastUpdated = new Date();

    this.performanceData.set(providerId, existing);
    
    logger.debug('Performance recorded for provider', { 
      providerId, 
      success, 
      responseTime,
      successRate: existing.successRate 
    });
  }

  getPerformance(providerId: string): ProviderPerformance | null {
    return this.performanceData.get(providerId) || null;
  }

  getAllPerformanceData(): ProviderPerformance[] {
    return Array.from(this.performanceData.values());
  }

  getTopPerformingProviders(limit: number = 5): ProviderPerformance[] {
    return Array.from(this.performanceData.values())
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  resetPerformanceData(providerId?: string): void {
    if (providerId) {
      this.performanceData.delete(providerId);
      logger.info(`Performance data reset for provider: ${providerId}`);
    } else {
      this.performanceData.clear();
      logger.info('All performance data cleared');
    }
  }

  // Additional methods required by enhanced-video-generation service
  trackVideoGeneration(
    providerId: string,
    options: any,
    result: any,
    generationTime: number,
    success: boolean
  ): void {
    this.recordRequest(providerId, success, generationTime);
    
    logger.debug('Video generation tracked', {
      providerId,
      success,
      generationTime,
      resultStatus: result?.status
    });
  }

  trackStatusCheck(
    providerId: string,
    success: boolean,
    responseTime: number
  ): void {
    this.recordRequest(providerId, success, responseTime);
    
    logger.debug('Status check tracked', {
      providerId,
      success,
      responseTime
    });
  }

  getDashboardData(): {
    providers: ProviderPerformance[];
    summary: {
      totalRequests: number;
      averageSuccessRate: number;
      averageResponseTime: number;
    };
  } {
    const providers = Array.from(this.performanceData.values());
    const totalRequests = providers.reduce((sum, p) => sum + p.totalRequests, 0);
    const averageSuccessRate = providers.length > 0 
      ? providers.reduce((sum, p) => sum + p.successRate, 0) / providers.length
      : 0;
    const averageResponseTime = providers.length > 0
      ? providers.reduce((sum, p) => sum + p.averageResponseTime, 0) / providers.length
      : 0;

    return {
      providers,
      summary: {
        totalRequests,
        averageSuccessRate,
        averageResponseTime
      }
    };
  }

  cleanup(): void {
    this.performanceData.clear();
    logger.info('Provider performance tracker cleaned up');
  }
}