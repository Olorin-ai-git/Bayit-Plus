import api from './api'

export interface EPGProgram {
  id: string
  channel_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  duration_seconds: number
  category?: string
  thumbnail?: string
  cast?: string[]
  genres?: string[]
  rating?: string
  director?: string
  recording_id?: string
  is_past: boolean
  is_now: boolean
  is_future: boolean
}

export interface Channel {
  id: string
  name: string
  name_en?: string
  name_es?: string
  description?: string
  thumbnail?: string
  logo?: string
  stream_url: string
  stream_type: string
  supports_live_subtitles: boolean
  primary_language: string
  available_translation_languages: string[]
  is_active: boolean
  order: number
  requires_subscription: string
}

export interface EPGResponse {
  programs: EPGProgram[]
  channels: Channel[]
  current_time: string
  time_window: {
    start: string
    end: string
  }
}

export interface EPGSearchResponse {
  results: EPGProgram[]
  total: number
}

export interface ChannelScheduleResponse {
  programs: EPGProgram[]
  channel_id: string
  date: string
  total: number
}

export interface CurrentProgramResponse {
  program: EPGProgram | null
  message?: string
}

export interface CatchUpStream {
  success: boolean
  program_id: string
  program_title: string
  program_start: string
  program_end: string
  recording_id: string
  stream_url: string
  seek_seconds: number
  duration_seconds: number
  subtitle_url?: string
  thumbnail?: string
  channel_name: string
  available_until: string
}

export interface CatchUpAvailability {
  available: boolean
  reason?: string
  program_id?: string
  program_title?: string
  available_until?: string
  starts_at?: string
  expired_at?: string
  message?: string
}

export interface AvailableCatchUpResponse {
  programs: EPGProgram[]
  total: number
}

export const epgApi = {
  /**
   * Get EPG data for specified channels and time range
   */
  getEPGData: async (params?: {
    channelIds?: string[]
    startTime?: string
    endTime?: string
    timezone?: string
  }): Promise<EPGResponse> => {
    const queryParams = new URLSearchParams()

    if (params?.channelIds) {
      params.channelIds.forEach(id => queryParams.append('channel_ids', id))
    }
    if (params?.startTime) {
      queryParams.append('start_time', params.startTime)
    }
    if (params?.endTime) {
      queryParams.append('end_time', params.endTime)
    }
    if (params?.timezone) {
      queryParams.append('timezone', params.timezone)
    }

    return await api.get(`/epg?${queryParams.toString()}`)
  },

  /**
   * Traditional text search in EPG data
   */
  searchEPG: async (params: {
    query: string
    channelIds?: string[]
    startTime?: string
    endTime?: string
    category?: string
  }): Promise<EPGSearchResponse> => {
    const queryParams = new URLSearchParams()
    queryParams.append('query', params.query)

    if (params.channelIds) {
      params.channelIds.forEach(id => queryParams.append('channel_ids', id))
    }
    if (params.startTime) {
      queryParams.append('start_time', params.startTime)
    }
    if (params.endTime) {
      queryParams.append('end_time', params.endTime)
    }
    if (params.category) {
      queryParams.append('category', params.category)
    }

    return await api.post(`/epg/search?${queryParams.toString()}`)
  },

  /**
   * Get full day schedule for a specific channel
   */
  getChannelSchedule: async (channelId: string, date?: string): Promise<ChannelScheduleResponse> => {
    const queryParams = new URLSearchParams()
    if (date) {
      queryParams.append('date', date)
    }

    return await api.get(`/epg/${channelId}/schedule?${queryParams.toString()}`)
  },

  /**
   * Get currently airing program for a channel
   */
  getCurrentProgram: async (channelId: string): Promise<CurrentProgramResponse> => {
    return await api.get(`/epg/${channelId}/current`)
  },

  /**
   * Get next program for a channel
   */
  getNextProgram: async (channelId: string): Promise<CurrentProgramResponse> => {
    return await api.get(`/epg/${channelId}/next`)
  },

  /**
   * Get catch-up TV stream for a past program (Premium feature)
   */
  getCatchUpStream: async (programId: string): Promise<CatchUpStream> => {
    return await api.get(`/epg/catchup/${programId}/stream`)
  },

  /**
   * Check if catch-up is available for a program
   */
  checkCatchUpAvailability: async (programId: string): Promise<CatchUpAvailability> => {
    return await api.get(`/epg/catchup/${programId}/availability`)
  },

  /**
   * Get list of programs available for catch-up
   */
  getAvailableCatchUpPrograms: async (params?: {
    channelId?: string
    limit?: number
  }): Promise<AvailableCatchUpResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.channelId) {
      queryParams.append('channel_id', params.channelId)
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString())
    }

    return await api.get(`/epg/catchup/available?${queryParams.toString()}`)
  }
}

export default epgApi
