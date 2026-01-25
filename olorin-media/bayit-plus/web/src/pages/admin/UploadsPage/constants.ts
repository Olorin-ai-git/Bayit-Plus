/**
 * Constants for Admin Uploads Page
 * All configuration values centralized (no hardcoded values elsewhere)
 */

import type { ContentType } from './types';

// ========================================
// FILE VALIDATION
// ========================================

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv'];

export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for chunked uploads

// ========================================
// CONTENT TYPES
// ========================================

export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'movie', label: 'admin.uploads.contentTypes.movie' },
  { value: 'series', label: 'admin.uploads.contentTypes.series' },
  { value: 'podcast', label: 'admin.uploads.contentTypes.podcast' },
];

// ========================================
// UPLOAD STAGES
// ========================================

export const UPLOAD_STAGE_LABELS: Record<string, string> = {
  browser_upload: 'admin.uploads.stages.browserUpload',
  hash_calculation: 'admin.uploads.stages.hashCalculation',
  duplicate_check: 'admin.uploads.stages.duplicateCheck',
  metadata_extraction: 'admin.uploads.stages.metadataExtraction',
  gcs_upload: 'admin.uploads.stages.gcsUpload',
  database_insert: 'admin.uploads.stages.databaseInsert',
};

export const UPLOAD_STAGE_ICONS: Record<string, string> = {
  browser_upload: '📤',
  hash_calculation: '🔢',
  duplicate_check: '🔍',
  metadata_extraction: '📄',
  gcs_upload: '☁️',
  database_insert: '💾',
};

// ========================================
// WEBSOCKET CONFIGURATION
// ========================================

export const WS_RECONNECT_DELAY = 5000; // 5 seconds

export const WS_MAX_RECONNECT_ATTEMPTS = 10;

// ========================================
// POLLING CONFIGURATION (fallback)
// ========================================

export const QUEUE_REFRESH_INTERVAL = 10000; // 10 seconds

// ========================================
// DRY RUN CONFIGURATION
// ========================================

export const DRY_RUN_STORAGE_KEY = 'uploads_dry_run_enabled';
