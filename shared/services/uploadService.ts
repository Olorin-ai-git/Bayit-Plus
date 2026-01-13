/**
 * Upload Service
 * API client for upload queue management and monitored folders
 */

import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';

// API Base URL configuration
const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'web') {
      return 'http://localhost:8000/api/v1';
    } else if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000/api/v1';
    } else {
      return 'http://localhost:8000/api/v1';
    }
  }
  return 'https://api.bayit.tv/api/v1';
};

// Create upload API instance
const uploadApi = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // Longer timeout for uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
uploadApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface UploadJob {
  job_id: string;
  type: string;
  filename: string;
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  file_size?: number;
  bytes_uploaded: number;
  upload_speed?: number;
  eta_seconds?: number;
  destination_url?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
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
}

export interface MonitoredFolder {
  id: string;
  path: string;
  name?: string;
  enabled: boolean;
  content_type: string;
  auto_upload: boolean;
  recursive: boolean;
  file_patterns: string[];
  exclude_patterns: string[];
  scan_interval: number;
  last_scanned?: string;
  files_found: number;
  files_uploaded: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface MonitoredFolderCreate {
  path: string;
  name?: string;
  content_type: string;
  auto_upload?: boolean;
  recursive?: boolean;
  file_patterns?: string[];
  exclude_patterns?: string[];
  scan_interval?: number;
}

export interface MonitoredFolderUpdate {
  name?: string;
  enabled?: boolean;
  auto_upload?: boolean;
  recursive?: boolean;
  file_patterns?: string[];
  exclude_patterns?: string[];
  scan_interval?: number;
}

export interface UploadHistoryParams {
  limit?: number;
  offset?: number;
}

export interface UploadHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  jobs: UploadJob[];
}

export interface ScanResult {
  status: string;
  folders_scanned?: number;
  files_found?: number;
  files_enqueued?: number;
  errors?: number;
  folder?: string;
}

// Upload Service
export const uploadService = {
  /**
   * Get current upload queue status
   */
  getQueue: async (): Promise<UploadQueueResponse> => {
    const response = await uploadApi.get<UploadQueueResponse>('/admin/uploads/queue');
    return response.data;
  },

  /**
   * Get upload history with pagination
   */
  getHistory: async (params?: UploadHistoryParams): Promise<UploadHistoryResponse> => {
    const response = await uploadApi.get<UploadHistoryResponse>('/admin/uploads/history', {
      params,
    });
    return response.data;
  },

  /**
   * Get details of a specific upload job
   */
  getJob: async (jobId: string): Promise<UploadJob> => {
    const response = await uploadApi.get<UploadJob>(`/admin/uploads/job/${jobId}`);
    return response.data;
  },

  /**
   * Enqueue a single file for upload
   */
  enqueueFile: async (sourcePath: string, contentType: string): Promise<UploadJob> => {
    const response = await uploadApi.post<UploadJob>('/admin/uploads/enqueue', null, {
      params: {
        source_path: sourcePath,
        content_type: contentType,
      },
    });
    return response.data;
  },

  /**
   * Enqueue multiple files for upload
   */
  enqueueFiles: async (
    filePaths: string[],
    contentType: string
  ): Promise<{ enqueued: number; jobs: UploadJob[] }> => {
    const response = await uploadApi.post('/admin/uploads/enqueue-multiple', null, {
      params: {
        file_paths: filePaths,
        content_type: contentType,
      },
    });
    return response.data;
  },

  /**
   * Cancel an upload job
   */
  cancelUpload: async (jobId: string): Promise<{ status: string; job_id: string }> => {
    const response = await uploadApi.delete(`/admin/uploads/job/${jobId}`);
    return response.data;
  },

  /**
   * Get all monitored folders
   */
  getMonitoredFolders: async (): Promise<MonitoredFolder[]> => {
    const response = await uploadApi.get<MonitoredFolder[]>('/admin/uploads/monitored-folders');
    return response.data;
  },

  /**
   * Add a new monitored folder
   */
  addMonitoredFolder: async (folder: MonitoredFolderCreate): Promise<MonitoredFolder> => {
    const response = await uploadApi.post<MonitoredFolder>(
      '/admin/uploads/monitored-folders',
      folder
    );
    return response.data;
  },

  /**
   * Update a monitored folder
   */
  updateMonitoredFolder: async (
    folderId: string,
    updates: MonitoredFolderUpdate
  ): Promise<MonitoredFolder> => {
    const response = await uploadApi.put<MonitoredFolder>(
      `/admin/uploads/monitored-folders/${folderId}`,
      updates
    );
    return response.data;
  },

  /**
   * Remove a monitored folder
   */
  removeMonitoredFolder: async (
    folderId: string
  ): Promise<{ status: string; folder_id: string }> => {
    const response = await uploadApi.delete(`/admin/uploads/monitored-folders/${folderId}`);
    return response.data;
  },

  /**
   * Trigger an immediate scan of monitored folders
   */
  scanNow: async (folderId?: string): Promise<ScanResult> => {
    const response = await uploadApi.post<ScanResult>('/admin/uploads/scan-now', null, {
      params: folderId ? { folder_id: folderId } : undefined,
    });
    return response.data;
  },

  /**
   * Check upload service health
   */
  checkHealth: async (): Promise<{ status: string; storage_type: string; message: string }> => {
    const response = await uploadApi.get('/admin/uploads/health');
    return response.data;
  },
};

export default uploadService;
