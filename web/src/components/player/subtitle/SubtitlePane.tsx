/**
 * SubtitlePane Component
 * Renders a single subtitle pane for split screen mode (left or right)
 */

import { View, Text, StyleSheet, Platform } from 'react-native'
import { SubtitleCue, SubtitleSettings, getLanguageInfo } from '@/types/subtitle'
import { colors, borderRadius } from '@olorin/design-tokens'

interface SubtitlePaneProps {
  cues: SubtitleCue[]
  language: string
  position: 'left' | 'right'
  settings: SubtitleSettings
  fontSize: number
}

export default function SubtitlePane({
  cues,
  language,
  position,
  settings,
  fontSize,
}: SubtitlePaneProps) {
  const langInfo = getLanguageInfo(language)
  const isRTL = langInfo?.rtl ?? false
  const isLeft = position === 'left'

  return (
    <View style={[styles.pane, isLeft ? styles.leftPane : styles.rightPane]}>
      {cues.length > 0 ? (
        cues.map((cue) => (
          <View
            key={`${position}-${cue.index}-${cue.start_time}`}
            style={[
              styles.cueContainer,
              isLeft ? styles.leftCueContainer : styles.rightCueContainer,
              {
                backgroundColor: settings.backgroundColor,
                opacity: settings.opacity ?? 1,
              },
            ]}
          >
            <Text
              style={[
                styles.cueText,
                {
                  color: settings.textColor,
                  fontSize,
                  fontFamily: settings.fontFamily,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}
            >
              {cue.text}
            </Text>
          </View>
        ))
      ) : (
        <View
          style={styles.emptyPane}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        />
      )}
      <View style={styles.languageIndicator}>
        <Text style={styles.languageFlag}>{langInfo?.flag || ''}</Text>
        <Text style={styles.languageName}>{langInfo?.nativeName || language}</Text>
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
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  leftCueContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.splitScreenLeft,
  },
  rightCueContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.splitScreenRight,
  },
  cueText: {
    fontWeight: '600',
    lineHeight: 24,
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
