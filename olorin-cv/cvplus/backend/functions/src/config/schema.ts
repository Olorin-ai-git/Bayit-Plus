/**
 * Configuration Schema for CVPlus Backend
 * Follows Olorin ecosystem configuration patterns
 *
 * INTEGRATES WITH:
 * - olorin-shared MongoDB connection
 * - olorin-fraud Firebase auth patterns
 * - Bayit+ configuration patterns
 */

import { z } from 'zod';

// Configuration schema with strict validation
export const ConfigSchema = z.object({
  // Application URLs (REQUIRED)
  app: z.object({
    baseUrl: z.string().url(),
    name: z.string().min(1).default('CVPlus'),
    env: z.enum(['development', 'staging', 'production']),
  }),

  // API Configuration (REQUIRED)
  api: z.object({
    baseUrl: z.string().url(),
    version: z.string().default('v1'),
  }),

  // MongoDB Configuration (REQUIRED - uses olorin-shared)
  // Reference: olorin-media/bayit-plus/packages/olorin-shared/olorin_shared/database/mongodb.py
  // CVPlus uses dedicated cluster (NEW): mongodb+srv://username:password@cluster0.xwvtofw.mongodb.net/cvplus_production
  mongodb: z.object({
    uri: z.string().min(1), // mongodb+srv://username:password@cluster0.xwvtofw.mongodb.net/cvplus_production...
    dbName: z.string().min(1),
    maxPoolSize: z.number().int().positive().default(100),
    minPoolSize: z.number().int().positive().default(20),
    maxIdleTimeMs: z.number().int().positive().default(30000),
    connectTimeoutMs: z.number().int().positive().default(10000),
    serverSelectionTimeoutMs: z.number().int().positive().default(30000),
  }),

  // Storage Configuration (REQUIRED)
  storage: z.object({
    bucketName: z.string().min(1),
    projectId: z.string().min(1),
    region: z.string().default('us-east1'),
  }),

  // Email Configuration (REQUIRED)
  email: z.object({
    service: z.string().min(1),
    user: z.string().email(),
    password: z.string().min(1),
    from: z.string().email(),
  }),

  // Firebase Configuration (REQUIRED - uses olorin-fraud auth patterns)
  // Reference: olorin-fraud/backend/app/middleware/firebase_auth_middleware.py
  firebase: z.object({
    projectId: z.string().min(1),
    credentialsJson: z.string().optional(), // For service account
    apiKey: z.string().optional(), // For client SDK
  }),

  // JWT Configuration (uses olorin-shared patterns)
  // Reference: olorin-shared/olorin_shared/auth.py
  jwt: z.object({
    secretKey: z.string().min(32),
    algorithm: z.enum(['RS256', 'HS256', 'HS512']).default('HS256'),
    accessTokenExpireMinutes: z.number().int().positive().default(30),
    refreshTokenExpireDays: z.number().int().positive().default(7),
  }),

  // Security Configuration
  security: z.object({
    bcryptRounds: z.number().int().min(10).max(15).default(12),
    sessionSecret: z.string().min(32),
    sessionMaxAge: z.number().positive().default(86400000), // 24 hours in ms
  }),

  // Redis Configuration (for sessions and rate limiting)
  redis: z.object({
    host: z.string().min(1),
    port: z.number().int().positive().default(6379),
    password: z.string().optional(),
    db: z.number().int().min(0).default(0),
    tls: z.boolean().default(false),
  }),

  // Rate Limiting Configuration (uses olorin-fraud patterns)
  // Reference: olorin-fraud/backend/app/middleware/enhanced_rate_limiter.py
  rateLimit: z.object({
    maxRequests: z.number().int().positive().default(60),
    windowSeconds: z.number().int().positive().default(60),
    enableBackoff: z.boolean().default(true),
  }),

  // AI Services (REQUIRED)
  ai: z.object({
    anthropicApiKey: z.string().startsWith('sk-ant-'),
    model: z.string().default('claude-3-sonnet-20240229'),
    maxTokens: z.number().int().positive().default(4096),
  }),

  // Feature Flags
  features: z.object({
    calendarIntegration: z.boolean().default(false),
    videoThumbnails: z.boolean().default(false),
    textToSpeech: z.boolean().default(false),
    voiceInput: z.boolean().default(false),
    offlineMode: z.boolean().default(false),
    analytics: z.boolean().default(true),
  }),

  // Vector Database (OPTIONAL)
  vectorDb: z.object({
    provider: z.enum(['pinecone', 'weaviate', 'qdrant']),
    apiKey: z.string().optional(),
    environment: z.string().optional(),
    indexName: z.string().default('cv-embeddings'),
  }).optional(),

  // Embeddings (OPTIONAL)
  embeddings: z.object({
    provider: z.enum(['openai', 'cohere']),
    apiKey: z.string().optional(),
    model: z.string().default('text-embedding-ada-002'),
  }).optional(),

  // Analytics (OPTIONAL)
  analytics: z.object({
    enabled: z.boolean().default(false),
    googleAnalyticsId: z.string().optional(),
  }).optional(),

  // Calendar Integration (OPTIONAL)
  calendar: z.object({
    google: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    }).optional(),
    calendly: z.object({
      apiKey: z.string().optional(),
    }).optional(),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 * FAILS FAST on startup if configuration is invalid
 *
 * Follows Olorin ecosystem patterns:
 * - olorin-fraud: Fail-fast validation
 * - bayit-plus: Pydantic BaseSettings equivalent
 * - olorin-shared: Centralized configuration
 */
export function loadConfig(): Config {
  try {
    const config = ConfigSchema.parse({
      app: {
        baseUrl: process.env.APP_BASE_URL,
        name: process.env.APP_NAME || 'CVPlus',
        env: process.env.APP_ENV || 'development',
      },
      api: {
        baseUrl: process.env.API_BASE_URL,
        version: process.env.API_VERSION || 'v1',
      },
      mongodb: {
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB_NAME || 'cvplus',
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '100', 10),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '20', 10),
        maxIdleTimeMs: parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '30000', 10),
        connectTimeoutMs: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || '10000', 10),
        serverSelectionTimeoutMs: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '30000', 10),
      },
      storage: {
        bucketName: process.env.STORAGE_BUCKET,
        projectId: process.env.FIREBASE_PROJECT_ID,
        region: process.env.STORAGE_REGION || 'us-east1',
      },
      email: {
        service: process.env.EMAIL_SERVICE,
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM,
      },
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        credentialsJson: process.env.FIREBASE_CREDENTIALS_JSON,
        apiKey: process.env.FIREBASE_API_KEY,
      },
      jwt: {
        secretKey: process.env.JWT_SECRET_KEY,
        algorithm: (process.env.JWT_ALGORITHM || 'HS256') as 'HS256' | 'RS256' | 'HS512',
        accessTokenExpireMinutes: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES || '30', 10),
        refreshTokenExpireDays: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRE_DAYS || '7', 10),
      },
      security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
        sessionSecret: process.env.SESSION_SECRET,
        sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        tls: process.env.REDIS_TLS === 'true',
      },
      rateLimit: {
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10),
        enableBackoff: process.env.RATE_LIMIT_ENABLE_BACKOFF !== 'false',
      },
      ai: {
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10),
      },
      features: {
        calendarIntegration: process.env.FEATURE_CALENDAR === 'true',
        videoThumbnails: process.env.FEATURE_VIDEO_THUMBNAILS === 'true',
        textToSpeech: process.env.FEATURE_TEXT_TO_SPEECH === 'true',
        voiceInput: process.env.FEATURE_VOICE_INPUT === 'true',
        offlineMode: process.env.FEATURE_OFFLINE_MODE === 'true',
        analytics: process.env.FEATURE_ANALYTICS !== 'false', // default true
      },
      vectorDb: process.env.VECTOR_DB_PROVIDER ? {
        provider: process.env.VECTOR_DB_PROVIDER as 'pinecone' | 'weaviate' | 'qdrant',
        apiKey: process.env.VECTOR_DB_API_KEY,
        environment: process.env.VECTOR_DB_ENVIRONMENT,
        indexName: process.env.VECTOR_DB_INDEX_NAME || 'cv-embeddings',
      } : undefined,
      embeddings: process.env.EMBEDDINGS_PROVIDER ? {
        provider: process.env.EMBEDDINGS_PROVIDER as 'openai' | 'cohere',
        apiKey: process.env.EMBEDDINGS_API_KEY,
        model: process.env.EMBEDDINGS_MODEL || 'text-embedding-ada-002',
      } : undefined,
      analytics: {
        enabled: process.env.ANALYTICS_ENABLED === 'true',
        googleAnalyticsId: process.env.GA_TRACKING_ID,
      },
      calendar: {
        google: {
          clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        },
        calendly: {
          apiKey: process.env.CALENDLY_API_KEY,
        },
      },
    });

    console.log('✅ Configuration loaded and validated successfully');
    console.log(`   Environment: ${config.app.env}`);
    console.log(`   MongoDB: ${config.mongodb.dbName} (${config.mongodb.uri.includes('localhost') ? 'local' : 'Atlas'})`);
    console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
    console.log(`   Region: ${config.storage.region}`);

    return config;
  } catch (error) {
    console.error('❌ CRITICAL: Configuration validation failed');

    if (error instanceof z.ZodError) {
      console.error('\nDetailed validation errors:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }

    console.error('\n💡 Please check your environment variables against .env.example');
    console.error('📚 Reference: Olorin ecosystem configuration patterns');
    console.error('   - olorin-fraud: Firebase auth + fail-fast validation');
    console.error('   - bayit-plus: Pydantic BaseSettings');
    console.error('   - olorin-shared: MongoDB connection management');

    process.exit(1); // FAIL FAST
  }
}

// Singleton instance
let configInstance: Config | null = null;

/**
 * Get validated configuration instance
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}
