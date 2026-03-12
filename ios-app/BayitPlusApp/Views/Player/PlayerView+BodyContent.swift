import BayitCore
import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Extension on PlayerView providing the main ZStack layer composition
/// and lifecycle event handlers extracted from the body.
extension PlayerView {
    // MARK: - Player ZStack

    var playerZStack: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Video layer
            VideoPlayerView(
                player: viewModel.player.avPlayer,
                allowsPiP: PiPController.isSupported,
                videoGravity: .resizeAspect,
                isPiPActive: $isPiPActive,
                onRestoreUserInterface: { [weak coordinator] completion in
                    guard let coordinator else {
                        completion(true)
                        return
                    }
                    if coordinator.fullscreenRoute == nil {
                        coordinator.presentFullscreen(
                            .player(contentId: contentId, contentType: contentType)
                        )
                    }
                    completion(true)
                }
            )
            .ignoresSafeArea()
            .background(GeometryReader { geo in
                Color.clear.preference(key: PlayerWidthKey.self, value: geo.size.width)
            })
            .onPreferenceChange(PlayerWidthKey.self) { playerWidth = $0 }
            .onTapGesture { toggleControls() }
            .simultaneousGesture(doubleTapSkipGesture)
            .walkthroughTarget(id: "discover_interactive_subtitles_step4")
            .walkthroughTarget(id: "discover_vocabulary_step4")
            .walkthroughTarget(id: "discover_vod_moments_step3")
            .walkthroughTarget(id: "discover_cultural_context_step3")
            .walkthroughTarget(id: "discover_bilingual_bridge_step4")
            .walkthroughTarget(id: "discover_live_dubbing_step4")
            .walkthroughTarget(id: "discover_live_subtitles_step4")
            .walkthroughTarget(id: "discover_live_trivia_step3")
            .walkthroughTarget(id: "discover_catch_up_step4")
            .walkthroughTarget(id: "discover_scene_search_step4")
            .walkthroughTarget(id: "discover_ai_companion_step4")
            .walkthroughTarget(id: "discover_pause_ask_step4")

            if viewModel.isLoading {
                loadingOverlay
            }

            if viewModel.player.state == .preBuffering {
                preBufferOverlay
            }

            if let error = viewModel.errorMessage {
                errorOverlay(error)
            }

            // Trivia overlay (above video, below subtitles)
            if let vm = triviaVM {
                TriviaFactsOverlayView(
                    viewModel: vm,
                    contentId: contentId,
                    currentTime: viewModel.player.currentTime,
                    isSubtitlesActive: selectedSubtitleLanguage != nil,
                    currentLanguage: selectedAILanguage
                )
            }

            // Subtitle overlay (above trivia, below dubbing/controls)
            if let vm = subtitlesVM, let lang = selectedSubtitleLanguage {
                InteractiveSubtitlesOverlay(
                    viewModel: vm,
                    contentId: contentId,
                    currentTime: viewModel.player.currentTime,
                    isTriviaActive: triviaVM?.activeFact != nil,
                    language: lang,
                    repository: repositories.subtitle
                )
                .allowsHitTesting(showControls)
            }

            // Live dubbing overlay (above subtitles, below controls)
            if let vm = liveDubbingVM, vm.isEnabled, vm.showOverlay {
                LiveDubbingOverlayView(
                    originalText: vm.overlayText,
                    translatedText: vm.translatedText,
                    isVisible: vm.showOverlay
                )
                .allowsHitTesting(false)
            }

            // Live subtitle overlay: split (side-by-side) or single
            if let vm = liveSubtitlesVM, vm.isEnabled, vm.showOverlay {
                if splitModeEnabled, splitLanguages.count == 2 {
                    LiveSplitSubtitleOverlayView(
                        originalText: vm.originalCueText,
                        translatedText: vm.activeCueText,
                        originalLanguage: vm.sourceLang,
                        translatedLanguage: vm.selectedLanguage,
                        isVisible: vm.showOverlay,
                        bottomInset: liveOverlayBottomInset
                    )
                } else {
                    LiveSubtitleOverlayView(
                        translatedText: vm.activeCueText,
                        originalText: vm.originalCueText,
                        isVisible: vm.showOverlay,
                        bottomInset: liveOverlayBottomInset
                    )
                    .allowsHitTesting(false)
                }
            }

