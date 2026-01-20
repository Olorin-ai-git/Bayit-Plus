/**
 * B2B Usage Store
 *
 * Zustand store for usage analytics and metrics.
 */

import { create } from 'zustand';
import type {
  UsageSummary,
  UsageDataPoint,
  UsageBreakdown,
  UsageBreakdownResponse,
  UsageGranularity,
  CapabilityType,
} from '../types';
import { getB2BApiUrl } from '../config/env';
import { getApiClient } from '../services/api';

interface DateRange {
  start: string;
  end: string;
}

interface UsageState {
  summary: UsageSummary | null;
  dataPoints: UsageDataPoint[];
  breakdown: UsageBreakdown[];
  dateRange: DateRange;
  granularity: UsageGranularity;
  capability: CapabilityType;
  isLoading: boolean;
  error: string | null;

  // Actions
  setDateRange: (range: DateRange) => void;
  setGranularity: (granularity: UsageGranularity) => void;
  setCapability: (capability: CapabilityType) => void;
  fetchSummary: (start?: string, end?: string) => Promise<void>;
  fetchBreakdown: () => Promise<void>;
  exportUsage: (format: 'csv' | 'json') => Promise<string>;
  clearError: () => void;
}

// Default to last 30 days
function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export const useUsageStore = create<UsageState>((set, get) => ({
  summary: null,
  dataPoints: [],
  breakdown: [],
  dateRange: getDefaultDateRange(),
  granularity: 'daily',
  capability: 'all',
  isLoading: false,
  error: null,

  setDateRange: (range: DateRange) => {
    set({ dateRange: range });
    // Auto-fetch when range changes
    get().fetchBreakdown();
  },

  setGranularity: (granularity: UsageGranularity) => {
    set({ granularity });
    // Auto-fetch when granularity changes
    get().fetchBreakdown();
  },

  setCapability: (capability: CapabilityType) => {
    set({ capability });
    // Auto-fetch when capability changes
    get().fetchBreakdown();
  },

  fetchSummary: async (start?: string, end?: string) => {
    set({ isLoading: true, error: null });

    const { dateRange } = get();
    const startDate = start ?? dateRange.start;
    const endDate = end ?? dateRange.end;

    try {
      const client = getApiClient();
      const response = await client.get<UsageSummary>(
        getB2BApiUrl('/usage/summary'),
        {
          params: {
            start_date: startDate,
            end_date: endDate,
          },
        }
      );
      set({ summary: response.data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch usage summary';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  fetchBreakdown: async () => {
    set({ isLoading: true, error: null });

    const { dateRange, granularity, capability } = get();

    try {
      const client = getApiClient();
      const response = await client.get<UsageBreakdownResponse>(
        getB2BApiUrl('/usage/breakdown'),
        {
          params: {
            start_date: dateRange.start,
            end_date: dateRange.end,
            granularity,
            capability: capability === 'all' ? undefined : capability,
          },
        }
      );

      set({
        dataPoints: response.data.dataPoints,
        breakdown: response.data.breakdown,
        summary: response.data.totals,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch usage breakdown';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  exportUsage: async (format: 'csv' | 'json') => {
    const { dateRange, granularity, capability } = get();

    try {
      const client = getApiClient();
      const response = await client.get<{ downloadUrl: string }>(
        getB2BApiUrl('/usage/export'),
        {
          params: {
            start_date: dateRange.start,
            end_date: dateRange.end,
            granularity,
            capability: capability === 'all' ? undefined : capability,
            format,
          },
        }
      );

      return response.data.downloadUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export usage data';
      set({ error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
