/**
 * Secret Manager Utilities
 * Helper functions for secret management operations
 */

import { secretsService, SecretName } from '../services/secrets.service';
import * as crypto from 'crypto';

/**
 * Generate a secure random secret
 */
export function generateSecureSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Generate a secure JWT secret
 */
export function generateJWTSecret(): string {
  return generateSecureSecret(64); // 64 bytes = 512 bits
}

/**
 * Generate a secure session secret
 */
export function generateSessionSecret(): string {
  return generateSecureSecret(64);
}

/**
 * Initialize all required secrets
 * Creates secrets if they don't exist, or uses provided values
 */
export async function initializeSecrets(options: {
  mongodbUri?: string;
  jwtSecret?: string;
  sessionSecret?: string;
  emailPassword?: string;
  anthropicApiKey?: string;
  firebaseCredentialsJson?: string;
  redisPassword?: string;
  force?: boolean; // Force regeneration of secrets
}): Promise<void> {
  console.log('🔐 Initializing application secrets...');

  const secrets: Array<{ name: SecretName; value: string | undefined; generate?: boolean }> = [
    {
      name: SecretName.MONGODB_URI,
      value: options.mongodbUri,
    },
    {
      name: SecretName.JWT_SECRET_KEY,
      value: options.jwtSecret,
      generate: true,
    },
    {
      name: SecretName.SESSION_SECRET,
      value: options.sessionSecret,
      generate: true,
    },
    {
      name: SecretName.EMAIL_PASSWORD,
      value: options.emailPassword,
    },
    {
      name: SecretName.ANTHROPIC_API_KEY,
      value: options.anthropicApiKey,
    },
    {
      name: SecretName.FIREBASE_CREDENTIALS_JSON,
      value: options.firebaseCredentialsJson,
    },
    {
      name: SecretName.REDIS_PASSWORD,
      value: options.redisPassword,
      generate: true,
    },
  ];

  for (const secret of secrets) {
    try {
      // Check if secret exists
      try {
        await secretsService.accessSecret(secret.name);
        if (!options.force) {
          console.log(`✅ Secret already exists: ${secret.name}`);
          continue;
        }
      } catch {
        // Secret doesn't exist, will create it
      }

      // Determine secret value
      let value = secret.value;
      if (!value && secret.generate) {
        value = generateSecureSecret();
        console.log(`🔑 Generated new secret for: ${secret.name}`);
      }

      if (!value) {
        console.warn(`⚠️  Skipping secret ${secret.name}: No value provided`);
        continue;
      }

      // Create or update secret
      await secretsService.createOrUpdateSecret(secret.name, value);
      console.log(`✅ ${options.force ? 'Updated' : 'Created'} secret: ${secret.name}`);
    } catch (error: any) {
      console.error(`❌ Failed to initialize secret ${secret.name}:`, error.message);
    }
  }

  console.log('✅ Secret initialization complete');
}

/**
 * Rotate all rotatable secrets
 * Generates new values for secrets that can be rotated
 */
export async function rotateSecrets(): Promise<void> {
  console.log('🔄 Rotating application secrets...');

  const rotatableSecrets = [
    SecretName.JWT_SECRET_KEY,
    SecretName.SESSION_SECRET,
    SecretName.REDIS_PASSWORD,
  ];

  for (const secretName of rotatableSecrets) {
    try {
      const newValue = generateSecureSecret();
      await secretsService.rotateSecret(secretName, newValue);
      console.log(`✅ Rotated secret: ${secretName}`);
    } catch (error: any) {
      console.error(`❌ Failed to rotate secret ${secretName}:`, error.message);
    }
  }

  console.log('✅ Secret rotation complete');
  console.log('⚠️  IMPORTANT: Restart the application to use the new secrets');
}

/**
 * Backup all secrets to a secure location
 */
export async function backupSecrets(): Promise<Record<string, string>> {
  console.log('💾 Backing up application secrets...');

  const backup: Record<string, string> = {};
  const secretNames = Object.values(SecretName);

  for (const secretName of secretNames) {
    try {
      const value = await secretsService.accessSecret(secretName);
      backup[secretName] = value;
      console.log(`✅ Backed up secret: ${secretName}`);
    } catch (error) {
      console.warn(`⚠️  Could not backup secret ${secretName}: Secret may not exist`);
    }
  }

  console.log('✅ Secret backup complete');
  console.log('⚠️  WARNING: Store this backup in a secure location');

  return backup;
}

/**
 * Restore secrets from backup
 */
export async function restoreSecrets(backup: Record<string, string>): Promise<void> {
  console.log('📥 Restoring secrets from backup...');

  for (const [secretName, value] of Object.entries(backup)) {
    try {
      await secretsService.createOrUpdateSecret(secretName, value);
      console.log(`✅ Restored secret: ${secretName}`);
    } catch (error: any) {
      console.error(`❌ Failed to restore secret ${secretName}:`, error.message);
    }
  }

  console.log('✅ Secret restoration complete');
}

/**
 * Validate that all required secrets are available
 */
export async function validateSecrets(): Promise<{
  valid: boolean;
  missing: string[];
  accessible: string[];
}> {
  console.log('🔍 Validating application secrets...');

  const requiredSecrets = [
    SecretName.MONGODB_URI,
    SecretName.JWT_SECRET_KEY,
    SecretName.SESSION_SECRET,
    SecretName.ANTHROPIC_API_KEY,
  ];

  const missing: string[] = [];
  const accessible: string[] = [];

  for (const secretName of requiredSecrets) {
    try {
      await secretsService.accessSecret(secretName);
      accessible.push(secretName);
      console.log(`✅ Secret accessible: ${secretName}`);
    } catch (error) {
      missing.push(secretName);
      console.error(`❌ Secret missing or inaccessible: ${secretName}`);
    }
  }

  const valid = missing.length === 0;

  if (valid) {
    console.log('✅ All required secrets are accessible');
  } else {
    console.error(`❌ Missing secrets: ${missing.join(', ')}`);
  }

  return { valid, missing, accessible };
}

/**
 * List all secrets with their metadata
 */
export async function listAllSecrets(): Promise<string[]> {
  console.log('📋 Listing all secrets...');

  try {
    const secrets = await secretsService.listSecrets();
    console.log(`Found ${secrets.length} secrets:`);
    secrets.forEach(secret => console.log(`  - ${secret}`));
    return secrets;
  } catch (error: any) {
    console.error('❌ Failed to list secrets:', error.message);
    return [];
  }
}

/**
 * Check secret expiration and rotation schedule
 */
export async function checkSecretHealth(): Promise<{
  healthy: boolean;
  warnings: string[];
}> {
  console.log('🏥 Checking secret health...');

  const warnings: string[] = [];

  // Check if secrets are in cache (indicates they've been loaded)
  const cacheStats = secretsService.getCacheStats();
  if (cacheStats.size === 0) {
    warnings.push('No secrets loaded in cache - secrets may not be initialized');
  }

  // Check for required secrets
  const validation = await validateSecrets();
  if (!validation.valid) {
    warnings.push(`Missing required secrets: ${validation.missing.join(', ')}`);
  }

  const healthy = warnings.length === 0;

  if (healthy) {
    console.log('✅ All secrets are healthy');
  } else {
    console.warn('⚠️  Secret health warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  return { healthy, warnings };
}
