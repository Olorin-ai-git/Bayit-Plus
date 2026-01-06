import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './VerticalFeed.css'

/**
 * VerticalFeed Layout
 * TikTok-style vertical swipe navigation for mobile/phone layouts.
 * Auto-plays short content clips as users swipe through.
 */
export default function VerticalFeed({
  items = [],
  onItemChange,
  onItemPress,
  renderItem,
  autoPlay = true,
  showProgress = true,
}) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [progress, setProgress] = useState(0)
  const containerRef = useRef(null)
  const videoRefs = useRef({})

  const currentItem = items[currentIndex]

  // Handle swipe gestures
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY)
    setTouchEnd(e.touches[0].clientY)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    const swipeThreshold = 50
    const diff = touchStart - touchEnd

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe up - next item
        goToNext()
      } else {
        // Swipe down - previous item
        goToPrevious()
      }
    }
  }

  // Handle wheel scroll on desktop
  const handleWheel = useCallback((e) => {
    if (isTransitioning) return

    if (e.deltaY > 0) {
      goToNext()
    } else if (e.deltaY < 0) {
      goToPrevious()
    }
  }, [isTransitioning])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNext()
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrevious()
      } else if (e.key === 'Enter' || e.key === ' ') {
        handleItemPress()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, items])

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1 && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }, [currentIndex, items.length, isTransitioning])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }, [currentIndex, isTransitioning])

  const goToIndex = useCallback((index) => {
    if (index >= 0 && index < items.length && index !== currentIndex) {
      setIsTransitioning(true)
      setCurrentIndex(index)
      setProgress(0)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }, [items.length, currentIndex])

  // Notify parent of item changes
  useEffect(() => {
    onItemChange?.(currentItem, currentIndex)
  }, [currentIndex, currentItem, onItemChange])

  // Auto-advance for clips with duration
  useEffect(() => {
    if (!autoPlay || !currentItem?.duration) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / currentItem.duration)
        if (next >= 100) {
          goToNext()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [currentIndex, currentItem, autoPlay, goToNext])

  const handleItemPress = () => {
    if (currentItem) {
      onItemPress?.(currentItem, currentIndex)
    }
  }

  // Default item renderer
  const defaultRenderItem = (item, index, isActive) => (
    <div className={`feed-item ${isActive ? 'active' : ''}`}>
      {item.type === 'video' || item.stream_url ? (
        <video
          ref={(el) => (videoRefs.current[index] = el)}
          src={item.stream_url || item.url}
          poster={item.thumbnail}
          muted
          playsInline
          loop
          autoPlay={isActive && autoPlay}
        />
      ) : (
        <div
          className="feed-thumbnail"
          style={{ backgroundImage: `url(${item.thumbnail})` }}
        />
      )}

      <div className="feed-overlay">
        <div className="feed-content" dir="rtl">
          <h2 className="feed-title">{item.title}</h2>
          {item.description && (
            <p className="feed-description">{item.description}</p>
          )}
          <div className="feed-meta">
            {item.category && <span className="feed-category">{item.category}</span>}
            {item.duration && (
              <span className="feed-duration">
                {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        <div className="feed-actions">
          <button className="action-button" onClick={() => navigate(`/watch/${item.id}`)}>
            <span className="action-icon">▶️</span>
            <span className="action-label">צפה</span>
          </button>
          <button className="action-button">
            <span className="action-icon">➕</span>
            <span className="action-label">שמור</span>
          </button>
          <button className="action-button">
            <span className="action-icon">↗️</span>
            <span className="action-label">שתף</span>
          </button>
        </div>
      </div>
    </div>
  )

  if (!items.length) {
    return (
      <div className="vertical-feed empty">
        <p>אין תוכן להצגה</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="vertical-feed"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Items Container */}
      <div
        className="feed-container"
        style={{
          transform: `translateY(-${currentIndex * 100}%)`,
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="feed-slide"
            onClick={handleItemPress}
          >
            {renderItem
              ? renderItem(item, index, index === currentIndex)
              : defaultRenderItem(item, index, index === currentIndex)
            }
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {showProgress && currentItem?.duration && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Navigation Dots */}
      <div className="feed-dots">
        {items.slice(
          Math.max(0, currentIndex - 2),
          Math.min(items.length, currentIndex + 3)
        ).map((_, i) => {
          const actualIndex = Math.max(0, currentIndex - 2) + i
          return (
            <button
              key={actualIndex}
              className={`dot ${actualIndex === currentIndex ? 'active' : ''}`}
              onClick={() => goToIndex(actualIndex)}
            />
          )
        })}
      </div>

      {/* Swipe Hints */}
      <div className="swipe-hints">
        {currentIndex > 0 && (
          <div className="hint hint-up">
            <span>↑</span>
          </div>
        )}
        {currentIndex < items.length - 1 && (
          <div className="hint hint-down">
            <span>↓</span>
          </div>
        )}
      </div>

      {/* Counter */}
      <div className="feed-counter">
        {currentIndex + 1} / {items.length}
      </div>
    </div>
  )
}
