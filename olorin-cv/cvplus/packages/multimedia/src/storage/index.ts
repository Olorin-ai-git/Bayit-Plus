/**
 * Storage Module Index
 * 
 * Exports all storage adapters, managers, and utilities for the
 * CVPlus Multimedia Module storage functionality.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Multimedia Module
  */

// ============================================================================
// STORAGE ADAPTERS
// ============================================================================

export { S3StorageAdapter } from './S3StorageAdapter';
export type { S3Config } from './S3StorageAdapter';

// ============================================================================
// STORAGE MANAGERS
// ============================================================================

export { CDNManager } from './CDNManager';
export type { 
  CDNDeploymentResult, 
  InvalidationResult 
} from './CDNManager';

export { StorageOptimizer } from './StorageOptimizer';
export type { 
  OptimizationConfig, 
  OptimizationResult, 
  OptimizationOptions 
} from './StorageOptimizer';

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

// Re-export Firebase adapter from services/storage for consistency
export { FirebaseStorageAdapter } from '../services/storage/FirebaseStorageAdapter';
export { StorageService } from '../services/storage/StorageService';

// ============================================================================
// CONSTANTS AND DEFAULTS
// ============================================================================

export const STORAGE_DEFAULTS = {
  OPTIMIZATION: {
    QUALITY: 'medium' as const,
    AUTO_FORMAT: true,
    PROGRESSIVE: true,
    STRIP_METADATA: true,
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  },
  
  CDN: {
    CACHE_TTL: 86400, // 24 hours
    INVALIDATION_BATCH_SIZE: 100,
    DEFAULT_COMPRESSION: true,
  },
  
  ADAPTERS: {
    FIREBASE: {
      TIMEOUT: 30000,
      MAX_RETRIES: 3,
      CHUNK_SIZE: 256 * 1024, // 256KB
    },
    
    S3: {
      TIMEOUT: 30000,
      MAX_RETRIES: 3,
      MULTIPART_THRESHOLD: 5 * 1024 * 1024, // 5MB
      PART_SIZE: 5 * 1024 * 1024, // 5MB
    }
  }
} as const;

// ============================================================================
// STORAGE FACTORY
// ============================================================================

/**
 * Storage factory for creating storage adapters
  */
export class StorageFactory {
  /**
   * Create Firebase storage adapter
    */
  static createFirebaseAdapter(config: any) {
    return new FirebaseStorageAdapter(config);
  }
  
  /**
   * Create S3 storage adapter
    */
  static createS3Adapter(config: S3Config) {
    return new S3StorageAdapter(config);
  }
  
  /**
   * Create CDN manager
    */
  static createCDNManager(config: any) {
    return new CDNManager(config);
  }
  
  /**
   * Create storage optimizer
    */
  static createStorageOptimizer(config: OptimizationConfig) {
    return new StorageOptimizer(config);
  }
  
  /**
   * Create unified storage service
    */
  static createStorageService(config: any) {
    return new StorageService(config);
  }
}