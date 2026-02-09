import Foundation

// MARK: - Protocol

/// Protocol for parsing shoresh (Hebrew root) highlighting data.
/// Enables testability and dependency injection.
protocol ShoreshParsing: Sendable {
    func parseForDisplay(_ jsonString: String) -> [HighlightedWord]
}

// MARK: - Models

/// A segment of Hebrew text with its root (shoresh) identification
struct ShoreshSegment: Decodable, Sendable {
    let word: String
    let shoresh: String?
}

/// Top-level data structure for shoresh JSON
struct ShoreshData: Decodable, Sendable {
    let segments: [ShoreshSegment]
}

/// A single character with highlighting state
struct HighlightedCharacter: Sendable, Identifiable {
    let id: UUID = UUID()
    let character: Character
    let isRoot: Bool
}

/// A word with per-character highlighting for display
struct HighlightedWord: Sendable, Identifiable {
    let id: UUID = UUID()
    let characters: [HighlightedCharacter]
    let originalWord: String
}

// MARK: - Implementation

/// Default implementation of ShoreshParsing that handles Hebrew root highlighting.
/// Supports Hebrew final forms (sofit letters) for accurate root matching.
struct DefaultShoreshParser: ShoreshParsing {

    func parseForDisplay(_ jsonString: String) -> [HighlightedWord] {
        guard let data = jsonString.data(using: .utf8),
              let shoreshData = try? JSONDecoder().decode(ShoreshData.self, from: data) else {
            return []
        }

        return shoreshData.segments.map { segment in
            let positions = segment.shoresh.flatMap {
                findShoreshPositions(word: segment.word, shoresh: $0)
            } ?? []

            let characters = segment.word.enumerated().map { index, char in
                HighlightedCharacter(
                    character: char,
                    isRoot: positions.contains(index)
                )
            }

            return HighlightedWord(
                characters: characters,
                originalWord: segment.word
            )
        }
    }

    /// Finds positions of root letters in a Hebrew word, handling final forms.
    ///
    /// Hebrew has five letters with special final forms (sofit):
    /// - kaf (כ U+05DB) <-> kaf-sofit (ך U+05DA)
    /// - mem (מ U+05DE) <-> mem-sofit (ם U+05DD)
    /// - nun (נ U+05E0) <-> nun-sofit (ן U+05DF)
    /// - pe (פ U+05E4) <-> pe-sofit (ף U+05E3)
    /// - tsadi (צ U+05E6) <-> tsadi-sofit (ץ U+05E5)
    private func findShoreshPositions(word: String, shoresh: String) -> Set<Int> {
        var positions = Set<Int>()
        let wordChars = Array(word)
        let shoreshChars = Array(shoresh)

        var shoreshIndex = 0
        for (wordIndex, wordChar) in wordChars.enumerated() {
            guard shoreshIndex < shoreshChars.count else { break }

            let shoreshChar = shoreshChars[shoreshIndex]
            if matches(wordChar, shoreshChar) {
                positions.insert(wordIndex)
                shoreshIndex += 1
            }
        }

        return positions
    }

    /// Checks if two Hebrew characters match, accounting for final forms.
    private func matches(_ a: Character, _ b: Character) -> Bool {
        if a == b { return true }

        let pairs: [(Character, Character)] = [
            ("כ", "ך"), // kaf / kaf-sofit
            ("מ", "ם"), // mem / mem-sofit
            ("נ", "ן"), // nun / nun-sofit
            ("פ", "ף"), // pe / pe-sofit
            ("צ", "ץ")  // tsadi / tsadi-sofit
        ]

        for (regular, final) in pairs {
            if (a == regular && b == final) || (a == final && b == regular) {
                return true
            }
        }

        return false
    }
}
