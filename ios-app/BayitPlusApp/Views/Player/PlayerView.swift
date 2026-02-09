import AVKit
import BayitAuth
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
    @Environment(RepositoryProvider.self) var repositories
    @Environment(AuthManager.self) private var authManager

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

    // Recording state
    @State private var isRecording = false
    @State private var recordingSessionId: String?
    @State private var recordingStartTime: Date?
    @State private var recordingDuration: TimeInterval = 0
    @State private var recordingTimer: Task<Void, Never>?
    @State private var showRecordingError = false
    @State private var recordingErrorMessage: String?

    // Dubbing controls state
    @State private var showDubbingControls = false

    // Split subtitle state
    @State var splitModeEnabled = false
    @State var splitLanguages: [String] = []
    @State var showSplitLanguagePicker = false
    @State var primarySubtitleCues: [SubtitleCue] = []
    @State var secondarySubtitleCues: [SubtitleCue] = []

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
            if let vm = triviaVM {
                TriviaFactsOverlayView(
                    viewModel: vm,
                    contentId: contentId,
                    currentTime: viewModel.player.currentTime,
                    isSubtitlesActive: selectedSubtitleLanguage != nil,
                    currentLanguage: selectedSubtitleLanguage ?? "en"
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

            // Recording indicator overlay
            if isRecording {
                VStack {
                    HStack {
                        Spacer()
                        GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.sm) {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Circle()
                                    .fill(Color.red)
                                    .frame(width: 8, height: 8)
                                    .opacity(0.8)
                                    .animation(
                                        .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                                        value: isRecording
                                    )
                                Text(formatRecordingDuration(recordingDuration))
                                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                        }
                        .padding(.trailing, DesignTokens.Spacing.base)
                    }
                    .padding(.top, DesignTokens.Spacing.base)
                    Spacer()
                }
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
            recordingTimer?.cancel()
            triviaVM?.disconnectLiveTrivia()
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
        .sheet(isPresented: $showDubbingControls) {
            if let vm = liveDubbingVM {
                LiveDubbingControlsView(viewModel: vm, channelId: contentId)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            } else {
                VStack(spacing: DesignTokens.Spacing.md) {
                    Text("Live Dubbing")
                        .font(.headline)
                    Text("Live dubbing is only available for live channels")
                        .foregroundStyle(.secondary)
                    GlassButton("OK", variant: .primary) {
                        showDubbingControls = false
                    }
                }
                .padding(DesignTokens.Spacing.xl)
            }
        }
        .alert("Recording Error", isPresented: $showRecordingError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let message = recordingErrorMessage {
                Text(message)
            }
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
            recordingButton
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

    // MARK: - Recording Button

    private var recordingButton: some View {
        Button {
            Task {
                if isRecording {
                    await stopRecording()
                } else {
                    await startRecording()
                }
            }
        } label: {
            Image(systemName: isRecording ? "circle.fill" : "circle")
                .font(.system(size: 18))
                .foregroundStyle(isRecording ? Color.red : .white)
                .frame(width: 44, height: 44)
                .overlay {
                    if isRecording {
                        Circle()
                            .stroke(Color.red, lineWidth: 2)
                            .scaleEffect(1.2)
                            .opacity(0.5)
                            .animation(
                                .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                                value: isRecording
                            )
                    }
                }
        }
        .accessibilityLabel(isRecording ? "Stop recording" : "Start recording")
    }

    private var dubbingToggle: some View {
        Button {
            showDubbingControls = true
        } label: {
            Image(systemName: liveDubbingVM?.isEnabled == true ? "waveform.fill" : "waveform")
                .font(.system(size: 18))
                .foregroundStyle(
                    liveDubbingVM?.isEnabled == true ? DesignTokens.Primary.p400 : .white
                )
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Live dubbing")
        .accessibilityValue(liveDubbingVM?.isEnabled == true ? "On" : "Off")
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
        // Initialize trivia for ALL content (VOD and live)
        triviaVM = TriviaFactsViewModel(
            repository: repositories.trivia,
            offlineCache: repositories.offlineCache
        )

        // Initialize live dubbing and trivia for live content
        if mediaContentType.isLive {
            // Dubbing WebSocket
            let dubbingWS = LiveDubbingWebSocketService(
                configuration: repositories.configuration,
                authTokenProvider: repositories.authTokenProvider
            )
            liveDubbingVM = LiveDubbingViewModel(
                repository: repositories.liveDubbing,
                webSocketService: dubbingWS
            )

            // Trivia WebSocket
            if let triviaVM = triviaVM {
                let triviaWS = LiveTriviaWebSocketService(
                    configuration: repositories.configuration,
                    authTokenProvider: repositories.authTokenProvider
                )
                triviaVM.connectLiveTrivia(
                    channelId: contentId,
                    language: selectedSubtitleLanguage ?? "en",
                    webSocketService: triviaWS
                )
            }
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

    // MARK: - Recording

    private func startRecording() async {
        // Premium check (allow premium subscribers and admin users)
        guard let user = authManager.user,
              user.subscriptionTier.isPremium || user.role.isAdmin else {
            recordingErrorMessage = "Premium subscription required"
            showRecordingError = true
            return
        }

        // Live content check
        guard mediaContentType.isLive else {
            recordingErrorMessage = "Recording is only available for live channels"
            showRecordingError = true
            return
        }

        do {
            let request = RecordingStartRequest(
                channelId: contentId,
                programId: nil,
                duration: nil
            )
            let response = try await repositories.user.startRecording(request: request)

            if let sessionId = response.recordingId {
                isRecording = true
                recordingSessionId = sessionId
                recordingStartTime = Date()
                startRecordingTimer()
            } else {
                recordingErrorMessage = response.message ?? "Failed to start recording"
                showRecordingError = true
            }

        } catch {
            recordingErrorMessage = "Failed to start recording: \(error.localizedDescription)"
            showRecordingError = true
        }
    }

    private func stopRecording() async {
        guard let sessionId = recordingSessionId else { return }

        do {
            _ = try await repositories.user.stopRecording(recordingId: sessionId)

            isRecording = false
            recordingSessionId = nil
            recordingStartTime = nil
            recordingDuration = 0
            recordingTimer?.cancel()

        } catch {
            recordingErrorMessage = "Failed to stop recording: \(error.localizedDescription)"
            showRecordingError = true
        }
    }

    private func startRecordingTimer() {
        recordingTimer = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                if let startTime = recordingStartTime {
                    await MainActor.run {
                        recordingDuration = Date().timeIntervalSince(startTime)
                    }
                }
            }
        }
    }

    private func formatRecordingDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60

        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}
