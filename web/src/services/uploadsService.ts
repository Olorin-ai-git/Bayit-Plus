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
  id: string;
  filename: string;
  type: string;
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed';
  progress: number;
  eta_seconds?: number;
  error_message?: string;
  created_at: string;
}

export interface UploadQueue {
  active: UploadJob[];
  queued: UploadJob[];
  completed: UploadJob[];
}

/**
 * Get upload queue status
 */
export const getUploadQueue = async (): Promise<UploadQueue> => {
  return uploadsApi.get('/admin/uploads/queue');
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
