import { z } from 'zod';

// Configuration schema for investigation polling and feature flags
export const InvestigationConfigSchema = z.object({
  pollingInterval: z.coerce.number().int().positive().default(10000),
  apiBaseUrl: z.string().url(),
  enableStatusFilter: z.coerce.boolean().default(false),
  enableRealTimeUpdates: z.coerce.boolean().default(false),
  paginationSize: z.coerce.number().int().positive().default(50),
});

export type InvestigationConfig = z.infer<typeof InvestigationConfigSchema>;

export function loadInvestigationConfig(): InvestigationConfig {
  const config = {
    pollingInterval: process.env.REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS || '10000',
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    enableStatusFilter: process.env.REACT_APP_FEATURE_ENABLE_STATUS_FILTER === 'true',
    enableRealTimeUpdates: process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES === 'true',
    paginationSize: process.env.REACT_APP_PAGINATION_SIZE || '50',
  };

  const result = InvestigationConfigSchema.safeParse(config);

  if (!result.success) {
    console.error('Invalid investigation configuration:', result.error.format());
    throw new Error('Investigation configuration validation failed - check environment variables');
  }

  return result.data;
}

// Create a singleton instance
let cachedConfig: InvestigationConfig | null = null;

export function getInvestigationConfig(): InvestigationConfig {
  if (!cachedConfig) {
    cachedConfig = loadInvestigationConfig();
  }
  return cachedConfig;
}
