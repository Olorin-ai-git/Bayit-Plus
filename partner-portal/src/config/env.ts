/**
 * B2B Partner Portal Environment Configuration
 *
 * All values loaded from environment variables.
 * Fails fast on missing or invalid configuration.
 */

import { z } from 'zod';

const B2BConfigSchema = z.object({
  apiBaseUrl: z.string().url({
    message: 'VITE_B2B_API_BASE_URL must be a valid URL',
  }),
  docsUrl: z.string().url({
    message: 'VITE_B2B_DOCS_URL must be a valid URL',
  }),
  requestTimeoutMs: z.number().int().positive({
    message: 'VITE_B2B_REQUEST_TIMEOUT_MS must be a positive integer',
  }),
  defaultLanguage: z.enum(['he', 'en', 'es'], {
    errorMap: () => ({ message: 'VITE_B2B_DEFAULT_LANGUAGE must be one of: he, en, es' }),
  }),
  features: z.object({
    enablePlayground: z.boolean(),
    enableBilling: z.boolean(),
    enableTeamManagement: z.boolean(),
    enableWebhooks: z.boolean(),
  }),
});

export type B2BConfig = z.infer<typeof B2BConfigSchema>;

/**
 * Validates that required environment variable is present.
 * Throws immediately if missing.
 */
function requireEnv(name: string): string {
  const value = import.meta.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `[B2B Config] Missing required environment variable: ${name}. ` +
      `Please set this in your .env file.`
    );
  }
  return value;
}

/**
 * Parses boolean environment variable.
 * Defaults to true if not set (features enabled by default).
 */
function parseFeatureFlag(name: string): boolean {
  const value = import.meta.env[name];
  if (value === undefined || value === '') {
    return true; // Features enabled by default
  }
  return value !== 'false';
}

function loadB2BConfig(): B2BConfig {
  // Required environment variables - fail fast if missing
  const apiBaseUrl = requireEnv('VITE_B2B_API_BASE_URL');
  const docsUrl = requireEnv('VITE_B2B_DOCS_URL');
  const timeoutStr = requireEnv('VITE_B2B_REQUEST_TIMEOUT_MS');
  const defaultLanguage = requireEnv('VITE_B2B_DEFAULT_LANGUAGE');

  const rawConfig = {
    apiBaseUrl,
    docsUrl,
    requestTimeoutMs: parseInt(timeoutStr, 10),
    defaultLanguage,
    features: {
      enablePlayground: parseFeatureFlag('VITE_B2B_FEATURE_ENABLE_PLAYGROUND'),
      enableBilling: parseFeatureFlag('VITE_B2B_FEATURE_ENABLE_BILLING'),
      enableTeamManagement: parseFeatureFlag('VITE_B2B_FEATURE_ENABLE_TEAM'),
      enableWebhooks: parseFeatureFlag('VITE_B2B_FEATURE_ENABLE_WEBHOOKS'),
    },
  };

  const parsed = B2BConfigSchema.safeParse(rawConfig);

  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(
      `[B2B Config] Configuration validation failed:\n${errors}\n` +
      `Please check your environment variables.`
    );
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

export function getB2BApiUrl(path: string): string {
  const config = getB2BConfig();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.apiBaseUrl}/api/v1/b2b${cleanPath}`;
}

export function isB2BFeatureEnabled(feature: keyof B2BConfig['features']): boolean {
  const config = getB2BConfig();
  return config.features[feature];
}
