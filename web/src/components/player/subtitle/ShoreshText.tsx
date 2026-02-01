/**
 * ShoreshText Component
 * Renders Hebrew text with shoresh (root) letters highlighted with bold and color
 * Follows WCAG AA contrast requirements for accessibility
 */

import { Fragment, useMemo } from 'react'
import { Text, StyleSheet, TextStyle, AccessibilityRole } from 'react-native'
import { parseShoreshForDisplay, isShoreshJson } from '@/utils/shoreshHighlight'
import logger from '@/utils/logger'

interface ShoreshTextProps {
  /** The shoresh JSON string or plain text */
  text: string
  /** Base text style to apply */
  style?: TextStyle
  /** Text color */
  color?: string
  /** Shoresh highlight color (defaults to gold/amber for WCAG AA contrast) */
  shoreshColor?: string
}

// WCAG AA compliant color for shoresh letters - gold/amber provides 4.5:1 contrast on dark backgrounds
const DEFAULT_SHORESH_COLOR = '#fbbf24' // amber-400

export default function ShoreshText({
  text,
  style,
  color = '#fff',
  shoreshColor = DEFAULT_SHORESH_COLOR,
}: ShoreshTextProps) {
  const highlightedWords = useMemo(() => {
    if (!isShoreshJson(text)) {
      // Not shoresh JSON, render as plain text
      return null
    }

    try {
      return parseShoreshForDisplay(text)
    } catch (error) {
      // Error boundary: log and fallback to plain text
      logger.error('Failed to parse shoresh JSON', 'ShoreshText', { error, text: text.substring(0, 100) })
      return null
    }
  }, [text])

  // If not shoresh JSON or parsing failed, just render plain text
  if (!highlightedWords) {
    return (
      <Text style={[styles.baseText, style, { color }]}>
        {text}
      </Text>
    )
  }

  // Count shoresh letters for screen reader announcement
  const shoreshLetterCount = highlightedWords.reduce(
    (count, word) => count + word.chars.filter((c) => c.isShoresh).length,
    0
  )

  return (
    <Text
      style={[styles.baseText, style, { color }]}
      accessibilityRole={'text' as AccessibilityRole}
      accessibilityLabel={`Hebrew text with ${shoreshLetterCount} root letters highlighted`}
    >
      {highlightedWords.map((word, wordIdx) => (
        <Fragment key={wordIdx}>
          {word.chars.map((charData, charIdx) => (
            <Text
              key={`${wordIdx}-${charIdx}`}
              style={
                charData.isShoresh
                  ? [styles.shoreshLetter, { color: shoreshColor }]
                  : undefined
              }
              accessibilityLabel={charData.isShoresh ? `${charData.char} (root letter)` : undefined}
            >
              {charData.char}
            </Text>
          ))}
        </Fragment>
      ))}
    </Text>
  )
}

const styles = StyleSheet.create({
  baseText: {
    fontWeight: '400',
  },
  shoreshLetter: {
    fontWeight: '900',
  },
})
