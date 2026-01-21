import { logger } from 'firebase-functions';

/**
 * Firestore Pre-write Validation Service
 * Comprehensive validation layer to ensure data integrity before Firestore operations
 * Phase 1.3 Implementation: Final safety net for timeline data
  */


export interface ValidationResult {
  isValid: boolean;
  sanitizedData: any;
  errors: string[];
  warnings: string[];
  validationContext: {
    path: string;
    operation: 'set' | 'update' | 'merge';
    timestamp: string;
    dataSize: number;
    undefinedFieldsRemoved: number;
    nullFieldsFound: number;
  };
}

export interface ValidationOptions {
  strict?: boolean; // Strict mode fails on any warnings
  allowUndefined?: boolean; // Allow undefined values (not recommended)
  allowNullValues?: boolean; // Allow null values
  maxDepth?: number; // Maximum object nesting depth
  maxArrayLength?: number; // Maximum array length
  maxStringLength?: number; // Maximum string length
  allowedTypes?: string[]; // Explicitly allowed data types
  requiredFields?: string[]; // Fields that must be present
  sanitizeOnValidation?: boolean; // Auto-sanitize during validation
}

const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  strict: false,
  allowUndefined: false,
  allowNullValues: true,
  maxDepth: 20,
  maxArrayLength: 10000,
  maxStringLength: 1048487, // Firestore field size limit
  allowedTypes: ['string', 'number', 'boolean', 'object', 'array', 'null', 'date', 'timestamp'],
  requiredFields: [],
  sanitizeOnValidation: true
};

export class FirestoreValidationService {
  
  /**
   * Comprehensive pre-write validation for Firestore operations
    */
  static validateForFirestore(
    data: any, 
    path: string = 'root',
    operation: 'set' | 'update' | 'merge' = 'update',
    options: ValidationOptions = {}
  ): ValidationResult {
    const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    const context = {
      path,
      operation,
      timestamp: new Date().toISOString(),
      dataSize: 0,
      undefinedFieldsRemoved: 0,
      nullFieldsFound: 0
    };


    try {
      // Calculate data size
      context.dataSize = JSON.stringify(data).length;
      
      // Check overall data size (Firestore document limit: 1MB)
      if (context.dataSize > 1000000) {
        errors.push(`Document size ${context.dataSize} bytes exceeds Firestore limit of 1MB`);
      }

      // Validate data structure recursively
      // For update operations, we need special handling of dot-notation paths
      let sanitizedData: any;
      let stats: { undefinedRemoved: number; nullsFound: number };
      
      if (operation === 'update' && this.isUpdateWithDotNotation(data)) {
        // Handle update operations with dot-notation field paths
        const result = this.validateUpdateDataWithPaths(data, path, opts, errors, warnings);
        sanitizedData = result.sanitizedData;
        stats = result.stats;
      } else {
        // Standard recursive validation
        const result = this.validateDataRecursive(data, path, 0, opts, errors, warnings);
        sanitizedData = result.sanitizedData;
        stats = result.stats;
      }

      context.undefinedFieldsRemoved = stats.undefinedRemoved;
      context.nullFieldsFound = stats.nullsFound;

      // Check for required fields
      if (opts.requiredFields && opts.requiredFields.length > 0) {
        this.validateRequiredFields(sanitizedData, opts.requiredFields, errors);
      }

      // Timeline-specific validation for enhanced features
      if (path.includes('enhancedFeatures.timeline') || this.isTimelineData(sanitizedData)) {
        this.validateTimelineSpecific(sanitizedData, errors, warnings);
      }

      const isValid = errors.length === 0 && (!opts.strict || warnings.length === 0);

      logger.info(`[Firestore Validation] Validation completed:`, {
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
        undefinedRemoved: context.undefinedFieldsRemoved,
        originalSize: context.dataSize
      });

      return {
        isValid,
        sanitizedData: opts.sanitizeOnValidation ? sanitizedData : data,
        errors,
        warnings,
        validationContext: context
      };

    } catch (validationError: any) {
      errors.push(`Validation process failed: ${validationError.message}`);
      
      return {
        isValid: false,
        sanitizedData: data,
        errors,
        warnings,
        validationContext: context
      };
    }
  }

