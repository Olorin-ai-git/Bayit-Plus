import { create } from 'zustand'

interface FullscreenPlayerContent {
  id: string
  title: string
  src: string
  poster?: string
  type: 'movie' | 'series' | 'live' | 'vod' | 'audiobook' | 'podcast' | 'radio'
  contentId?: string
  episodeId?: string
  seriesId?: string
  chapters?: Array<{
    start_time: number
    end_time: number
    title?: string
  }>
  /** Whether this is kids content (for quiz feature) */
  is_kids_content?: boolean
  /** Age group for kids content quiz */
  age_group?: 'toddlers' | 'preschool' | 'elementary' | 'preteen'
  /** Pre-selected subtitle language from detail page */
  initialSubtitleLang?: string | null
  /** Pre-selected split/dual subtitle mode from detail page */
  initialSplitMode?: boolean
  /** Pre-selected split languages pair from detail page */
  initialSplitLanguages?: [string, string] | null
}

interface FullscreenPlayerState {
  isOpen: boolean
  content: FullscreenPlayerContent | null
  startTime: number

  // Actions
  openPlayer: (content: FullscreenPlayerContent, startTime?: number) => void
  closePlayer: () => void
  updateContent: (content: Partial<FullscreenPlayerContent>) => void
}

export const useFullscreenPlayerStore = create<FullscreenPlayerState>((set) => ({
  isOpen: false,
  content: null,
  startTime: 0,

  openPlayer: (content, startTime = 0) => {
    set({ isOpen: true, content, startTime })
    // Request fullscreen on the document
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden'
    }
  },

  closePlayer: () => {
    set({ isOpen: false, content: null, startTime: 0 })
    // Restore scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = ''
    }
    // Exit fullscreen if active
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  },

  updateContent: (updates) => {
    set((state) => ({
      content: state.content ? { ...state.content, ...updates } : null,
    }))
  },
}))
