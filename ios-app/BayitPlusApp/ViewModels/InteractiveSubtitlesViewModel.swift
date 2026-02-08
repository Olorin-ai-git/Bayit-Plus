import Foundation
import Observation

/// ViewModel for interactive subtitles - manages cues, active cue tracking, and word translation
@Observable
final class InteractiveSubtitlesViewModel {
    private(set) var cues: [SubtitleCue] = []
    private(set) var activeCue: SubtitleCue?
    private(set) var translation: TranslationResult?
    private(set) var showNikud = false
    private(set) var isTranslating = false
    private(set) var showTranslation = false

    private let repository: any SubtitleRepository

    init(repository: any SubtitleRepository) {
        self.repository = repository
    }

    @MainActor
    func loadCues(contentId: String, language: String?) async {
        do {
            let response = try await repository.fetchCues(
                contentId: contentId,
                language: language,
                withNikud: showNikud
            )
            cues = response.cues ?? []
        } catch {
            // Non-blocking: subtitles are supplementary
        }
    }

    @MainActor
    func updateActiveCue(currentTime: Double) {
        activeCue = cues.first { cue in
            let start = cue.startTime ?? 0
            let end = cue.endTime ?? 0
            return currentTime >= start && currentTime < end
        }
    }

    @MainActor
    func translateWord(_ word: String) async {
        isTranslating = true

        do {
            translation = try await repository.translateWord(
                word: word,
                sourceLang: "he",
                targetLang: "en"
            )
            showTranslation = true
        } catch {
            // Non-blocking: translation is supplementary
        }

        isTranslating = false
    }

    @MainActor
    func toggleNikud() {
        showNikud.toggle()
    }

    @MainActor
    func dismissTranslation() {
        showTranslation = false
        translation = nil
    }
}
