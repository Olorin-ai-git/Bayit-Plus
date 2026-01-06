import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ritualService } from '../../services/api'
import './MorningRitual.css'

/**
 * MorningRitual Component
 * Full-screen morning ritual experience with auto-play content.
 * Shows AI brief, Israel context, and curated morning playlist.
 */
export default function MorningRitual({ onComplete, onSkip }) {
  const navigate = useNavigate()
  const [ritualData, setRitualData] = useState(null)
  const [aiBrief, setAIBrief] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBrief, setShowBrief] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    const fetchRitualData = async () => {
      try {
        const [checkResult, briefResult] = await Promise.all([
          ritualService.check(),
          ritualService.getAIBrief(),
        ])

        setRitualData(checkResult)
        setAIBrief(briefResult)

        // Auto-hide brief after 5 seconds
        setTimeout(() => {
          setShowBrief(false)
          if (checkResult.playlist?.length > 0) {
            setIsPlaying(true)
          }
        }, 5000)
      } catch (err) {
        console.error('Failed to fetch ritual data:', err)
        onSkip?.()
      } finally {
        setLoading(false)
      }
    }

    fetchRitualData()
  }, [onSkip])

  const handleSkip = async () => {
    try {
      await ritualService.skipToday()
    } catch (err) {
      console.error('Failed to skip ritual:', err)
    }
    onSkip?.()
  }

  const handleComplete = () => {
    onComplete?.()
    navigate('/')
  }

  const handleNextItem = () => {
    if (!ritualData?.playlist) return

    if (currentIndex < ritualData.playlist.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePreviousItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const currentItem = ritualData?.playlist?.[currentIndex]

  if (loading) {
    return (
      <div className="morning-ritual loading">
        <div className="ritual-loader">
          <div className="loader-icon">☀️</div>
          <div className="loader-text">מכין את טקס הבוקר שלך...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="morning-ritual">
      {/* Background gradient */}
      <div className="ritual-background">
        <div className="gradient-overlay" />
      </div>

      {/* AI Brief Overlay */}
      {showBrief && aiBrief && (
        <div className="ai-brief-overlay">
          <div className="brief-content">
            <div className="brief-emoji">☀️</div>
            <h1 className="brief-greeting">{aiBrief.greeting}</h1>
            <p className="brief-israel">{aiBrief.israel_update}</p>
            <p className="brief-recommendation">{aiBrief.recommendation}</p>

            <div className="israel-context">
              <div className="context-item">
                <span className="context-icon">🇮🇱</span>
                <span className="context-label">שעה בישראל</span>
                <span className="context-value">{aiBrief.israel_context?.israel_time}</span>
              </div>
              <div className="context-item">
                <span className="context-icon">📅</span>
                <span className="context-label">יום</span>
                <span className="context-value">{aiBrief.israel_context?.day_name_he}</span>
              </div>
              {aiBrief.israel_context?.is_shabbat && (
                <div className="context-item shabbat">
                  <span className="context-icon">🕯️</span>
                  <span className="context-value">שבת שלום!</span>
                </div>
              )}
            </div>

            <button className="start-button" onClick={() => setShowBrief(false)}>
              בואו נתחיל
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!showBrief && (
        <div className="ritual-main">
          {/* Header */}
          <div className="ritual-header">
            <div className="header-left">
              <span className="ritual-title">☀️ טקס הבוקר</span>
              <span className="ritual-time">{ritualData?.local_time}</span>
            </div>
            <div className="header-right">
              <button className="skip-button" onClick={handleSkip}>
                דלג להיום
              </button>
              <button className="exit-button" onClick={handleComplete}>
                סיום
              </button>
            </div>
          </div>

          {/* Player Area */}
          <div className="player-area">
            {currentItem?.type === 'live' || currentItem?.type === 'vod' ? (
              <div className="video-container">
                <video
                  ref={videoRef}
                  src={currentItem.stream_url}
                  autoPlay={isPlaying}
                  controls
                  onEnded={handleNextItem}
                />
                <div className="video-info">
                  <h2>{currentItem.title}</h2>
                  <span className="video-category">{currentItem.category}</span>
                </div>
              </div>
            ) : currentItem?.type === 'radio' ? (
              <div className="radio-container">
                <div className="radio-visual">
                  <img src={currentItem.thumbnail} alt={currentItem.title} />
                  <div className="radio-waves">
                    <div className="wave" />
                    <div className="wave" />
                    <div className="wave" />
                  </div>
                </div>
                <h2>{currentItem.title}</h2>
                <audio
                  ref={audioRef}
                  src={currentItem.stream_url}
                  autoPlay={isPlaying}
                  controls
                />
              </div>
            ) : (
              <div className="no-content">
                <p>אין תוכן זמין כרגע</p>
              </div>
            )}
          </div>

          {/* Playlist */}
          <div className="playlist-bar">
            <div className="playlist-items">
              {ritualData?.playlist?.map((item, index) => (
                <button
                  key={item.id}
                  className={`playlist-item ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                >
                  <img src={item.thumbnail} alt={item.title} />
                  <div className="item-info">
                    <span className="item-title">{item.title}</span>
                    <span className="item-type">
                      {item.type === 'live' ? '🔴 שידור חי' :
                       item.type === 'radio' ? '📻 רדיו' : '🎬 וידאו'}
                    </span>
                  </div>
                  {index === currentIndex && <div className="playing-indicator" />}
                </button>
              ))}
            </div>

            <div className="playlist-nav">
              <button
                className="nav-button"
                onClick={handlePreviousItem}
                disabled={currentIndex === 0}
              >
                ←
              </button>
              <span className="nav-counter">
                {currentIndex + 1} / {ritualData?.playlist?.length || 0}
              </span>
              <button
                className="nav-button"
                onClick={handleNextItem}
                disabled={currentIndex >= (ritualData?.playlist?.length || 0) - 1}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
