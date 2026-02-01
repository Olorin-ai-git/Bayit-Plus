/**
 * ShoreshText Component
 * Renders Hebrew text with shoresh (root) letters highlighted in bold
 */

import { Fragment, useMemo } from 'react'
import { Text, StyleSheet, TextStyle } from 'react-native'
import { parseShoreshForDisplay, isShoreshJson } from '@/utils/shoreshHighlight'

interface ShoreshTextProps {
  /** The shoresh JSON string or plain text */
  text: string
  /** Base text style to apply */
  style?: TextStyle
  /** Text color */
  color?: string
}

export default function ShoreshText({ text, style, color = '#fff' }: ShoreshTextProps) {
  const highlightedWords = useMemo(() => {
    if (!isShoreshJson(text)) {
      // Not shoresh JSON, render as plain text
      return null
    }
    return parseShoreshForDisplay(text)
  }, [text])

  // If not shoresh JSON, just render plain text
  if (!highlightedWords) {
    return (
      <Text style={[styles.baseText, style, { color }]}>
        {text}
      </Text>
    )
  }

  return (
    <Text style={[styles.baseText, style, { color }]}>
      {highlightedWords.map((word, wordIdx) => (
        <Fragment key={wordIdx}>
          {word.chars.map((charData, charIdx) => (
            <Text
              key={`${wordIdx}-${charIdx}`}
              style={charData.isShoresh ? styles.shoreshLetter : undefined}
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
