import AVKit
import BayitDesignSystem
import BayitMedia
import BayitVoice
import SwiftUI

/// Full-screen media player with glass overlay controls.
///
/// Uses AVPlayerViewController via UIViewControllerRepresentable for native
/// playback with PiP, AirPlay, and system controls. Overlays glass-styled
/// transport controls and metadata on top.
struct PlayerView: View {

    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(RepositoryProvider.self) private var repositories

    @State private var viewModel: MediaPlayerViewModel
    @State private var showControls = true
    @State private var controlsTimer: Task<Void, Never>?
    @State private var nowPlayingService = NowPlayingService()
    @State private var remoteCommandService = RemoteCommandService()
    @State private var dubbingMixer = DubbingMixer()
    @State private var isDubbingEnabled = false
    @State private var showSubtitlePicker = false
    @State private var subtitlesVM: InteractiveSubtitlesViewModel?
    @State private var selectedSubtitleLanguage: String?
    @State private var subtitleLoadTask: Task<Void, Never>?

    let contentId: String
    let contentType: ContentType

    init(contentId: String, contentType: ContentType, player: MediaPlayer,
         repository: any MediaRepository, contentRepository: any ContentRepository,
         liveTVRepository: any LiveTVRepository) {
        self.contentId = contentId
        self.contentType = contentType
        _viewModel = State(initialValue: MediaPlayerViewModel(
            contentId: contentId,
            contentType: contentType,
            player: player,
            repository: repository,
            contentRepository: contentRepository,
            liveTVRepository: liveTVRepository
        ))
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Video layer
            VideoPlayerView(player: viewModel.player.avPlayer)
                .ignoresSafeArea()
                .onTapGesture { toggleControls() }

            // Loading overlay
            if viewModel.isLoading {
                loadingOverlay
            }

            // Error overlay
            if let error = viewModel.errorMessage {
                errorOverlay(error)
            }

            // Subtitle overlay (above video, below controls)
            if let vm = subtitlesVM, let lang = selectedSubtitleLanguage {
                InteractiveSubtitlesOverlay(
                    viewModel: vm,
                    contentId: contentId,
                    currentTime: viewModel.player.currentTime,
                    language: lang
                )
                .allowsHitTesting(showControls)
            }

            // Controls overlay
            if showControls && !viewModel.isLoading && viewModel.errorMessage == nil {
                controlsOverlay
            }
        }
        .statusBarHidden(true)
        .task { await viewModel.load() }
        .onDisappear {
            Task {
                await viewModel.cleanup()
                await dubbingMixer.cleanup()
            }
            nowPlayingService.clear()
            remoteCommandService.unregister()
            controlsTimer?.cancel()
            subtitleLoadTask?.cancel()
        }
        .onChange(of: viewModel.player.currentTime) { _, _ in
            updateNowPlaying()
        }
        .sheet(isPresented: $showSubtitlePicker) {
            SubtitleLanguagePickerView(
                availableLanguages: availableSubtitleLanguages,
                selectedLanguage: selectedSubtitleLanguage,
                onSelect: { language in
                    handleSubtitleSelection(language)
                }
            )
        }
    }

    // MARK: - Loading

    private var loadingOverlay: some View {
        ProgressView()
            .scaleEffect(1.5)
            .tint(.white)
            .accessibilityLabel("Loading media")
    }

    // MARK: - Error

    private func errorOverlay(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.ErrorColor.default)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton("Dismiss", variant: .ghost) {
                coordinator.dismissFullscreen()
            }
        }
        .padding(DesignTokens.Spacing.xl)
    }

    // MARK: - Controls

    private var controlsOverlay: some View {
        VStack {
            topBar
            Spacer()
            GlassPlayerControls(
                isPlaying: viewModel.player.state == .playing,
                isLive: mediaContentType.isLive,
                isSeekable: mediaContentType.isSeekable,
                currentTime: viewModel.player.currentTime,
                duration: viewModel.player.duration,
                bufferedTime: viewModel.player.bufferedTime,
                onPlayPause: { viewModel.player.togglePlayPause() },
                onSkipForward: { Task { await viewModel.player.skipForward() } },
                onSkipBackward: { Task { await viewModel.player.skipBackward() } },
                onSeek: { time in Task { await viewModel.player.seek(to: time) } }
            )
            .padding(.bottom, DesignTokens.Spacing.xxl)
        }
        .background(controlsGradient)
        .transition(.opacity)
    }

    private var topBar: some View {
        HStack {
            Button { coordinator.dismissFullscreen() } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Dismiss player")

            VStack(alignment: .leading, spacing: 2) {
                if let title = viewModel.title {
                    Text(title)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
                if let subtitle = viewModel.subtitle {
                    Text(subtitle)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            subtitleToggle
            dubbingToggle

            AirPlayView()
                .frame(width: 36, height: 36)

            if PiPController.isSupported {
                Button {
                    // PiP handled via AVPlayerViewController's built-in support
                } label: {
                    Image(systemName: "pip.enter")
                        .font(.system(size: 18))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Picture in Picture")
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.top, DesignTokens.Spacing.sm)
    }

    private var controlsGradient: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [.black.opacity(0.7), .clear],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 120)
            Spacer()
            LinearGradient(
                colors: [.clear, .black.opacity(0.7)],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 200)
        }
        .ignoresSafeArea()
    }

    // MARK: - Dubbing

    private var dubbingToggle: some View {
        Button {
            isDubbingEnabled.toggle()
            Task {
                if isDubbingEnabled {
                    await dubbingMixer.configureAudioSession()
                } else {
                    await dubbingMixer.stopPlayback()
                }
            }
        } label: {
            Image(systemName: isDubbingEnabled ? "captions.bubble.fill" : "captions.bubble")
                .font(.system(size: 18))
                .foregroundStyle(
                    isDubbingEnabled ? DesignTokens.Primary.p400 : .white
                )
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Live dubbing")
        .accessibilityValue(isDubbingEnabled ? "On" : "Off")
    }

    // MARK: - Subtitles

    private var subtitleToggle: some View {
        Button { showSubtitlePicker = true } label: {
            Image(systemName: selectedSubtitleLanguage != nil ? "cc.circle.fill" : "cc.circle")
                .font(.system(size: 18))
                .foregroundStyle(
                    selectedSubtitleLanguage != nil ? DesignTokens.Primary.p400 : .white
                )
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Subtitles")
        .accessibilityValue(
            selectedSubtitleLanguage.flatMap { SubtitleLanguages.info(for: $0)?.name } ?? "Off"
        )
    }

    private var availableSubtitleLanguages: [String] {
        viewModel.availableSubtitleLanguages
    }

    private func handleSubtitleSelection(_ language: String?) {
        selectedSubtitleLanguage = language
        subtitleLoadTask?.cancel()
        if let language {
            if subtitlesVM == nil {
                subtitlesVM = InteractiveSubtitlesViewModel(
                    repository: repositories.subtitle
                )
            }
            subtitleLoadTask = Task {
                await subtitlesVM?.loadCues(contentId: contentId, language: language)
            }
        } else {
            subtitlesVM = nil
        }
    }

    // MARK: - Helpers

    private var mediaContentType: MediaContentType {
        switch contentType {
        case .live, .liveTV: return .liveTV
        case .radio: return .radio
        case .podcast: return .podcast
        case .audiobook: return .audiobook
        case .movie, .series, .episode: return .vod
        }
    }

    private func toggleControls() {
        withAnimation(.easeInOut(duration: 0.25)) {
            showControls.toggle()
        }
        scheduleControlsHide()
    }

    private func scheduleControlsHide() {
        controlsTimer?.cancel()
        guard showControls else { return }
        controlsTimer = Task {
            try? await Task.sleep(for: .seconds(5))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.25)) {
                    showControls = false
                }
            }
        }
    }

    private func updateNowPlaying() {
        guard let title = viewModel.title else { return }
        let metadata = NowPlayingMetadata(
            title: title,
            artist: viewModel.subtitle,
            artworkURL: viewModel.artworkURL,
            duration: viewModel.player.duration,
            contentType: mediaContentType,
            isLiveStream: mediaContentType.isLive
        )
        nowPlayingService.update(
            metadata: metadata,
            currentTime: viewModel.player.currentTime,
            duration: viewModel.player.duration,
            rate: viewModel.player.rate
        )
    }
}
