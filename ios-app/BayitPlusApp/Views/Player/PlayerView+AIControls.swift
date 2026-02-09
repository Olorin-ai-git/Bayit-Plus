#if os(iOS)
import BayitCore
import BayitDesignSystem
import SwiftUI

/// Extension on PlayerView providing the AI features panel and mutual exclusivity logic.
///
/// Dubbing and live subtitles are mutually exclusive: enabling one disables the other.
/// Trivia is independent and can coexist with either dubbing or subtitles.
extension PlayerView {

    // MARK: - AI Features Panel View

    var glassAIFeaturesPanel: some View {
        GlassAIFeaturesPanel(
            isExpanded: showAIPanel,
            onToggleExpand: {
                withAnimation(.spring(duration: 0.3)) {
                    showAIPanel.toggle()
                }
            },
            isSubtitlesEnabled: selectedSubtitleLanguage != nil,
            isSubtitlesConnecting: false,
            isSplitEnabled: splitModeEnabled,
            isDubbingEnabled: liveDubbingVM?.isEnabled ?? false,
            isDubbingConnecting: liveDubbingVM?.isConnecting ?? false,
            isDubbingPremiumLocked: liveDubbingVM?.isPremiumRequired ?? false,
            isTriviaEnabled: triviaVM?.isEnabled ?? false,
            isTriviaConnecting: isTriviaConnecting,
            onSubtitlesTap: { toggleLiveTranslation() },
            onSubtitlesSplitTap: {
                withAnimation(.spring(duration: 0.3)) {
                    showSubtitlePicker = true
                }
            },
            onSplitSubtitlesTap: { toggleSplitSubtitles() },
            onDubbingTap: { toggleLiveDubbing() },
            onTriviaTap: { toggleLiveTrivia() }
        )
    }

    // MARK: - Trivia Connecting State

    private var isTriviaConnecting: Bool {
        guard let vm = triviaVM else { return false }
        return vm.isEnabled && !vm.isConnected
    }

    // MARK: - Toggle Live Translation

    /// Toggles live subtitles. If dubbing is active, disables dubbing first
    /// (mutual exclusivity). User must re-enable dubbing manually.
    func toggleLiveTranslation() {
        if selectedSubtitleLanguage != nil {
            // Disable subtitles
            handleSubtitleSelection(nil)
        } else {
            // Enable subtitles with default language - disable dubbing (mutual exclusivity)
            if liveDubbingVM?.isEnabled == true {
                liveDubbingVM?.toggleDubbing(channelId: contentId)
            }
            // Enable subtitles directly with English default
            handleSubtitleSelection("en")
        }
    }

    // MARK: - Toggle Live Dubbing

    /// Toggles live dubbing. If subtitles are active, disables them first
    /// (mutual exclusivity). User must re-enable subtitles manually.
    func toggleLiveDubbing() {
        guard let vm = liveDubbingVM else { return }

        // Disable active subtitles/split when enabling dubbing (mutual exclusivity)
        if !vm.isEnabled {
            if selectedSubtitleLanguage != nil {
                handleSubtitleSelection(nil)
            }
            if splitModeEnabled {
                splitModeEnabled = false
                splitLanguages = []
                primarySubtitleCues = []
                secondarySubtitleCues = []
            }
        }

        // Direct toggle - dubbing VM handles premium gate internally
        vm.toggleDubbing(channelId: contentId)
    }

    // MARK: - Toggle Split Subtitles

    /// Toggles split subtitle mode. Independent of dubbing mutual exclusivity
    /// since split subtitles are a subtitle variant.
    func toggleSplitSubtitles() {
        if splitModeEnabled {
            splitModeEnabled = false
            splitLanguages = []
            primarySubtitleCues = []
            secondarySubtitleCues = []
        } else {
            showSplitLanguagePicker = true
        }
    }

    // MARK: - Toggle Live Trivia

    /// Toggles live trivia. Independent of dubbing/subtitles -
    /// can coexist with either feature.
    func toggleLiveTrivia() {
        guard let vm = triviaVM else { return }

        if vm.isEnabled {
            vm.disconnectLiveTrivia()
        } else {
            let triviaWS = LiveTriviaWebSocketService(
                configuration: repositories.configuration,
                authTokenProvider: repositories.authTokenProvider
            )
            vm.toggleTrivia(
                channelId: contentId,
                language: selectedSubtitleLanguage ?? "en",
                webSocketService: triviaWS
            )
        }
    }
}
#endif
