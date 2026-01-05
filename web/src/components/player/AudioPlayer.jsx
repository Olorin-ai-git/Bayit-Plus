import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'

export default function AudioPlayer({
  src,
  title,
  artist,
  cover,
  isLive = false,
}) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src || !audioRef.current) return

    const audio = audioRef.current
    audio.src = src

    const handleCanPlay = () => setLoading(false)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [src])

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

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const skip = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds
    }
  }

  const formatTime = (time) => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="glass-card p-6">
      <audio ref={audioRef} />

      <div className="flex items-center gap-6">
        {/* Cover Art */}
        <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden shadow-glass">
          <img
            src={cover || '/placeholder-audio.png'}
            alt={title}
            className="w-full h-full object-cover"
          />
          {isLive && (
            <div className="absolute inset-0 glass flex items-center justify-center">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-glow-danger" />
            </div>
          )}
        </div>

        {/* Info & Controls */}
        <div className="flex-1 min-w-0">
          {/* Title & Artist */}
          <div className="mb-4">
            {isLive && <span className="live-badge mb-2">LIVE</span>}
            <h2 className="text-xl font-bold truncate">{title}</h2>
            {artist && <p className="text-dark-400 truncate">{artist}</p>}
          </div>

          {/* Progress Bar (not for live) */}
          {!isLive && duration > 0 && (
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-dark-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isLive && (
              <button
                onClick={() => skip(-15)}
                className="glass-btn-ghost glass-btn-icon"
              >
                <SkipBack size={22} />
              </button>
            )}

            <button
              onClick={togglePlay}
              disabled={loading}
              className="glass-btn-primary w-14 h-14 rounded-full flex items-center justify-center hover:shadow-glow transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={28} fill="white" className="text-white" />
              ) : (
                <Play size={28} fill="white" className="text-white mr-[-2px]" />
              )}
            </button>

            {!isLive && (
              <button
                onClick={() => skip(15)}
                className="glass-btn-ghost glass-btn-icon"
              >
                <SkipForward size={22} />
              </button>
            )}

            <div className="flex items-center gap-2 mr-auto">
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
                className="w-24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
