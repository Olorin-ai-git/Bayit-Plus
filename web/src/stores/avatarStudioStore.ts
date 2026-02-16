/**
 * Avatar Movie Studio State Management
 *
 * Manages state for the flagship Avatar Movie Studio admin feature.
 */
import create from 'zustand'
import api from '@/services/api'

export interface InteractiveMoment {
  id: string
  timestamp: number
  character_name: string
  interaction_prompt: string
  character_frame_url?: string
  voice_id?: string
  context?: string
  max_duration?: number
  auto_generate_reel?: boolean
}

export interface Movie {
  id: string
  title: string
  poster_url?: string
  year?: number
  content_type: string
  video_url?: string
  moment_count: number
  status: 'ready' | 'in_progress' | 'not_started' | 'needs_review'
}

interface AvatarStudioStore {
  movies: Movie[]
  selectedMovie: Movie | null
  moments: InteractiveMoment[]
  selectedMoment: InteractiveMoment | null
  videoTime: number
  isLoading: boolean
  error: string | null
  statusFilter: string | null
  searchQuery: string

  loadMovies: () => Promise<void>
  setStatusFilter: (filter: string | null) => void
  setSearchQuery: (query: string) => void
  selectMovie: (movieId: string) => void
  clearSelectedMovie: () => void
  loadMoments: (movieId: string) => Promise<void>
  selectMoment: (moment: InteractiveMoment | null) => void
  setVideoTime: (time: number) => void
  addMoment: (timestamp: number) => void
  updateMoment: (momentId: string, data: Partial<InteractiveMoment>) => Promise<void>
  deleteMoment: (momentId: string) => Promise<void>
  saveMoments: () => Promise<void>
  setError: (error: string | null) => void
}

export const useAvatarStudioStore = create<AvatarStudioStore>((set, get) => ({
  movies: [],
  selectedMovie: null,
  moments: [],
  selectedMoment: null,
  videoTime: 0,
  isLoading: false,
  error: null,
  statusFilter: null,
  searchQuery: '',

  loadMovies: async () => {
    set({ isLoading: true, error: null })
    try {
      const { statusFilter, searchQuery } = get()
      const params: Record<string, string> = {}
      if (statusFilter) params.status_filter = statusFilter
      if (searchQuery) params.search = searchQuery

      const movies = await api.get('/admin/avatar-studio/movies', { params })
      set({ movies, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to load movies', isLoading: false })
    }
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter })
    get().loadMovies()
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
    get().loadMovies()
  },

  selectMovie: (movieId) => {
    const movie = get().movies.find((m) => m.id === movieId)
    if (movie) {
      set({ selectedMovie: movie })
      get().loadMoments(movieId)
    }
  },

  clearSelectedMovie: () => {
    set({ selectedMovie: null, moments: [], selectedMoment: null, videoTime: 0 })
  },

  loadMoments: async (movieId) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.get(`/admin/avatar-studio/movies/${movieId}/moments`)
      set({ moments: data.moments || [], isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to load moments', isLoading: false })
    }
  },

  selectMoment: (moment) => {
    set({ selectedMoment: moment })
    if (moment) {
      set({ videoTime: moment.timestamp })
    }
  },

  setVideoTime: (time) => {
    set({ videoTime: time })
  },

  addMoment: (timestamp) => {
    const newMoment: InteractiveMoment = {
      id: `temp-${Date.now()}`,
      timestamp,
      character_name: '',
      interaction_prompt: '',
      max_duration: 60,
      auto_generate_reel: true,
    }
    set((state) => ({
      moments: [...state.moments, newMoment].sort((a, b) => a.timestamp - b.timestamp),
      selectedMoment: newMoment,
    }))
  },

  updateMoment: async (momentId, data) => {
    const { selectedMovie, moments } = get()
    if (!selectedMovie) return

    try {
      const updatedMoment = await api.patch(
        `/admin/avatar-studio/moments/${momentId}`,
        { ...data, content_id: selectedMovie.id }
      )

      set({
        moments: moments.map((m) => (m.id === momentId ? { ...m, ...updatedMoment } : m)),
        selectedMoment: get().selectedMoment?.id === momentId
          ? { ...get().selectedMoment, ...updatedMoment }
          : get().selectedMoment,
      })
    } catch (error: any) {
      set({ error: error.message || 'Failed to update moment' })
    }
  },

  deleteMoment: async (momentId) => {
    const { selectedMovie, moments } = get()
    if (!selectedMovie) return

    try {
      await api.delete(`/admin/avatar-studio/moments/${momentId}`, {
        params: { content_id: selectedMovie.id },
      })

      set({
        moments: moments.filter((m) => m.id !== momentId),
        selectedMoment: get().selectedMoment?.id === momentId ? null : get().selectedMoment,
      })
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete moment' })
    }
  },

  saveMoments: async () => {
    const { selectedMovie, moments } = get()
    if (!selectedMovie) return

    set({ isLoading: true, error: null })

    try {
      for (const moment of moments) {
        if (moment.id.startsWith('temp-')) {
          await api.post(`/admin/avatar-studio/movies/${selectedMovie.id}/moments`, moment)
        }
      }

      await get().loadMoments(selectedMovie.id)
      await get().loadMovies()
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to save moments', isLoading: false })
    }
  },

  setError: (error) => {
    set({ error })
  },
}))
