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

            if viewModel.isLoading {
                loadingOverlay
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

            interactiveMomentOverlay
            dialogueOverlay
            pauseAskOverlay
            sharedInteractionOverlay

            // Controls overlay
            if showControls && !viewModel.isLoading && viewModel.errorMessage == nil {
                controlsOverlay
            }

            // Recording indicator overlay
            if isRecording {
                recordingIndicatorOverlay
            }

            // Subtitle picker overlay
            if showSubtitlePicker {
                subtitlePickerOverlay
            }
        }
    }

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
        triviaVM?.disconnectLiveTrivia()
        liveSubtitlesVM?.cleanup()
        catchUpVM?.reset()
        catchUpVM = nil
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
