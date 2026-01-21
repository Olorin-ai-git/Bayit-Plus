/**
 * Utility Types
 * 
 * Common utility types used throughout the CVPlus platform.
 * Provides type safety and consistency for common patterns.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// GENERIC UTILITY TYPES
// ============================================================================

/** Make all properties optional recursively  */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Make all properties required recursively  */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/** Extract keys of T where the value extends U  */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/** Make specific keys optional  */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific keys required  */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Create a union of all values in an object type  */
export type ValueOf<T> = T[keyof T];

/** Create a type with nullable properties  */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

// ============================================================================
// ARRAY AND COLLECTION UTILITY TYPES
// ============================================================================

/** Extract the element type of an array  */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/** Create a non-empty array type  */
export type NonEmptyArray<T> = [T, ...T[]];

/** Create a tuple type from a union  */
export type UnionToTuple<T> = T extends any ? [T] : never;

// ============================================================================
// FUNCTION UTILITY TYPES
// ============================================================================

/** Extract the return type of a promise  */
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

/** Create an async version of a function type  */
export type AsyncFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

/** Extract function parameter types as a tuple  */
export type FunctionParameters<T> = T extends (...args: infer P) => any ? P : never;

// ============================================================================
// OBJECT MANIPULATION TYPES
// ============================================================================

/** Deep merge two object types  */
export type DeepMerge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof U
    ? K extends keyof T
      ? T[K] extends object
        ? U[K] extends object
          ? DeepMerge<T[K], U[K]>
          : U[K]
        : U[K]
      : U[K]
    : K extends keyof T
    ? T[K]
    : never;
};

/** Create a type with only specific keys from T  */
export type Subset<T, K extends keyof T> = Pick<T, K>;

/** Remove specific keys from T  */
export type Without<T, K extends keyof T> = Omit<T, K>;

// ============================================================================
// VALIDATION AND STATUS TYPES (renamed to avoid conflicts)
// ============================================================================

export interface UtilityValidationResult<T = any> {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: T;
}

export interface UtilityProcessingStatus {
  stage: string;
  progress: number; // 0-100
  message?: string;
  timestamp: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// METADATA AND TIMESTAMPS
// ============================================================================

export interface Timestamps {
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

export interface Metadata extends Timestamps {
  createdBy?: string;
  updatedBy?: string;
  version?: number;
  tags?: string[];
}

export interface AuditLog extends Timestamps {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}

// ============================================================================
// CONDITIONAL TYPES
// ============================================================================

/** Check if T extends string  */
export type IsString<T> = T extends string ? true : false;

/** Check if T extends number  */
export type IsNumber<T> = T extends number ? true : false;

/** Check if T is never  */
export type IsNever<T> = [T] extends [never] ? true : false;

/** Check if T is any  */
export type IsAny<T> = 0 extends 1 & T ? true : false;