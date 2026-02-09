#if os(iOS)
import BayitCore
import BayitDesignSystem
import SwiftUI

/// Extension on PlayerView providing the AI features panel and mutual exclusivity logic.
///
/// Dubbing and live subtitles are mutually exclusive: enabling one disables the other.
/// Trivia is independent and can coexist with either dubbing or subtitles.
/// A unified `selectedAILanguage` flows to live translate, dubbing, and trivia.
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
            currentLanguageCode: selectedAILanguage,
            isLiveContent: mediaContentType.isLive,
            isSplitLanguagesReady: selectedSecondaryLanguage != nil,
            onLanguageBadgeTap: { showAILanguagePicker = true },
            isSubtitlesEnabled: selectedSubtitleLanguage != nil,
            isSubtitlesConnecting: liveSubtitlesVM?.isConnecting ?? false,
            isSubtitlesPremiumLocked: liveSubtitlesVM?.isPremiumRequired ?? false,
            isSplitEnabled: splitModeEnabled,
            isDubbingEnabled: liveDubbingVM?.isEnabled ?? false,
            isDubbingConnecting: liveDubbingVM?.isConnecting ?? false,
            isDubbingPremiumLocked: liveDubbingVM?.isPremiumRequired ?? false,
            isTriviaEnabled: triviaVM?.isEnabled ?? false,
            isTriviaConnecting: isTriviaConnecting,
            onSubtitlesTap: { toggleLiveTranslation() },
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

    /// Toggles live subtitles using `selectedAILanguage`. If dubbing is active,
    /// disables dubbing first (mutual exclusivity).
    func toggleLiveTranslation() {
        if selectedSubtitleLanguage != nil {
            handleSubtitleSelection(nil)
        } else {
            // Disable dubbing when enabling subtitles (mutual exclusivity)
            if liveDubbingVM?.isEnabled == true {
                liveDubbingVM?.toggleDubbing(channelId: contentId)
            }
            handleSubtitleSelection(selectedAILanguage)
        }
    }

    // MARK: - Toggle Live Dubbing

    /// Toggles live dubbing using `selectedAILanguage`. If subtitles are active,
    /// disables them first (mutual exclusivity).
    func toggleLiveDubbing() {
        guard let vm = liveDubbingVM else { return }

        if !vm.isEnabled {
            // Disable active subtitles/split when enabling dubbing (mutual exclusivity)
            if selectedSubtitleLanguage != nil {
                handleSubtitleSelection(nil)
            }
            if liveSubtitlesVM?.isEnabled == true {
                liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
                selectedSubtitleLanguage = nil
            }
            if splitModeEnabled {
                splitModeEnabled = false
                splitLanguages = []
                primarySubtitleCues = []
                secondarySubtitleCues = []
            }
            // Ensure dubbing uses the unified AI language
            vm.selectLanguage(selectedAILanguage, channelId: contentId)
        }

        vm.toggleDubbing(channelId: contentId)
    }

    // MARK: - Toggle Split Subtitles

    /// Toggles split subtitle mode. For live content acts as a toggle when two
    /// languages are selected. For VOD content opens the existing sheet picker.
    func toggleSplitSubtitles() {
        if splitModeEnabled {
            splitModeEnabled = false
            splitLanguages = []
            primarySubtitleCues = []
            secondarySubtitleCues = []
            return
        }

        if mediaContentType.isLive {
            guard let secondary = selectedSecondaryLanguage else { return }
            // Auto-enable live translate if not active
            if selectedSubtitleLanguage == nil {
                if liveDubbingVM?.isEnabled == true {
                    liveDubbingVM?.toggleDubbing(channelId: contentId)
                }
                handleSubtitleSelection(selectedAILanguage)
            }
            splitLanguages = [selectedAILanguage, secondary]
            splitModeEnabled = true
            Task { await loadSplitSubtitleCues() }
        } else {
            showSplitLanguagePicker = true
        }
    }

    // MARK: - Toggle Live Trivia

    /// Toggles live trivia using `selectedAILanguage`. Independent of dubbing/subtitles.
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
                language: selectedAILanguage,
                webSocketService: triviaWS
            )
        }
    }

    // MARK: - AI Language Change

    /// Propagates a new AI language to all active features (subtitles, dubbing, trivia, split).
    func handleAILanguageChange(_ newLanguage: String) {
        selectedAILanguage = newLanguage

        if selectedSubtitleLanguage != nil {
            handleSubtitleSelection(newLanguage)
        }

        if liveSubtitlesVM?.isEnabled == true {
            liveSubtitlesVM?.selectLanguage(newLanguage, channelId: contentId)
        }

        if liveDubbingVM?.isEnabled == true {
            liveDubbingVM?.selectLanguage(newLanguage, channelId: contentId)
        }

        if let vm = triviaVM, vm.isEnabled {
            vm.disconnectLiveTrivia()
            let triviaWS = LiveTriviaWebSocketService(
                configuration: repositories.configuration,
                authTokenProvider: repositories.authTokenProvider
            )
            vm.toggleTrivia(
                channelId: contentId,
                language: newLanguage,
                webSocketService: triviaWS
            )
        }

        if splitModeEnabled, splitLanguages.count == 2 {
            splitLanguages[0] = newLanguage
            Task { await loadSplitSubtitleCues() }
        }
    }
}
#endif
