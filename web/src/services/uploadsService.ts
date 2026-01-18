/**
 * Uploads Service
 * API calls for upload management
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create uploads API instance
const uploadsApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests and handle FormData properly
uploadsApi.interceptors.request.use((config) => {
  const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}');
  if (authData?.state?.token) {
    config.headers.Authorization = `Bearer ${authData.state.token}`;
  }

  // When uploading FormData, delete Content-Type header so axios sets it
  // automatically with the correct multipart boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Handle response
uploadsApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bayit-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export interface MonitoredFolder {
  id: string;
  name?: string;
  path: string;
  enabled: boolean;
  content_type: string;
  auto_upload: boolean;
  last_scanned?: string;
  include_patterns?: string[];
  exclude_patterns?: string[];
}

// Upload processing stages
export type UploadStage = 
  | 'browser_upload'      // File chunks being sent from browser to server
  | 'hash_calculation'    // Server calculating file hash
  | 'duplicate_check'     // Checking for duplicates
  | 'metadata_extraction' // Extracting file metadata
  | 'gcs_upload'          // Uploading to Google Cloud Storage
  | 'database_insert'     // Creating content entry in database
  | 'completed'           // All done
  | 'failed';             // Failed at some stage

export interface UploadStages {
  hash_calculation?: 'pending' | 'in_progress' | 'completed';
  metadata_extraction?: 'pending' | 'in_progress' | 'completed';
  gcs_upload?: 'pending' | 'in_progress' | 'completed';
  database_insert?: 'pending' | 'in_progress' | 'completed';
  // Non-critical enrichment stages (run after upload is complete)
  imdb_lookup?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  subtitle_extraction?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'scheduled';
}

export interface UploadJob {
  job_id: string;
  filename: string;
  type: string;
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
  // Multi-stage progress tracking
  current_stage?: string | null;  // Human-readable current stage
  stages?: UploadStages;          // Detailed stage status
}

export interface QueueStats {
  total_jobs: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  skipped?: number; // Duplicates and informational skips
  total_size_bytes: number;
  uploaded_bytes: number;
}

export interface UploadQueueResponse {
  stats: QueueStats;
  active_job: UploadJob | null;
  queue: UploadJob[];
  recent_completed: UploadJob[];
  queue_paused?: boolean;
  pause_reason?: string | null;
}

/**
 * Get upload queue status
 */
export const getUploadQueue = async (): Promise<UploadQueueResponse> => {
  return uploadsApi.get('/admin/uploads/queue');
};

/**
 * Resume a paused upload queue
 */
export const resumeUploadQueue = async (): Promise<{ success: boolean; message: string }> => {
  return uploadsApi.post('/admin/uploads/queue/resume');
};

/**
 * Clear the upload queue (cancel all queued and processing jobs)
 */
export const clearUploadQueue = async (): Promise<{ success: boolean; cancelled_count: number; message: string }> => {
  return uploadsApi.post('/admin/uploads/queue/clear');
};

/**
 * Clear completed jobs from the queue history
 * Removes all completed, failed, and cancelled jobs
 */
export const clearCompletedJobs = async (): Promise<{ success: boolean; cleared_count: number; message: string }> => {
  return uploadsApi.post('/admin/uploads/queue/clear-completed');
};

/**
 * Cancel a specific upload job
 * Works for both active (processing) and queued jobs
 */
export const cancelUploadJob = async (jobId: string): Promise<{ status: string; job_id: string }> => {
  return uploadsApi.delete(`/admin/uploads/job/${jobId}`);
};

/**
 * Get monitored folders
 */
export const getMonitoredFolders = async (): Promise<MonitoredFolder[]> => {
  return uploadsApi.get('/admin/uploads/monitored-folders');
};

/**
 * Add a monitored folder
 */
export const addMonitoredFolder = async (folder: Omit<MonitoredFolder, 'id'>): Promise<MonitoredFolder> => {
  return uploadsApi.post('/admin/uploads/monitored-folders', folder);
};

/**
 * Update a monitored folder
 */
export const updateMonitoredFolder = async (
  folderId: string,
  folder: Partial<MonitoredFolder>
): Promise<MonitoredFolder> => {
  return uploadsApi.put(`/admin/uploads/monitored-folders/${folderId}`, folder);
};

/**
 * Delete a monitored folder
 */
export const deleteMonitoredFolder = async (folderId: string): Promise<void> => {
  return uploadsApi.delete(`/admin/uploads/monitored-folders/${folderId}`);
};

/**
 * Trigger immediate scan of monitored folders
 */
export const triggerUploadScan = async (
  folderId?: string,
  options?: { moviesOnly?: boolean; seriesOnly?: boolean; audiobooksOnly?: boolean }
): Promise<{ message: string; files_found: number }> => {
  const params: any = folderId ? { folder_id: folderId } : {};
  
  if (options) {
    if (options.moviesOnly) params.movies_only = true;
    if (options.seriesOnly) params.series_only = true;
    if (options.audiobooksOnly) params.audiobooks_only = true;
  }
  
  return uploadsApi.post('/admin/uploads/scan-now', null, { params });
};

/**
 * Reset the 'known files' cache for monitored folders
 * This forces a rescan of files that were previously detected
 */
export const resetFolderCache = async (folderId?: string): Promise<{ success: boolean; message: string; files_cleared: number }> => {
  const params = folderId ? { folder_id: folderId } : {};
  return uploadsApi.post('/admin/uploads/reset-cache', null, { params });
};

/**
 * Active browser upload session (in-progress uploads)
 */
