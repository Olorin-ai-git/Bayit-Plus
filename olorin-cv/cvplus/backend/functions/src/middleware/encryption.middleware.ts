/**
 * Encryption Middleware
 * Automatically encrypts/decrypts PII fields in request/response data
 */

import { Request, Response, NextFunction } from 'express';
import { encryptionService } from '../services/encryption.service';

/**
 * Middleware to encrypt PII fields in request body
 */
export function encryptRequest(fields: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.body || typeof req.body !== 'object') {
      next();
      return;
    }

    try {
      req.body = await encryptionService.encryptPII(req.body, fields);
      next();
    } catch (error: any) {
      console.error('Encryption middleware error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to encrypt sensitive data',
      });
    }
  };
}

/**
 * Middleware to decrypt PII fields in response data
 */
export function decryptResponse(fields: string[]) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      if (data && typeof data === 'object') {
        encryptionService.decryptPII(data, fields)
          .then((decrypted) => {
            originalJson(decrypted);
          })
          .catch((error) => {
            console.error('Decryption middleware error:', error);
            // Return encrypted data if decryption fails
            originalJson(data);
          });
      } else {
        originalJson(data);
      }

      return res;
    };

    next();
  };
}

/**
 * Middleware to encrypt personal information fields
 */
export const encryptPersonalInfo = encryptRequest(['name', 'email', 'phone', 'address']);

/**
 * Middleware to decrypt personal information fields
 */
export const decryptPersonalInfo = decryptResponse(['name', 'email', 'phone', 'address']);

/**
 * Middleware to encrypt contact form fields
 */
export const encryptContactForm = encryptRequest([
  'senderName',
  'senderEmail',
  'senderPhone',
  'recipientEmail',
]);

/**
 * Middleware to decrypt contact form fields
 */
export const decryptContactForm = decryptResponse([
  'senderName',
  'senderEmail',
  'senderPhone',
  'recipientEmail',
]);

/**
 * Detect and encrypt PII fields automatically
 * Uses regex patterns to detect common PII field names
 */
export async function autoEncryptPII(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.body || typeof req.body !== 'object') {
    next();
    return;
  }

  const piiPatterns = [
    /name$/i,
    /email$/i,
    /phone$/i,
    /address$/i,
    /ssn$/i,
    /^(credit|debit)card/i,
    /password$/i,
  ];

  const piiFields: string[] = [];

  for (const key of Object.keys(req.body)) {
    if (piiPatterns.some(pattern => pattern.test(key))) {
      piiFields.push(key);
    }
  }

  if (piiFields.length > 0) {
    try {
      req.body = await encryptionService.encryptPII(req.body, piiFields);
      console.log(`Auto-encrypted PII fields: ${piiFields.join(', ')}`);
    } catch (error: any) {
      console.error('Auto-encryption error:', error);
      // Continue without encryption rather than failing the request
    }
  }

  next();
}
