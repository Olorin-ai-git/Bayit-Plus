/**
 * Type definitions and constants for Offline Cache Service (tvOS)
 * Extracted from offlineCacheService.ts for file size compliance
 */

export const CACHE_VERSION = '1.0.0';
export const CACHE_PREFIX = '@bayit_offline_cache_';
export const CACHE_INDEX_KEY = '@bayit_cache_index';
export const CACHE_METADATA_KEY = '@bayit_cache_metadata';

// Max cache size per category (in bytes)
// tvOS: Larger limits than mobile (more storage available)
export const CACHE_LIMITS = {
  featured: 1024 * 1000,
  categories: 1024 * 400,
  search: 1024 * 500,
  continueWatching: 1024 * 200,
  favorites: 1024 * 200,
  playlist: 1024 * 200,
  liveChannels: 1024 * 300,
  multiWindow: 1024 * 150,
};

// Cache expiry times (in milliseconds)
// tvOS: Longer expiry times (TV users expect instant launch)
export const CACHE_EXPIRY = {
  featured: 1000 * 60 * 60 * 2,
  categories: 1000 * 60 * 60 * 6,
  search: 1000 * 60 * 45,
  continueWatching: 1000 * 60 * 10,
  favorites: 1000 * 60 * 60 * 2,
  playlist: 1000 * 60 * 60 * 2,
  liveChannels: 1000 * 60 * 5,
  multiWindow: 1000 * 60 * 30,
};

export type CacheCategory = keyof typeof CACHE_LIMITS;

export interface CacheEntry {
  key: string;
  category: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  size: number;
}

export interface CacheMetadata {
  version: string;
  createdAt: number;
  entries: Record<string, Omit<CacheEntry, 'data'>>;
}

export interface CacheStats {
  totalSize: number;
  entriesCount: number;
  byCategory: Record<string, { count: number; size: number }>;
}
