import { useRef, useState, useEffect } from 'react'
import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView, GlassBadge } from '@bayit/shared/ui'

interface AudioPlayerProps {
  src: string
  title: string
  artist?: string
  cover?: string
  isLive?: boolean
  onEnded?: () => void
}

export default function AudioPlayer({
  src,
  title,
  artist,
  cover,
  isLive = false,
  onEnded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src) return

    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current
    audio.src = src

    const handleCanPlay = () => setLoading(false)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      if (onEnded) onEnded()
    }

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [src, onEnded])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds
    }
  }

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <GlassView className="flex-1 p-4 justify-center">
      <View className="flex-row items-center gap-4">
        {/* Cover Art */}
        <View className="relative w-32 h-32 rounded-lg overflow-hidden" style={{ shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 }}>
          <Image
            source={{ uri: cover || '/placeholder-audio.png' }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {isLive && (
            <View className="absolute inset-0 bg-[rgba(26,26,46,0.5)] items-center justify-center">
              <View className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.error, shadowColor: colors.error, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 }} />
            </View>
          )}
        </View>

        {/* Info & Controls */}
        <View className="flex-1 min-w-0">
          {/* Title & Artist */}
          <View className="mb-4">
            {isLive && (
              <GlassBadge variant="danger" size="sm" className="mb-2">
                LIVE
              </GlassBadge>
            )}
            <Text className="text-xl font-bold text-white" numberOfLines={1}>{title}</Text>
            {artist && <Text className="text-sm text-gray-400 mt-1" numberOfLines={1}>{artist}</Text>}
          </View>

          {/* Progress Bar (not for live) */}
          {!isLive && duration > 0 && (
            <View className="mb-4 relative">
              <View className="h-1 bg-white/10 rounded-sm overflow-hidden">
                <View className="h-full rounded-sm" style={{ width: `${progress}%`, backgroundColor: colors.primary }} />
              </View>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                style={webStyles.progressInput}
              />
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-gray-500">{formatTime(currentTime)}</Text>
                <Text className="text-xs text-gray-500">{formatTime(duration)}</Text>
              </View>
            </View>
          )}

          {/* Controls */}
          <View className="flex-row items-center gap-2">
            {!isLive && (
              <Pressable
                onPress={() => skip(-15)}
                className="w-11 h-11 rounded-full items-center justify-center hover:bg-white/10"
                style={{ backgroundColor: colors.glassLight }}
              >
                <SkipBack size={22} color={colors.text} />
              </Pressable>
            )}

            <Pressable
              onPress={togglePlay}
              disabled={loading}
              className="w-14 h-14 rounded-full items-center justify-center hover:shadow-lg hover:shadow-purple-500/50"
              style={{ backgroundColor: colors.primary }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : isPlaying ? (
                <Pause size={28} fill={colors.background} color={colors.background} />
              ) : (
                <Play size={28} fill={colors.background} color={colors.background} style={{ marginLeft: 2 }} />
              )}
            </Pressable>

            {!isLive && (
              <Pressable
                onPress={() => skip(15)}
                className="w-11 h-11 rounded-full items-center justify-center hover:bg-white/10"
                style={{ backgroundColor: colors.glassLight }}
              >
                <SkipForward size={22} color={colors.text} />
              </Pressable>
            )}

            <View className="flex-row items-center gap-2 ml-auto">
              <Pressable
                onPress={toggleMute}
                className="w-9 h-9 rounded-full items-center justify-center hover:bg-white/5"
              >
                {isMuted ? (
                  <VolumeX size={18} color={colors.textSecondary} />
                ) : (
                  <Volume2 size={18} color={colors.textSecondary} />
                )}
              </Pressable>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={webStyles.volumeSlider}
              />
            </View>
          </View>
        </View>
      </View>
    </GlassView>
  )
}

const webStyles: Record<string, React.CSSProperties> = {
  progressInput: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    width: '100%',
    height: 16,
    opacity: 0,
    cursor: 'pointer',
  },
  volumeSlider: {
    width: 96,
    accentColor: colors.primary,
  },
}
