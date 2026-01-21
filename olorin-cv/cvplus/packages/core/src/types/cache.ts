/**
 * Cache Types
 *
 * Type definitions for caching system
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;
}

export interface CacheConfiguration {
  memory: {
    maxSize: number;
    evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    database?: number;
  };
  ttl: {
    default: number;
    short: number;
    medium: number;
    long: number;
  };
}