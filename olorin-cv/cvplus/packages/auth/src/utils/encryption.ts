import { logger } from 'firebase-functions';

/**
 * Encryption Utilities
 * 
 * Utilities for encrypting and decrypting sensitive authentication data.
  */

/**
 * Simple base64 encoding (for development - use proper encryption in production)
  */
export function encodeData(data: string): string {
  try {
    return btoa(data);
  } catch (error) {
    logger.error('Failed to encode data:', error);
    return data; // Return original data if encoding fails
  }
}

/**
 * Simple base64 decoding (for development - use proper decryption in production)
  */
export function decodeData(encodedData: string): string {
  try {
    return atob(encodedData);
  } catch (error) {
    logger.error('Failed to decode data:', error);
    return encodedData; // Return original data if decoding fails
  }
}

/**
 * Encrypt sensitive data (placeholder implementation)
  */
export function encryptSensitiveData(data: string, key?: string): string {
  // In a production environment, this would use proper encryption
  // like AES-256-GCM with a proper key derivation function
  
  if (typeof window === 'undefined') {
    // Server-side encryption would be handled differently
    return encodeData(data);
  }
  
  // For now, just use base64 encoding as a placeholder
  return encodeData(data);
}

/**
 * Decrypt sensitive data (placeholder implementation)
  */
export function decryptSensitiveData(encryptedData: string, key?: string): string {
  // In a production environment, this would use proper decryption
  
  if (typeof window === 'undefined') {
    // Server-side decryption would be handled differently
    return decodeData(encryptedData);
  }
  
  // For now, just use base64 decoding as a placeholder
  return decodeData(encryptedData);
}

/**
 * Generate a random string for use as salt or nonce
  */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Simple hash function for data integrity (not cryptographically secure)
  */
export function simpleHash(data: string): string {
  let hash = 0;
  if (data.length === 0) return hash.toString();
  
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Mask sensitive data for logging (shows only first and last few characters)
  */
export function maskSensitiveData(data: string, visibleChars: number = 3): string {
  if (!data || data.length <= visibleChars * 2) {
    return '***';
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const maskLength = Math.max(3, data.length - visibleChars * 2);
  const mask = '*'.repeat(maskLength);
  
  return `${start}${mask}${end}`;
}

/**
 * Validate data integrity using a simple checksum
  */
export function validateDataIntegrity(data: string, expectedHash: string): boolean {
  const actualHash = simpleHash(data);
  return actualHash === expectedHash;
}

/**
 * Generate a secure token (placeholder - use proper cryptographic methods in production)
  */
export function generateSecureToken(length: number = 64): string {
  const array = new Uint8Array(length / 2);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Browser environment with Web Crypto API
    window.crypto.getRandomValues(array);
  } else {
    // Fallback to Math.random (not cryptographically secure)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Secure comparison of two strings (prevents timing attacks)
  */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}