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

// Add auth token to requests
uploadsApi.interceptors.request.use((config) => {
  const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}');
  if (authData?.state?.token) {
    config.headers.Authorization = `Bearer ${authData.state.token}`;
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
 * Upload a file from the browser and add it to the upload queue
 * @param file - The file to upload
 * @param contentType - The type of content (movie, series, audiobook)
 * @param onProgress - Optional progress callback
 */
export const uploadBrowserFile = async (
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<UploadJob> => {
  const formData = new FormData();
  formData.append('file', file);

  return uploadsApi.post('/admin/uploads/enqueue-browser-file', formData, {
    params: { content_type: contentType },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 0, // No timeout for large file uploads
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
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
