/**
 * Firebase Types
 * 
 * Shared types for Firebase operations and data structures.
 * Provides type safety for Firestore documents and operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// FIREBASE DOCUMENT TYPES
// ============================================================================

export interface FirebaseDocument<T = Record<string, any>> {
  id: string;
  data: T;
  exists: boolean;
  ref?: any;
}

export interface FirebaseQueryResult<T = Record<string, any>> {
  docs: FirebaseDocument<T>[];
  empty: boolean;
  size: number;
}

// ============================================================================
// FIREBASE OPERATION RESULTS
// ============================================================================

export interface FirebaseOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface FirebaseWriteResult {
  success: boolean;
  documentId?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface FirebaseDeleteResult {
  success: boolean;
  deletedCount?: number;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================================================
// FIREBASE QUERY OPTIONS
// ============================================================================

export interface FirebaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  where?: {
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'not-in' | 'array-contains-any';
    value: any;
  }[];
  startAfter?: any;
  endBefore?: any;
}

// ============================================================================
// FIREBASE BATCH OPERATION TYPES
// ============================================================================

export interface FirebaseBatchWrite {
  type: 'create' | 'update' | 'delete' | 'set';
  collection: string;
  documentId: string;
  data?: any;
}

export interface FirebaseBatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{
    operation: FirebaseBatchWrite;
    error: string;
  }>;
}

// ============================================================================
// FIREBASE TIMESTAMP HELPERS
// ============================================================================

export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

// ============================================================================
// COLLECTION REFERENCE TYPES
// ============================================================================

export interface CollectionConfig<T = any> {
  name: string;
  converter?: {
    toFirestore: (data: T) => any;
    fromFirestore: (snapshot: any) => T;
  };
}

// ============================================================================
// FIREBASE SECURITY TYPES
// ============================================================================

export interface FirebaseSecurityContext {
  userId?: string;
  userRoles?: string[];
  isAdmin?: boolean;
  permissions?: string[];
}