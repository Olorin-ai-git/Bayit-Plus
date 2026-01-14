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
export const triggerUploadScan = async (folderId?: string): Promise<{ message: string; files_found: number }> => {
  const params = folderId ? { folder_id: folderId } : {};
  return uploadsApi.post('/admin/uploads/scan-now', null, { params });
};
