export interface ChannelDto {
  id: string
  name: string
  logo: string
  category: string
  streamUrl: string
}

export interface ContentDto {
  id: string
  title: string
  description: string
  poster: string
  type: 'movie' | 'series'
  rating: number
  year: number
  duration?: number
  genres: string[]
}

export interface EpisodeDto {
  id: string
  seriesId: string
  season: number
  episode: number
  title: string
  description: string
  duration: number
  thumbnail?: string
  streamUrl: string
}

export interface ProgramDto {
  id: string
  channelId: string
  title: string
  description: string
  startTime: string
  endTime: string
  category: string
}

export interface RadioStationDto {
  id: string
  name: string
  logo: string
  streamUrl: string
  category: string
  language: string
}

export interface PodcastDto {
  id: string
  title: string
  description: string
  cover: string
  author: string
  category: string
  episodeCount: number
}

export interface PodcastDetailDto extends PodcastDto {
  website?: string
  language: string
  rssUrl: string
}

export interface PodcastEpisodeDto {
  id: string
  podcastId: string
  title: string
  description: string
  duration: number
  publishedAt: string
  audioUrl: string
}

export interface AudiobookDto {
  id: string
  title: string
  author: string
  narrator: string
  cover: string
  duration: number
  rating: number
  category: string
}

export interface AudiobookDetailDto extends AudiobookDto {
  description: string
  publisher: string
  publishedYear: number
  chapters: AudiobookChapterDto[]
}

export interface AudiobookChapterDto {
  id: string
  title: string
  duration: number
  startTime: number
}

export interface UserProfileDto {
  id: string
  email: string
  displayName: string
  avatar?: string
  subscription?: 'free' | 'premium'
}

export interface WatchlistItemDto {
  id: string
  contentId: string
  addedAt: string
}

export interface FavoriteDto {
  id: string
  contentId: string
  contentType: 'channel' | 'content' | 'radio' | 'podcast' | 'audiobook'
  addedAt: string
}

export interface DownloadDto {
  id: string
  contentId: string
  contentType: 'movie' | 'episode' | 'podcast' | 'audiobook'
  title: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  downloadedAt?: string
}

export interface Beta500CreditsDto {
  userId: string
  credits: number
  usedCredits: number
  resetDate: string
  features: {
    aiSearch: boolean
    aiRecommendations: boolean
    liveDubbing: boolean
    autoCatchUp: boolean
  }
}

export interface SearchResultDto {
  channels: ChannelDto[]
  content: ContentDto[]
  radio: RadioStationDto[]
  podcasts: PodcastDto[]
  audiobooks: AudiobookDto[]
}

export interface EpgDataDto {
  channels: ChannelDto[]
  programs: ProgramDto[]
}
