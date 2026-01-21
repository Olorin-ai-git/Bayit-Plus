/**
 * Queue Stage Configuration
 * Critical and enrichment stages for upload pipeline
 */

import { Hash, FileText, Cloud, Database, Film, Subtitles } from 'lucide-react';

export const CRITICAL_STAGES = [
  { key: 'hash_calculation', icon: Hash, label: 'Hash' },
  { key: 'metadata_extraction', icon: FileText, label: 'Metadata' },
  { key: 'gcs_upload', icon: Cloud, label: 'Cloud' },
  { key: 'database_insert', icon: Database, label: 'Database' },
] as const;

export const ENRICHMENT_STAGES = [
  { key: 'imdb_lookup', icon: Film, label: 'IMDB' },
  { key: 'subtitle_extraction', icon: Subtitles, label: 'Subtitles' },
] as const;

export const UPLOAD_STAGES = [...CRITICAL_STAGES, ...ENRICHMENT_STAGES] as const;
