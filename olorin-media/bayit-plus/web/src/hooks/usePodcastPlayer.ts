import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PodcastEpisode, AudioQuality } from '../types/podcast'
import { AudioCacheService } from '../services/mobile/AudioCacheService'
import { useNetworkQuality } from './useNetworkQuality'
import { useAuthStore } from '@/stores/authStore'
import logger from '@/utils/logger'

interface UsePodcastPlayerOptions {
  episode: PodcastEpisode
  autoPlay?: boolean
  savePosition?: boolean
}

export function usePodcastPlayer({ episode, autoPlay = false, savePosition = true }: UsePodcastPlayerOptions) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cacheService = useRef(new AudioCacheService())

  // Check premium status
  const isPremium = user?.can_access_premium_features() || false

  const [currentLanguage, setCurrentLanguage] = useState<string>(
    episode.availableLanguages.includes(i18n.language) ? i18n.language : episode.originalLanguage
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')

  const { quality } = useNetworkQuality()

  // Upgrade handler
  const handleShowUpgrade = () => {
    navigate('/subscribe')
  }

  useEffect(() => {
    async function loadAudio() {
      setIsLoading(true)
      setError(null)

      try {
        const translation = episode.translations[currentLanguage]
        const sourceUrl = translation?.audioUrl || episode.audioUrl

        if (typeof cacheService.current.getCachedAudio === 'function') {
          const cached = await cacheService.current.getCachedAudio(episode.id, currentLanguage)
          if (cached) {
            setAudioUrl(cached.localPath)
            setIsLoading(false)
            return
          }
        }

        const qualityUrl = getQualityVariantUrl(sourceUrl, quality)
        setAudioUrl(qualityUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audio')
      } finally {
        setIsLoading(false)
      }
    }

    loadAudio()
  }, [episode.id, currentLanguage, quality])

  const switchLanguage = async (newLanguage: string) => {
    if (newLanguage === currentLanguage || !episode.availableLanguages.includes(newLanguage)) {
      return
    }

    const savedPosition = audioRef.current?.currentTime || 0
    const wasPlaying = isPlaying

    setIsLoading(true)
    setError(null)

    try {
      if (audioRef.current) {
        audioRef.current.pause()
      }

      setCurrentLanguage(newLanguage)

      await new Promise((resolve) => {
        const checkLoaded = setInterval(() => {
          if (audioRef.current?.readyState >= 2) {
            clearInterval(checkLoaded)
            resolve(true)
          }
        }, 100)
      })

      if (audioRef.current && savedPosition > 0) {
        const durationRatio = episode.translations[newLanguage]?.duration
          ? parseFloat(episode.translations[newLanguage].duration!) / duration
          : 1
        audioRef.current.currentTime = savedPosition * durationRatio
      }

      if (wasPlaying && audioRef.current) {
        await audioRef.current.play()
      }
    } catch (err) {
      setError('Failed to switch language')
      logger.error('Language switch error', 'usePodcastPlayer', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }
  const handleError = (e: Event) => {
    setError('Audio playback error')
    logger.error('Audio error', 'usePodcastPlayer', e)
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  return {
    currentLanguage,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    audioUrl,
    switchLanguage,
    isPremium,
    onShowUpgrade: handleShowUpgrade,
    play: () => audioRef.current?.play(),
    pause: () => audioRef.current?.pause(),
    seek: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time
      }
    },
    audioRef,
    audioProps: {
      ref: audioRef,
      src: audioUrl,
      onPlay: handlePlay,
      onPause: handlePause,
      onTimeUpdate: handleTimeUpdate,
      onLoadedMetadata: handleLoadedMetadata,
      onError: handleError,
      autoPlay,
    },
  }
}

function getQualityVariantUrl(baseUrl: string, quality: AudioQuality): string {
  const qualitySuffix = quality === 'high' ? '128' : quality === 'medium' ? '96' : '64'
  return baseUrl.replace(/\.mp3$/, `_${qualitySuffix}k.mp3`)
}
