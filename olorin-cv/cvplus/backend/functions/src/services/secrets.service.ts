/**
 * Google Secret Manager Service
 * Manages application secrets using Google Cloud Secret Manager
 *
 * INTEGRATES WITH:
 * - Google Cloud Secret Manager for secret storage
 * - Config schema for secret configuration
 * - Olorin ecosystem secret management patterns
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { getConfig } from '../config/schema';

/**
 * Secret names used in the application
 */
export enum SecretName {
  // Database secrets
  MONGODB_URI = 'mongodb-uri',
  MONGODB_PASSWORD = 'mongodb-password',

  // JWT secrets
  JWT_SECRET_KEY = 'jwt-secret-key',
  SESSION_SECRET = 'session-secret',

  // Email secrets
  EMAIL_PASSWORD = 'email-password',
  EMAIL_API_KEY = 'email-api-key',

  // AI service secrets
  ANTHROPIC_API_KEY = 'anthropic-api-key',

  // Firebase secrets
  FIREBASE_CREDENTIALS_JSON = 'firebase-credentials-json',
  FIREBASE_API_KEY = 'firebase-api-key',

  // Redis secrets
  REDIS_PASSWORD = 'redis-password',

  // Third-party API keys
  GOOGLE_CALENDAR_CLIENT_SECRET = 'google-calendar-client-secret',
  CALENDLY_API_KEY = 'calendly-api-key',
  STRIPE_SECRET_KEY = 'stripe-secret-key',
  STRIPE_WEBHOOK_SECRET = 'stripe-webhook-secret',

  // Vector database secrets
  VECTOR_DB_API_KEY = 'vector-db-api-key',
  EMBEDDINGS_API_KEY = 'embeddings-api-key',
}

/**
 * Secret metadata
 */
export interface SecretMetadata {
  name: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  rotationSchedule?: string;
}

/**
 * Secret value with metadata
 */
export interface SecretValue {
  value: string;
  metadata: SecretMetadata;
}

export class SecretsService {
  private client: SecretManagerServiceClient;
  private projectId: string;
  private cache: Map<string, { value: string; expiresAt: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const config = getConfig();
    this.client = new SecretManagerServiceClient();
    this.projectId = config.storage.projectId;
    this.cache = new Map();
  }

  /**
   * Get the full secret path
   */
  private getSecretPath(secretName: string, version: string = 'latest'): string {
    return this.client.secretVersionPath(this.projectId, secretName, version);
  }

