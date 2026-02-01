/**
 * Subtitles API Service
 * Extended subtitle service with AI generation job management
 */

// Re-export base service from shared
export {
  subtitlesService as baseSubtitlesService,
  subtitlePreferencesService,
} from '@bayit/shared-services/api'

import { api } from '@bayit/shared-services/api'
import { HebrewMode, EnglishMode } from '@/types/subtitle'

interface JobResponse {
  job_id: string
  content_id: string
  job_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  total_cues: number
  processed_cues: number
  error_message?: string
  created_at?: string
  started_at?: string
  completed_at?: string
}

interface ActiveJobsResponse {
  content_id: string
  nikud_job: JobResponse | null
  shoresh_job: JobResponse | null
  heblish_job: JobResponse | null
  grammar_flip_job: JobResponse | null
  slang_synthesis_job: JobResponse | null
}

interface CancelJobResponse {
  message: string
  job: JobResponse
}

/**
 * Extended subtitles service with AI generation job support
 */
export const subtitlesService = {
  // Base methods from shared service
  getLanguages: () => api.get('/subtitles/languages'),

  getTracks: (contentId: string, language?: string) =>
    api.get(`/subtitles/${contentId}`, { params: { language } }),

  getCues: (
    contentId: string,
    language: string = 'he',
    hebrewMode: HebrewMode = 'regular',
    englishMode: EnglishMode = 'regular',
    startTime?: number,
    endTime?: number
  ) =>
    api.get(`/subtitles/${contentId}/cues`, {
      params: {
        language,
        hebrew_mode: hebrewMode,
        english_mode: englishMode,
        start_time: startTime,
        end_time: endTime,
      },
    }),

  // AI Generation - Hebrew modes
  generateNikud: (contentId: string, language: string = 'he', force: boolean = false): Promise<JobResponse> =>
    api.post(`/subtitles/${contentId}/nikud`, null, { params: { language, force } }),

  generateShoresh: (contentId: string, language: string = 'he', force: boolean = false): Promise<JobResponse> =>
    api.post(`/subtitles/${contentId}/shoresh`, null, { params: { language, force } }),

  // AI Generation - English modes
  generateHeblish: (contentId: string, language: string = 'en', force: boolean = false): Promise<JobResponse> =>
    api.post(`/subtitles/${contentId}/heblish`, null, { params: { language, force } }),

  generateGrammarFlip: (contentId: string, language: string = 'en', force: boolean = false): Promise<JobResponse> =>
    api.post(`/subtitles/${contentId}/grammar-flip`, null, { params: { language, force } }),

  generateSlangSynthesis: (contentId: string, language: string = 'en', force: boolean = false): Promise<JobResponse> =>
    api.post(`/subtitles/${contentId}/slang-synthesis`, null, { params: { language, force } }),

  // Job management
  getJobStatus: (jobId: string): Promise<JobResponse> =>
    api.get(`/subtitles/job/${jobId}`),

  getActiveJobs: (contentId: string): Promise<ActiveJobsResponse> =>
    api.get(`/subtitles/${contentId}/job/active`),

  cancelJob: (jobId: string): Promise<CancelJobResponse> =>
    api.post(`/subtitles/job/${jobId}/cancel`),

  // Translation helpers
  translateWord: (word: string, sourceLang: string = 'he', targetLang: string = 'en') =>
    api.post('/subtitles/translate/word', null, {
      params: { word, source_lang: sourceLang, target_lang: targetLang },
    }),

  translatePhrase: (phrase: string, sourceLang: string = 'he', targetLang: string = 'en') =>
    api.post('/subtitles/translate/phrase', null, {
      params: { phrase, source_lang: sourceLang, target_lang: targetLang },
    }),

  addNikudToText: (text: string) =>
    api.post('/subtitles/nikud/text', null, { params: { text } }),

  fetchExternal: (contentId: string, languages?: string[]) =>
    api.post(`/subtitles/${contentId}/fetch-external`, null, {
      params: languages ? { languages: languages.join(',') } : undefined,
    }),

  // Cache stats (admin)
  getCacheStats: () => api.get('/subtitles/cache/stats'),
}
