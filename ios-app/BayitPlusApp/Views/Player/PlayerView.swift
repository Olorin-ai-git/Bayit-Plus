import AVKit
import BayitAuth
import BayitDesignSystem
import BayitLocalization
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
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.scenePhase) private var scenePhase

    @State var viewModel: MediaPlayerViewModel
    @State private var showControls = true
    @State private var controlsTimer: Task<Void, Never>?
    @State private var nowPlayingService = NowPlayingService()
    @State private var remoteCommandService = RemoteCommandService()
    @State private var dubbingMixer = DubbingMixer()
    @State private var isDubbingEnabled = false
    @State var showSubtitlePicker = false
    @State private var subtitlesVM: InteractiveSubtitlesViewModel?
    @State var selectedSubtitleLanguage: String?
    @State private var subtitleLoadTask: Task<Void, Never>?
    @State var triviaVM: TriviaFactsViewModel?
    @State var liveDubbingVM: LiveDubbingViewModel?
    @State var liveSubtitlesVM: LiveSubtitlesViewModel?

    // Recording state
    @State private var isRecording = false
    @State private var recordingSessionId: String?
    @State private var recordingStartTime: Date?
    @State private var recordingDuration: TimeInterval = 0
    @State private var recordingTimer: Task<Void, Never>?
    @State private var showRecordingError = false
    @State private var recordingErrorMessage: String?

    // Dubbing controls state
    @State var showDubbingControls = false

    // Live feature overlays
    @State var showCatchUp = false
    @State var showSceneSearch = false
    @State var showChannelChat = false
    @State var showAICompanion = false
    @State var showStreamLimitExceeded = false
    @State var streamLimitMaxStreams = 3
    @State var streamLimitDevices: [ActiveDevice] = []

    // AI panel state
    @State var showAIPanel = false
    @State var selectedAILanguage: String = "en"
    @State var selectedSecondaryLanguage: String?
    @State var showAILanguagePicker = false

    // Split subtitle state
    @State var splitModeEnabled = false
    @State var splitLanguages: [String] = []
    @State var showSplitLanguagePicker = false
    @State var primarySubtitleCues: [SubtitleCue] = []
    @State var secondarySubtitleCues: [SubtitleCue] = []

    // PiP state
    @State private var isPiPActive = false

    let contentId: String
    let contentType: ContentType

    init(contentId: String, contentType: ContentType, player: MediaPlayer,
         repository: any MediaRepository, contentRepository: any ContentRepository,
         liveTVRepository: any LiveTVRepository, radioRepository: any RadioRepository,
         podcastRepository: any PodcastRepository) {
        self.contentId = contentId
        self.contentType = contentType
        _viewModel = State(initialValue: MediaPlayerViewModel(
            contentId: contentId,
            contentType: contentType,
            player: player,
            repository: repository,
            contentRepository: contentRepository,
            liveTVRepository: liveTVRepository,
            radioRepository: radioRepository,
            podcastRepository: podcastRepository
        ))
    }

    var body: some View {
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

            // Live feature overlays (catch-up, scene search, chat, companion)
            catchUpOverlay
            sceneSearchOverlay
            channelChatOverlay
            aiCompanionOverlay
            streamLimitOverlay

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
            liveSubtitlesVM?.cleanup()
        }
        .onChange(of: viewModel.player.currentTime) { _, newTime in
            updateNowPlaying()
            triviaVM?.updateActiveFact(currentTime: newTime)
        }
        .onChange(of: scenePhase) { _, newPhase in
            // PiP auto-starts on background via AVPlayerViewController's
            // canStartPictureInPictureAutomaticallyFromInline = true
            if newPhase == .active, isPiPActive {
                isPiPActive = false
            }
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
        .sheet(isPresented: $showAILanguagePicker) {
            GlassAILanguagePickerView(
                selectedLanguage: selectedAILanguage,
                secondaryLanguage: selectedSecondaryLanguage,
                onSelectLanguage: { handleAILanguageChange($0) },
                onSelectSecondaryLanguage: { lang in
                    selectedSecondaryLanguage = lang
                    if splitModeEnabled {
                        splitLanguages = [selectedAILanguage, lang]
                        Task { await loadSplitSubtitleCues() }
                    }
                }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .alert("Recording Error", isPresented: $showRecordingError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let message = recordingErrorMessage {
                Text(message)
            }
        }
        .alert(
            localization.t("subtitles.quotaExceeded.title"),
            isPresented: Binding(
                get: { liveSubtitlesVM?.isQuotaExceeded ?? false },
                set: { if !$0 { liveSubtitlesVM?.dismissQuotaExceeded() } }
            )
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(liveSubtitlesVM?.error ?? localization.t("subtitles.quotaExceeded.message"))
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
                    onSplitTap: {
                        withAnimation(.spring(duration: 0.3)) {
                            showSubtitlePicker = false
                        }
                        showSplitLanguagePicker = true
                    },
                    isSplitEnabled: splitModeEnabled,
                    currentHebrewMode: subtitlesVM?.hebrewMode ?? .standard,
                    currentEnglishMode: subtitlesVM?.englishMode ?? .standard,
                    hasNikud: subtitlesVM?.hasNikud ?? false,
                    hasShoresh: subtitlesVM?.hasShoresh ?? false,
                    hasHeblish: subtitlesVM?.hasHeblish ?? false,
                    hasEngrew: false,
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
            if mediaContentType.isLive {
                glassAIFeaturesPanel
                    .padding(.bottom, DesignTokens.Spacing.sm)
            }
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

            // Subtitle picker button (VOD only - live uses AI panel)
            if !mediaContentType.isLive && !availableSubtitleLanguages.isEmpty {
                Button {
                    withAnimation(.spring(duration: 0.3)) {
                        showSubtitlePicker.toggle()
                    }
                } label: {
                    Image(systemName: selectedSubtitleLanguage != nil
                        ? "captions.bubble.fill" : "captions.bubble")
                        .font(.system(size: 18))
                        .foregroundStyle(
                            selectedSubtitleLanguage != nil
                                ? DesignTokens.Primary.p400 : .white
                        )
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Subtitles")
            }

            liveFeatureButtons

            recordingButton

            AirPlayView()
                .frame(width: 36, height: 36)

            if PiPController.isSupported {
                Button {
                    isPiPActive.toggle()
                } label: {
                    Image(systemName: isPiPActive ? "pip.exit" : "pip.enter")
                        .font(.system(size: 18))
                        .foregroundStyle(isPiPActive ? DesignTokens.Primary.p400 : .white)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(
                    isPiPActive
                        ? localization.t("exitPiP")
                        : localization.t("enterPiP")
                )
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

    // MARK: - Live Overlay Inset

    /// Bottom inset for live subtitle/dubbing overlays.
    /// Clears the AI panel height + spacing + player controls + bottom padding.
    var liveOverlayBottomInset: CGFloat {
        let aiPanelHeight: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 56 : 48
        let aiPanelBottomPadding = DesignTokens.Spacing.sm
        let playerControlsHeight: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 80 : 64
        let controlsBottomPadding = DesignTokens.Spacing.xxl
        return aiPanelHeight + aiPanelBottomPadding + playerControlsHeight + controlsBottomPadding
    }

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

    // MARK: - Subtitles

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

    func handleSubtitleSelection(_ language: String?) {
        // Live channels use WebSocket-based subtitles
        if mediaContentType.isLive {
            if let language {
                liveSubtitlesVM?.selectLanguage(language, channelId: contentId)
                if liveSubtitlesVM?.isEnabled != true {
                    liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
                }
            } else if liveSubtitlesVM?.isEnabled == true {
                liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
            }
            selectedSubtitleLanguage = language
            return
        }

        // VOD content uses REST-based subtitle cues
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

        // Load trivia facts for VOD content immediately
        if !mediaContentType.isLive {
            Task {
                await triviaVM?.loadFacts(
                    contentId: contentId,
                    language: selectedAILanguage
                )
            }
        }

        // Initialize live dubbing, subtitles, and trivia for live content
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

            // Live subtitles WebSocket (server-side audio capture)
            let subtitleWS = LiveSubtitlesWebSocketService(
                configuration: repositories.configuration,
                authTokenProvider: repositories.authTokenProvider
            )
            liveSubtitlesVM = LiveSubtitlesViewModel(
                webSocketService: subtitleWS
            )

            // Live trivia WebSocket is connected on-demand via AI panel toggle
        }
    }

    // MARK: - Helpers

    var mediaContentType: MediaContentType {
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
