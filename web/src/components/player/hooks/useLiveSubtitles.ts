/**
 * Custom hook for live subtitle management
 */

import { useState, useEffect, useMemo } from 'react'
import { LiveSubtitleCue } from '@/services/liveSubtitleService'

export function useLiveSubtitles() {
  const [liveSubtitleCues, setLiveSubtitleCues] = useState<LiveSubtitleCue[]>([])
  const [liveSubtitleLang, setLiveSubtitleLang] = useState('en')
  const [subtitleTick, setSubtitleTick] = useState(0)

  // Memoize visible live subtitles to avoid filtering on every render
  // Show only the MOST RECENT subtitle (1 at a time) to prevent stacking
  const visibleLiveSubtitles = useMemo(() => {
    const now = Date.now()
    return liveSubtitleCues
      .filter((cue) => (cue as any).displayUntil > now)
      .slice(-1) // Only show the most recent subtitle
  }, [liveSubtitleCues, subtitleTick])

  // Aggressive cleanup: Poll every 500ms to remove expired subtitles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setLiveSubtitleCues((prev) => {
        const active = prev.filter((cue) => (cue as any).displayUntil > now)
        if (active.length !== prev.length) {
          setSubtitleTick((t) => t + 1)
        }
        return active
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Live subtitle handler (Premium feature)
  const handleLiveSubtitleCue = (cue: LiveSubtitleCue) => {
    const newCue = { ...cue, displayUntil: Date.now() + 3000 }
    setLiveSubtitleCues((prev) => [...prev.slice(-50), newCue])
  }

  return {
    liveSubtitleCues,
    liveSubtitleLang,
    visibleLiveSubtitles,
    setLiveSubtitleLang,
    handleLiveSubtitleCue,
  }
}