  /**
   * Recursive data validation with sanitization
    */
  private static validateDataRecursive(
    value: any,
    currentPath: string,
    depth: number,
    options: ValidationOptions,
    errors: string[],
    warnings: string[]
  ): { sanitizedData: any; stats: { undefinedRemoved: number; nullsFound: number } } {
    const stats = { undefinedRemoved: 0, nullsFound: 0 };

    // Check depth limit
    if (depth > (options.maxDepth || 20)) {
      errors.push(`${currentPath}: Exceeds maximum nesting depth of ${options.maxDepth}`);
      return { sanitizedData: null, stats };
    }

    // Handle undefined values
    if (value === undefined) {
      if (!options.allowUndefined) {
        warnings.push(`${currentPath}: Undefined value removed (Firestore incompatible)`);
        stats.undefinedRemoved++;
        return { sanitizedData: undefined, stats }; // Will be filtered out by parent
      }
    }

    // Handle null values
    if (value === null) {
      stats.nullsFound++;
      if (!options.allowNullValues) {
        warnings.push(`${currentPath}: Null value found`);
      }
      return { sanitizedData: null, stats };
    }

    // Handle primitive types
    if (this.isPrimitive(value)) {
      return this.validatePrimitive(value, currentPath, options, errors, warnings, stats);
    }

    // Handle Firestore-specific types
    if (value && typeof value.toDate === 'function') {
      // Firestore Timestamp
      return { sanitizedData: value, stats };
    }

    if (value instanceof Date) {
      return { sanitizedData: value, stats };
    }

    if (value && value.constructor && value.constructor.name === 'FieldValue') {
      // Firestore FieldValue (serverTimestamp, etc.)
      return { sanitizedData: value, stats };
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return this.validateArray(value, currentPath, depth, options, errors, warnings, stats);
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      return this.validateObject(value, currentPath, depth, options, errors, warnings, stats);
    }

    // Handle unsupported types
    const valueType = typeof value;
    errors.push(`${currentPath}: Unsupported data type '${valueType}' (value: ${value})`);
    return { sanitizedData: undefined, stats };
  }

  /**
   * Validate primitive values
    */
  private static validatePrimitive(
    value: any,
    path: string,
    options: ValidationOptions,
    errors: string[],
    warnings: string[],
    stats: { undefinedRemoved: number; nullsFound: number }
  ): { sanitizedData: any; stats: { undefinedRemoved: number; nullsFound: number } } {
    
    if (typeof value === 'string') {
      // Check string length
      if (value.length > (options.maxStringLength || 1048487)) {
        errors.push(`${path}: String length ${value.length} exceeds Firestore limit`);
        return { sanitizedData: value.substring(0, options.maxStringLength || 1048487), stats };
      }
      
      // Check for problematic characters
      if (value.includes('\u0000')) {
        warnings.push(`${path}: String contains null character, may cause issues`);
      }
    }

    if (typeof value === 'number') {
      // Check for NaN and Infinity
      if (isNaN(value)) {
        errors.push(`${path}: NaN values are not supported in Firestore`);
        return { sanitizedData: null, stats };
      }
      
      if (!isFinite(value)) {
        errors.push(`${path}: Infinity values are not supported in Firestore`);
        return { sanitizedData: null, stats };
      }
    }

    return { sanitizedData: value, stats };
  }

