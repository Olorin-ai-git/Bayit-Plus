/**
 * Google Cloud KMS Encryption Service
 * Encrypts/decrypts PII fields using Google Cloud Key Management Service
 *
 * INTEGRATES WITH:
 * - Google Cloud KMS for encryption key management
 * - Config schema for KMS configuration
 */

import { KeyManagementServiceClient } from '@google-cloud/kms';
import { getConfig } from '../config/schema';

export class EncryptionService {
  private kmsClient: KeyManagementServiceClient;
  private keyRingName: string;
  private cryptoKeyName: string;

  constructor() {
    const config = getConfig();

    this.kmsClient = new KeyManagementServiceClient();

    // KMS key path: projects/{project}/locations/{location}/keyRings/{keyRing}/cryptoKeys/{key}
    this.keyRingName = this.kmsClient.keyRingPath(
      config.storage.projectId,
      config.storage.region,
      'cvplus-keys'
    );

    this.cryptoKeyName = this.kmsClient.cryptoKeyPath(
      config.storage.projectId,
      config.storage.region,
      'cvplus-keys',
      'pii-encryption-key'
    );
  }

  /**
   * Encrypt sensitive data using Google Cloud KMS
   */
  async encrypt(plaintext: string): Promise<string> {
    try {
      const plaintextBuffer = Buffer.from(plaintext, 'utf8');

      const [encryptResponse] = await this.kmsClient.encrypt({
        name: this.cryptoKeyName,
        plaintext: plaintextBuffer,
      });

      if (!encryptResponse.ciphertext) {
        throw new Error('Encryption failed: No ciphertext returned');
      }

      // Return base64-encoded ciphertext
      return Buffer.from(encryptResponse.ciphertext as Uint8Array).toString('base64');
    } catch (error: any) {
      console.error('KMS encryption error:', error);
      throw new Error(`Failed to encrypt data: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data using Google Cloud KMS
   */
  async decrypt(ciphertext: string): Promise<string> {
    try {
      const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

      const [decryptResponse] = await this.kmsClient.decrypt({
        name: this.cryptoKeyName,
        ciphertext: ciphertextBuffer,
      });

      if (!decryptResponse.plaintext) {
        throw new Error('Decryption failed: No plaintext returned');
      }

      return Buffer.from(decryptResponse.plaintext as Uint8Array).toString('utf8');
    } catch (error: any) {
      console.error('KMS decryption error:', error);
      throw new Error(`Failed to decrypt data: ${error.message}`);
    }
  }

  /**
   * Encrypt PII fields in an object
   * Encrypts specific fields marked as PII
   */
  async encryptPII<T extends Record<string, any>>(
    data: T,
    piiFields: (keyof T)[]
  ): Promise<T> {
    const encrypted = { ...data };

    for (const field of piiFields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = await this.encrypt(encrypted[field] as string) as T[keyof T];
      }
    }

    return encrypted;
  }

  /**
   * Decrypt PII fields in an object
   * Decrypts specific fields marked as PII
   */
  async decryptPII<T extends Record<string, any>>(
    data: T,
    piiFields: (keyof T)[]
  ): Promise<T> {
    const decrypted = { ...data };

    for (const field of piiFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = await this.decrypt(decrypted[field] as string) as T[keyof T];
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decrypted;
  }

  /**
   * Encrypt user personal information
   */
  async encryptPersonalInfo(personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    [key: string]: any;
  }): Promise<typeof personalInfo> {
    return this.encryptPII(personalInfo, ['name', 'email', 'phone', 'address']);
  }

  /**
   * Decrypt user personal information
   */
  async decryptPersonalInfo(personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    [key: string]: any;
  }): Promise<typeof personalInfo> {
    return this.decryptPII(personalInfo, ['name', 'email', 'phone', 'address']);
  }

  /**
   * Encrypt contact form submission
   */
  async encryptContactSubmission(submission: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    message: string;
    [key: string]: any;
  }): Promise<typeof submission> {
    return this.encryptPII(submission, ['senderName', 'senderEmail', 'senderPhone']);
  }

  /**
   * Decrypt contact form submission
   */
  async decryptContactSubmission(submission: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    message: string;
    [key: string]: any;
  }): Promise<typeof submission> {
    return this.decryptPII(submission, ['senderName', 'senderEmail', 'senderPhone']);
  }

  /**
   * Create encryption key ring and crypto key if they don't exist
   * Should be run once during setup
   */
  async initializeKeys(): Promise<void> {
    const config = getConfig();

    try {
      // Create key ring
      try {
        await this.kmsClient.createKeyRing({
          parent: this.kmsClient.locationPath(
            config.storage.projectId,
            config.storage.region
          ),
          keyRingId: 'cvplus-keys',
        });
        console.log('✅ Created KMS key ring: cvplus-keys');
      } catch (error: any) {
        if (error.code === 6) {
          // Already exists
          console.log('✅ KMS key ring already exists');
        } else {
          throw error;
        }
      }

      // Create crypto key
      try {
        await this.kmsClient.createCryptoKey({
          parent: this.keyRingName,
          cryptoKeyId: 'pii-encryption-key',
          cryptoKey: {
            purpose: 'ENCRYPT_DECRYPT',
            versionTemplate: {
              algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION',
            },
          },
        });
        console.log('✅ Created KMS crypto key: pii-encryption-key');
      } catch (error: any) {
        if (error.code === 6) {
          // Already exists
          console.log('✅ KMS crypto key already exists');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize KMS keys:', error);
      throw error;
    }
  }
}

export const encryptionService = new EncryptionService();
