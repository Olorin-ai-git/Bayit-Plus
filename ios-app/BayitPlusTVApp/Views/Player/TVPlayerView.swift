import AVKit
import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS full-screen video player with complete subtitle, AI, dubbing, trivia,
/// split display, chapter, audio track, and speed controls.
struct TVPlayerView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(MediaPlayer.self) var mediaPlayer
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(AuthManager.self) var authManager

    @Environment(NetworkMonitor.self) var networkMonitor
    @Environment(TVOnboardingPreferences.self) var onboardingPrefs
    @Environment(\.dismiss) var dismiss

    let contentId: String
    let contentType: MediaContentType
    let channelId: String?
    let directUrl: String?

    @State var state = TVPlayerStateContainer()

    @Namespace var playerFocus

    let interactionRewindThreshold: TimeInterval = 3
    let interactionSeekOffset: TimeInterval = 5
    let progressIntervalSeconds: TimeInterval = 15

    var isLive: Bool {
        contentType == .liveTV
    }

    init(
        contentId: String,
        contentType: MediaContentType,
        channelId: String?,
        directUrl: String? = nil
    ) {
        self.contentId = contentId
        self.contentType = contentType
        self.channelId = channelId
        self.directUrl = directUrl
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if state.isResolvingStream {
                streamLoadingView
            } else if let error = state.streamError {
                streamErrorView(error)
            } else {
                playerContentLayer

                if mediaPlayer.state == .preBuffering {
                    preBufferOverlay
                }
            }
        }
        .overlay { networkDisconnectedOverlay }
        .onChange(of: networkMonitor.isConnected) { _, connected in
            if !connected {
                mediaPlayer.pause()
            } else if state.streamError == nil, !state.isResolvingStream {
                mediaPlayer.play()
            }
        }
        .focusScope(playerFocus)
        .onDisappear { cleanup() }
        .task { await resolveAndPlay() }
        .task { initializeViewModels() }
        .task { await loadChapters() }
        .onChange(of: mediaPlayer.currentTime) { _, newTime in
            state.subtitlesVM?.updateActiveCue(currentTime: newTime)
            state.triviaVM?.updateActiveFact(currentTime: newTime)
            if let vm = state.interactionVM, vm.phase == .idle {
                _ = vm.checkForMoment(currentTime: newTime)
            }
        }
        .onPlayPauseCommand {
            mediaPlayer.togglePlayPause()
            resetOverlayTimer()
        }
        .task { resetOverlayTimer() }
        .onExitCommand {
            if state.showControlButtons {
                state.showControlButtons = false
            } else {
                mediaPlayer.stop()
                dismiss()
            }
        }
        .fullScreenCover(isPresented: $state.showSubtitleLanguagePicker) {
            subtitleLanguagePickerSheet
        }
        .fullScreenCover(isPresented: $state.showSplitLanguagePicker) {
            splitLanguagePickerSheet
        }
        .fullScreenCover(isPresented: $state.showAILanguagePicker) {
            aiLanguagePickerSheet
        }
        .fullScreenCover(isPresented: $state.showSubtitleSettings) {
            TVSubtitleSettingsView()
        }
        .fullScreenCover(isPresented: $state.showDubbingControls) {
            dubbingControlsSheet
        }
        .fullScreenCover(isPresented: $state.showChapterList) {
            chapterListSheet
        }
        .fullScreenCover(isPresented: $state.showAudioTracks) {
            audioTracksSheet
        }
        .fullScreenCover(isPresented: $state.showSpeedControl) {
            speedControlSheet
        }
        .fullScreenCover(isPresented: $state.showCatchUp) {
            catchUpSheet
        }
        .fullScreenCover(isPresented: $state.showCompanion) {
            TVAICompanionView(
                contentId: contentId,
                onDismiss: { state.showCompanion = false }
            )
        }
        .fullScreenCover(isPresented: $state.showCharacterSelection) {
            characterDialogueFlowSheet
        }
        .fullScreenCover(isPresented: $state.showPauseAskOverlay) {
            pauseAskSheet
        }
        .fullScreenCover(isPresented: $state.showQuiz) {
            TVQuizOverlayView(
                contentId: contentId,
                profileId: authManager.user?.id,
                onDismiss: { state.showQuiz = false }
            )
        }
        .fullScreenCover(isPresented: $state.showVocabulary) {
            TVVocabularyTrackerView(
                savedWords: state.interactiveSubtitleVM?.savedWords ?? [],
                onDismiss: { state.showVocabulary = false }
            )
        }
    }

    // MARK: - Player Content Layer

    @ViewBuilder
    private var playerContentLayer: some View {
        TVVideoPlayerRepresentable(player: mediaPlayer.avPlayer)
            .ignoresSafeArea()

        triviaOverlay.allowsHitTesting(false)
        subtitleOverlay.allowsHitTesting(
            state.interactiveSubtitleVM?.isEnabled != true
                ? false : true
        )
        splitSubtitleOverlay.allowsHitTesting(false)
        liveSubtitleOverlay.allowsHitTesting(false)
        translationOverlay
        catchUpAutoPromptOverlay
        interactiveMomentOverlay.allowsHitTesting(false)
        sharedInteractionOverlay
        sharePlayOverlay

        if state.showControlButtons {
            controlsOverlayLayer
        } else {
            Color.clear
                .focusable()
                .onMoveCommand { _ in
                    state.showControlButtons = true
                    resetOverlayTimer()
                }
        }
    }
}
