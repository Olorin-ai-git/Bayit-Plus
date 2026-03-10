import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Controls overlay layer, live/VOD control bar sections, and dock focus handling.
extension TVPlayerView {
    private var isOwnerOnlyContent: Bool {
        contentType == .vod
    }

    // MARK: - Controls Overlay

    @ViewBuilder
    var controlsOverlayLayer: some View {
        VStack {
            Spacer()
            LinearGradient(
                colors: [.clear, .black.opacity(0.85)],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 320)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)

        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Spacer()
            if !isLive {
                playbackControlsOverlay
                    .focusSection()
                    .prefersDefaultFocus(in: playerFocus)
            }
            Spacer()
            if !isLive { playerProgressBar }
            controlBarSection
        }
        .padding(.bottom, 40)
    }

    // MARK: - Control Bar Section

    @ViewBuilder
    var controlBarSection: some View {
        if isLive { liveControlBar } else { vodControlBar }
    }

    var liveControlBar: some View {
        TVAIFeaturesPanel(
            isSubtitlesEnabled: state.liveSubtitlesVM?.isEnabled ?? false,
            isDubbingEnabled: state.liveDubbingVM?.isEnabled ?? false,
            isTriviaEnabled: state.triviaVM?.isEnabled ?? false,
            isSplitEnabled: state.splitModeEnabled,
            isCatchUpAvailable: state.catchUpVM?.isAvailable ?? false,
            currentLanguage: state.selectedAILanguage,
            onSubtitlesTap: { toggleLiveTranslation() },
            onDubbingTap: { toggleLiveDubbing() },
            onTriviaTap: { toggleLiveTrivia() },
            onCatchUpTap: { state.showCatchUp = true },
            onCompanionTap: { state.showCompanion = true },
            onSplitTap: { state.showSplitLanguagePicker = true },
            onLanguageTap: { state.showAILanguagePicker = true }
        )
        .walkthroughTarget(id: "discover_live_subtitles_step2")
        .walkthroughTarget(id: "discover_live_dubbing_step2")
        .walkthroughTarget(id: "discover_live_trivia_step2")
        .walkthroughTarget(id: "discover_catch_up_step2")
        .walkthroughTarget(id: "discover_scene_search_step2")
        .onPreferenceChange(ControlBarFocusKey.self) { handleDockFocus($0) }
    }

    var vodControlBar: some View {
        TVPlayerControlBar(
            contentType: contentType,
            onSubtitles: { state.showSubtitleLanguagePicker = true },
            onDubbing: { state.showDubbingControls = true },
            onChapters: { state.showChapterList = true },
            onStartOver: mediaPlayer.currentTime > 30 ? { startOver() } : nil,
            onAudioTracks: { state.showAudioTracks = true },
            onSpeed: { state.showSpeedControl = true },
            onTalk: state.interactionVM != nil
                && (appConfiguration.ownerMode || !isOwnerOnlyContent) ? {
                    if state.hasVoiceClone {
                        Task { await startPauseAskInteraction() }
                    } else {
                        Task { await openCharacterSelection() }
                    }
                } : nil,
            onVocabulary: state.interactiveSubtitleVM != nil ? {
                state.showVocabulary = true
            } : nil,
            onInteractiveSubtitles: state.selectedSubtitleLanguage != nil ? {
                toggleInteractiveSubtitles()
            } : nil,
            onSharePlay: {
                Task { await activateSharePlay() }
            },
            onPreviousInteraction: (appConfiguration.ownerMode || !isOwnerOnlyContent)
                ? previousInteractionAction : nil,
            onNextInteraction: (appConfiguration.ownerMode || !isOwnerOnlyContent)
                ? nextInteractionAction : nil,
            isInteractiveSubtitlesEnabled: state.interactiveSubtitleVM?.isEnabled ?? false,
            selectedSubtitleLanguage: state.selectedSubtitleLanguage,
            isSplitEnabled: state.splitModeEnabled,
            splitLanguages: state.splitLanguages
        )
        .walkthroughTarget(id: "discover_pause_ask_step2")
        .walkthroughTarget(id: "discover_interactive_subtitles_step2")
        .walkthroughTarget(id: "discover_vocabulary_step2")
        .walkthroughTarget(id: "discover_bilingual_bridge_step2")
        .walkthroughTarget(id: "discover_vod_moments_step2")
        .onPreferenceChange(ControlBarFocusKey.self) { handleDockFocus($0) }
    }

    func handleDockFocus(_ focused: Bool) {
        state.isDockFocused = focused
        if focused {
            state.overlayHideTask?.cancel()
        } else {
            resetOverlayTimer()
        }
    }
}
