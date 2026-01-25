/**
 * Queue Component Types
 * Shared interfaces and type definitions for the upload queue system
 */

export interface UploadStages {
  hash_calculation?: 'pending' | 'in_progress' | 'completed';
  metadata_extraction?: 'pending' | 'in_progress' | 'completed';
  gcs_upload?: 'pending' | 'in_progress' | 'completed';
  database_insert?: 'pending' | 'in_progress' | 'completed';
  imdb_lookup?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  subtitle_extraction?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'scheduled';
}

export interface QueueJob {
  job_id: string;
  filename: string;
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  file_size: number;
  bytes_uploaded: number;
  upload_speed?: number | null;
  eta_seconds?: number | null;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  current_stage?: string | null;
  stages?: UploadStages;
}

export interface QueueStats {
  total_jobs: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  skipped?: number;
  total_size_bytes: number;
  uploaded_bytes: number;
}

export interface GlassQueueProps {
  stats: QueueStats;
  activeJob?: QueueJob | null;
  queue?: QueueJob[];
  recentCompleted?: QueueJob[];
  queuePaused?: boolean;
  pauseReason?: string | null;
  loading?: boolean;
  onResumeQueue?: () => void;
  onClearCompleted?: () => void;
  onCancelJob?: (jobId: string) => void;
  clearingCompleted?: boolean;
  cancellingJob?: boolean;
  noCard?: boolean;
  hideHeader?: boolean;
}
