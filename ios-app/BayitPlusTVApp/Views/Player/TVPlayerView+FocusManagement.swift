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
    }

    // MARK: - Subtitle Selection (VOD)

    func handleSubtitleSelection(_ language: String?) {
        state.selectedSubtitleLanguage = language

        if state.splitModeEnabled {
            state.splitModeEnabled = false
            state.splitLanguages = []
            state.primarySubtitleCues = []
            state.secondarySubtitleCues = []
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

        let repo = repos.subtitle
        async let primaryResult = repo.fetchCues(
            contentId: contentId, language: state.splitLanguages[0],
            hebrewMode: nil, englishMode: nil
        )
        async let secondaryResult = repo.fetchCues(
            contentId: contentId, language: state.splitLanguages[1],
            hebrewMode: nil, englishMode: nil
        )

        do {
            let (primary, secondary) = try await (
                primaryResult, secondaryResult
            )
            state.primarySubtitleCues = primary.cues ?? []
            state.secondarySubtitleCues = secondary.cues ?? []
        } catch {
            state.splitModeEnabled = false
        }
    }
}
