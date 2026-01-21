/**
 * LiveSubtitleControls Component
 * Premium feature for real-time subtitle translation of live streams
 */

import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import liveSubtitleService, { LiveSubtitleCue } from '@/services/liveSubtitleService'
import { AVAILABLE_LANGUAGES } from './LiveSubtitleControls.styles'

interface LiveSubtitleControlsProps {
  channelId: string
  isLive: boolean
  isPremium: boolean
  videoElement: HTMLVideoElement | null
  onSubtitleCue: (cue: LiveSubtitleCue) => void
  onShowUpgrade?: () => void
  targetLang: string
  onLanguageChange: (lang: string) => void
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export default function LiveSubtitleControls({
  channelId,
  isLive,
  isPremium,
  videoElement,
  onSubtitleCue,
  onShowUpgrade,
  targetLang,
  onLanguageChange,
}: LiveSubtitleControlsProps) {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const prevLangRef = useRef<string>(targetLang)

  // Don't render if not a live stream
  if (!isLive) return null

  // Reconnect when language changes while connected
  useEffect(() => {
    // Only reconnect if language actually changed and we're connected
    if (enabled && videoElement && prevLangRef.current !== targetLang) {
      console.log('🔄 [LiveSubtitleControls] Language changed, reconnecting:', prevLangRef.current, '->', targetLang)
      prevLangRef.current = targetLang

      liveSubtitleService.disconnect()
      setStatus('connecting')

      liveSubtitleService.connect(
        channelId,
        targetLang,
        videoElement,
        onSubtitleCue,
        (err) => {
          setError(err)
          setStatus('error')
          setEnabled(false)
        }
      ).then(() => {
        setStatus('connected')
        setEnabled(true)
      }).catch((err) => {
        console.error('❌ [LiveSubtitleControls] Reconnection failed:', err)
        setError(err instanceof Error ? err.message : 'Reconnection failed')
        setStatus('error')
      })
    } else {
      // Update ref even if not reconnecting
      prevLangRef.current = targetLang
    }
  }, [targetLang, enabled, videoElement, channelId])

  const handleToggle = async () => {
    // Check premium access
    if (!isPremium) {
      onShowUpgrade?.()
      return
    }

    if (enabled) {
      // Disconnect
      liveSubtitleService.disconnect()
      setStatus('disconnected')
      setEnabled(false)
      setError(null)
    } else {
      // Connect
      if (!videoElement) {
        setError('Video not ready')
        return
      }

      setStatus('connecting')
      setError(null)

      try {
        await liveSubtitleService.connect(
          channelId,
          targetLang,
          videoElement,
          (cue) => {
            onSubtitleCue(cue)
          },
          (err) => {
            setError(err)
            setStatus('error')
            setEnabled(false)
          }
        )

        prevLangRef.current = targetLang
        setStatus('connected')
        setEnabled(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
        setStatus('error')
      }
    }
  }


  return (
    <View className="flex-row items-center gap-2 relative">
      {/* Main Toggle Button */}
      <Pressable
        onPress={handleToggle}
        className={`flex-row items-center gap-1 px-4 py-2 rounded-lg bg-black/30 border ${
          enabled
            ? 'bg-white/15 border-purple-500'
            : !isPremium
            ? 'border-yellow-500'
            : 'border-white/10 hover:bg-white/5 active:opacity-70'
        }`}
      >
        <Globe size={20} color={enabled ? colors.primary : colors.textSecondary} />
        <Text className={`text-sm font-medium ${enabled ? 'text-white' : 'text-gray-400'}`}>
          {isPremium ? t('subtitles.liveTranslate') : '⭐ Premium'}
        </Text>
        {status === 'connecting' && <ActivityIndicator size="small" color={colors.primary} />}
        {enabled && status === 'connected' && <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.success }} />}
      </Pressable>

      {/* Error Message */}
      {error && (
        <View className="absolute bottom-[60px] right-0 bg-red-600/90 px-4 py-2 rounded-lg max-w-[250px]">
          <Text className="text-white text-xs font-medium">{error}</Text>
        </View>
      )}
    </View>
  )
}
