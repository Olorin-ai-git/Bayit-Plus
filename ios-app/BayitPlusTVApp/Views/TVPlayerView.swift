import AVKit
import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitMedia
import SwiftUI

/// tvOS full-screen video player with subtitle, dubbing, chapter, audio track,
/// speed, translation, and shoresh overlays.
/// Uses AVPlayerViewController for native tvOS playback controls
/// including Siri Remote: swipe to seek, play/pause, Menu to exit.
struct TVPlayerView: View {
    @Environment(MediaPlayer.self) private var mediaPlayer
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(AuthManager.self) private var authManager

    let contentId: String
    let contentType: MediaContentType
    let channelId: String?

    // MARK: - ViewModels

    @State private var subtitlesVM: InteractiveSubtitlesViewModel?
    @State private var liveDubbingVM: LiveDubbingViewModel?
    @State private var webSocketService: LiveDubbingWebSocketService?

    // MARK: - Panel Visibility

    @State private var showSubtitleSettings = false
    @State private var showDubbingControls = false
    @State private var showChapterList = false
    @State private var showAudioTracks = false
    @State private var showSpeedControl = false
    @State private var showControlButtons = false

    // MARK: - Playback State

    @State private var selectedSubtitleLanguage: String?
    @State private var selectedAudioTrackId: String?
    @State private var playbackSpeed: Float = 1.0
    @State private var audioTracks: [AudioTrack] = []

    var body: some View {
        ZStack {
            TVVideoPlayerRepresentable(player: mediaPlayer.avPlayer)
                .ignoresSafeArea()

            subtitleOverlay
            translationOverlay

            if showControlButtons {
                TVPlayerControlBar(
                    contentType: contentType,
                    onSubtitles: { showSubtitleSettings = true },
                    onDubbing: { showDubbingControls = true },
                    onChapters: { showChapterList = true },
                    onAudioTracks: { showAudioTracks = true },
                    onSpeed: { showSpeedControl = true }
                )
            }
        }
        .onAppear { startPlayback() }
        .onDisappear { cleanup() }
        .task { initializeViewModels() }
        .onChange(of: mediaPlayer.currentTime) { _, newTime in
            subtitlesVM?.updateActiveCue(currentTime: newTime)
        }
        .onPlayPauseCommand { mediaPlayer.togglePlayPause() }
        .onMoveCommand { direction in
            if direction == .up { showControlButtons = true }
        }
        .fullScreenCover(isPresented: $showSubtitleSettings) {
            TVSubtitleSettingsView()
        }
        .fullScreenCover(isPresented: $showDubbingControls) {
            dubbingCover
        }
        .fullScreenCover(isPresented: $showChapterList) {
            chapterCover
        }
        .fullScreenCover(isPresented: $showAudioTracks) {
            TVAudioTrackSelectorView(
                tracks: audioTracks,
                selectedTrackId: $selectedAudioTrackId,
                onDismiss: { showAudioTracks = false }
            )
        }
        .fullScreenCover(isPresented: $showSpeedControl) {
            TVPlaybackSpeedControlView(
                currentSpeed: playbackSpeed,
                onSpeedSelected: { speed in
                    playbackSpeed = speed
                    mediaPlayer.setRate(speed)
                    showSpeedControl = false
                }
            )
        }
    }

    // MARK: - Full-Screen Covers

    @ViewBuilder
    private var dubbingCover: some View {
        if let vm = liveDubbingVM {
            TVLiveDubbingOverlayView(viewModel: vm, channelId: channelId ?? contentId)
        }
    }

    @ViewBuilder
    private var chapterCover: some View {
        TVChapterNavigationView(contentId: contentId) { chapter in
            showChapterList = false
            if let startTime = chapter.startTime {
                Task { await mediaPlayer.seek(to: startTime) }
            }
        }
    }

    // MARK: - Subtitle Overlay

    @ViewBuilder
    private var subtitleOverlay: some View {
        if let vm = subtitlesVM, vm.activeCue != nil {
            VStack {
                Spacer()
                if vm.hebrewMode == .shoresh, !vm.shoreshWords.isEmpty {
                    TVShoreshHighlightView(words: vm.shoreshWords)
                } else {
                    subtitleText(vm.activeText)
                }
            }
            .padding(.bottom, TVDesignTokens.Spacing.xxl)
        }
    }

    private func subtitleText(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundColor(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(Color.black.opacity(0.6))
            .cornerRadius(TVDesignTokens.Radius.sm)
            .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Translation Overlay

    @ViewBuilder
    private var translationOverlay: some View {
        if let vm = subtitlesVM, vm.showTranslation, let translation = vm.translation {
            TVTranslationPopoverView(translation: translation, onDismiss: { vm.dismissTranslation() })
        }
    }

    // MARK: - Lifecycle

    private func startPlayback() {
        guard let url = URL(string: contentId) else { return }
        mediaPlayer.load(url: url, contentType: contentType)
        mediaPlayer.play()
    }

    private func initializeViewModels() {
        subtitlesVM = InteractiveSubtitlesViewModel(
            repository: repos.subtitle,
            offlineCache: repos.offlineCache
        )

        let wsService = LiveDubbingWebSocketService(
            configuration: repos.configuration,
            authTokenProvider: repos.authTokenProvider
        )
        webSocketService = wsService
        liveDubbingVM = LiveDubbingViewModel(
            repository: repos.liveDubbing,
            webSocketService: wsService,
            authManager: authManager
        )

        Task {
            await subtitlesVM?.loadCues(contentId: contentId, language: selectedSubtitleLanguage)
        }
    }

    private func cleanup() {
        mediaPlayer.pause()
        liveDubbingVM?.cleanup()
    }
}
