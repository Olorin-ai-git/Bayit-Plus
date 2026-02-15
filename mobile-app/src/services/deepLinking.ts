import { Linking } from 'react-native'
import { log } from '@bayit/shared-services/logger.native'

export type DeepLinkRoute =
  | { screen: 'MovieDetail'; params: { movieId: string } }
  | { screen: 'SeriesDetail'; params: { seriesId: string } }
  | { screen: 'AudiobookDetail'; params: { audiobookId: string } }
  | { screen: 'AudiobookPlayer'; params: { audiobookId: string; startChapter?: number } }
  | { screen: 'PodcastDetail'; params: { podcastId: string } }
  | { screen: 'PodcastPlayer'; params: { episodeId: string } }
  | { screen: 'Player'; params: { id: string; type: string; t?: number } }
  | { screen: 'EPG'; params: { channelId?: string } }
  | { screen: 'LiveTV'; params: { channelId?: string } }
  | { screen: 'Beta500'; params: undefined }
  | { screen: 'Favorites'; params: undefined }
  | { screen: 'Downloads'; params: undefined }

type DeepLinkListener = (route: DeepLinkRoute) => void

class DeepLinkingService {
  private listeners: Set<DeepLinkListener> = new Set()
  private initialUrl: string | null = null

  async initialize(): Promise<void> {
    try {
      this.initialUrl = await Linking.getInitialURL()

      if (this.initialUrl) {
        log.info('App opened with deep link', { url: this.initialUrl })
        const route = this.parseUrl(this.initialUrl)
        if (route) {
          this.notifyListeners(route)
        }
      }

      Linking.addEventListener('url', this.handleDeepLink)
      log.info('Deep linking service initialized')
    } catch (error: unknown) {
      log.error('Failed to initialize deep linking', { error })
    }
  }

  private handleDeepLink = ({ url }: { url: string }) => {
    log.info('Deep link received', { url })
    const route = this.parseUrl(url)
    if (route) {
      this.notifyListeners(route)
    }
  }

  private parseUrl(url: string): DeepLinkRoute | null {
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname.replace(/^\//, '')
      const params = Object.fromEntries(urlObj.searchParams)

      if (path.startsWith('movie/')) {
        const movieId = path.replace('movie/', '')
        return { screen: 'MovieDetail', params: { movieId } }
      }

      if (path.startsWith('series/')) {
        const seriesId = path.replace('series/', '')
        return { screen: 'SeriesDetail', params: { seriesId } }
      }

      if (path.startsWith('audiobook/')) {
        const parts = path.replace('audiobook/', '').split('/')
        const audiobookId = parts[0]

        if (parts[1] === 'play') {
          const startChapter = params.chapter ? parseInt(params.chapter, 10) : undefined
          return { screen: 'AudiobookPlayer', params: { audiobookId, startChapter } }
        }

        return { screen: 'AudiobookDetail', params: { audiobookId } }
      }

      if (path.startsWith('podcast/')) {
        const parts = path.replace('podcast/', '').split('/')
        const podcastId = parts[0]

        if (parts[1] === 'episode' && parts[2]) {
          return { screen: 'PodcastPlayer', params: { episodeId: parts[2] } }
        }

        return { screen: 'PodcastDetail', params: { podcastId } }
      }

      if (path.startsWith('play/')) {
        const id = path.replace('play/', '')
        const type = params.type || 'vod'
        const t = params.t ? parseInt(params.t, 10) : undefined
        return { screen: 'Player', params: { id, type, t } }
      }

      if (path === 'epg' || path.startsWith('epg/')) {
        const channelId = path === 'epg' ? params.channelId : path.replace('epg/', '')
        return { screen: 'EPG', params: { channelId } }
      }

      if (path === 'live' || path.startsWith('live/')) {
        const channelId = path === 'live' ? params.channelId : path.replace('live/', '')
        return { screen: 'LiveTV', params: { channelId } }
      }

      if (path === 'beta500') {
        return { screen: 'Beta500', params: undefined }
      }

      if (path === 'favorites') {
        return { screen: 'Favorites', params: undefined }
      }

      if (path === 'downloads') {
        return { screen: 'Downloads', params: undefined }
      }

      log.warn('Unknown deep link path', { path })
      return null
    } catch (error: unknown) {
      log.error('Failed to parse deep link URL', { url, error })
      return null
    }
  }

  addListener(listener: DeepLinkListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(route: DeepLinkRoute): void {
    this.listeners.forEach(listener => {
      listener(route)
    })
  }

  async openUrl(url: string): Promise<void> {
    try {
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        log.warn('Cannot open URL', { url })
      }
    } catch (error: unknown) {
      log.error('Failed to open URL', { url, error })
    }
  }

  cleanup(): void {
    Linking.removeAllListeners('url')
    this.listeners.clear()
  }
}

export const deepLinkingService = new DeepLinkingService()
