/**
 * Firestore Sanitizer Utility
 *
 * Utility functions for sanitizing data before storing in Firestore.
 * Handles field validation, data transformation, and security sanitization.
  */

/**
 * Sanitize data for Firestore storage
  */
export function sanitizeForFirestore(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }

  if (typeof data === 'string') {
    return data.trim().substring(0, 1000); // Limit string length
  }

  if (typeof data === 'number') {
    return isNaN(data) ? 0 : data;
  }

  if (typeof data === 'boolean') {
    return data;
  }

  if (data instanceof Date) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.slice(0, 100).map(item => sanitizeForFirestore(item)); // Limit array size
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    const keys = Object.keys(data).slice(0, 50); // Limit object keys

    for (const key of keys) {
      if (isValidFirestoreKey(key)) {
        sanitized[key] = sanitizeForFirestore(data[key]);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Check if key is valid for Firestore
  */
export function isValidFirestoreKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Firestore field name restrictions
  if (key.startsWith('__') || key.includes('.') || key.includes('[') || key.includes(']')) {
    return false;
  }

  // Length restriction
  if (key.length > 1500) {
    return false;
  }

  return true;
}

/**
 * Remove sensitive fields from data
  */
export function removeSensitiveFields(data: any): any {
  const sensitiveFields = [
    'password',
    'apiKey',
    'secret',
    'token',
    'privateKey',
    'accessToken',
    'refreshToken',
    'sessionToken'
  ];

  if (!data || typeof data !== 'object') {
    return data;
  }

  const cleaned = { ...data };

  for (const field of sensitiveFields) {
    delete cleaned[field];
  }

  return cleaned;
}

/**
 * Validate data size for Firestore
  */
export function validateDataSize(data: any): {
  valid: boolean;
  size: number;
  maxSize: number;
  error?: string;
} {
  const maxSize = 1048576; // 1MB Firestore document limit
  const serialized = JSON.stringify(data);
  const size = new Blob([serialized]).size;

  return {
    valid: size <= maxSize,
    size,
    maxSize,
    error: size > maxSize ? `Data size ${size} exceeds Firestore limit of ${maxSize} bytes` : undefined
  };
}

/**
 * Sanitize metrics data for Firestore storage
  */
export function sanitizeMetrics(metrics: any): any {
  if (!metrics || typeof metrics !== 'object') {
    return {};
  }

  const sanitized: any = {};

  // Sanitize numeric metrics
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'number') {
      sanitized[key] = isNaN(value) ? 0 : value;
    } else if (typeof value === 'string') {
      sanitized[key] = value.substring(0, 200); // Limit string length
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value instanceof Date) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 50).map(item => sanitizeForFirestore(item));
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }

  return sanitized;
}