/**
 * Safe Firestore Service
 * Wrapper for Firestore operations with comprehensive pre-write validation
 * Phase 1.3 Implementation: Safety layer to prevent undefined value errors
  */

import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { 
  FirestoreValidationService, 
  ValidationResult, 
  ValidationOptions 
} from './firestore-validation.service';

export interface SafeFirestoreOptions {
  validate?: boolean;
  sanitize?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  validationOptions?: ValidationOptions;
  fallbackOnError?: boolean;
  logValidation?: boolean;
}

export interface SafeOperationResult {
  success: boolean;
  validation?: ValidationResult;
  errors?: string[];
  warnings?: string[];
  sanitizedData?: any;
  retryAttempts?: number;
  fallbackUsed?: boolean;
  operationTime?: number;
}

const DEFAULT_SAFE_OPTIONS: SafeFirestoreOptions = {
  validate: true,
  sanitize: true,
  retryAttempts: 3,
  retryDelay: 1000,
  validationOptions: {
    strict: false,
    sanitizeOnValidation: true,
    allowUndefined: false,
    allowNullValues: true
  },
  fallbackOnError: true,
  logValidation: true
};

export class SafeFirestoreService {
  
  /**
   * Safe Firestore update with comprehensive validation
    */
  static async safeUpdate(
    docRef: DocumentReference,
    data: Record<string, any>,
    options: SafeFirestoreOptions = {}
  ): Promise<SafeOperationResult> {
    const opts = { ...DEFAULT_SAFE_OPTIONS, ...options };
    const startTime = Date.now();
    
    
    try {
      // Pre-write validation
      let validationResult: ValidationResult | undefined;
      let finalData = data;
      
      if (opts.validate) {
        validationResult = FirestoreValidationService.validateForFirestore(
          data,
          `update:${docRef.path}`,
          'update',
          opts.validationOptions
        );
        
        if (opts.logValidation) {
        }
        
        if (!validationResult.isValid) {
          
          if (!opts.fallbackOnError) {
            return {
              success: false,
              validation: validationResult,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              operationTime: Date.now() - startTime
            };
          }
          
          // Use sanitized data as fallback
          finalData = validationResult.sanitizedData;
        } else if (opts.sanitize) {
          finalData = validationResult.sanitizedData;
        }
      }
      
      // Perform the update with retry logic
      const updateResult = await this.executeWithRetry(
        async () => {
          await docRef.update(finalData);
        },
        opts.retryAttempts || 3,
        opts.retryDelay || 1000,
        `update:${docRef.path}`
      );
      
      const operationTime = Date.now() - startTime;
      
      return {
        success: true,
        validation: validationResult,
        sanitizedData: finalData,
        retryAttempts: updateResult.attempts,
        operationTime
      };
      
    } catch (error: any) {
      
      return {
        success: false,
        errors: [error.message],
        operationTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Safe Firestore set operation with validation
    */
  static async safeSet(
    docRef: DocumentReference,
    data: Record<string, any>,
    setOptions: { merge?: boolean } = {},
    options: SafeFirestoreOptions = {}
  ): Promise<SafeOperationResult> {
    const opts = { ...DEFAULT_SAFE_OPTIONS, ...options };
    const startTime = Date.now();
    
    
    try {
      // Pre-write validation
      let validationResult: ValidationResult | undefined;
      let finalData = data;
      
      if (opts.validate) {
        validationResult = FirestoreValidationService.validateForFirestore(
          data,
          `set:${docRef.path}`,
          setOptions.merge ? 'merge' : 'set',
          opts.validationOptions
        );
        
        if (opts.logValidation) {
        }
        
        if (!validationResult.isValid) {
          
          if (!opts.fallbackOnError) {
            return {
              success: false,
              validation: validationResult,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              operationTime: Date.now() - startTime
            };
          }
          
          finalData = validationResult.sanitizedData;
        } else if (opts.sanitize) {
          finalData = validationResult.sanitizedData;
        }
      }
      
      // Perform the set with retry logic
      const setResult = await this.executeWithRetry(
        async () => {
          await docRef.set(finalData, setOptions);
        },
        opts.retryAttempts || 3,
        opts.retryDelay || 1000,
        `set:${docRef.path}`
      );
      
      const operationTime = Date.now() - startTime;
      
      return {
        success: true,
        validation: validationResult,
        sanitizedData: finalData,
        retryAttempts: setResult.attempts,
        operationTime
      };
      
    } catch (error: any) {
      
      return {
        success: false,
        errors: [error.message],
        operationTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Safe timeline-specific update with enhanced validation
    */
  static async safeTimelineUpdate(
    docRef: DocumentReference,
    timelineUpdates: Record<string, any>,
    options: SafeFirestoreOptions = {}
  ): Promise<SafeOperationResult> {
    const timelineOptions = {
      ...options,
      validationOptions: {
        ...options.validationOptions,
        strict: false,
        sanitizeOnValidation: true,
        requiredFields: [], // Timeline fields are optional
        allowNullValues: true
      }
    };
    
    
    // Add timeline-specific logging
    logger.info('[Timeline Update] Data preview:', {
      hasTimelineData: !!timelineUpdates['enhancedFeatures.timeline.data'],
      hasStatus: !!timelineUpdates['enhancedFeatures.timeline.status'],
      hasProgress: !!timelineUpdates['enhancedFeatures.timeline.progress'],
      totalFields: Object.keys(timelineUpdates).length
    });
    
    return this.safeUpdate(docRef, timelineUpdates, timelineOptions);
  }
  
  /**
   * Execute operation with retry logic
    */
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    delay: number,
    _operationName: string
  ): Promise<{ result: T; attempts: number }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
        }
        
        return { result, attempts: attempt };
        
      } catch (error: any) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError || new Error(`Operation failed after ${maxAttempts} attempts`);
  }
  
  /**
   * Batch safe operations with validation
    */
  static async safeBatch(
    operations: Array<{
      type: 'set' | 'update' | 'delete';
      ref: DocumentReference;
      data?: any;
      options?: any;
    }>,
    batchOptions: SafeFirestoreOptions = {}
  ): Promise<SafeOperationResult> {
    const opts = { ...DEFAULT_SAFE_OPTIONS, ...batchOptions };
    const startTime = Date.now();
    
    
    try {
      const batch = admin.firestore().batch();
      const validationResults: ValidationResult[] = [];
      
      for (const [index, operation] of operations.entries()) {
        if (operation.type === 'delete') {
          batch.delete(operation.ref);
          continue;
        }
        
        let finalData = operation.data;
        
        if (opts.validate && operation.data) {
          const validationResult = FirestoreValidationService.validateForFirestore(
            operation.data,
            `batch[${index}]:${operation.ref.path}`,
            operation.type === 'set' ? 'set' : 'update',
            opts.validationOptions
          );
          
          validationResults.push(validationResult);
          
          if (!validationResult.isValid && !opts.fallbackOnError) {
            throw new Error(`Batch validation failed for operation ${index}: ${validationResult.errors.join(', ')}`);
          }
          
          if (opts.sanitize || !validationResult.isValid) {
            finalData = validationResult.sanitizedData;
          }
        }
        
        if (operation.type === 'set') {
          batch.set(operation.ref, finalData, operation.options || {});
        } else {
          batch.update(operation.ref, finalData);
        }
      }
      
      // Execute batch with retry
      await this.executeWithRetry(
        async () => {
          await batch.commit();
        },
        opts.retryAttempts || 3,
        opts.retryDelay || 1000,
        'batch-commit'
      );
      
      const operationTime = Date.now() - startTime;
      
      return {
        success: true,
        operationTime,
        warnings: validationResults.flatMap(r => r.warnings)
      };
      
    } catch (error: any) {
      
      return {
        success: false,
        errors: [error.message],
        operationTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Transaction-safe operations with validation
    */
  static async safeTransaction<T>(
    updateFunction: (transaction: Transaction, safeHelpers: {
      safeUpdate: (ref: DocumentReference, data: any) => void;
      safeSet: (ref: DocumentReference, data: any, options?: any) => void;
    }) => Promise<T>,
    options: SafeFirestoreOptions = {}
  ): Promise<{ success: boolean; result?: T; errors?: string[] }> {
    const opts = { ...DEFAULT_SAFE_OPTIONS, ...options };
    
    
    try {
      const result = await admin.firestore().runTransaction(async (transaction) => {
        const safeHelpers = {
          safeUpdate: (ref: DocumentReference, data: any) => {
            if (opts.validate) {
              const validation = FirestoreValidationService.validateForFirestore(
                data,
                `transaction:${ref.path}`,
                'update',
                opts.validationOptions
              );
              
              if (!validation.isValid) {
              }
              
              const finalData = opts.sanitize ? validation.sanitizedData : data;
              transaction.update(ref, finalData);
            } else {
              transaction.update(ref, data);
            }
          },
          
          safeSet: (ref: DocumentReference, data: any, setOptions?: any) => {
            if (opts.validate) {
              const validation = FirestoreValidationService.validateForFirestore(
                data,
                `transaction:${ref.path}`,
                'set',
                opts.validationOptions
              );
              
              if (!validation.isValid) {
              }
              
              const finalData = opts.sanitize ? validation.sanitizedData : data;
              transaction.set(ref, finalData, setOptions || {});
            } else {
              transaction.set(ref, data, setOptions || {});
            }
          }
        };
        
        return await updateFunction(transaction, safeHelpers);
      });
      
      
      return { success: true, result };
      
    } catch (error: any) {
      
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
  
  /**
   * Create a pre-validated update object for timeline operations
    */
  static createSafeTimelineUpdate(updates: Record<string, any>): {
    data: Record<string, any>;
    validation: ValidationResult;
  } {
    
    const validation = FirestoreValidationService.validateForFirestore(
      updates,
      'timeline-update-preparation',
      'update',
      {
        strict: false,
        sanitizeOnValidation: true,
        allowUndefined: false,
        allowNullValues: true
      }
    );
    
    return {
      data: validation.sanitizedData,
      validation
    };
  }
  
  /**
   * Monitor and log Firestore operation performance
    */
  static async monitoredOperation<T>(
    _operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const _duration = Date.now() - startTime;
      
      
      // Log performance warning for slow operations
      if (_duration > 5000) {
      }
      
      return result;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      // Log error with duration for debugging purposes
      logger.error('Firestore operation failed', { duration, error });
      throw error;
    }
  }
}