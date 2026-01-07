import { useRef, useState, useEffect, useCallback } from 'react'
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
import {
  WatchPartyButton,
  WatchPartyCreateModal,
  WatchPartyJoinModal,
  WatchPartyPanel,
  WatchPartyOverlay,
} from '@/components/watchparty'
import ChaptersPanel from './ChaptersPanel'
import ChapterTimeline from './ChapterTimeline'

export default function VideoPlayer({
  src,
  poster,
  title,
  contentId,
  contentType = 'vod',
  onProgress,
  isLive = false,
  autoPlay = false,
  chapters = [],
  chaptersLoading = false,
}) {
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
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const hlsRef = useRef(null)
  const progressInterval = useRef(null)

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

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

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
    let timeout
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

  const handleCreateParty = async (options) => {
    if (!contentId) return
    const newParty = await createParty(contentId, contentType, {
      title,
      chatEnabled: options.chatEnabled,
      syncPlayback: options.syncPlayback,
    })
    connect(newParty.id, user?.token)
    setShowPartyPanel(true)
  }

  const handleJoinParty = async (roomCode) => {
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

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const handleSeek = (e) => {
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

  const skip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  const seekToTime = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  const formatTime = (time) => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      className="video-player relative bg-black group"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full"
        playsInline
      />

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center glass">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin shadow-glow" />
        </div>
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
      <div
        className={`absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-dark-900/40 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold truncate drop-shadow-lg">{title}</h2>
          {isLive && <span className="live-badge">LIVE</span>}
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full glass flex items-center justify-center hover:shadow-glow transition-all duration-300 group/play"
          >
            {isPlaying ? (
              <Pause size={40} fill="white" className="text-white" />
            ) : (
              <Play size={40} fill="white" className="text-white mr-[-4px] group-hover/play:scale-110 transition-transform" />
            )}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 glass-strong p-4 space-y-3 rounded-b-xl">
          {/* Progress Bar */}
          {!isLive && (
            <div
              className="h-1.5 bg-white/20 rounded-full cursor-pointer group/progress relative"
              onClick={handleSeek}
            >
              {/* Chapter Timeline Markers */}
              {chapters.length > 0 && (
                <ChapterTimeline
                  chapters={chapters}
                  duration={duration}
                  currentTime={currentTime}
                  onSeek={seekToTime}
                />
              )}
              <div
                className="h-full bg-primary-500 rounded-full relative shadow-glow"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-glow" />
              </div>
            </div>
          )}

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="glass-btn-ghost glass-btn-icon-sm">
                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
              </button>

              {!isLive && (
                <>
                  <button onClick={() => skip(-10)} className="glass-btn-ghost glass-btn-icon-sm">
                    <SkipBack size={18} />
                  </button>
                  <button onClick={() => skip(10)} className="glass-btn-ghost glass-btn-icon-sm">
                    <SkipForward size={18} />
                  </button>
                </>
              )}

              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="glass-btn-ghost glass-btn-icon-sm">
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              {!isLive && (
                <span className="text-sm tabular-nums text-dark-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {user && contentId && (
                <WatchPartyButton
                  hasActiveParty={!!party}
                  onCreateClick={() => setShowCreateModal(true)}
                  onJoinClick={() => setShowJoinModal(true)}
                  onPanelToggle={() => setShowPartyPanel(!showPartyPanel)}
                />
              )}
              {!isLive && chapters.length > 0 && (
                <button
                  onClick={() => setShowChaptersPanel(!showChaptersPanel)}
                  className={`glass-btn-ghost glass-btn-icon-sm ${showChaptersPanel ? 'text-primary-400' : ''}`}
                  title="Chapters"
                >
                  <List size={18} />
                </button>
              )}
              <button className="glass-btn-ghost glass-btn-icon-sm">
                <Settings size={18} />
              </button>
              <button onClick={toggleFullscreen} className="glass-btn-ghost glass-btn-icon-sm">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

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
        <div className="absolute inset-0 pointer-events-none border-2 border-emerald-500/50 rounded-xl animate-pulse" />
      )}
    </div>
  )
}
