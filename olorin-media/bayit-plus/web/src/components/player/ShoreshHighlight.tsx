/**
 * ShoreshHighlight Component
 * Renders a Hebrew word with root letters highlighted in a configurable color
 */

import { Text, StyleSheet } from 'react-native'
import type { ShoreshHighlight as ShoreshHighlightData } from '@/services/smartSubsService'

interface ShoreshHighlightProps {
  word: string
  rootIndices: number[]
  highlightColor: string
  meaningHint?: string
  fontSize?: number
}

export default function ShoreshHighlight({
  word,
  rootIndices,
  highlightColor,
  meaningHint,
  fontSize = 28,
}: ShoreshHighlightProps) {
  const characters = Array.from(word)
  const rootIndexSet = new Set(rootIndices)

  return (
    <Text
      style={[styles.word, { fontSize }]}
      accessibilityLabel={
        meaningHint
          ? `${word}, root meaning: ${meaningHint}`
          : word
      }
      accessibilityRole="text"
    >
      {characters.map((char, index) => {
        const isRoot = rootIndexSet.has(index)
        return (
          <Text
            key={`${char}-${index}`}
            style={isRoot ? [styles.rootChar, { color: highlightColor }] : styles.normalChar}
          >
            {char}
          </Text>
        )
      })}
    </Text>
  )
}

/**
 * Renders a full sentence with shoresh-highlighted words
 */
export function ShoreshSentence({
  text,
  highlights,
  highlightColor,
  fontSize = 28,
}: {
  text: string
  highlights: ShoreshHighlightData[]
  highlightColor: string
  fontSize?: number
}) {
  const words = text.split(/\s+/)
  const highlightMap = new Map(
    highlights.map((h) => [h.word, h]),
  )

  return (
    <Text style={[styles.sentence, { fontSize }]} accessibilityRole="text">
      {words.map((word, idx) => {
        const highlight = highlightMap.get(word)
        if (highlight) {
          return (
            <Text key={`${word}-${idx}`}>
              <ShoreshHighlight
                word={word}
                rootIndices={highlight.root_indices}
                highlightColor={highlightColor}
                meaningHint={highlight.meaning_en}
                fontSize={fontSize}
              />
              {idx < words.length - 1 ? ' ' : ''}
            </Text>
          )
        }
        return (
          <Text key={`${word}-${idx}`} style={styles.normalChar}>
            {word}
            {idx < words.length - 1 ? ' ' : ''}
          </Text>
        )
      })}
    </Text>
  )
}

const styles = StyleSheet.create({
  word: {
    writingDirection: 'rtl',
  },
  sentence: {
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  rootChar: {
    fontWeight: '800',
    textShadowColor: 'rgba(255, 215, 0, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  normalChar: {
    color: '#fff',
    fontWeight: 'bold',
  },
})
