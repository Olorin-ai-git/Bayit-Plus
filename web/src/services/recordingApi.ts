/**
 * Recording API Service
 * Handles all recording-related API calls
 */

import api from './api'

import type {
  ConflictCheckResult,
  CreateSeriesRuleRequest,
  PaginatedRecordings,
  Recording,
  RecordingQuota,
  RecordingSchedule,
  RecordingSession,
  ScheduleRecordingRequest,
  SeriesRecordingRule,
  StartRecordingRequest,
} from './recordingApi.types'

export type {
  ConflictCheckResult,
  CreateSeriesRuleRequest,
  PaginatedRecordings,
  Recording,
  RecordingQuota,
  RecordingSchedule,
  RecordingSession,
  ScheduleRecordingRequest,
  SeriesRecordingRule,
  StartRecordingRequest,
}

export const recordingApi = {
  startRecording: async (data: StartRecordingRequest): Promise<RecordingSession> =>
    api.post('/recordings/start', data),

  stopRecording: async (sessionId: string): Promise<Recording> =>
    api.post(`/recordings/${sessionId}/stop`),

  listRecordings: async (page = 1, pageSize = 20): Promise<PaginatedRecordings> =>
    api.get('/recordings', { params: { page, page_size: pageSize } }),

  getRecording: async (recordingId: string): Promise<Recording> =>
    api.get(`/recordings/${recordingId}`),

  deleteRecording: async (recordingId: string): Promise<void> =>
    api.delete(`/recordings/${recordingId}`),

  getActiveRecordings: async (): Promise<RecordingSession[]> =>
    api.get('/recordings/active/sessions'),

  getQuota: async (): Promise<RecordingQuota> =>
    api.get('/recordings/quota/status'),

  scheduleRecording: async (data: ScheduleRecordingRequest): Promise<RecordingSchedule> =>
    api.post('/recordings/schedule', data),

  cancelSchedule: async (scheduleId: string): Promise<void> =>
    api.delete(`/recordings/schedule/${scheduleId}`),

  listSchedules: async (status?: string): Promise<RecordingSchedule[]> =>
    api.get('/recordings/schedules', { params: status ? { status } : undefined }),

  checkConflicts: async (startTime: string, endTime: string, channelId: string): Promise<ConflictCheckResult> =>
    api.get('/recordings/schedule/conflicts', {
      params: { start_time: startTime, end_time: endTime, channel_id: channelId },
    }),

  createSeriesRule: async (data: CreateSeriesRuleRequest): Promise<SeriesRecordingRule> =>
    api.post('/recordings/rules', data),

  listSeriesRules: async (): Promise<SeriesRecordingRule[]> =>
    api.get('/recordings/rules'),

  updateSeriesRule: async (ruleId: string, data: Partial<CreateSeriesRuleRequest>): Promise<SeriesRecordingRule> =>
    api.put(`/recordings/rules/${ruleId}`, data),

  deleteSeriesRule: async (ruleId: string): Promise<void> =>
    api.delete(`/recordings/rules/${ruleId}`),
}

export default recordingApi
