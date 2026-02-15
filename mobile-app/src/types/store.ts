import {
  ChannelDto,
  ContentDto,
  RadioStationDto,
  PodcastDto,
  AudiobookDto,
  UserProfileDto
} from './api'

export interface AuthState {
  user: UserProfileDto | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export interface ContentState {
  featuredContent: ContentDto[]
  liveChannels: ChannelDto[]
  trending: ContentDto[]
  categories: string[]
  isLoading: boolean
  error: string | null
  fetchFeaturedContent: () => Promise<void>
  fetchLiveChannels: () => Promise<void>
  fetchTrending: () => Promise<void>
}

export interface PlayerState {
  currentContent: ContentDto | RadioStationDto | null
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  play: (content: ContentDto | RadioStationDto) => void
  pause: () => void
  seekTo: (time: number) => void
  setPlaybackSpeed: (speed: number) => void
}
