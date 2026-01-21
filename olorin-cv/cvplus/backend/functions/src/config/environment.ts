/**
 * Environment configuration
 */

export interface Config {
  storage: {
    bucketName: string;
  };
  email?: {
    user?: string;
    password?: string;
    from?: string;
    service?: string;
  };
  vectorDb?: {
    provider: 'pinecone' | 'weaviate' | 'qdrant';
    apiKey?: string;
    environment?: string;
    indexName?: string;
  };
  embeddings?: {
    provider: 'openai' | 'cohere';
    apiKey?: string;
    model?: string;
  };
  calendar?: {
    google?: {
      clientId?: string;
      clientSecret?: string;
    };
    calendly?: {
      apiKey?: string;
    };
  };
  analytics?: {
    enabled: boolean;
    googleAnalyticsId?: string;
  };
}

export const config: Config = {
  storage: {
    bucketName: process.env.STORAGE_BUCKET || 'cvplus.appspot.com'
  },
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'CVPlus <noreply@cvplus.com>'
  },
  vectorDb: {
    provider: (process.env.VECTOR_DB_PROVIDER as any) || 'pinecone',
    apiKey: process.env.VECTOR_DB_API_KEY,
    environment: process.env.VECTOR_DB_ENVIRONMENT,
    indexName: process.env.VECTOR_DB_INDEX_NAME || 'cv-embeddings'
  },
  embeddings: {
    provider: (process.env.EMBEDDINGS_PROVIDER as any) || 'openai',
    apiKey: process.env.EMBEDDINGS_API_KEY,
    model: process.env.EMBEDDINGS_MODEL || 'text-embedding-ada-002'
  },
  calendar: {
    google: {
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    },
    calendly: {
      apiKey: process.env.CALENDLY_API_KEY
    }
  },
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
    googleAnalyticsId: process.env.GA_TRACKING_ID
  }
};