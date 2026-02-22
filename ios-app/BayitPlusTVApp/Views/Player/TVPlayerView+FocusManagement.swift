import BayitAuth
import BayitCore
import BayitMedia
import SwiftUI

/// Subtitle selection, live feature toggles, AI language management,
/// split subtitle helpers, and available language loading.
extension TVPlayerView {
    // MARK: - Available Languages

    func loadAvailableLanguages() async {
        guard contentType != .liveTV else {
            state.availableSubtitleLanguages = []
            return
        }

        do {
            let detail = try await repos.content.fetchContentDetail(
                id: contentId
            )
            state.availableSubtitleLanguages =
                detail.availableSubtitleLanguages ?? []
        } catch {
            state.availableSubtitleLanguages = []
        }
        Task { await loadSplitSubtitleAvailability() }
    }

    // MARK: - Subtitle Selection (VOD)

    func handleSubtitleSelection(_ language: String?) {
        state.selectedSubtitleLanguage = language

        if state.splitModeEnabled {
            state.splitModeEnabled = false
            state.splitLanguages = []
            state.primarySubtitleCues = []
            state.secondarySubtitleCues = []
            state.splitPrimaryHebrewMode = .standard
            state.splitPrimaryEnglishMode = .standard
            state.splitSecondaryHebrewMode = .standard
            state.splitSecondaryEnglishMode = .standard
        }

        if let language {
            if state.subtitlesVM == nil {
                state.subtitlesVM = InteractiveSubtitlesViewModel(
                    repository: repos.subtitle,
                    offlineCache: repos.offlineCache
                )
            }
            Task {
                await state.subtitlesVM?.loadCues(
                    contentId: contentId, language: language
                )
                if !isLive {
                    await saveSubtitlePreference(language: language)
                }
            }
        } else {
            state.subtitlesVM = nil
        }
    }

    // MARK: - Live Feature Toggles

    func toggleLiveTranslation() {
        if state.liveSubtitlesVM?.isEnabled == true {
            state.liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
        } else {
            if state.liveDubbingVM?.isEnabled == true {
                state.liveDubbingVM?.toggleDubbing(channelId: contentId)
            }
            state.liveSubtitlesVM?.selectLanguage(
                state.selectedAILanguage, channelId: contentId
            )
            state.liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
        }
    }

    func toggleLiveDubbing() {
        guard let vm = state.liveDubbingVM else { return }

        if !vm.isEnabled {
            if state.liveSubtitlesVM?.isEnabled == true {
                state.liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
            }
            vm.selectLanguage(state.selectedAILanguage, channelId: contentId)
        }
        vm.toggleDubbing(channelId: contentId)
    }

    func toggleLiveTrivia() {
        guard let vm = state.triviaVM else { return }

        if vm.isEnabled {
            vm.disconnectLiveTrivia()
        } else {
            let triviaWS = LiveTriviaWebSocketService(
                webSocketManager: repos.webSocketManager,
                configuration: repos.configuration,
                authTokenProvider: repos.authTokenProvider
            )
            vm.toggleTrivia(
                channelId: contentId,
                language: state.selectedAILanguage,
                webSocketService: triviaWS
            )
        }
    }

    func handleAILanguageChange(_ newLanguage: String) {
        state.selectedAILanguage = newLanguage

        if state.liveSubtitlesVM?.isEnabled == true {
            state.liveSubtitlesVM?.selectLanguage(
                newLanguage, channelId: contentId
            )
        }
        if state.liveDubbingVM?.isEnabled == true {
            state.liveDubbingVM?.selectLanguage(
                newLanguage, channelId: contentId
            )
        }
    }

    // MARK: - Split Subtitles

    func activeModeLabel(for languageCode: String) -> String? {
        if state.splitModeEnabled, state.splitLanguages.count == 2 {
            let isPrimary = state.splitLanguages[0] == languageCode
            switch languageCode {
            case "he":
                let mode = isPrimary ? state.splitPrimaryHebrewMode : state.splitSecondaryHebrewMode
                return mode != .standard ? mode.displayName : nil
            case "en":
                let mode = isPrimary ? state.splitPrimaryEnglishMode : state.splitSecondaryEnglishMode
                return mode != .standard ? mode.displayName : nil
            default:
                return nil
            }
        }
        guard let vm = state.subtitlesVM else { return nil }
        switch languageCode {
        case "he" where vm.hebrewMode != .standard:
            return vm.hebrewMode.displayName
        case "en" where vm.englishMode != .standard:
            return vm.englishMode.displayName
        default:
            return nil
        }
    }

    func loadSplitSubtitleCues() async {
        guard state.splitLanguages.count == 2 else { return }

        let lang0 = state.splitLanguages[0]
        let lang1 = state.splitLanguages[1]
        let hMode0: SubtitleHebrewMode? = lang0 == "he" ? state.splitPrimaryHebrewMode : nil
        let eMode0: SubtitleEnglishMode? = lang0 == "en" ? state.splitPrimaryEnglishMode : nil
        let hMode1: SubtitleHebrewMode? = lang1 == "he" ? state.splitSecondaryHebrewMode : nil
        let eMode1: SubtitleEnglishMode? = lang1 == "en" ? state.splitSecondaryEnglishMode : nil

        let repo = repos.subtitle
        async let primaryResult = repo.fetchCues(
            contentId: contentId, language: lang0,
            hebrewMode: hMode0, englishMode: eMode0
        )
        async let secondaryResult = repo.fetchCues(
            contentId: contentId, language: lang1,
            hebrewMode: hMode1, englishMode: eMode1
        )

        do {
            let (primary, secondary) = try await (primaryResult, secondaryResult)
            state.primarySubtitleCues = primary.cues ?? []
            state.secondarySubtitleCues = secondary.cues ?? []
        } catch {
            state.splitModeEnabled = false
        }
    }

    // MARK: - Split Subtitle Availability

    func loadSplitSubtitleAvailability() async {
        guard !contentId.isEmpty, !isLive else { return }
        let repo = repos.subtitle
        let langs = state.availableSubtitleLanguages
        if langs.contains("he"),
           let c = try? await repo.fetchCues(
               contentId: contentId, language: "he", hebrewMode: nil, englishMode: nil
           ).cues
        {
            state.splitHasNikud = c.contains { $0.textNikud != nil }
            state.splitHasShoresh = c.contains { $0.textShoresh != nil }
            state.splitHasHeblish = c.contains { $0.textHeblish != nil }
        }
        if langs.contains("en"),
           let c = try? await repo.fetchCues(
               contentId: contentId, language: "en", hebrewMode: nil, englishMode: nil
           ).cues
        {
            state.splitHasEngrew = c.contains { $0.textEngrew != nil }
        }
    }
}