  /**
   * Access a secret from Google Secret Manager
   */
  async accessSecret(secretName: SecretName | string, version: string = 'latest'): Promise<string> {
    const cacheKey = `${secretName}:${version}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const secretPath = this.getSecretPath(secretName, version);
      const [response] = await this.client.accessSecretVersion({
        name: secretPath,
      });

      if (!response.payload?.data) {
        throw new Error(`Secret ${secretName} has no data`);
      }

      const secretValue = response.payload.data.toString();

      // Cache the secret
      this.cache.set(cacheKey, {
        value: secretValue,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      return secretValue;
    } catch (error: any) {
      console.error(`Failed to access secret ${secretName}:`, error);
      throw new Error(`Failed to access secret ${secretName}: ${error.message}`);
    }
  }

  /**
   * Access a secret with metadata
   */
  async accessSecretWithMetadata(secretName: SecretName | string, version: string = 'latest'): Promise<SecretValue> {
    try {
      const secretPath = this.getSecretPath(secretName, version);
      const [response] = await this.client.accessSecretVersion({
        name: secretPath,
      });

      if (!response.payload?.data) {
        throw new Error(`Secret ${secretName} has no data`);
      }

      const secretValue = response.payload.data.toString();

      return {
        value: secretValue,
        metadata: {
          name: secretName,
          version: version,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error: any) {
      console.error(`Failed to access secret ${secretName}:`, error);
      throw new Error(`Failed to access secret ${secretName}: ${error.message}`);
    }
  }

  /**
   * Create or update a secret
   */
  async createOrUpdateSecret(secretName: SecretName | string, secretValue: string): Promise<void> {
    try {
      // Try to get the secret first
      const secretPath = this.client.secretPath(this.projectId, secretName);

      try {
        await this.client.getSecret({ name: secretPath });
        // Secret exists, add a new version
        await this.addSecretVersion(secretName, secretValue);
      } catch (error: any) {
        if (error.code === 5) {
          // NOT_FOUND - create new secret
          await this.createSecret(secretName, secretValue);
        } else {
          throw error;
        }
      }

      // Invalidate cache
      this.invalidateCache(secretName);
    } catch (error: any) {
      console.error(`Failed to create/update secret ${secretName}:`, error);
      throw new Error(`Failed to create/update secret ${secretName}: ${error.message}`);
    }
  }

  /**
   * Create a new secret
   */
  private async createSecret(secretName: string, secretValue: string): Promise<void> {
    const parent = this.client.projectPath(this.projectId);

    // Create the secret
    const [secret] = await this.client.createSecret({
      parent,
      secretId: secretName,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });

    // Add the initial version
    await this.client.addSecretVersion({
      parent: secret.name!,
      payload: {
        data: Buffer.from(secretValue, 'utf8'),
      },
    });

    console.log(`✅ Created secret: ${secretName}`);
  }

  /**
   * Add a new version to an existing secret
   */
  private async addSecretVersion(secretName: string, secretValue: string): Promise<void> {
    const secretPath = this.client.secretPath(this.projectId, secretName);

    await this.client.addSecretVersion({
      parent: secretPath,
      payload: {
        data: Buffer.from(secretValue, 'utf8'),
      },
    });

    console.log(`✅ Updated secret: ${secretName}`);
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretName: SecretName | string): Promise<void> {
    try {
      const secretPath = this.client.secretPath(this.projectId, secretName);
      await this.client.deleteSecret({ name: secretPath });

      // Invalidate cache
      this.invalidateCache(secretName);

      console.log(`✅ Deleted secret: ${secretName}`);
    } catch (error: any) {
      console.error(`Failed to delete secret ${secretName}:`, error);
      throw new Error(`Failed to delete secret ${secretName}: ${error.message}`);
    }
  }

  /**
   * List all secrets
   */
  async listSecrets(): Promise<string[]> {
    try {
      const parent = this.client.projectPath(this.projectId);
      const [secrets] = await this.client.listSecrets({ parent });

      return secrets.map(secret => {
        const nameParts = secret.name!.split('/');
        return nameParts[nameParts.length - 1];
      });
    } catch (error: any) {
      console.error('Failed to list secrets:', error);
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * Rotate a secret (create new version with new value)
   */
  async rotateSecret(secretName: SecretName | string, newValue: string): Promise<void> {
    try {
      await this.addSecretVersion(secretName, newValue);
      this.invalidateCache(secretName);
      console.log(`✅ Rotated secret: ${secretName}`);
    } catch (error: any) {
      console.error(`Failed to rotate secret ${secretName}:`, error);
      throw new Error(`Failed to rotate secret ${secretName}: ${error.message}`);
    }
  }

  /**
   * Disable a secret version
   */
  async disableSecretVersion(secretName: SecretName | string, version: string): Promise<void> {
    try {
      const versionPath = this.getSecretPath(secretName, version);
      await this.client.disableSecretVersion({ name: versionPath });
      console.log(`✅ Disabled secret version: ${secretName}:${version}`);
    } catch (error: any) {
      console.error(`Failed to disable secret version ${secretName}:${version}:`, error);
      throw new Error(`Failed to disable secret version: ${error.message}`);
    }
  }

  /**
   * Enable a secret version
   */
  async enableSecretVersion(secretName: SecretName | string, version: string): Promise<void> {
    try {
      const versionPath = this.getSecretPath(secretName, version);
      await this.client.enableSecretVersion({ name: versionPath });
      console.log(`✅ Enabled secret version: ${secretName}:${version}`);
    } catch (error: any) {
      console.error(`Failed to enable secret version ${secretName}:${version}:`, error);
      throw new Error(`Failed to enable secret version: ${error.message}`);
    }
  }

  /**
   * Destroy a secret version (permanent deletion)
   */
  async destroySecretVersion(secretName: SecretName | string, version: string): Promise<void> {
    try {
      const versionPath = this.getSecretPath(secretName, version);
      await this.client.destroySecretVersion({ name: versionPath });
      this.invalidateCache(secretName);
      console.log(`✅ Destroyed secret version: ${secretName}:${version}`);
    } catch (error: any) {
      console.error(`Failed to destroy secret version ${secretName}:${version}:`, error);
      throw new Error(`Failed to destroy secret version: ${error.message}`);
    }
  }

  /**
   * Load all application secrets into environment
   */
  async loadApplicationSecrets(): Promise<void> {
    console.log('Loading application secrets from Google Secret Manager...');

    const secretMappings: Record<string, string> = {
      [SecretName.MONGODB_URI]: 'MONGODB_URI',
      [SecretName.JWT_SECRET_KEY]: 'JWT_SECRET_KEY',
      [SecretName.SESSION_SECRET]: 'SESSION_SECRET',
      [SecretName.EMAIL_PASSWORD]: 'EMAIL_PASSWORD',
      [SecretName.ANTHROPIC_API_KEY]: 'ANTHROPIC_API_KEY',
      [SecretName.FIREBASE_CREDENTIALS_JSON]: 'FIREBASE_CREDENTIALS_JSON',
      [SecretName.REDIS_PASSWORD]: 'REDIS_PASSWORD',
    };

    for (const [secretName, envVar] of Object.entries(secretMappings)) {
      try {
        const value = await this.accessSecret(secretName);
        process.env[envVar] = value;
        console.log(`✅ Loaded secret: ${secretName} → ${envVar}`);
      } catch (error) {
        console.warn(`⚠️  Failed to load secret ${secretName}, using environment variable if available`);
      }
    }

    console.log('✅ Application secrets loaded successfully');
  }

  /**
   * Invalidate cache for a secret
   */
  private invalidateCache(secretName: string): void {
    // Remove all versions of this secret from cache
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${secretName}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('✅ Secret cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const secretsService = new SecretsService();