  /**
   * Validate array data
    */
  private static validateArray(
    value: any[],
    path: string,
    depth: number,
    options: ValidationOptions,
    errors: string[],
    warnings: string[],
    stats: { undefinedRemoved: number; nullsFound: number }
  ): { sanitizedData: any; stats: { undefinedRemoved: number; nullsFound: number } } {
    
    // Check array length
    if (value.length > (options.maxArrayLength || 10000)) {
      warnings.push(`${path}: Array length ${value.length} is very large, may impact performance`);
    }

    const sanitizedArray: any[] = [];
    
    value.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      const result = this.validateDataRecursive(item, itemPath, depth + 1, options, errors, warnings);
      
      // Only include items that are not undefined after validation
      if (result.sanitizedData !== undefined) {
        sanitizedArray.push(result.sanitizedData);
      }
      
      stats.undefinedRemoved += result.stats.undefinedRemoved;
      stats.nullsFound += result.stats.nullsFound;
    });

    return { sanitizedData: sanitizedArray, stats };
  }

  /**
   * Validate object data
    */
  private static validateObject(
    value: Record<string, any>,
    path: string,
    depth: number,
    options: ValidationOptions,
    errors: string[],
    warnings: string[],
    stats: { undefinedRemoved: number; nullsFound: number }
  ): { sanitizedData: any; stats: { undefinedRemoved: number; nullsFound: number } } {
    
    const sanitizedObject: Record<string, any> = {};
    
    for (const [key, val] of Object.entries(value)) {
      // Validate field names
      if (key.includes('/') || key.includes('.')) {
        errors.push(`${path}.${key}: Field names cannot contain '/' or '.' characters`);
        continue;
      }
      
      if (key.startsWith('__') && key.endsWith('__')) {
        warnings.push(`${path}.${key}: Field names starting and ending with '__' are reserved`);
      }
      
      const fieldPath = path === 'root' ? key : `${path}.${key}`;
      const result = this.validateDataRecursive(val, fieldPath, depth + 1, options, errors, warnings);
      
      // Only include fields that are not undefined after validation
      if (result.sanitizedData !== undefined) {
        sanitizedObject[key] = result.sanitizedData;
      }
      
      stats.undefinedRemoved += result.stats.undefinedRemoved;
      stats.nullsFound += result.stats.nullsFound;
    }

    return { sanitizedData: sanitizedObject, stats };
  }

  /**
   * Timeline-specific validation rules
    */
  private static validateTimelineSpecific(
    data: any,
    errors: string[],
    warnings: string[]
  ): void {

    // Validate timeline structure
    if (data && typeof data === 'object') {
      if (data.data && typeof data.data === 'object') {
        const timelineData = data.data;
        
        // Validate events array
        if (timelineData.events && Array.isArray(timelineData.events)) {
          timelineData.events.forEach((event: any, index: number) => {
            if (!event.id) {
              warnings.push(`timeline.data.events[${index}]: Event missing required 'id' field`);
            }
            if (!event.type) {
              warnings.push(`timeline.data.events[${index}]: Event missing required 'type' field`);
            }
            if (!event.startDate) {
              warnings.push(`timeline.data.events[${index}]: Event missing required 'startDate' field`);
            }
          });
        } else if (timelineData.events !== undefined) {
          errors.push('timeline.data.events: Must be an array if present');
        }

        // Validate summary object
        if (timelineData.summary && typeof timelineData.summary !== 'object') {
          errors.push('timeline.data.summary: Must be an object if present');
        }

        // Validate insights object
        if (timelineData.insights && typeof timelineData.insights !== 'object') {
          errors.push('timeline.data.insights: Must be an object if present');
        }
      }

      // Validate timeline status
      if (data.status && !['processing', 'completed', 'failed'].includes(data.status)) {
        warnings.push(`timeline.status: Invalid status '${data.status}', should be 'processing', 'completed', or 'failed'`);
      }

      // Validate progress
      if (data.progress !== undefined) {
        if (typeof data.progress !== 'number' || data.progress < 0 || data.progress > 100) {
          warnings.push('timeline.progress: Must be a number between 0 and 100');
        }
      }
    }
  }

  /**
   * Check if data contains dot-notation field paths (for update operations)
    */
  private static isUpdateWithDotNotation(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    return Object.keys(data).some(key => key.includes('.'));
  }

  /**
   * Validate update data with dot-notation field paths
    */
  private static validateUpdateDataWithPaths(
    data: Record<string, any>,
    _path: string,
    options: ValidationOptions,
    errors: string[],
    warnings: string[]
  ): { sanitizedData: any; stats: { undefinedRemoved: number; nullsFound: number } } {
    const stats = { undefinedRemoved: 0, nullsFound: 0 };
    const sanitizedData: Record<string, any> = {};
    
    
    for (const [fieldPath, value] of Object.entries(data)) {
      // For update operations, dot-notation paths are valid Firestore field paths
      // We only need to validate the actual values, not the field names
      if (value === undefined) {
        warnings.push(`${fieldPath}: Undefined value removed (Firestore incompatible)`);
        stats.undefinedRemoved++;
        continue;
      }
      
      if (value === null) {
        stats.nullsFound++;
        if (!options.allowNullValues) {
          warnings.push(`${fieldPath}: Null value found`);
        }
        sanitizedData[fieldPath] = null;
        continue;
      }
      
      // Validate the field value recursively if it's a complex type
      if (typeof value === 'object' && value !== null && 
          !Array.isArray(value) && 
          !(value instanceof Date) &&
          (!value.constructor || value.constructor.name !== 'FieldValue')) {
        
        const result = this.validateDataRecursive(
          value, 
          fieldPath, 
          0, 
          options, 
          errors, 
          warnings
        );
        
        if (result.sanitizedData !== undefined) {
          sanitizedData[fieldPath] = result.sanitizedData;
        }
        
        stats.undefinedRemoved += result.stats.undefinedRemoved;
        stats.nullsFound += result.stats.nullsFound;
      } else {
        // Validate primitive or special values (including FieldValue)
        if (value && value.constructor && value.constructor.name === 'FieldValue') {
          // Firestore FieldValue objects are valid
          sanitizedData[fieldPath] = value;
        } else {
          const result = this.validatePrimitive(value, fieldPath, options, errors, warnings, { undefinedRemoved: 0, nullsFound: 0 });
          
          if (result.sanitizedData !== undefined) {
            sanitizedData[fieldPath] = result.sanitizedData;
          }
          
          stats.undefinedRemoved += result.stats.undefinedRemoved;
          stats.nullsFound += result.stats.nullsFound;
        }
      }
    }
    
    return { sanitizedData, stats };
  }

  /**
   * Validate required fields are present
    */
  private static validateRequiredFields(
    data: any,
    requiredFields: string[],
    errors: string[]
  ): void {
    for (const field of requiredFields) {
      if (!this.hasNestedProperty(data, field)) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
  }

  /**
   * Check if object has nested property using dot notation
    */
  private static hasNestedProperty(obj: any, path: string): boolean {
    return path.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined;
    }, obj) !== undefined;
  }

  /**
   * Check if value is primitive type
    */
  private static isPrimitive(value: any): boolean {
    const type = typeof value;
    return type === 'string' || 
           type === 'number' || 
           type === 'boolean' || 
           type === 'bigint';
  }

  /**
   * Check if data appears to be timeline-related
    */
  private static isTimelineData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    return !!(
      data.events ||
      data.timeline ||
      data.summary ||
      data.insights ||
      (data.data && (data.data.events || data.data.timeline))
    );
  }

  /**
   * Create comprehensive validation report
    */
  static createValidationReport(result: ValidationResult): string {
    const { isValid, errors, warnings, validationContext } = result;
    
    let report = `\n=== Firestore Validation Report ===\n`;
    report += `Operation: ${validationContext.operation}\n`;
    report += `Path: ${validationContext.path}\n`;
    report += `Timestamp: ${validationContext.timestamp}\n`;
    report += `Data Size: ${validationContext.dataSize} bytes\n`;
    report += `Status: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`;
    report += `Undefined Fields Removed: ${validationContext.undefinedFieldsRemoved}\n`;
    report += `Null Fields Found: ${validationContext.nullFieldsFound}\n`;
    
    if (errors.length > 0) {
      report += `\n🚨 ERRORS (${errors.length}):\n`;
      errors.forEach((error, index) => {
        report += `  ${index + 1}. ${error}\n`;
      });
    }
    
    if (warnings.length > 0) {
      report += `\n⚠️  WARNINGS (${warnings.length}):\n`;
      warnings.forEach((warning, index) => {
        report += `  ${index + 1}. ${warning}\n`;
      });
    }
    
    if (isValid) {
      report += `\n✅ Data is safe for Firestore operations\n`;
    } else {
      report += `\n❌ Data contains errors and should be fixed before Firestore operations\n`;
    }
    
    report += `=====================================\n`;
    
    return report;
  }
}