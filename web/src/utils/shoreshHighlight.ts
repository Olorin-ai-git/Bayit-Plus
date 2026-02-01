/**
 * Shoresh Highlighting Utility
 * Parses shoresh data and identifies which characters in each word are root letters
 */

export interface ShoreshSegment {
  word: string
  shoresh: string
}

export interface ShoreshData {
  segments: ShoreshSegment[]
}

export interface HighlightedChar {
  char: string
  isShoresh: boolean
}

export interface HighlightedWord {
  chars: HighlightedChar[]
}

/**
 * Parse shoresh JSON string into structured data
 */
export function parseShoreshJson(jsonStr: string): ShoreshData | null {
  try {
    const data = JSON.parse(jsonStr)
    if (data && Array.isArray(data.segments)) {
      return data as ShoreshData
    }
  } catch {
    // Invalid JSON
  }
  return null
}

/**
 * Find positions of shoresh letters within a word
 * Hebrew roots appear in order within the word, but may have other letters between them
 *
 * @example
 * findShoreshPositions("הילדים", "ילד") => [1, 2, 3] (positions of י, ל, ד)
 * findShoreshPositions("הולכים", "הלך") => [0, 2, 3] (positions of ה, ל, כ)
 */
export function findShoreshPositions(word: string, shoresh: string): Set<number> {
  const positions = new Set<number>()

  if (!shoresh || shoresh.length === 0) {
    return positions
  }

  // Track which shoresh letters we've found
  let shoreshIdx = 0
  const shoreshChars = [...shoresh]

  // Scan through the word looking for shoresh letters in order
  for (let i = 0; i < word.length && shoreshIdx < shoreshChars.length; i++) {
    const wordChar = word[i]
    const targetChar = shoreshChars[shoreshIdx]

    // Match the character (handle final forms of Hebrew letters)
    if (isMatchingHebrewLetter(wordChar, targetChar)) {
      positions.add(i)
      shoreshIdx++
    }
  }

  // Only return positions if we found all shoresh letters
  if (shoreshIdx === shoreshChars.length) {
    return positions
  }

  // Fallback: couldn't find all letters in order, return empty
  return new Set()
}

/**
 * Check if two Hebrew characters match (accounting for final letter forms)
 * כ/ך, מ/ם, נ/ן, פ/ף, צ/ץ
 */
function isMatchingHebrewLetter(char1: string, char2: string): boolean {
  if (char1 === char2) return true

  // Final form mappings (sofit ↔ regular)
  const finalForms: Record<string, string> = {
    'ך': 'כ',
    'ם': 'מ',
    'ן': 'נ',
    'ף': 'פ',
    'ץ': 'צ',
    'כ': 'ך',
    'מ': 'ם',
    'נ': 'ן',
    'פ': 'ף',
    'צ': 'ץ',
  }

  // Check if they're final/regular variants of the same letter
  return finalForms[char1] === char2 || finalForms[char2] === char1
}

/**
 * Convert a word with its shoresh into an array of highlighted characters
 */
export function highlightWord(word: string, shoresh: string): HighlightedChar[] {
  const positions = findShoreshPositions(word, shoresh)

  return [...word].map((char, idx) => ({
    char,
    isShoresh: positions.has(idx),
  }))
}

/**
 * Convert shoresh JSON into an array of highlighted words for rendering
 */
export function parseShoreshForDisplay(jsonStr: string): HighlightedWord[] {
  const data = parseShoreshJson(jsonStr)

  if (!data) {
    // Fallback: return the string as plain text
    return [{ chars: [...jsonStr].map((char) => ({ char, isShoresh: false })) }]
  }

  return data.segments.map((segment) => ({
    chars: highlightWord(segment.word, segment.shoresh),
  }))
}

/**
 * Check if a string is valid shoresh JSON format
 */
export function isShoreshJson(text: string): boolean {
  return parseShoreshJson(text) !== null
}
