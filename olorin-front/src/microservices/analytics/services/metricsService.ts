/**
 * Metrics Service Helper - Additional metrics calculation utilities.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { analyticsService } from './analyticsService';
import type { FraudMetrics, PrecisionRecallResponse } from '../types/metrics';

export class MetricsService {
  async getMetrics(
    startDate: string,
    endDate: string,
    includeLatency = true,
    includeThroughput = true
  ): Promise<FraudMetrics> {
    return analyticsService.getMetrics(startDate, endDate, includeLatency, includeThroughput);
  }

  async getPrecisionRecall(
    startDate: string,
    endDate: string
  ): Promise<PrecisionRecallResponse> {
    return analyticsService.getPrecisionRecall(startDate, endDate);
  }
}

export const metricsService = new MetricsService();