            // VOD split subtitle overlay (side-by-side dual subtitles)
            if !mediaContentType.isLive, splitModeEnabled, splitLanguages.count == 2 {
                SplitSubtitleOverlayView(
                    currentTime: viewModel.player.currentTime,
                    primaryCues: primarySubtitleCues,
                    secondaryCues: secondarySubtitleCues,
                    primaryLanguage: splitLanguages[0],
                    secondaryLanguage: splitLanguages[1],
                    enabled: splitModeEnabled,
                    settings: SubtitleSettings(),
                    safeAreaBottom: 0
                )
                .allowsHitTesting(showControls)
            }

            // Live feature overlays
            catchUpOverlay
            sceneSearchOverlay
            channelChatOverlay
            aiCompanionOverlay
            streamLimitOverlay
            catchUpAutoPromptOverlay
            catchUpSummaryOverlay

            // Cultural context badge row (VOD only, above subtitles, below controls)
            culturalContextOverlay

            // Controls overlay — below full-screen interaction overlays so they appear on top
            if showControls && !viewModel.isLoading && viewModel.errorMessage == nil {
                controlsOverlay
            }

            // Full-screen interaction overlays (above controls)
            interactiveMomentOverlay
            dialogueOverlay
            talkBackOverlay
            pauseAskOverlay
            sharedInteractionOverlay

            // Recording indicator overlay (always on top)
            if isRecording {
                recordingIndicatorOverlay
            }

            // Subtitle picker overlay (always on top)
            if showSubtitlePicker {
                subtitlePickerOverlay
            }
        }
        .walkthroughOverlay(
            featureIds: PlayerView.walkthroughFeatureIds,
            localize: localization.t,
            isReady: !viewModel.isLoading && viewModel.player.state != .preBuffering
        )
    }

    static let walkthroughFeatureIds: Set<String> = [
        "pause_ask", "interactive_subtitles", "vocabulary", "vod_moments",
        "cultural_context", "bilingual_bridge", "ai_companion",
        "live_dubbing", "live_subtitles", "live_trivia", "catch_up", "scene_search",
    ]

    // MARK: - Lifecycle Handlers

    func performCleanup() {
        UIApplication.shared.isIdleTimerDisabled = false
        restorePortraitOrientation()
        Task {
            await viewModel.cleanup()
            await dubbingMixer.cleanup()
        }
        nowPlayingService.clear()
        remoteCommandService.unregister()
        controlsTimer?.cancel()
        playbackUpdateTask?.cancel()
        subtitleLoadTask?.cancel()
        recordingTimer?.cancel()
        triviaVM?.cleanup()
        triviaVM?.disconnectLiveTrivia()
        liveSubtitlesVM?.cleanup()
        catchUpVM?.reset()
        catchUpVM = nil
        talkBackVM?.resetAll()
        talkBackVM = nil
        interactionVM = nil
        if dialogueVM?.isActive == true {
            Task { await dialogueVM?.endSession() }
        }
        dialogueVM = nil
    }

    func handleTimeChange(_ newTime: TimeInterval) {
        playbackUpdateTask?.cancel()
        playbackUpdateTask = Task {
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            updateNowPlaying()
            triviaVM?.updateActiveFact(currentTime: newTime)
            talkBackVM?.checkTrigger(currentTime: newTime, tolerance: 1.0)
            if interactionVM?.checkForMoment(currentTime: newTime) == true {
                // Overlay appears via interactiveMomentOverlay ViewBuilder
            }
        }
    }
}

// MARK: - Player Width Preference Key

struct PlayerWidthKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}
