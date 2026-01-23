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

import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'
import { platformClass } from '../../../utils/platformClass'
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
      {/* Chapter Navigation - Previous */}
      {hasChapters && chapters.length > 0 && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onSkipToPreviousChapter(chapters, currentTime)
          }}
          className={platformClass(
            'w-9 h-9 rounded-lg items-center justify-center hover:bg-white/10',
            'w-9 h-9 rounded-lg items-center justify-center'
          )}
          accessibilityLabel={t('player.previousChapter')}
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
      )}

      {/* Skip Backward 30s */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onSkip(-30)
        }}
        className={platformClass(
          'flex-row items-center justify-center gap-0.5 w-11 h-9 rounded-lg hover:bg-white/10',
          'flex-row items-center justify-center gap-0.5 w-11 h-9 rounded-lg'
        )}
        accessibilityLabel={t('player.skipBackward')}
        accessibilityRole="button"
      >
        <SkipBack size={16} color={colors.text} />
        <Text className="text-[10px] text-white font-semibold">30</Text>
      </Pressable>

      {/* Skip Forward 30s */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onSkip(30)
        }}
        className={platformClass(
          'flex-row items-center justify-center gap-0.5 w-11 h-9 rounded-lg hover:bg-white/10',
          'flex-row items-center justify-center gap-0.5 w-11 h-9 rounded-lg'
        )}
        accessibilityLabel={t('player.skipForward')}
        accessibilityRole="button"
      >
        <SkipForward size={16} color={colors.text} />
        <Text className="text-[10px] text-white font-semibold">30</Text>
      </Pressable>

      {/* Chapter Navigation - Next */}
      {hasChapters && chapters.length > 0 && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onSkipToNextChapter(chapters, currentTime)
          }}
          className={platformClass(
            'w-9 h-9 rounded-lg items-center justify-center hover:bg-white/10',
            'w-9 h-9 rounded-lg items-center justify-center'
          )}
          accessibilityLabel={t('player.nextChapter')}
          accessibilityRole="button"
        >
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      )}

      {/* Restart */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onRestart()
        }}
        className={platformClass(
          'w-9 h-9 rounded-lg items-center justify-center hover:bg-white/10',
          'w-9 h-9 rounded-lg items-center justify-center'
        )}
        accessibilityLabel={t('player.restart')}
        accessibilityRole="button"
      >
        <RotateCcw size={18} color={colors.text} />
      </Pressable>
    </>
  )
}
