/**
 * Shared type definitions for VideoPlayer components
 */

export interface Chapter {
  start_time: number
  end_time: number
  title?: string
  summary?: string
}

export interface QualityOption {
  quality: string
  resolution_height: number
  content_id: string
  label?: string
}

export interface VideoPlayerProps {
  src: string
  poster?: string
  title?: string
  contentId?: string
  contentType?: string
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  isLive?: boolean
  availableSubtitleLanguages?: string[]
  autoPlay?: boolean
  chapters?: Chapter[]
  chaptersLoading?: boolean
  initialSeekTime?: number
  onShowUpgrade?: () => void
}

export interface PlayerState {
  isPlaying: boolean
  isMuted: boolean
  isFullscreen: boolean
  volume: number
  currentTime: number
  duration: number
  showControls: boolean
  loading: boolean
  currentQuality?: string
  availableQualities?: QualityOption[]
  playbackSpeed: number
}

export interface PlayerControls {
  togglePlay: () => void
  toggleMute: () => void
  toggleFullscreen: () => void
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  setVolume: (value: number) => void
  handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void
  skip: (seconds: number) => void
  seekToTime: (time: number) => void
  handleRestart: () => Promise<void>
  formatTime: (time: number) => string
  changeQuality?: (quality: string) => Promise<void>
  setPlaybackSpeed: (speed: number) => void
  skipToNextChapter: (chapters: Chapter[], currentTime: number) => void
  skipToPreviousChapter: (chapters: Chapter[], currentTime: number) => void
}
