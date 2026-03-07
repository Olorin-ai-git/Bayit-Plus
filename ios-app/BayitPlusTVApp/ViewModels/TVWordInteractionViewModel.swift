import BayitCore
import Foundation
import Observation

/// Manages interactive subtitle word selection, translation lookup, and vocabulary tracking.
/// Used when the user enables interactive mode to explore individual words via Siri Remote.
@MainActor
@Observable
final class TVWordInteractionViewModel {
    // MARK: - Published State

    private(set) var words: [TVSubtitleWord] = []
    private(set) var translationResult: TranslationResult?
    private(set) var isTranslating = false
    private(set) var savedWords: [SavedVocabularyWord] = []
    var selectedWordIndex: Int?
    var isEnabled = false

    // MARK: - Computed

    var selectedWord: TVSubtitleWord? {
        guard let idx = selectedWordIndex, idx >= 0, idx < words.count else {
            return nil
        }
        return words[idx]
    }

    var hasTranslation: Bool {
        translationResult != nil
    }

    // MARK: - Dependencies

    private let repository: any SubtitleRepository
    private let logger = BayitLogger(category: "TVInteractiveSubtitle")

    init(repository: any SubtitleRepository) {
        self.repository = repository
    }

    // MARK: - Word Parsing

    func parseSubtitleText(_ text: String) {
        guard !text.isEmpty else {
            words = []
            return
        }
        words = text.split(separator: " ").enumerated().map { _, segment in
            let str = String(segment)
            let isHebrew = str.unicodeScalars.contains {
                $0.value >= 0x0590 && $0.value <= 0x05FF
            }
            return TVSubtitleWord(
                text: str,
                isHebrew: isHebrew,
                hasCulturalRef: false
            )
        }
        selectedWordIndex = nil
        dismissTranslation()
    }

    // MARK: - Navigation

    func selectWord(at index: Int) async {
        guard index >= 0, index < words.count else { return }
        selectedWordIndex = index
        await fetchTranslation(for: words[index])
    }

    func nextWord() async {
        let nextIdx = (selectedWordIndex ?? -1) + 1
        guard nextIdx < words.count else { return }
        await selectWord(at: nextIdx)
    }

    func previousWord() async {
        let prevIdx = (selectedWordIndex ?? words.count) - 1
        guard prevIdx >= 0 else { return }
        await selectWord(at: prevIdx)
    }

    // MARK: - Translation

    func fetchTranslation(for word: TVSubtitleWord) async {
        isTranslating = true
        do {
            let sourceLang = word.isHebrew ? "he" : nil
            let targetLang = word.isHebrew ? "en" : "he"
            translationResult = try await repository.translateWord(
                word: word.text,
                sourceLang: sourceLang,
                targetLang: targetLang
            )
        } catch {
            logger.error("Translation failed for '\(word.text)': \(error)")
            translationResult = nil
        }
        isTranslating = false
    }

    func dismissTranslation() {
        translationResult = nil
        isTranslating = false
    }

    // MARK: - Glossary

    func saveToGlossary(_ word: TVSubtitleWord) {
        let existing = savedWords.first { $0.originalWord == word.text }
        if let existing {
            if let idx = savedWords.firstIndex(where: { $0.id == existing.id }) {
                savedWords[idx] = existing.incrementEncountered()
            }
        } else {
            let entry = SavedVocabularyWord(
                originalWord: word.text,
                translation: translationResult?.translation,
                transliteration: translationResult?.transliteration,
                partOfSpeech: translationResult?.partOfSpeech,
                isHebrew: word.isHebrew,
                timesEncountered: 1,
                isNew: true
            )
            savedWords.append(entry)
        }
    }

    func clearSession() {
        savedWords = []
        words = []
        selectedWordIndex = nil
        dismissTranslation()
        isEnabled = false
    }
}

// MARK: - Vocabulary Model

struct SavedVocabularyWord: Identifiable, Sendable {
    let id: UUID
    let originalWord: String
    let translation: String?
    let transliteration: String?
    let partOfSpeech: String?
    let isHebrew: Bool
    let timesEncountered: Int
    let isNew: Bool

    init(
        originalWord: String,
        translation: String?,
        transliteration: String?,
        partOfSpeech: String?,
        isHebrew: Bool,
        timesEncountered: Int,
        isNew: Bool
    ) {
        id = UUID()
        self.originalWord = originalWord
        self.translation = translation
        self.transliteration = transliteration
        self.partOfSpeech = partOfSpeech
        self.isHebrew = isHebrew
        self.timesEncountered = timesEncountered
        self.isNew = isNew
    }

    func incrementEncountered() -> SavedVocabularyWord {
        SavedVocabularyWord(
            originalWord: originalWord,
            translation: translation,
            transliteration: transliteration,
            partOfSpeech: partOfSpeech,
            isHebrew: isHebrew,
            timesEncountered: timesEncountered + 1,
            isNew: false
        )
    }
}
