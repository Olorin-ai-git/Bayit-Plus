import { useState, useEffect, useCallback, useRef } from 'react'
import { subtitlesService } from '../../services/api'
import './InteractiveSubtitles.css'

/**
 * InteractiveSubtitles Component
 * Hebrew-first subtitle display with tap-to-translate and nikud toggle.
 * Designed for heritage speakers who understand spoken Hebrew but need reading assistance.
 */
export default function InteractiveSubtitles({
  contentId,
  currentTime = 0,
  language = 'he',
  onWordTranslate,
  className = '',
}) {
  const [cues, setCues] = useState([])
  const [currentCue, setCurrentCue] = useState(null)
  const [showNikud, setShowNikud] = useState(false)
  const [hasNikud, setHasNikud] = useState(false)
  const [translation, setTranslation] = useState(null)
  const [translationPosition, setTranslationPosition] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const subtitleRef = useRef(null)

  // Fetch subtitle cues
  useEffect(() => {
    if (!contentId) return

    const fetchCues = async () => {
      setIsLoading(true)
      try {
        const response = await subtitlesService.getCues(contentId, language, showNikud)
        setCues(response.cues || [])
        setHasNikud(response.has_nikud || false)
      } catch (err) {
        console.error('Failed to fetch subtitles:', err)
        setCues([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCues()
  }, [contentId, language, showNikud])

  // Update current cue based on playback time
  useEffect(() => {
    if (!cues.length) {
      setCurrentCue(null)
      return
    }

    const activeCue = cues.find(
      (cue) => currentTime >= cue.start_time && currentTime < cue.end_time
    )
    setCurrentCue(activeCue || null)
  }, [currentTime, cues])

  // Handle word click for translation
  const handleWordClick = useCallback(async (word, event) => {
    if (!word.is_hebrew) return

    // Position the translation popup near the clicked word
    const rect = event.target.getBoundingClientRect()
    const containerRect = subtitleRef.current?.getBoundingClientRect()

    if (containerRect) {
      setTranslationPosition({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 10,
      })
    }

    setIsTranslating(true)
    try {
      const result = await subtitlesService.translateWord(word.word)
      setTranslation(result)
      onWordTranslate?.(result)
    } catch (err) {
      console.error('Translation failed:', err)
      setTranslation({ word: word.word, translation: 'Translation unavailable' })
    } finally {
      setIsTranslating(false)
    }
  }, [onWordTranslate])

  // Close translation popup
  const closeTranslation = useCallback(() => {
    setTranslation(null)
  }, [])

  // Toggle nikud display
  const toggleNikud = useCallback(async () => {
    if (!hasNikud && !showNikud) {
      // Generate nikud if not available
      try {
        await subtitlesService.generateNikud(contentId, language)
        setHasNikud(true)
      } catch (err) {
        console.error('Failed to generate nikud:', err)
        return
      }
    }
    setShowNikud((prev) => !prev)
  }, [contentId, language, hasNikud, showNikud])

  // Handle click outside to close translation
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (translation && !e.target.closest('.translation-popup')) {
        closeTranslation()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [translation, closeTranslation])

  if (isLoading) {
    return (
      <div className={`interactive-subtitles ${className}`}>
        <div className="subtitle-loading">טוען כתוביות...</div>
      </div>
    )
  }

  if (!currentCue) {
    return (
      <div className={`interactive-subtitles ${className}`} ref={subtitleRef}>
        <div className="subtitle-controls">
          <button
            className={`nikud-toggle ${showNikud ? 'active' : ''}`}
            onClick={toggleNikud}
            title={showNikud ? 'הסתר ניקוד' : 'הצג ניקוד'}
          >
            <span className="nikud-icon">אָ</span>
            <span className="nikud-label">{showNikud ? 'ניקוד' : 'ניקוד'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`interactive-subtitles ${className}`} ref={subtitleRef}>
      {/* Controls */}
      <div className="subtitle-controls">
        <button
          className={`nikud-toggle ${showNikud ? 'active' : ''}`}
          onClick={toggleNikud}
          title={showNikud ? 'הסתר ניקוד' : 'הצג ניקוד'}
        >
          <span className="nikud-icon">אָ</span>
          <span className="nikud-label">{showNikud ? 'ניקוד' : 'ניקוד'}</span>
        </button>
      </div>

      {/* Subtitle Text */}
      <div className="subtitle-text" dir="rtl">
        {currentCue.words.map((word, index) => (
          <span
            key={`${currentCue.index}-${index}`}
            className={`subtitle-word ${word.is_hebrew ? 'hebrew clickable' : ''}`}
            onClick={(e) => word.is_hebrew && handleWordClick(word, e)}
          >
            {word.word}
          </span>
        ))}
      </div>

      {/* Translation Popup */}
      {translation && (
        <div
          className="translation-popup"
          style={{
            left: `${translationPosition.x}px`,
            top: `${translationPosition.y}px`,
          }}
        >
          <button className="close-popup" onClick={closeTranslation}>×</button>

          <div className="translation-header">
            <span className="original-word">{translation.word}</span>
            {translation.transliteration && (
              <span className="transliteration">{translation.transliteration}</span>
            )}
          </div>

          <div className="translation-content">
            <span className="translation-text">{translation.translation}</span>
            {translation.part_of_speech && (
              <span className="part-of-speech">{translation.part_of_speech}</span>
            )}
          </div>

          {translation.example && (
            <div className="translation-example">
              <div className="example-hebrew" dir="rtl">{translation.example}</div>
              {translation.example_translation && (
                <div className="example-english">{translation.example_translation}</div>
              )}
            </div>
          )}

          {isTranslating && (
            <div className="translation-loading">מתרגם...</div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="subtitle-timestamp">
        {currentCue.formatted_start} - {currentCue.formatted_end}
      </div>
    </div>
  )
}
