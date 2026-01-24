/**
 * SkipControls Component
 * Skip backward/forward buttons and chapter navigation
 *
 * Features:
 * - Chapter navigation (previous/next)
 * - 30-second skip backward/forward
 * - Restart button
 * - TailwindCSS styling
 * - Conditional rendering based on chapters availability
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { Chapter } from '../types'

const SkipControlsPropsSchema = z.object({
  hasChapters: z.boolean(),
  chapters: z.array(z.any()),
  currentTime: z.number(),
  onSkip: z.function().args(z.number()).returns(z.void()),
  onSkipToPreviousChapter: z.function()
    .args(z.array(z.any()), z.number())
    .returns(z.void()),
  onSkipToNextChapter: z.function()
    .args(z.array(z.any()), z.number())
    .returns(z.void()),
  onRestart: z.function().returns(z.promise(z.void())),
})

type SkipControlsProps = z.infer<typeof SkipControlsPropsSchema>

export default function SkipControls({
  hasChapters,
  chapters,
  currentTime,
  onSkip,
  onSkipToPreviousChapter,
  onSkipToNextChapter,
  onRestart,
}: SkipControlsProps) {
  const { t } = useTranslation()

  return (
    <>
      {hasChapters && chapters.length > 0 && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onSkipToPreviousChapter(chapters, currentTime)
          }}
          style={styles.button}
          accessibilityLabel={t('player.previousChapter')}
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
      )}

      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onSkip(-30)
        }}
        style={styles.skipButton}
        accessibilityLabel={t('player.skipBackward')}
        accessibilityRole="button"
      >
        <SkipBack size={16} color={colors.text} />
        <Text style={styles.skipText}>30</Text>
      </Pressable>

      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onSkip(30)
        }}
        style={styles.skipButton}
        accessibilityLabel={t('player.skipForward')}
        accessibilityRole="button"
      >
        <SkipForward size={16} color={colors.text} />
        <Text style={styles.skipText}>30</Text>
      </Pressable>

      {hasChapters && chapters.length > 0 && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onSkipToNextChapter(chapters, currentTime)
          }}
          style={styles.button}
          accessibilityLabel={t('player.nextChapter')}
          accessibilityRole="button"
        >
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      )}

      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onRestart()
        }}
        style={styles.button}
        accessibilityLabel={t('player.restart')}
        accessibilityRole="button"
      >
        <RotateCcw size={18} color={colors.text} />
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 44,
    height: 36,
    borderRadius: borderRadius.lg,
  },
  skipText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
  },
})
