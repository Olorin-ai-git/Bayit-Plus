/**
 * B2B Usage Service
 *
 * Handles usage analytics and metrics operations.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { b2bGet } from './b2bApiClient';
import {
  UsageSummary,
  UsageBreakdownRequest,
  UsageBreakdownResponse,
  UsageExportRequest,
  UsageExportResponse,
} from '../types';

const USAGE_ENDPOINTS = {
  SUMMARY: '/usage/summary',
  BREAKDOWN: '/usage/breakdown',
  EXPORT: '/usage/export',
} as const;

export async function getUsageSummary(
  startDate?: string,
  endDate?: string
): Promise<UsageSummary> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await b2bGet<UsageSummary>(USAGE_ENDPOINTS.SUMMARY, params);
  return response.data;
}

export async function getUsageBreakdown(
  request: UsageBreakdownRequest
): Promise<UsageBreakdownResponse> {
  const params: Record<string, string> = {
    startDate: request.startDate,
    endDate: request.endDate,
    granularity: request.granularity,
  };
  if (request.capability) {
    params.capability = request.capability;
  }

  const response = await b2bGet<UsageBreakdownResponse>(
    USAGE_ENDPOINTS.BREAKDOWN,
    params
  );
  return response.data;
}

export async function exportUsage(
  request: UsageExportRequest
): Promise<UsageExportResponse> {
  const params: Record<string, string> = {
    startDate: request.startDate,
    endDate: request.endDate,
    format: request.format,
  };
  if (request.capability) {
    params.capability = request.capability;
  }

  const response = await b2bGet<UsageExportResponse>(
    USAGE_ENDPOINTS.EXPORT,
    params
  );
  return response.data;
}
