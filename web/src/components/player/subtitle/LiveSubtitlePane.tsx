/**
 * LiveSubtitlePane Component
 * Renders a single subtitle pane for live split screen mode (left or right)
 */

import { View, Text, StyleSheet, Platform } from 'react-native'
import { LiveSubtitleCue, getLanguageInfo } from '@/types/subtitle'
import { colors, borderRadius } from '@olorin/design-tokens'
import { isShoreshJson } from '@/utils/shoreshHighlight'
import ShoreshText from './ShoreshText'

interface LiveSubtitlePaneProps {
  cues: LiveSubtitleCue[]
  language: string
  position: 'left' | 'right'
  fontSize?: number
}

export default function LiveSubtitlePane({
  cues,
  language,
  position,
  fontSize = 17,
}: LiveSubtitlePaneProps) {
  const langInfo = getLanguageInfo(language)
  const isRTL = langInfo?.rtl ?? false
  const isLeft = position === 'left'

  // Show only the most recent cue to avoid stacking
  const visibleCue = cues.length > 0 ? cues[cues.length - 1] : null

  // Check if the text is shoresh JSON format
  const isShoresh = visibleCue?.text ? isShoreshJson(visibleCue.text) : false

  return (
    <View style={[styles.pane, isLeft ? styles.leftPane : styles.rightPane]}>
      {visibleCue ? (
        <View
          style={[
            styles.cueContainer,
            isLeft ? styles.leftCueContainer : styles.rightCueContainer,
          ]}
        >
          {isShoresh ? (
            <ShoreshText
              text={visibleCue.text}
              style={{
                fontSize,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
                lineHeight: 26,
              }}
            />
          ) : (
            <Text
              style={[
                styles.cueText,
                {
                  fontSize,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}
            >
              {visibleCue.text}
            </Text>
          )}
        </View>
      ) : (
        <View
          style={styles.emptyPane}
          accessibilityLabel={`No ${langInfo?.nativeName || language} subtitles available`}
          accessibilityRole="status"
        />
      )}
      <View style={styles.languageIndicator}>
        <Text style={styles.languageFlag} importantForAccessibility="no">
          {langInfo?.flag || ''}
        </Text>
        <Text style={styles.languageName}>
          {langInfo?.nativeName || language}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pane: {
    flex: 1,
    maxWidth: '45%',
    alignItems: 'center',
  },
  leftPane: {
    alignItems: 'flex-end',
  },
  rightPane: {
    alignItems: 'flex-start',
  },
  cueContainer: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    marginVertical: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  leftCueContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.splitScreenLeft,
  },
  rightCueContainer: {
    borderRightWidth: 3,
    borderRightColor: colors.splitScreenRight,
  },
  cueText: {
    color: '#fff',
    fontWeight: '600',
    lineHeight: 26,
    ...Platform.select({
      web: { textShadow: '1px 1px 3px rgba(0, 0, 0, 0.95)' },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.95)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  emptyPane: {
    height: 28,
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glassLight,
  },
  languageFlag: {
    fontSize: 12,
  },
  languageName: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
})
