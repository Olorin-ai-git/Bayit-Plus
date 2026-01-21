// @ts-ignore - Export conflicts/**
 * Firestore Data Sanitization Utility
 * 
 * Prevents "Unsupported field value: undefined" errors by sanitizing data before Firestore writes.
 * Handles nested objects, arrays, and complex data structures safely.
 */

export interface SanitizationOptions {
  removeUndefined?: boolean;
  removeNull?: boolean;
  removeEmptyStrings?: boolean;
  removeEmptyArrays?: boolean;
  removeEmptyObjects?: boolean;
  convertNullToUndefined?: boolean;
  maxDepth?: number;
  preserveSpecialFields?: string[]; // Fields to preserve even if they would normally be removed
}

const DEFAULT_OPTIONS: SanitizationOptions = {
  removeUndefined: true,
  removeNull: false,
  removeEmptyStrings: false,
  removeEmptyArrays: false,
  removeEmptyObjects: false,
  convertNullToUndefined: false,
  maxDepth: 10,
  preserveSpecialFields: ['completedAt', 'processedAt', 'startedAt', 'updatedAt', 'createdAt']
};

export class FirestoreSanitizer {
  
  /**
   * Sanitize data for safe Firestore write operations
   */
  static sanitize(data: any, options: SanitizationOptions = {}): any {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    return this.sanitizeRecursive(data, opts, 0);
  }
  
  /**
   * Sanitize data specifically for error logging contexts
   */
  static sanitizeForErrorLogging(errorData: any): any {
    return this.sanitize(errorData, {
      removeUndefined: true,
      removeNull: false,
      removeEmptyStrings: false,
      removeEmptyArrays: true,
      removeEmptyObjects: true,
      maxDepth: 5 // Limit depth for error logs
    });
  }
  
  /**
   * Sanitize data specifically for performance metrics
   */
  static sanitizeForMetrics(metricsData: any): any {
    return this.sanitize(metricsData, {
      removeUndefined: true,
      removeNull: true,
      removeEmptyStrings: true,
      removeEmptyArrays: true,
      removeEmptyObjects: true,
      maxDepth: 3 // Shallow depth for metrics
    });
  }
  
  /**
   * Recursive sanitization with depth protection
   */
  private static sanitizeRecursive(
    value: any, 
    options: SanitizationOptions, 
    currentDepth: number
  ): any {
    // Protect against infinite recursion
    if (currentDepth >= (options.maxDepth || 10)) {
      return null;
    }
    
    // Handle undefined values
    if (value === undefined) {
      if (options.removeUndefined) {
        return undefined; // This will cause the key to be omitted
      }
      return null; // Convert to null for Firestore compatibility
    }
    
    // Handle null values
    if (value === null) {
      if (options.removeNull) {
        return undefined; // This will cause the key to be omitted
      }
      if (options.convertNullToUndefined) {
        return undefined;
      }
      return null;
    }
    
    // Handle primitive types
    if (this.isPrimitive(value)) {
      if (typeof value === 'string') {
        if (options.removeEmptyStrings && value.trim() === '') {
          return undefined;
        }
        return value;
      }
      return value;
    }
    
    // Handle Date objects (Firestore compatible)
    if (value instanceof Date) {
      return value;
    }
    
    // Handle Firestore Timestamps
    if (value && typeof value.toDate === 'function') {
      return value;
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      const sanitizedArray = value
        .map(item => this.sanitizeRecursive(item, options, currentDepth + 1))
        .filter(item => item !== undefined);
      
      if (options.removeEmptyArrays && sanitizedArray.length === 0) {
        return undefined;
      }
      
      return sanitizedArray;
    }
    
    // Handle objects
    if (typeof value === 'object' && value !== null) {
      const sanitizedObj: Record<string, any> = {};
      let hasValidProperties = false;
      
      for (const [key, val] of Object.entries(value)) {
        const sanitizedValue = this.sanitizeRecursive(val, options, currentDepth + 1);
        
        // Keep the property if:
        // 1. It's not undefined
        // 2. It's a preserved special field (even if undefined)
        const isPreservedField = options.preserveSpecialFields?.includes(key);
        
        if (sanitizedValue !== undefined || isPreservedField) {
          sanitizedObj[key] = sanitizedValue === undefined && isPreservedField ? null : sanitizedValue;
          hasValidProperties = true;
        }
      }
      
      if (options.removeEmptyObjects && !hasValidProperties) {
        return undefined;
      }
      
      return sanitizedObj;
    }
    
    // Handle functions and other unsupported types
    if (typeof value === 'function' || typeof value === 'symbol') {
      return undefined;
    }
    
    return value;
  }
  
  /**
   * Check if value is a primitive type
   */
  private static isPrimitive(value: any): boolean {
    const type = typeof value;
    return type === 'string' || 
           type === 'number' || 
           type === 'boolean' || 
           type === 'bigint';
  }
  
  /**
   * Validate that data is safe for Firestore operations
   */
  static validate(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    this.validateRecursive(data, '', errors, 0);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Recursive validation with path tracking
   */
  private static validateRecursive(
    value: any, 
    path: string, 
    errors: string[], 
    depth: number
  ): void {
    if (depth > 20) {
      errors.push(`${path}: Maximum depth exceeded`);
      return;
    }
    
    if (value === undefined) {
      errors.push(`${path}: Contains undefined value (not allowed in Firestore)`);
      return;
    }
    
    if (typeof value === 'function') {
      errors.push(`${path}: Contains function (not allowed in Firestore)`);
      return;
    }
    
    if (typeof value === 'symbol') {
      errors.push(`${path}: Contains symbol (not allowed in Firestore)`);
      return;
    }
    
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.validateRecursive(item, `${path}[${index}]`, errors, depth + 1);
      });
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      for (const [key, val] of Object.entries(value)) {
        const newPath = path ? `${path}.${key}` : key;
        this.validateRecursive(val, newPath, errors, depth + 1);
      }
    }
  }
  
  /**
   * Create a safe update object by removing undefined values
   */
  static createSafeUpdateObject(updates: Record<string, any>): Record<string, any> {
    const safeUpdates: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      const sanitizedValue = this.sanitize(value);
      if (sanitizedValue !== undefined) {
        safeUpdates[key] = sanitizedValue;
      }
    }
    
    return safeUpdates;
  }
  
  /**
   * Log sanitization results for debugging
   */
  static sanitizeWithLogging(data: any, context: string = 'unknown'): any {
    const originalValidation = this.validate(data);
    const sanitized = this.sanitize(data);
    const sanitizedValidation = this.validate(sanitized);
    
    console.log(`[FirestoreSanitizer] ${context}:`, {
      originalValid: originalValidation.isValid,
      originalErrors: originalValidation.errors,
      sanitizedValid: sanitizedValidation.isValid,
      sanitizedErrors: sanitizedValidation.errors
    });
    
    return sanitized;
  }
}

/**
 * Convenience functions for common sanitization patterns
 */

export function sanitizeForFirestore(data: any, options?: SanitizationOptions): any {
  return FirestoreSanitizer.sanitize(data, options);
}

export function sanitizeErrorContext(errorData: any): any {
  return FirestoreSanitizer.sanitizeForErrorLogging(errorData);
}

export function sanitizeMetrics(metricsData: any): any {
  return FirestoreSanitizer.sanitizeForMetrics(metricsData);
}

export function createSafeFirestoreUpdate(updates: Record<string, any>): Record<string, any> {
  return FirestoreSanitizer.createSafeUpdateObject(updates);
}