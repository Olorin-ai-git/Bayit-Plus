import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system'
import NetInfo from '@react-native-community/netinfo'
import { Platform } from 'react-native'

interface CachedAudio {
  episodeId: string
  language: string
  localPath: string
  fileSize: number
  downloadedAt: number
  expiresAt?: number
}

export class AudioCacheService {
  private cacheDir = FileSystem.documentDirectory + 'podcast_cache/'
  private maxCacheSize = 500 * 1024 * 1024
  private cacheMetadataKey = '@podcast_audio_cache'

  async initialize(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir)
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true })
    }

    const maxSize = await AsyncStorage.getItem('@cache_max_size')
    if (maxSize) {
      this.maxCacheSize = parseInt(maxSize, 10)
    }
  }

  async cacheAudio(episodeId: string, language: string, remoteUrl: string): Promise<string> {
    const fileName = `${episodeId}_${language}.mp3`
    const localPath = this.cacheDir + fileName

    const cached = await this.getCachedAudio(episodeId, language)
    if (cached) {
      return cached.localPath
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      localPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
        this.emitProgress(episodeId, language, progress)
      }
    )

    const result = await downloadResumable.downloadAsync()
    if (!result) {
      throw new Error('Download failed')
    }

    const fileInfo = await FileSystem.getInfoAsync(result.uri)
    const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0

    await this.storeCacheMetadata({
      episodeId,
      language,
      localPath: result.uri,
      fileSize,
      downloadedAt: Date.now()
    })

    await this.enforceCacheSizeLimit()

    return result.uri
  }

  async getCachedAudio(episodeId: string, language: string): Promise<CachedAudio | null> {
    const metadata = await this.getAllCacheMetadata()
    const cached = metadata.find(
      item => item.episodeId === episodeId && item.language === language
    )

    if (!cached) {
      return null
    }

    const fileInfo = await FileSystem.getInfoAsync(cached.localPath)
    if (!fileInfo.exists) {
      await this.removeCacheEntry(episodeId, language)
      return null
    }

    return cached
  }

  async getAudioUrl(episodeId: string, language: string, remoteUrl: string): Promise<string> {
    const wifiOnly = await AsyncStorage.getItem('@download_wifi_only')
    const isWifi = await this.isConnectedToWiFi()

    if (wifiOnly === 'true' && !isWifi) {
      return remoteUrl
    }

    const cached = await this.getCachedAudio(episodeId, language)
    if (cached) {
      return cached.localPath
    }

    await this.cacheAudio(episodeId, language, remoteUrl)
    return remoteUrl
  }

  private async enforceCacheSizeLimit(): Promise<void> {
    const metadata = await this.getAllCacheMetadata()
    const totalSize = metadata.reduce((sum, item) => sum + item.fileSize, 0)

    if (totalSize <= this.maxCacheSize) {
      return
    }

    const sorted = metadata.sort((a, b) => a.downloadedAt - b.downloadedAt)
    let currentSize = totalSize

    for (const item of sorted) {
      if (currentSize <= this.maxCacheSize) {
        break
      }

      await FileSystem.deleteAsync(item.localPath, { idempotent: true })
      await this.removeCacheEntry(item.episodeId, item.language)
      currentSize -= item.fileSize
    }
  }

  private async isConnectedToWiFi(): Promise<boolean> {
    const netInfo = await NetInfo.fetch()
    return netInfo.type === 'wifi' || netInfo.type === 'ethernet'
  }

  private async getAllCacheMetadata(): Promise<CachedAudio[]> {
    const json = await AsyncStorage.getItem(this.cacheMetadataKey)
    return json ? JSON.parse(json) : []
  }

  private async storeCacheMetadata(cached: CachedAudio): Promise<void> {
    const metadata = await this.getAllCacheMetadata()
    metadata.push(cached)
    await AsyncStorage.setItem(this.cacheMetadataKey, JSON.stringify(metadata))
  }

  async removeCacheEntry(episodeId: string, language: string): Promise<void> {
    const metadata = await this.getAllCacheMetadata()
    const filtered = metadata.filter(
      item => !(item.episodeId === episodeId && item.language === language)
    )
    await AsyncStorage.setItem(this.cacheMetadataKey, JSON.stringify(filtered))
  }

  private emitProgress(episodeId: string, language: string, progress: number): void {
  }
}
