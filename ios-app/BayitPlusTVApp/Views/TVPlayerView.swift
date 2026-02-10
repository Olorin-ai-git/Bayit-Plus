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
    @State private var isResolvingStream = true
    @State private var streamError: String?

    var body: some View {
        ZStack {
            if isResolvingStream {
                streamLoadingView
            } else if let error = streamError {
                streamErrorView(error)
            } else {
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
        }
        .onDisappear { cleanup() }
        .task { await resolveAndPlay() }
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

    // MARK: - Stream Loading Views

    private var streamLoadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
            Text("Loading stream...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
    }

    private func streamErrorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)

            GlassButton("Retry", variant: .secondary, size: .large) {
                Task { await resolveAndPlay() }
            }
            .frame(maxWidth: 300)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
    }

    // MARK: - Lifecycle

    /// Resolve the stream URL from the API and begin playback.
    private func resolveAndPlay() async {
        isResolvingStream = true
        streamError = nil

        do {
            let streamURL = try await fetchStreamURL()
            guard let url = URL(string: streamURL) else {
                streamError = "Invalid stream URL received"
                isResolvingStream = false
                return
            }
            mediaPlayer.load(url: url, contentType: contentType)
            mediaPlayer.play()
            isResolvingStream = false
        } catch {
            streamError = "Unable to load stream. Please try again."
            isResolvingStream = false
        }
    }

    /// Fetch the appropriate stream URL based on content type.
    private func fetchStreamURL() async throws -> String {
        switch contentType {
        case .liveTV:
            let stream = try await repos.media.fetchLiveStream(channelId: channelId ?? contentId)
            guard let url = stream.url ?? stream.directUrl else {
                throw StreamResolutionError.noURL
            }
            return url

        case .radio:
            let stream = try await repos.media.fetchRadioStream(stationId: contentId)
            guard let url = stream.url else {
                throw StreamResolutionError.noURL
            }
            return url

        case .podcast:
            let podcastDetail = try await repos.podcasts.fetchPodcastDetail(id: contentId)
            let audioURLStr = podcastDetail.episodes?.first?.audioUrl
                ?? podcastDetail.latestEpisode?.audioUrl
            guard let url = audioURLStr, !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url

        case .vod, .audiobook:
            let stream = try await repos.media.fetchStream(contentId: contentId, quality: nil)
            guard let url = stream.url ?? stream.directUrl else {
                throw StreamResolutionError.noURL
            }
            return url
        }
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

// MARK: - Stream Resolution Error

private enum StreamResolutionError: Error {
    case noURL
}
