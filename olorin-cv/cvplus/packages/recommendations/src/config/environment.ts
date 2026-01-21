/**
 * Environment Configuration
 * Manages environment variables and configuration for the recommendations module
  */

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'text-embedding-3-small'
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.STORAGE_BUCKET || ''
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || ''
  },
  rag: {
    enabled: true,
    maxChunkSize: 1000,
    vectorDimension: 1536,
    openaiApiKey: process.env.OPENAI_API_KEY || ''
  }
};

export default config;