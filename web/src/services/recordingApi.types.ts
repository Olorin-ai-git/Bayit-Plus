/**
 * Recording API TypeScript interfaces
 */

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
  dubbed_audio_url?: string
  dubbed_audio_language?: string
  program_title?: string
  epg_entry_id?: string
  series_rule_id?: string
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
  dubbing_enabled?: boolean
  dubbing_target_language?: string
}

export interface ScheduleRecordingRequest {
  epg_entry_id: string
  subtitle_enabled?: boolean
  subtitle_target_language?: string
  dubbing_enabled?: boolean
  dubbing_target_language?: string
}

export interface RecordingSchedule {
  id: string
  user_id: string
  channel_id: string
  channel_name: string
  program_title: string
  start_time: string
  end_time: string
  subtitle_enabled: boolean
  subtitle_target_language?: string
  dubbing_enabled: boolean
  dubbing_target_language?: string
  series_rule_id?: string
  epg_entry_id?: string
  status: string
  recording_id?: string
  created_at: string
}

export interface SeriesRecordingRule {
  id: string
  user_id: string
  rule_name: string
  match_title: string
  match_type: 'exact' | 'contains' | 'starts_with'
  channel_ids: string[]
  scope: 'episode' | 'season' | 'all_seasons'
  subtitle_enabled: boolean
  subtitle_target_language?: string
  dubbing_enabled: boolean
  dubbing_target_language?: string
  is_active: boolean
  max_recordings: number
  recordings_count: number
  created_at: string
  updated_at: string
  last_matched_at?: string
}

export interface CreateSeriesRuleRequest {
  rule_name: string
  match_title: string
  match_type: 'exact' | 'contains' | 'starts_with'
  channel_ids?: string[]
  scope: 'episode' | 'season' | 'all_seasons'
  subtitle_enabled?: boolean
  subtitle_target_language?: string
  dubbing_enabled?: boolean
  dubbing_target_language?: string
  max_recordings?: number
}

export interface ConflictCheckResult {
  has_conflict: boolean
  conflicting_schedules: RecordingSchedule[]
}
