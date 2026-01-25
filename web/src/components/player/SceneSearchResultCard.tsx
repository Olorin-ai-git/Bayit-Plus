/**
 * Scene Search Result Card Component
 *
 * Displays a single search result with timestamp, matched text,
 * and episode info for series content.
 */

import { View, Text, Pressable, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Clock, Play } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import type { SceneSearchResult } from './hooks/useSceneSearch'
import { resultCardStyles as styles } from './panel/sceneSearchResultStyles'

interface SceneSearchResultCardProps {
  result: SceneSearchResult
  isActive?: boolean
  onPress?: () => void
}

export default function SceneSearchResultCard({
  result,
  isActive = false,
  onPress,
}: SceneSearchResultCardProps) {
  const { t, i18n } = useTranslation()
  const isRTL = I18nManager.isRTL || i18n.language === 'he' || i18n.language === 'ar'
  const { isFocused, handleFocus, handleBlur, focusStyle } = useTVFocus({ styleType: 'card' })

  // Format score for RTL locales
  const formattedScore = isRTL
    ? Math.round(result.relevance_score * 100).toLocaleString('he-IL')
    : Math.round(result.relevance_score * 100)

  return (
    <Pressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      focusable={true}
      testID={`scene-search-result-${result.content_id}-${result.timestamp_seconds}`}
      accessibilityRole="button"
      accessibilityLabel={t('player.sceneSearch.result.jumpTo', {
        title: result.title,
        time: result.timestamp_formatted,
      })}
      accessibilityHint={t('player.sceneSearch.result.hint')}
      accessibilityState={{ selected: isActive }}
    >
      {({ hovered }) => (
        <GlassView
          style={[
            styles.card,
            isActive && styles.cardActive,
            hovered && !isActive && styles.cardHovered,
            isFocused && focusStyle,
          ]}
          intensity={isActive ? 'high' : 'medium'}
        >
          <View style={[styles.content, isRTL && styles.contentRTL]}>
            {/* Timestamp badge */}
            <View style={[styles.timestampContainer, isTV && styles.timestampContainerTV]}>
              <Clock size={isTV ? 16 : 12} color={colors.primary} />
              <Text style={[styles.timestamp, isTV && styles.timestampTV]}>
                {result.timestamp_formatted}
              </Text>
            </View>

            {/* Main content */}
            <View style={styles.textContainer}>
              {/* Title with episode info */}
              <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
                <Text
                  style={[
                    styles.title,
                    isTV && styles.titleTV,
                    isActive && styles.titleActive,
                  ]}
                  numberOfLines={1}
                >
                  {result.title}
                </Text>
                {result.episode_info && (
                  <View style={[styles.episodeBadge, isTV && styles.episodeBadgeTV]}>
                    <Text style={[styles.episodeText, isTV && styles.episodeTextTV]}>
                      {result.episode_info}
                    </Text>
                  </View>
                )}
              </View>

              {/* Matched text */}
              <Text style={[styles.matchedText, isTV && styles.matchedTextTV]} numberOfLines={2}>
                {result.matched_text}
              </Text>

              {/* Relevance score indicator */}
              <View style={[styles.scoreRow, isRTL && styles.scoreRowRTL]}>
                <View style={styles.scoreBarContainer}>
                  <View
                    style={[styles.scoreBar, { width: `${result.relevance_score * 100}%` }]}
                  />
                </View>
                <Text
                  style={[
                    styles.scoreText,
                    isTV && styles.scoreTextTV,
                    isRTL ? styles.scoreTextRTL : styles.scoreTextLTR,
                  ]}
                >
                  {formattedScore}%
                </Text>
              </View>
            </View>

            {/* Play indicator */}
            <View
              style={[
                styles.playButton,
                isTV && styles.playButtonTV,
                isActive && styles.playButtonActive,
                hovered && !isActive && styles.playButtonHovered,
              ]}
            >
              <Play size={isTV ? 20 : 14} color={isActive ? colors.text : colors.textMuted} />
            </View>
          </View>
        </GlassView>
      )}
    </Pressable>
  )
}
