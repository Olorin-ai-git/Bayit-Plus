import { z } from 'zod';

const InvestigationConfigSchema = z.object({
  pollingInterval: z.coerce.number().int().min(1000),
  apiBaseUrl: z.string().url(),
  enableStatusFilter: z.coerce.boolean().default(false),
  enableRealTimeUpdates: z.coerce.boolean().default(false),
  paginationSize: z.coerce.number().int().positive().default(50),
});

export type InvestigationConfig = z.infer<typeof InvestigationConfigSchema>;

let cachedConfig: InvestigationConfig | null = null;

export function getInvestigationConfig(): InvestigationConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = InvestigationConfigSchema.safeParse({
    pollingInterval: process.env.REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS || '10000',
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    enableStatusFilter: process.env.REACT_APP_FEATURE_ENABLE_STATUS_FILTER,
    enableRealTimeUpdates: process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES,
    paginationSize: process.env.REACT_APP_PAGINATION_SIZE,
  });

  if (!config.success) {
    console.error('Investigation configuration validation failed:', config.error.format());
    throw new Error(
      `Investigation configuration validation failed. Missing or invalid values: ${Object.keys(config.error.flatten().fieldErrors).join(', ')}`
    );
  }

  cachedConfig = config.data;
  return cachedConfig;
}
