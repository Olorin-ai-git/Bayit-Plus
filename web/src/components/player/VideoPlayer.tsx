import { useRef, useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import Hls from 'hls.js'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  List,
} from 'lucide-react'
import { useWatchPartyStore } from '@/stores/watchPartyStore'
import { useAuthStore } from '@/stores/authStore'
import logger from '@/utils/logger'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView, GlassBadge } from '@bayit/shared/ui'
import {
  WatchPartyButton,
  WatchPartyCreateModal,
  WatchPartyJoinModal,
  WatchPartyPanel,
  WatchPartyOverlay,
} from '@/components/watchparty'
import ChaptersPanel from './ChaptersPanel'
import ChapterTimeline from './ChapterTimeline'

interface Chapter {
  start_time: number
  end_time: number
  title?: string
}

interface VideoPlayerProps {
  src: string
  poster?: string
  title?: string
  contentId?: string
  contentType?: string
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  isLive?: boolean
  autoPlay?: boolean
  chapters?: Chapter[]
  chaptersLoading?: boolean
}

export default function VideoPlayer({
  src,
  poster,
  title,
  contentId,
  contentType = 'vod',
  onProgress,
  onEnded,
  isLive = false,
  autoPlay = false,
  chapters = [],
  chaptersLoading = false,
}: VideoPlayerProps) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const {
    party,
    participants,
    messages,
    isHost,
    isConnected,
    syncedPosition,
    isPlaying: partySyncPlaying,
    createParty,
    joinByCode,
    connect,
    sendMessage,
    syncPlayback,
    leaveParty,
    endParty,
  } = useWatchPartyStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showPartyPanel, setShowPartyPanel] = useState(false)
  const [isSynced, setIsSynced] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showChaptersPanel, setShowChaptersPanel] = useState(false)
  const lastSyncRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src || !videoRef.current) return

    const video = videoRef.current

    if (Hls.isSupported() && src.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
      })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false)
        if (autoPlay) video.play()
      })
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          logger.error('HLS error', 'VideoPlayer', data)
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.addEventListener('loadedmetadata', () => {
        setLoading(false)
        if (autoPlay) video.play()
      })
    } else {
      video.src = src
      video.addEventListener('loadeddata', () => {
        setLoading(false)
        if (autoPlay) video.play()
      })
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [src, isLive, autoPlay])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      setDuration(video.duration || 0)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      if (onEnded) onEnded()
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [onEnded])

  useEffect(() => {
    if (onProgress && isPlaying && !isLive) {
      progressInterval.current = setInterval(() => {
        if (videoRef.current) {
          onProgress(videoRef.current.currentTime, videoRef.current.duration)
        }
      }, 10000)
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPlaying, isLive, onProgress])

  useEffect(() => {
    let timeout: NodeJS.Timeout
    const handleMouseMove = () => {
      setShowControls(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 3000)
    }

    const container = containerRef.current
    container?.addEventListener('mousemove', handleMouseMove)
    container?.addEventListener('touchstart', handleMouseMove)

    return () => {
      container?.removeEventListener('mousemove', handleMouseMove)
      container?.removeEventListener('touchstart', handleMouseMove)
      clearTimeout(timeout)
    }
  }, [isPlaying])

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!party || isHost || !isConnected) return
    const video = videoRef.current
    if (!video) return

    const diff = Math.abs(video.currentTime - syncedPosition)
    if (diff > 2) {
      video.currentTime = syncedPosition
      setIsSynced(false)
      setTimeout(() => setIsSynced(true), 500)
    }

    if (partySyncPlaying && video.paused) {
      video.play()
    } else if (!partySyncPlaying && !video.paused) {
      video.pause()
    }
  }, [syncedPosition, partySyncPlaying, party, isHost, isConnected])

  useEffect(() => {
    if (!party || !isHost || !isConnected) return
    const video = videoRef.current
    if (!video) return

    const now = Date.now()
    if (now - lastSyncRef.current < 1000) return
    lastSyncRef.current = now

    syncPlayback(video.currentTime, !video.paused)
  }, [currentTime, isPlaying, party, isHost, isConnected, syncPlayback])

  const handleCreateParty = async (options: { chatEnabled: boolean; syncPlayback: boolean }) => {
    if (!contentId) return
    const newParty = await createParty(contentId, contentType, {
      title,
      chatEnabled: options.chatEnabled,
      syncPlayback: options.syncPlayback,
    })
    connect(newParty.id, user?.token)
    setShowPartyPanel(true)
  }

  const handleJoinParty = async (roomCode: string) => {
    const joinedParty = await joinByCode(roomCode)
    connect(joinedParty.id, user?.token)
    setShowPartyPanel(true)
  }

  const handleLeaveParty = async () => {
    await leaveParty()
    setShowPartyPanel(false)
  }

  const handleEndParty = async () => {
    await endParty()
    setShowPartyPanel(false)
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    if (videoRef.current && duration) {
      videoRef.current.currentTime = pos * duration
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  const seekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
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
    <div
      ref={containerRef}
      style={webStyles.container}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        poster={poster}
        style={webStyles.video}
        playsInline
      />

      {/* Loading Spinner */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.spinner}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      )}

      {/* Chapters Panel */}
      {!isLive && chapters.length > 0 && (
        <ChaptersPanel
          chapters={chapters}
          currentTime={currentTime}
          duration={duration}
          isLoading={chaptersLoading}
          isOpen={showChaptersPanel}
          onClose={() => setShowChaptersPanel(false)}
          onSeek={seekToTime}
        />
      )}

      {/* Controls Overlay */}
      <View
        style={[
          styles.controlsOverlay,
          !showControls && styles.controlsHidden,
        ]}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {isLive && (
            <GlassBadge variant="danger" size="sm">{t('common.live')}</GlassBadge>
          )}
        </View>

        {/* Center Play Button */}
        <View style={styles.centerControls}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.()
              togglePlay()
            }}
            style={({ hovered }) => [
              styles.centerPlayButton,
              hovered && styles.centerPlayButtonHovered,
            ]}
          >
            {isPlaying ? (
              <Pause size={40} fill={colors.text} color={colors.text} />
            ) : (
              <Play size={40} fill={colors.text} color={colors.text} style={{ marginLeft: 4 }} />
            )}
          </Pressable>
        </View>

        {/* Bottom Controls */}
        <GlassView style={styles.bottomControls} intensity="high" noBorder>
          {/* Progress Bar */}
          {!isLive && (
            <Pressable onPress={handleSeek as any} style={styles.progressContainer}>
              {chapters.length > 0 && (
                <ChapterTimeline
                  chapters={chapters}
                  duration={duration}
                  currentTime={currentTime}
                  onSeek={seekToTime}
                />
              )}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </Pressable>
          )}

          {/* Controls Row */}
          <View style={styles.controlsRow}>
            <View style={styles.leftControls}>
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); togglePlay() }}
                style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
              >
                {isPlaying ? <Pause size={22} color={colors.text} /> : <Play size={22} color={colors.text} />}
              </Pressable>

              {!isLive && (
                <>
                  <Pressable
                    onPress={(e) => { e.stopPropagation?.(); skip(-10) }}
                    style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
                  >
                    <SkipBack size={18} color={colors.text} />
                  </Pressable>
                  <Pressable
                    onPress={(e) => { e.stopPropagation?.(); skip(10) }}
                    style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
                  >
                    <SkipForward size={18} color={colors.text} />
                  </Pressable>
                </>
              )}

              <View style={styles.volumeControls}>
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); toggleMute() }}
                  style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
                >
                  {isMuted ? <VolumeX size={18} color={colors.text} /> : <Volume2 size={18} color={colors.text} />}
                </Pressable>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  style={webStyles.volumeSlider}
                />
              </View>

              {!isLive && (
                <Text style={styles.timeText}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>
              )}
            </View>

            <View style={styles.rightControls}>
              {user && contentId && (
                <WatchPartyButton
                  hasActiveParty={!!party}
                  onCreateClick={() => setShowCreateModal(true)}
                  onJoinClick={() => setShowJoinModal(true)}
                  onPanelToggle={() => setShowPartyPanel(!showPartyPanel)}
                />
              )}
              {!isLive && chapters.length > 0 && (
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); setShowChaptersPanel(!showChaptersPanel) }}
                  style={({ hovered }) => [
                    styles.controlButton,
                    hovered && styles.controlButtonHovered,
                    showChaptersPanel && styles.controlButtonActive,
                  ]}
                >
                  <List size={18} color={showChaptersPanel ? colors.primary : colors.text} />
                </Pressable>
              )}
              <Pressable
                onPress={(e) => e.stopPropagation?.()}
                style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
              >
                <Settings size={18} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); toggleFullscreen() }}
                style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
              >
                {isFullscreen ? <Minimize size={18} color={colors.text} /> : <Maximize size={18} color={colors.text} />}
              </Pressable>
            </View>
          </View>
        </GlassView>
      </View>

      {/* Watch Party Panel (Desktop) */}
      {!isMobile && (
        <WatchPartyPanel
          isOpen={showPartyPanel && !!party}
          onClose={() => setShowPartyPanel(false)}
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={party && !partySyncPlaying}
          currentUserId={user?.id}
          onLeave={handleLeaveParty}
          onEnd={handleEndParty}
          onSendMessage={sendMessage}
        />
      )}

      {/* Watch Party Overlay (Mobile) */}
      {isMobile && (
        <WatchPartyOverlay
          isOpen={showPartyPanel && !!party}
          onClose={() => setShowPartyPanel(false)}
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={party && !partySyncPlaying}
          currentUserId={user?.id}
          onLeave={handleLeaveParty}
          onEnd={handleEndParty}
          onSendMessage={sendMessage}
        />
      )}

      {/* Modals */}
      <WatchPartyCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateParty}
        contentTitle={title}
      />

      <WatchPartyJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinParty}
      />

      {/* Party Active Indicator Border */}
      {party && (
        <View style={styles.partyIndicator} pointerEvents="none" />
      )}
    </div>
  )
}

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  volumeSlider: {
    width: 80,
    accentColor: colors.primary,
  },
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 48,
    height: 48,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: 'linear-gradient(to top, rgba(17, 17, 34, 0.9), transparent 40%, transparent 60%, rgba(17, 17, 34, 0.4))' as any,
  },
  controlsHidden: {
    opacity: 0,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  centerControls: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26, 26, 46, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  centerPlayButtonHovered: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  progressContainer: {
    height: 6,
    position: 'relative',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  partyIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: borderRadius.lg,
  },
})
