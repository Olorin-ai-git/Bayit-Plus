/**
 * Scene Search Result Card Component
 *
 * Displays a single search result with timestamp, matched text,
 * and episode info for series content.
 */

import { View, Text, Pressable, StyleSheet, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play, Clock } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import type { SceneSearchResult } from './hooks/useSceneSearch'

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
  const { t } = useTranslation()
  const isRTL = I18nManager.isRTL

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('player.sceneSearch.result.jumpTo', {
        title: result.title,
        time: result.timestamp_formatted,
      })}
      accessibilityHint={t('player.sceneSearch.result.hint')}
    >
      {({ hovered }) => (
        <GlassView
          style={[
            styles.card,
            isActive && styles.cardActive,
            hovered && !isActive && styles.cardHovered,
          ]}
          intensity={isActive ? 'high' : 'medium'}
        >
          <View style={[styles.content, isRTL && styles.contentRTL]}>
            {/* Timestamp badge */}
            <View style={styles.timestampContainer}>
              <Clock size={12} color={colors.primary} />
              <Text style={styles.timestamp}>{result.timestamp_formatted}</Text>
            </View>

            {/* Main content */}
            <View style={styles.textContainer}>
              {/* Title with episode info */}
              <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
                <Text
                  style={[styles.title, isActive && styles.titleActive]}
                  numberOfLines={1}
                >
                  {result.title}
                </Text>
                {result.episode_info && (
                  <View style={styles.episodeBadge}>
                    <Text style={styles.episodeText}>{result.episode_info}</Text>
                  </View>
                )}
              </View>

              {/* Matched text */}
              <Text style={styles.matchedText} numberOfLines={2}>
                {result.matched_text}
              </Text>

              {/* Relevance score indicator */}
              <View style={[styles.scoreRow, isRTL && styles.scoreRowRTL]}>
                <View style={styles.scoreBarContainer}>
                  <View
                    style={[
                      styles.scoreBar,
                      { width: `${result.relevance_score * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.scoreText}>
                  {Math.round(result.relevance_score * 100)}%
                </Text>
              </View>
            </View>

            {/* Play indicator */}
            <View
              style={[
                styles.playButton,
                isActive && styles.playButtonActive,
                hovered && !isActive && styles.playButtonHovered,
              ]}
            >
              <Play
                size={14}
                fill={isActive ? colors.text : 'none'}
                color={isActive ? colors.text : colors.textMuted}
              />
            </View>
          </View>
        </GlassView>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardActive: {
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  titleActive: {
    color: '#c084fc',
  },
  episodeBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  episodeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#818cf8',
  },
  matchedText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  scoreRowRTL: {
    flexDirection: 'row-reverse',
  },
  scoreBarContainer: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scoreText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontVariant: ['tabular-nums'],
    minWidth: 28,
    textAlign: 'right',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  playButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
})
