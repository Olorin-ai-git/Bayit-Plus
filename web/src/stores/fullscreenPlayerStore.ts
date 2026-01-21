import { create } from 'zustand'

interface FullscreenPlayerContent {
  id: string
  title: string
  src: string
  poster?: string
  type: 'movie' | 'series' | 'live' | 'vod'
  contentId?: string
  episodeId?: string
  seriesId?: string
  chapters?: Array<{
    start_time: number
    end_time: number
    title?: string
  }>
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
