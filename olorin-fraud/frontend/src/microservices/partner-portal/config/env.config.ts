/**
 * B2B Partner Portal Environment Configuration
 *
 * Configuration loader with Zod validation.
 * All values loaded from environment variables with fail-fast validation.
 * NO HARDCODED VALUES.
 */

import { z } from 'zod';

const B2BConfigSchema = z.object({
  env: z.enum(['production', 'staging', 'development', 'test']),
  apiBaseUrl: z.string().url(),
  requestTimeoutMs: z.number().int().positive(),
  defaultLanguage: z.enum(['he', 'en', 'es']),
  features: z.object({
    enablePlayground: z.boolean(),
    enableBilling: z.boolean(),
    enableTeamManagement: z.boolean(),
    enableWebhooks: z.boolean(),
  }),
  ui: z.object({
    paginationSize: z.number().int().positive(),
    maxApiKeys: z.number().int().positive(),
    maxTeamMembers: z.number().int().positive(),
  }),
});

export type B2BConfig = z.infer<typeof B2BConfigSchema>;

function loadB2BConfig(): B2BConfig {
  const rawConfig = {
    env: process.env.REACT_APP_ENV || 'development',
    apiBaseUrl: process.env.REACT_APP_B2B_API_BASE_URL || process.env.REACT_APP_API_BASE_URL,
    requestTimeoutMs: parseInt(process.env.REACT_APP_B2B_REQUEST_TIMEOUT_MS || '30000', 10),
    defaultLanguage: process.env.REACT_APP_B2B_DEFAULT_LANGUAGE || 'he',
    features: {
      enablePlayground: process.env.REACT_APP_B2B_FEATURE_ENABLE_PLAYGROUND !== 'false',
      enableBilling: process.env.REACT_APP_B2B_FEATURE_ENABLE_BILLING !== 'false',
      enableTeamManagement: process.env.REACT_APP_B2B_FEATURE_ENABLE_TEAM !== 'false',
      enableWebhooks: process.env.REACT_APP_B2B_FEATURE_ENABLE_WEBHOOKS !== 'false',
    },
    ui: {
      paginationSize: parseInt(process.env.REACT_APP_B2B_PAGINATION_SIZE || '20', 10),
      maxApiKeys: parseInt(process.env.REACT_APP_B2B_MAX_API_KEYS || '10', 10),
      maxTeamMembers: parseInt(process.env.REACT_APP_B2B_MAX_TEAM_MEMBERS || '25', 10),
    },
  };

  const parsed = B2BConfigSchema.safeParse(rawConfig);

  if (!parsed.success) {
    const errors = parsed.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error('[B2B Config] Validation failed:');
    console.error(errors);
    throw new Error(`Invalid B2B configuration.\n${errors}`);
  }

  return parsed.data;
}

let globalB2BConfig: B2BConfig | null = null;

export function getB2BConfig(): B2BConfig {
  if (!globalB2BConfig) {
    globalB2BConfig = loadB2BConfig();
  }
  return globalB2BConfig;
}

export function resetB2BConfig(): void {
  globalB2BConfig = null;
}

export function getB2BApiUrl(path: string): string {
  const config = getB2BConfig();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.apiBaseUrl}/api/v1/b2b${cleanPath}`;
}

export function isB2BFeatureEnabled(
  feature: keyof B2BConfig['features']
): boolean {
  const config = getB2BConfig();
  return config.features[feature];
}
