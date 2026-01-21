/**
 * Recording API Service
 * Handles all recording-related API calls
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
  if (authData?.state?.token) {
    config.headers.Authorization = `Bearer ${authData.state.token}`
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bayit-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

// TypeScript interfaces
export interface RecordingSession {
  id: string
  recording_id: string
  channel_id: string
  channel_name: string
  started_at: string
  status: string
  duration_seconds: number
  file_size_bytes: number
  subtitle_enabled: boolean
  subtitle_target_language?: string
}

export interface Recording {
  id: string
  channel_name: string
  title: string
  description?: string
  thumbnail?: string
  recorded_at: string
  duration_seconds: number
  file_size_bytes: number
  video_url: string
  subtitle_url?: string
  auto_delete_at: string
  view_count: number
}

export interface PaginatedRecordings {
  items: Recording[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface RecordingQuota {
  total_storage_bytes: number
  used_storage_bytes: number
  available_storage_bytes: number
  storage_usage_percentage: number
  total_storage_formatted: string
  used_storage_formatted: string
  available_storage_formatted: string
  max_recording_duration_seconds: number
  max_recording_duration_formatted: string
  max_concurrent_recordings: number
  active_recordings: number
  total_recordings: number
}

export interface StartRecordingRequest {
  channel_id: string
  subtitle_enabled?: boolean
  subtitle_target_language?: string
}

export const recordingApi = {
  /**
   * Start manual recording of live channel
   */
  startRecording: async (data: StartRecordingRequest): Promise<RecordingSession> => {
    return api.post('/recordings/start', data)
  },

  /**
   * Stop active recording
   */
  stopRecording: async (sessionId: string): Promise<Recording> => {
    return api.post(`/recordings/${sessionId}/stop`)
  },

  /**
   * List user's recordings with pagination
   */
  listRecordings: async (page: number = 1, pageSize: number = 20): Promise<PaginatedRecordings> => {
    return api.get('/recordings', {
      params: { page, page_size: pageSize }
    })
  },

  /**
   * Get recording details
   */
  getRecording: async (recordingId: string): Promise<Recording> => {
    return api.get(`/recordings/${recordingId}`)
  },

  /**
   * Delete recording
   */
  deleteRecording: async (recordingId: string): Promise<void> => {
    return api.delete(`/recordings/${recordingId}`)
  },

  /**
   * Get active recording sessions
   */
  getActiveRecordings: async (): Promise<RecordingSession[]> => {
    return api.get('/recordings/active/sessions')
  },

  /**
   * Get user's recording quota status
   */
  getQuota: async (): Promise<RecordingQuota> => {
    return api.get('/recordings/quota/status')
  }
}

export default recordingApi
