import { z } from 'zod';

const InvestigationConfigSchema = z.object({
  pollingInterval: z.coerce.number().int().min(1000),
  apiBaseUrl: z.string().url(),
  enableStatusFilter: z.coerce.boolean().default(false),
  enableRealTimeUpdates: z.coerce.boolean().default(false),
  paginationSize: z.coerce.number().int().positive().default(50),
  retryMaxAttempts: z.coerce.number().int().min(1),
  retryBaseDelayMs: z.coerce.number().int().min(1),
});

export type InvestigationConfig = z.infer<typeof InvestigationConfigSchema>;

let cachedConfig: InvestigationConfig | null = null;

export function getInvestigationConfig(): InvestigationConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = InvestigationConfigSchema.safeParse({
    pollingInterval: process.env.REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS,
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    enableStatusFilter: process.env.REACT_APP_FEATURE_ENABLE_STATUS_FILTER,
    enableRealTimeUpdates: process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES,
    paginationSize: process.env.REACT_APP_PAGINATION_SIZE,
    retryMaxAttempts: process.env.REACT_APP_INVESTIGATION_POLLING_RETRY_MAX_ATTEMPTS,
    retryBaseDelayMs: process.env.REACT_APP_INVESTIGATION_POLLING_RETRY_BASE_DELAY_MS,
  });

  if (!config.success) {
    console.error('Investigation configuration validation failed:', config.error.format());
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/06c5fffe-6ae5-4788-a989-0bf06eb0cb8b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'investigationConfig.ts:34',message:'Config validation failed',data:{errors:config.error.flatten().fieldErrors,envVars:{pollingInterval:process.env.REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS,retryMaxAttempts:process.env.REACT_APP_INVESTIGATION_POLLING_RETRY_MAX_ATTEMPTS,retryBaseDelayMs:process.env.REACT_APP_INVESTIGATION_POLLING_RETRY_BASE_DELAY_MS}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    throw new Error(
      `Investigation configuration validation failed. Missing or invalid values: ${Object.keys(config.error.flatten().fieldErrors).join(', ')}`
    );
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/06c5fffe-6ae5-4788-a989-0bf06eb0cb8b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'investigationConfig.ts:44',message:'Config loaded successfully',data:{pollingInterval:config.data.pollingInterval,retryMaxAttempts:config.data.retryMaxAttempts,retryBaseDelayMs:config.data.retryBaseDelayMs,apiBaseUrl:config.data.apiBaseUrl},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  cachedConfig = config.data;
  return cachedConfig;
}
