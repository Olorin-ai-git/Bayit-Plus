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
  const visibleLiveSubtitles = useMemo(() => {
    const now = Date.now()
    return liveSubtitleCues
      .filter((cue) => (cue as any).displayUntil > now)
      .slice(-3)
  }, [liveSubtitleCues, subtitleTick])

  // Update display when subtitles expire
  useEffect(() => {
    if (liveSubtitleCues.length === 0) return

    const now = Date.now()
    const activeCues = liveSubtitleCues.filter((cue) => (cue as any).displayUntil > now)

    if (activeCues.length === 0) return

    // Find when the next subtitle expires
    const nextExpiry = Math.min(...activeCues.map((cue) => (cue as any).displayUntil))
    const timeUntilExpiry = nextExpiry - now

    // Schedule update slightly after expiry
    if (timeUntilExpiry > 0 && timeUntilExpiry < 60000) {
      const timer = setTimeout(() => {
        setSubtitleTick((t) => t + 1)
      }, timeUntilExpiry + 100)

      return () => clearTimeout(timer)
    }
  }, [liveSubtitleCues, subtitleTick])

  // Live subtitle handler (Premium feature)
  const handleLiveSubtitleCue = (cue: LiveSubtitleCue) => {
    console.log('🎬 [useLiveSubtitles] Received live subtitle cue:', cue.text)
    const newCue = { ...cue, displayUntil: Date.now() + 5000 }
    setLiveSubtitleCues((prev) => {
      const updated = [...prev.slice(-50), newCue]
      console.log('🎬 [useLiveSubtitles] Updated liveSubtitleCues, count:', updated.length)
      return updated
    })
  }

  return {
    liveSubtitleCues,
    liveSubtitleLang,
    visibleLiveSubtitles,
    setLiveSubtitleLang,
    handleLiveSubtitleCue,
  }
}
