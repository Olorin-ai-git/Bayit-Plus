/**
 * B2B Usage Store
 *
 * Zustand store for usage analytics state.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { create } from 'zustand';
import {
  UsageSummary,
  UsageBreakdownResponse,
  UsageGranularity,
  CapabilityType,
} from '../types';
import * as usageService from '../services/usageService';

interface UsageState {
  summary: UsageSummary | null;
  breakdown: UsageBreakdownResponse | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  granularity: UsageGranularity;
  capability: CapabilityType;
  isLoading: boolean;
  error: string | null;

  setDateRange: (startDate: string, endDate: string) => void;
  setGranularity: (granularity: UsageGranularity) => void;
  setCapability: (capability: CapabilityType) => void;

  fetchSummary: (startDate?: string, endDate?: string) => Promise<void>;
  fetchBreakdown: () => Promise<void>;
  exportUsage: (format: 'csv' | 'json') => Promise<string>;

  clearError: () => void;
  reset: () => void;
}

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

const initialState = {
  summary: null,
  breakdown: null,
  dateRange: getDefaultDateRange(),
  granularity: 'daily' as UsageGranularity,
  capability: 'all' as CapabilityType,
  isLoading: false,
  error: null,
};

export const useUsageStore = create<UsageState>((set, get) => ({
  ...initialState,

  setDateRange: (startDate: string, endDate: string) => {
    set({ dateRange: { startDate, endDate } });
  },

  setGranularity: (granularity: UsageGranularity) => {
    set({ granularity });
  },

  setCapability: (capability: CapabilityType) => {
    set({ capability });
  },

  fetchSummary: async (startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { dateRange } = get();
      const summary = await usageService.getUsageSummary(
        startDate || dateRange.startDate,
        endDate || dateRange.endDate
      );
      set({ summary, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch usage summary';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchBreakdown: async () => {
    set({ isLoading: true, error: null });
    try {
      const { dateRange, granularity, capability } = get();
      const breakdown = await usageService.getUsageBreakdown({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        granularity,
        capability: capability === 'all' ? undefined : capability,
      });
      set({ breakdown, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch usage breakdown';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  exportUsage: async (format: 'csv' | 'json') => {
    const { dateRange, capability } = get();
    try {
      const response = await usageService.exportUsage({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format,
        capability: capability === 'all' ? undefined : capability,
      });
      return response.downloadUrl;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export usage';
      set({ error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

export const useUsageSummary = () => useUsageStore((state) => state.summary);

export const useUsageBreakdown = () =>
  useUsageStore((state) => state.breakdown);

export const useUsageDateRange = () =>
  useUsageStore((state) => state.dateRange);

export const useUsageGranularity = () =>
  useUsageStore((state) => state.granularity);

export const useUsageCapability = () =>
  useUsageStore((state) => state.capability);

export const useUsageLoading = () => useUsageStore((state) => state.isLoading);

export const useUsageError = () => useUsageStore((state) => state.error);
