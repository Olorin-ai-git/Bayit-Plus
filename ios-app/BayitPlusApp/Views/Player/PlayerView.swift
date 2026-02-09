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
    @Environment(RepositoryProvider.self) fileprivate var repositories

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
    @State private var triviaVM: TriviaFactsViewModel?
    @State private var liveDubbingVM: LiveDubbingViewModel?

    // Split subtitle state
    @State fileprivate var splitModeEnabled = false
    @State fileprivate var splitLanguages: [String] = []
    @State fileprivate var showSplitLanguagePicker = false
    @State fileprivate var primarySubtitleCues: [SubtitleCue] = []
    @State fileprivate var secondarySubtitleCues: [SubtitleCue] = []

    let contentId: String
    let contentType: ContentType

    init(contentId: String, contentType: ContentType, player: MediaPlayer,
         repository: any MediaRepository, contentRepository: any ContentRepository,
         liveTVRepository: any LiveTVRepository, radioRepository: any RadioRepository) {
        self.contentId = contentId
        self.contentType = contentType
        _viewModel = State(initialValue: MediaPlayerViewModel(
            contentId: contentId,
            contentType: contentType,
            player: player,
            repository: repository,
            contentRepository: contentRepository,
            liveTVRepository: liveTVRepository,
            radioRepository: radioRepository
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

            // Trivia overlay (above video, below subtitles)
            if let vm = triviaVM, !mediaContentType.isLive {
                TriviaFactsOverlayView(
                    viewModel: vm,
                    contentId: contentId,
                    currentTime: viewModel.player.currentTime,
                    isSubtitlesActive: selectedSubtitleLanguage != nil,
                    currentLanguage: selectedSubtitleLanguage ?? "en"
                )
            }

            // Subtitle overlay (above trivia, below controls)
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

            // Split subtitle overlay (side-by-side dual subtitles)
            if splitModeEnabled && splitLanguages.count == 2 {
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

            // Controls overlay
            if showControls && !viewModel.isLoading && viewModel.errorMessage == nil {
                controlsOverlay
            }

            // Subtitle picker overlay
            if showSubtitlePicker {
                subtitlePickerOverlay
            }
        }
        .statusBarHidden(true)
        .task {
            await viewModel.load()
            initializeViewModels()
        }
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
        .sheet(isPresented: $showSplitLanguagePicker) {
            SplitSubtitleLanguagePickerView(
                availableLanguages: availableSubtitleLanguages,
                sourceLanguage: "he",
                selectedLanguages: $splitLanguages,
                splitModeEnabled: $splitModeEnabled,
                onConfirm: { languages in
                    splitLanguages = languages
                    splitModeEnabled = true
                    Task {
                        await loadSplitSubtitleCues()
                    }
                }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Subtitle Picker Overlay

    private var subtitlePickerOverlay: some View {
        ZStack {
            // Dimmed background
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation(.spring(duration: 0.3)) {
                        showSubtitlePicker = false
                    }
                }

            // Picker sheet from bottom
            VStack {
                Spacer()
                SubtitleLanguagePickerView(
                    availableLanguages: availableSubtitleLanguages,
                    aiLanguages: aiSubtitleLanguages,
                    selectedLanguage: selectedSubtitleLanguage,
                    contentId: contentId,
                    repository: repositories.subtitle,
                    onSelect: { language in
                        handleSubtitleSelection(language)
                        withAnimation(.spring(duration: 0.3)) {
                            showSubtitlePicker = false
                        }
                    },
                    onRefresh: {
                        Task { await viewModel.load() }
                    },
                    onDismiss: {
                        withAnimation(.spring(duration: 0.3)) {
                            showSubtitlePicker = false
                        }
                    },
                    currentHebrewMode: subtitlesVM?.hebrewMode ?? .standard,
                    currentEnglishMode: subtitlesVM?.englishMode ?? .standard,
                    hasNikud: subtitlesVM?.hasNikud ?? false,
                    hasShoresh: subtitlesVM?.hasShoresh ?? false,
                    hasHeblish: subtitlesVM?.hasHeblish ?? false,
                    hasEngrew: false,  // English AI modes not yet implemented
                    onHebrewModeSelect: { mode in
                        Task {
                            await subtitlesVM?.setHebrewMode(mode, contentId: contentId, language: selectedSubtitleLanguage)
                        }
                    },
                    onEnglishModeSelect: { mode in
                        Task {
                            await subtitlesVM?.setEnglishMode(mode, contentId: contentId, language: selectedSubtitleLanguage)
                        }
                    }
                )
                .frame(maxHeight: UIScreen.main.bounds.height * 0.7)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .transition(.opacity)
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
            splitSubtitleToggle
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
            Image(systemName: isDubbingEnabled ? "waveform.fill" : "waveform")
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
        Button {
            withAnimation(.spring(duration: 0.3)) {
                showSubtitlePicker = true
            }
        } label: {
            ZStack(alignment: .bottomTrailing) {
                Image(systemName: selectedSubtitleLanguage != nil ? "captions.bubble.fill" : "captions.bubble")
                    .font(.system(size: 18))
                    .foregroundStyle(
                        selectedSubtitleLanguage != nil ? DesignTokens.Primary.p400 : .white
                    )
                    .frame(width: 44, height: 44)

                // Show flag emoji when subtitle is selected
                if let language = selectedSubtitleLanguage {
                    Text(SubtitleLanguages.emojiFlag(for: language))
                        .font(.system(size: 12))
                        .offset(x: 4, y: 4)
                }
            }
        }
        .accessibilityLabel("Subtitles")
        .accessibilityValue(
            selectedSubtitleLanguage.flatMap { SubtitleLanguages.info(for: $0)?.name } ?? "Off"
        )
    }

    private var availableSubtitleLanguages: [String] {
        viewModel.availableSubtitleLanguages
    }

    private var aiSubtitleLanguages: Set<String> {
        var aiLangs = Set<String>()
        // Assume Hebrew and English may have AI versions if available
        if availableSubtitleLanguages.contains("he") {
            aiLangs.insert("he")
        }
        if availableSubtitleLanguages.contains("en") {
            aiLangs.insert("en")
        }
        return aiLangs
    }

    private func handleSubtitleSelection(_ language: String?) {
        selectedSubtitleLanguage = language
        subtitleLoadTask?.cancel()
        if let language {
            if subtitlesVM == nil {
                subtitlesVM = InteractiveSubtitlesViewModel(
                    repository: repositories.subtitle,
                    offlineCache: repositories.offlineCache,
                    shoreshParser: DefaultShoreshParser()
                )
            }
            subtitleLoadTask = Task {
                await subtitlesVM?.loadCues(contentId: contentId, language: language)
            }
        } else {
            subtitlesVM = nil
        }
    }

    private func initializeViewModels() {
        // Initialize trivia for VOD content
        if !mediaContentType.isLive {
            triviaVM = TriviaFactsViewModel(
                repository: repositories.trivia,
                offlineCache: repositories.offlineCache
            )
        }

        // Initialize live dubbing for live content
        if mediaContentType.isLive {
            let wsService = LiveDubbingWebSocketService(
                configuration: repositories.configuration,
                authTokenProvider: repositories.authTokenProvider
            )
            liveDubbingVM = LiveDubbingViewModel(
                repository: repositories.liveDubbing,
                webSocketService: wsService
            )
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

    // MARK: - Split Subtitle Toggle Button

    private var splitSubtitleToggle: some View {
        Button {
            if splitModeEnabled {
                // Disable split mode
                splitModeEnabled = false
                splitLanguages = []
                primarySubtitleCues = []
                secondarySubtitleCues = []
            } else {
                // Show language picker
                showSplitLanguagePicker = true
            }
        } label: {
            Image(systemName: splitModeEnabled ? "square.split.2x1.fill" : "square.split.2x1")
                .font(.system(size: 18))
                .foregroundStyle(
                    splitModeEnabled ? DesignTokens.Primary.p400 : .white
                )
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Split screen subtitles")
        .accessibilityValue(splitModeEnabled ? "On" : "Off")
    }

    // MARK: - Load Split Subtitle Cues

    private func loadSplitSubtitleCues() async {
        guard splitLanguages.count == 2 else { return }

        async let primary = loadCuesForLanguage(splitLanguages[0])
        async let secondary = loadCuesForLanguage(splitLanguages[1])

        let (primaryResult, secondaryResult) = await (primary, secondary)
        primarySubtitleCues = primaryResult
        secondarySubtitleCues = secondaryResult
    }

    private func loadCuesForLanguage(_ language: String) async -> [SubtitleCue] {
        do {
            let response = try await repositories.subtitle.fetchCues(
                contentId: contentId,
                language: language,
                hebrewMode: .standard,
                englishMode: .standard
            )
            return response.cues ?? []
        } catch {
            print("Failed to load \(language) cues: \(error)")
            return []
        }
    }
}