export interface ActiveBrowserSession {
  upload_id: string;
  filename: string;
  file_size: number;
  content_type: string;
  total_chunks: number;
  chunks_received: number;
  missing_chunks: number[];
  bytes_received: number;
  progress: number;
  status: string;
  started_at: string;
  last_activity: string;
  job_id: string | null;
}

/**
 * Get all active browser upload sessions for the current user
 * Used to reconnect to in-progress uploads after page refresh
 */
export const getActiveBrowserSessions = async (): Promise<{ sessions: ActiveBrowserSession[]; count: number }> => {
  return uploadsApi.get('/admin/uploads/browser-upload/active');
};

/**
 * Get resume info for a specific upload session
 */
export const getUploadResumeInfo = async (uploadId: string): Promise<{
  upload_id: string;
  filename: string;
  total_chunks: number;
  chunks_received: number[];
  missing_chunks: number[];
  bytes_received: number;
  total_size: number;
  progress: number;
  status: string;
  can_resume: boolean;
  started_at: string;
  last_activity: string;
}> => {
  return uploadsApi.get(`/admin/uploads/browser-upload/${uploadId}/resume-info`);
};

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

interface UploadSession {
  upload_id: string;
  filename: string;
  file_size: number;
  chunk_size: number;
  status: string;
}

interface ChunkResponse {
  upload_id: string;
  chunk_index: number;
  bytes_received: number;
  total_size: number;
  progress: number;
  status: string;
}

/**
 * Initialize a chunked upload session
 */
const initUploadSession = async (
  filename: string,
  fileSize: number,
  contentType: string
): Promise<UploadSession> => {
  return uploadsApi.post('/admin/uploads/browser-upload/init', null, {
    params: { filename, file_size: fileSize, content_type: contentType },
  });
};

/**
 * Upload a single chunk
 * Note: Do NOT set Content-Type header manually when using FormData.
 * Axios will automatically set it with the correct multipart boundary.
 */
const uploadChunk = async (
  uploadId: string,
  chunkIndex: number,
  chunkData: Blob
): Promise<ChunkResponse> => {
  const formData = new FormData();
  formData.append('chunk', chunkData);

  return uploadsApi.post(`/admin/uploads/browser-upload/${uploadId}/chunk`, formData, {
    params: { chunk_index: chunkIndex },
    timeout: 60000, // 60s timeout per chunk
  });
};

/**
 * Complete the upload and enqueue for processing
 * Uses extended timeout since the server needs to assemble all chunks
 */
const completeUpload = async (uploadId: string): Promise<UploadJob> => {
  return uploadsApi.post(`/admin/uploads/browser-upload/${uploadId}/complete`, null, {
    timeout: 300000, // 5 minutes - assembling large files can take a while
  });
};

/**
 * Upload a file from the browser using chunked upload
 * @param file - The file to upload
 * @param contentType - The type of content (movie, series, audiobook)
 * @param onProgress - Optional progress callback (0-100)
 */
export const uploadBrowserFile = async (
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<UploadJob> => {
  // Initialize upload session
  const session = await initUploadSession(file.name, file.size, contentType);
  
  // Calculate number of chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // Upload chunks sequentially
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const response = await uploadChunk(session.upload_id, i, chunk);
    
    // Report progress
    if (onProgress) {
      onProgress(response.progress);
    }
  }
  
  // Complete upload and get the job
  const job = await completeUpload(session.upload_id);
  
  if (onProgress) {
    onProgress(100);
  }
  
  return job;
};

/**
 * Upload multiple files from browser in sequence
 * @param files - Array of files to upload
 * @param contentType - The type of content for all files
 * @param onFileProgress - Callback for individual file progress
 * @param onFileComplete - Callback when a file completes
 */
export const uploadBrowserFiles = async (
  files: File[],
  contentType: string,
  onFileProgress?: (fileIndex: number, progress: number) => void,
  onFileComplete?: (fileIndex: number, job: UploadJob) => void
): Promise<{ successful: UploadJob[]; failed: { file: File; error: string }[] }> => {
  const successful: UploadJob[] = [];
  const failed: { file: File; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const job = await uploadBrowserFile(
        file,
        contentType,
        (progress) => onFileProgress?.(i, progress)
      );
      successful.push(job);
      onFileComplete?.(i, job);
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Upload failed';
      failed.push({ file, error: errorMessage });
    }
  }

  return { successful, failed };
};

/**
 * Resume an existing upload session by uploading missing chunks
 * @param file - The original file (user must re-select it)
 * @param session - The active session info from getActiveBrowserSessions
 * @param onProgress - Optional progress callback (0-100)
 */
export const resumeBrowserUpload = async (
  file: File,
  session: ActiveBrowserSession,
  onProgress?: (progress: number) => void
): Promise<UploadJob> => {
  // Verify file matches session
  if (file.name !== session.filename || file.size !== session.file_size) {
    throw new Error(`File mismatch. Expected "${session.filename}" (${session.file_size} bytes)`);
  }

  // Get current resume info with missing chunks
  const resumeInfo = await getUploadResumeInfo(session.upload_id);

  if (!resumeInfo.can_resume) {
    throw new Error('Session cannot be resumed');
  }

  // Upload only the missing chunks
  const missingChunks = resumeInfo.missing_chunks;
  let uploadedCount = resumeInfo.chunks_received.length;
  const totalChunks = resumeInfo.total_chunks;

  for (const chunkIndex of missingChunks) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await uploadChunk(session.upload_id, chunkIndex, chunk);
    uploadedCount++;

    // Report progress
    if (onProgress) {
      const progress = (uploadedCount / totalChunks) * 100;
      onProgress(progress);
    }
  }

  // Complete upload and get the job
  const job = await completeUpload(session.upload_id);

  if (onProgress) {
    onProgress(100);
  }

  return job;
};
