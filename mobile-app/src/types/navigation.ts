import { ContentDto, ChannelDto, PodcastDto, AudiobookDto } from './api'

export type RootStackParamList = {
  Main: undefined
  Player: { content: ContentDto }
  ChannelDetail: { channel: ChannelDto }
  ContentDetail: { content: ContentDto }
  PodcastDetail: { podcast: PodcastDto }
  PodcastPlayer: { podcastId: string; episodeId: string }
  AudiobookDetail: { audiobook: AudiobookDto }
  AudiobookPlayer: { audiobookId: string }
  EPG: undefined
  Settings: undefined
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
  Beta500: undefined
  Favorites: undefined
  Downloads: undefined
}

export type TabParamList = {
  Home: undefined
  LiveTV: undefined
  VOD: undefined
  Radio: undefined
  Podcasts: undefined
  Search: undefined
  Profile: undefined
}
