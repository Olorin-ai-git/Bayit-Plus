import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { subtitlesService } from '../../services/api'
import logger from '@/utils/logger'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

interface Word {
  word: string
  is_hebrew: boolean
}

interface Cue {
  index: number
  start_time: number
  end_time: number
  formatted_start: string
  formatted_end: string
  words: Word[]
}

interface Translation {
  word: string
  translation: string
  transliteration?: string
  part_of_speech?: string
  example?: string
  example_translation?: string
}

interface InteractiveSubtitlesProps {
  contentId: string
  currentTime?: number
  language?: string
  onWordTranslate?: (translation: Translation) => void
  style?: any
}

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
  style,
}: InteractiveSubtitlesProps) {
  const [cues, setCues] = useState<Cue[]>([])
  const [currentCue, setCurrentCue] = useState<Cue | null>(null)
  const [showNikud, setShowNikud] = useState(false)
  const [hasNikud, setHasNikud] = useState(false)
  const [translation, setTranslation] = useState<Translation | null>(null)
  const [translationPosition, setTranslationPosition] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const subtitleRef = useRef<View>(null)

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
        logger.error('Failed to fetch subtitles', 'InteractiveSubtitles', err)
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
  const handleWordClick = useCallback(async (word: Word, event: any) => {
    if (!word.is_hebrew) return

    // Position the translation popup near the clicked word
    const rect = event.target?.getBoundingClientRect?.()
    const containerRect = (subtitleRef.current as any)?.getBoundingClientRect?.()

    if (containerRect && rect) {
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
      logger.error('Translation failed', 'InteractiveSubtitles', err)
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
        logger.error('Failed to generate nikud', 'InteractiveSubtitles', err)
        return
      }
    }
    setShowNikud((prev) => !prev)
  }, [contentId, language, hasNikud, showNikud])

  // Handle click outside to close translation
  useEffect(() => {
    const handleClickOutside = () => {
      if (translation) {
        closeTranslation()
      }
    }

    if (translation) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [translation, closeTranslation])

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>טוען כתוביות...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]} ref={subtitleRef}>
      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          onPress={toggleNikud}
          style={({ hovered }) => [
            styles.nikudToggle,
            showNikud && styles.nikudToggleActive,
            hovered && styles.nikudToggleHovered,
          ]}
        >
          <Text style={styles.nikudIcon}>אָ</Text>
          <Text style={styles.nikudLabel}>ניקוד</Text>
        </Pressable>
      </View>

      {/* Subtitle Text */}
      {currentCue && (
        <View style={styles.subtitleText}>
          {currentCue.words.map((word, index) => (
            <Pressable
              key={`${currentCue.index}-${index}`}
              onPress={(e) => word.is_hebrew && handleWordClick(word, e)}
              style={({ hovered }) => [
                styles.word,
                word.is_hebrew && styles.hebrewWord,
                word.is_hebrew && hovered && styles.wordHovered,
              ]}
            >
              <Text style={[styles.wordText, word.is_hebrew && styles.hebrewWordText]}>
                {word.word}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Translation Popup */}
      {translation && (
        <GlassView
          style={[
            styles.translationPopup,
            { left: translationPosition.x, top: translationPosition.y },
          ]}
          intensity="high"
        >
          <Pressable onPress={closeTranslation} style={styles.closePopup}>
            <Text style={styles.closePopupText}>×</Text>
          </Pressable>

          <View style={styles.translationHeader}>
            <Text style={styles.originalWord}>{translation.word}</Text>
            {translation.transliteration && (
              <Text style={styles.transliteration}>{translation.transliteration}</Text>
            )}
          </View>

          <View style={styles.translationContent}>
            <Text style={styles.translationText}>{translation.translation}</Text>
            {translation.part_of_speech && (
              <Text style={styles.partOfSpeech}>{translation.part_of_speech}</Text>
            )}
          </View>

          {translation.example && (
            <View style={styles.translationExample}>
              <Text style={styles.exampleHebrew}>{translation.example}</Text>
              {translation.example_translation && (
                <Text style={styles.exampleEnglish}>{translation.example_translation}</Text>
              )}
            </View>
          )}

          {isTranslating && (
            <Text style={styles.translatingText}>מתרגם...</Text>
          )}
        </GlassView>
      )}

      {/* Timestamp */}
      {currentCue && (
        <Text style={styles.timestamp}>
          {currentCue.formatted_start} - {currentCue.formatted_end}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  nikudToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  nikudToggleActive: {
    backgroundColor: colors.primary,
  },
  nikudToggleHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  nikudIcon: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nikudLabel: {
    fontSize: 12,
    color: colors.text,
  },
  subtitleText: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  word: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  hebrewWord: {
    cursor: 'pointer' as any,
  },
  wordHovered: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  wordText: {
    fontSize: 20,
    color: colors.text,
  },
  hebrewWordText: {
    color: colors.text,
  },
  translationPopup: {
    position: 'absolute',
    transform: [{ translateX: -100 }],
    width: 200,
    padding: spacing.md,
    zIndex: 100,
  } as any,
  closePopup: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePopupText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  translationHeader: {
    marginBottom: spacing.sm,
  },
  originalWord: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  transliteration: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  translationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  translationText: {
    fontSize: 14,
    color: colors.text,
  },
  partOfSpeech: {
    fontSize: 10,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.sm,
  },
  translationExample: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  exampleHebrew: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  exampleEnglish: {
    fontSize: 12,
    color: colors.textMuted,
  },
  translatingText: {
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: 'monospace',
  },
})
