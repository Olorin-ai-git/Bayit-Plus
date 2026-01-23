/**
 * LeftControls Component
 * Play, skip, volume and time display controls with TV focus support
 */

import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, RotateCcw, Volume2, VolumeX,
} from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassSlider } from '@bayit/shared/ui'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { PlayerState, PlayerControls, Chapter } from '../types'
import { controlStyles as styles, MIN_TOUCH_TARGET, TV_TOUCH_TARGET } from './playerControlsStyles'

interface LeftControlsProps {
  state: PlayerState
  controls: PlayerControls
  isLive?: boolean
  hasChapters?: boolean
  chapters?: Chapter[]
}

export default function LeftControls({
  state, controls, isLive = false, hasChapters = false, chapters = [],
}: LeftControlsProps) {
  const { t } = useTranslation()
  const playFocus = useTVFocus({ styleType: 'button' })
  const prevChapterFocus = useTVFocus({ styleType: 'button' })
  const skipBackFocus = useTVFocus({ styleType: 'button' })
  const skipForwardFocus = useTVFocus({ styleType: 'button' })
  const nextChapterFocus = useTVFocus({ styleType: 'button' })
  const restartFocus = useTVFocus({ styleType: 'button' })
  const muteFocus = useTVFocus({ styleType: 'button' })

  const iconSize = isTV ? 28 : 22
  const smallIconSize = isTV ? 24 : 18
  const speedDisplay = state.playbackSpeed !== 1 ? `${state.playbackSpeed}x` : null

  return (
    <View style={styles.leftControls}>
      {/* Play/Pause */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); controls.togglePlay() }}
        onFocus={playFocus.handleFocus}
        onBlur={playFocus.handleBlur}
        focusable={true}
        style={({ hovered }) => [
          styles.controlButton,
          hovered && styles.controlButtonHovered,
          playFocus.isFocused && playFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={state.isPlaying ? t('player.pause') : t('player.play')}
      >
        {state.isPlaying ? <Pause size={iconSize} color={colors.text} /> : <Play size={iconSize} color={colors.text} />}
      </Pressable>

      {!isLive && (
        <>
          {/* Previous Chapter */}
          {hasChapters && chapters.length > 0 && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); controls.skipToPreviousChapter(chapters, state.currentTime) }}
              onFocus={prevChapterFocus.handleFocus}
              onBlur={prevChapterFocus.handleBlur}
              focusable={true}
              style={({ hovered }) => [
                styles.controlButton, hovered && styles.controlButtonHovered,
                prevChapterFocus.isFocused && prevChapterFocus.focusStyle,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('player.previousChapter')}
            >
              <ChevronLeft size={smallIconSize} color={colors.text} />
            </Pressable>
          )}

          {/* Skip Back/Forward */}
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); controls.skip(-30) }}
            onFocus={skipBackFocus.handleFocus}
            onBlur={skipBackFocus.handleBlur}
            focusable={true}
            style={({ hovered }) => [
              styles.controlButton, styles.skipButton, hovered && styles.controlButtonHovered,
              skipBackFocus.isFocused && skipBackFocus.focusStyle,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('player.skipBackward')}
          >
            <SkipBack size={isTV ? 20 : 16} color={colors.text} />
            <Text style={[styles.skipText, isTV && styles.skipTextTV]}>30</Text>
          </Pressable>

          <Pressable
            onPress={(e) => { e.stopPropagation?.(); controls.skip(30) }}
            onFocus={skipForwardFocus.handleFocus}
            onBlur={skipForwardFocus.handleBlur}
            focusable={true}
            style={({ hovered }) => [
              styles.controlButton, styles.skipButton, hovered && styles.controlButtonHovered,
              skipForwardFocus.isFocused && skipForwardFocus.focusStyle,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('player.skipForward')}
          >
            <SkipForward size={isTV ? 20 : 16} color={colors.text} />
            <Text style={[styles.skipText, isTV && styles.skipTextTV]}>30</Text>
          </Pressable>

          {/* Next Chapter */}
          {hasChapters && chapters.length > 0 && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); controls.skipToNextChapter(chapters, state.currentTime) }}
              onFocus={nextChapterFocus.handleFocus}
              onBlur={nextChapterFocus.handleBlur}
              focusable={true}
              style={({ hovered }) => [
                styles.controlButton, hovered && styles.controlButtonHovered,
                nextChapterFocus.isFocused && nextChapterFocus.focusStyle,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('player.nextChapter')}
            >
              <ChevronRight size={smallIconSize} color={colors.text} />
            </Pressable>
          )}

          {/* Restart */}
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); controls.handleRestart() }}
            onFocus={restartFocus.handleFocus}
            onBlur={restartFocus.handleBlur}
            focusable={true}
            style={({ hovered }) => [
              styles.controlButton, hovered && styles.controlButtonHovered,
              restartFocus.isFocused && restartFocus.focusStyle,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('player.restart')}
          >
            <RotateCcw size={smallIconSize} color={colors.text} />
          </Pressable>
        </>
      )}

      {/* Volume */}
      <View style={styles.volumeControls}>
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); controls.toggleMute() }}
          onFocus={muteFocus.handleFocus}
          onBlur={muteFocus.handleBlur}
          focusable={true}
          style={({ hovered }) => [
            styles.controlButton, hovered && styles.controlButtonHovered,
            muteFocus.isFocused && muteFocus.focusStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={state.isMuted ? t('player.unmute') : t('player.mute')}
        >
          {state.isMuted ? <VolumeX size={smallIconSize} color={colors.text} /> : <Volume2 size={smallIconSize} color={colors.text} />}
        </Pressable>
        <View style={styles.sliderContainer}>
          <GlassSlider
            value={state.isMuted ? 0 : state.volume}
            min={0} max={1} step={0.1}
            onValueChange={controls.setVolume}
            accessibilityLabel={t('player.volume')}
            testID="volume-slider"
          />
        </View>
      </View>

      {/* Time Display */}
      {!isLive && (
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, isTV && styles.timeTextTV]}>
            {controls.formatTime(state.currentTime)} / {controls.formatTime(state.duration)}
          </Text>
          {speedDisplay && (
            <Text style={[styles.speedBadge, isTV && styles.speedBadgeTV]}>{speedDisplay}</Text>
          )}
        </View>
      )}
    </View>
  )
}
