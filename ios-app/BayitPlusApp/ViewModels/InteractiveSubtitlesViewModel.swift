#if os(iOS)
import Foundation
import Observation

/// ViewModel for interactive subtitles - manages cues, active cue tracking, modes, and word translation.
/// Available on iOS only. Depends on OfflineCacheService and ShoreshParsing.
@Observable
final class InteractiveSubtitlesViewModel {
    private(set) var cues: [SubtitleCue] = []
    private(set) var activeCue: SubtitleCue?
    private(set) var translation: TranslationResult?
    private(set) var hebrewMode: SubtitleHebrewMode = .standard
    private(set) var englishMode: SubtitleEnglishMode = .standard
    private(set) var shoreshWords: [HighlightedWord] = []
    private(set) var isTranslating = false
    private(set) var showTranslation = false
    private(set) var hasNikud = false
    private(set) var hasShoresh = false
    private(set) var hasHeblish = false

    /// Check if user is admin (from auth store or user session)
    /// TODO: Wire to actual auth store when available
    var isAdmin: Bool {
        return false
    }

    private let repository: any SubtitleRepository
    private let offlineCache: OfflineCacheService
    private let shoreshParser: any ShoreshParsing

    init(
        repository: any SubtitleRepository,
        offlineCache: OfflineCacheService,
        shoreshParser: any ShoreshParsing = DefaultShoreshParser()
    ) {
        self.repository = repository
        self.offlineCache = offlineCache
        self.shoreshParser = shoreshParser
    }

    @MainActor
    func loadCues(contentId: String, language: String?) async {
        let cacheKey = "subtitles_\(contentId)_\(language ?? "default")_\(hebrewMode.rawValue)_\(englishMode.rawValue)"

        do {
            let response = try await repository.fetchCues(
                contentId: contentId,
                language: language,
                hebrewMode: hebrewMode,
                englishMode: englishMode
            )
            cues = response.cues ?? []

            // Check which AI modes have generated subtitles
            hasNikud = cues.contains { $0.textNikud != nil }
            hasShoresh = cues.contains { $0.textShoresh != nil }
            hasHeblish = cues.contains { $0.textHeblish != nil }

            await offlineCache.save(response, forKey: cacheKey)
        } catch {
            if let cached = await offlineCache.load(forKey: cacheKey, as: SubtitleCuesResponse.self) {
                cues = cached.cues ?? []

                // Check which AI modes have generated subtitles from cache
                hasNikud = cues.contains { $0.textNikud != nil }
                hasShoresh = cues.contains { $0.textShoresh != nil }
                hasHeblish = cues.contains { $0.textHeblish != nil }
            }
        }
    }

    @MainActor
    func setHebrewMode(_ mode: SubtitleHebrewMode, contentId: String, language: String?) async {
        hebrewMode = mode
        await loadCues(contentId: contentId, language: language)
    }

    @MainActor
    func setEnglishMode(_ mode: SubtitleEnglishMode, contentId: String, language: String?) async {
        englishMode = mode
        await loadCues(contentId: contentId, language: language)
    }

    var activeText: String {
        guard let cue = activeCue else { return "" }

        switch hebrewMode {
        case .standard:
            return cue.text ?? ""
        case .nikud:
            return cue.textNikud ?? cue.text ?? ""
        case .shoresh:
            return cue.textShoresh ?? cue.text ?? ""
        case .heblish:
            return cue.textHeblish ?? cue.text ?? ""
        }
    }

    @MainActor
    func updateActiveCue(currentTime: Double) {
        activeCue = cues.first { cue in
            let start = cue.startTime ?? 0
            let end = cue.endTime ?? 0
            return currentTime >= start && currentTime < end
        }

        if hebrewMode == .shoresh, let cue = activeCue, let shoreshJSON = cue.textShoresh {
            shoreshWords = shoreshParser.parseForDisplay(shoreshJSON)
        } else {
            shoreshWords = []
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
    func dismissTranslation() {
        showTranslation = false
        translation = nil
    }
}
#endif
