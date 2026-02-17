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
    @Environment(LocalizationManager.self) private var localization
    @Environment(MediaPlayer.self) private var mediaPlayer
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(AuthManager.self) private var authManager

    @Environment(\.dismiss) private var dismiss

    let contentId: String
    let contentType: MediaContentType
    let channelId: String?

    // MARK: - Initializer

    init(contentId: String, contentType: MediaContentType, channelId: String?) {
        self.contentId = contentId
        self.contentType = contentType
        self.channelId = channelId
    }

    // MARK: - ViewModels

    @State private var subtitlesVM: InteractiveSubtitlesViewModel?
    @State private var liveDubbingVM: LiveDubbingViewModel?
    @State private var liveSubtitlesVM: LiveSubtitlesViewModel?
    @State private var triviaVM: TriviaFactsViewModel?
    @State private var webSocketService: LiveDubbingWebSocketService?
    @State private var catchUpVM: CatchUpViewModel?
    @State private var interactionVM: VODInteractionViewModel?
    @State private var avatarImageUrl: String?
    @State private var showNoAvatarWarning = false

    // Free-form dialogue state
    @State private var dialogueVM: AvatarDialogueViewModel?
    @State private var showCharacterSelection = false
    @State private var showDialogueOverlay = false

    // MARK: - Panel Visibility

    @State private var showSubtitleLanguagePicker = false
    @State private var showSubtitleSettings = false
    @State private var showDubbingControls = false
    @State private var showChapterList = false
    @State private var showAudioTracks = false
    @State private var showSpeedControl = false
    @State private var showControlButtons = true
    @State private var showPlaybackOverlay = true
    @State private var overlayHideTask: Task<Void, Never>?
    @State private var showSplitLanguagePicker = false
    @State private var showAILanguagePicker = false
    @State private var showCatchUp = false
    @State private var showCompanion = false
    @State private var showQuiz = false
    @State private var volumeBeforeDuck: Float?

    // MARK: - Playback State

    @State private var selectedSubtitleLanguage: String?
    @State private var selectedAILanguage: String = "en"
    @State private var selectedAudioTrackId: String?
    @State private var playbackSpeed: Float = 1.0
    @State private var audioTracks: [AudioTrack] = []
    @State private var isResolvingStream = true
    @State private var streamError: String?
    @State private var initialPosition: TimeInterval = 0
    @State private var progressTrackingTask: Task<Void, Never>? = nil
    private let progressIntervalSeconds: TimeInterval = 15

    // Focus management
    @FocusState private var controlBarFocused: Bool
    @State private var seekPreviewPosition: TimeInterval?

    // MARK: - Split Subtitle State

    @State private var splitModeEnabled = false
    @State private var splitLanguages: [String] = []
    @State private var splitLayout: SplitSubtitleLayout = .stacked
    @State private var primarySubtitleCues: [SubtitleCue] = []
    @State private var secondarySubtitleCues: [SubtitleCue] = []

    // MARK: - Available Languages

    @State private var availableSubtitleLanguages: [String] = []
    @State private var hasChapters = false

    private var isLive: Bool { contentType == .liveTV }

    var body: some View {
        ZStack {
            if isResolvingStream {
                streamLoadingView
            } else if let error = streamError {
                streamErrorView(error)
            } else {
                TVVideoPlayerRepresentable(player: mediaPlayer.avPlayer)
                    .ignoresSafeArea()

                triviaOverlay
                subtitleOverlay
                splitSubtitleOverlay
                liveSubtitleOverlay
                translationOverlay
                catchUpAutoPromptOverlay
                interactiveMomentOverlay
                dialogueOverlay

                // Transparent playback controls overlay (center)
                if !isLive {
                    playbackControlsOverlay
                }

                if showControlButtons {
                    // Gradient scrim for readability
                    VStack {
                        Spacer()
                        LinearGradient(
                            colors: [.clear, .black.opacity(0.85)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(height: 320)
                    }
                    .ignoresSafeArea()
                    .allowsHitTesting(false)

                    // Progress bar + controls anchored to bottom
                    VStack(spacing: TVDesignTokens.Spacing.lg) {
                        Spacer()

                        if !isLive {
                            playerProgressBar
                        }

                        if isLive {
                            TVAIFeaturesPanel(
                                isSubtitlesEnabled: liveSubtitlesVM?.isEnabled ?? false,
                                isDubbingEnabled: liveDubbingVM?.isEnabled ?? false,
                                isTriviaEnabled: triviaVM?.isEnabled ?? false,
                                isSplitEnabled: splitModeEnabled,
                                isCatchUpAvailable: catchUpVM?.isAvailable ?? false,
                                currentLanguage: selectedAILanguage,
                                onSubtitlesTap: { toggleLiveTranslation() },
                                onDubbingTap: { toggleLiveDubbing() },
                                onTriviaTap: { toggleLiveTrivia() },
                                onCatchUpTap: { showCatchUp = true },
                                onCompanionTap: { showCompanion = true },
                                onSplitTap: { showSplitLanguagePicker = true },
                                onLanguageTap: { showAILanguagePicker = true }
                            )
                        } else {
                            HStack(spacing: TVDesignTokens.Spacing.lg) {
                            TVPlayerControlBar(
                                contentType: contentType,
                                onSubtitles: { showSubtitleLanguagePicker = true },
                                onDubbing: { showDubbingControls = true },
                                onChapters: { showChapterList = true },
                                onAudioTracks: { showAudioTracks = true },
                                onSpeed: { showSpeedControl = true },
                                selectedSubtitleLanguage: selectedSubtitleLanguage,
                                isSplitEnabled: splitModeEnabled,
                                splitLanguages: splitLanguages
                            )

                            if interactionVM != nil {
                                Button {
                                    Task { await openCharacterSelection() }
                                } label: {
                                    Image(systemName: showDialogueOverlay
                                        ? "bubble.left.and.bubble.right.fill"
                                        : "bubble.left.and.bubble.right")
                                        .font(.system(size: TVDesignTokens.FontSize.lg))
                                        .foregroundStyle(
                                            showDialogueOverlay
                                                ? DesignTokens.Primary.p400 : .white
                                        )
                                }
                                .accessibilityLabel(
                                    localization.t("player.dialogue.talkToCharacter")
                                )
                            }
                        }
                        .focused($controlBarFocused)
                        .defaultFocus($controlBarFocused, true)
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .onDisappear { cleanup() }
        .task { await resolveAndPlay() }
        .task { initializeViewModels() }
        .task { await loadChapters() }
        .onChange(of: mediaPlayer.currentTime) { _, newTime in
            subtitlesVM?.updateActiveCue(currentTime: newTime)
            triviaVM?.updateActiveFact(currentTime: newTime)
            if let vm = interactionVM, vm.phase == .idle {
                _ = vm.checkForMoment(currentTime: newTime)
            }
        }
        .onChange(of: showControlButtons) { _, isVisible in
            if isVisible {
                controlBarFocused = true
            }
        }
        .onPlayPauseCommand {
            mediaPlayer.togglePlayPause()
            resetOverlayTimer()
        }
        .onMoveCommand { direction in
            resetOverlayTimer()
            switch direction {
            case .up: showControlButtons = true
            case .down: showControlButtons = false
            case .left: Task { await mediaPlayer.skipBackward(seconds: 10) }
            case .right: Task { await mediaPlayer.skipForward(seconds: 10) }
            @unknown default: break
            }
        }
        .task {
            resetOverlayTimer()
        }
        .onExitCommand {
            if showControlButtons {
                showControlButtons = false
            } else {
                mediaPlayer.stop()
                dismiss()
            }
        }
        .fullScreenCover(isPresented: $showSubtitleLanguagePicker) {
            TVSubtitleLanguagePickerView(
                availableLanguages: availableSubtitleLanguages,
                selectedLanguage: selectedSubtitleLanguage,
                isSplitEnabled: splitModeEnabled,
                onSelect: { handleSubtitleSelection($0) },
                onSplitTap: {
                    showSubtitleLanguagePicker = false
                    showSplitLanguagePicker = true
                },
                onDismiss: { showSubtitleLanguagePicker = false },
                contentId: contentId,
                repository: repos.subtitle,
                currentHebrewMode: subtitlesVM?.hebrewMode ?? .standard,
                currentEnglishMode: subtitlesVM?.englishMode ?? .standard,
                hasNikud: subtitlesVM?.hasNikud ?? false,
                hasShoresh: subtitlesVM?.hasShoresh ?? false,
                hasHeblish: subtitlesVM?.hasHeblish ?? false,
                hasEngrew: subtitlesVM?.hasEngrew ?? false,
                isAdmin: authManager.user?.role.isAdmin ?? false,
                onHebrewModeSelect: { mode in
                    Task {
                        await subtitlesVM?.setHebrewMode(
                            mode, contentId: contentId,
                            language: selectedSubtitleLanguage
                        )
                    }
                },
                onEnglishModeSelect: { mode in
                    Task {
                        await subtitlesVM?.setEnglishMode(
                            mode, contentId: contentId,
                            language: selectedSubtitleLanguage
                        )
                    }
                },
                onSubtitlesRefresh: {
                    Task { await loadAvailableLanguages() }
                }
            )
        }
        .fullScreenCover(isPresented: $showSplitLanguagePicker) {
            TVSplitLanguagePickerView(
                availableLanguages: availableSubtitleLanguages,
                selectedLanguages: $splitLanguages,
                layout: $splitLayout,
                onConfirm: { languages in
                    splitLanguages = languages
                    splitModeEnabled = true
                    showSplitLanguagePicker = false
                    Task { await loadSplitSubtitleCues() }
                },
                onDismiss: { showSplitLanguagePicker = false }
            )
        }
        .fullScreenCover(isPresented: $showAILanguagePicker) {
            TVAILanguagePickerView(
                selectedLanguage: selectedAILanguage,
                onSelect: { handleAILanguageChange($0) },
                onDismiss: { showAILanguagePicker = false }
            )
        }
        .fullScreenCover(isPresented: $showSubtitleSettings) {
            TVSubtitleSettingsView()
        }
        .fullScreenCover(isPresented: $showDubbingControls) {
            if let vm = liveDubbingVM {
                TVLiveDubbingOverlayView(
                    viewModel: vm,
                    channelId: channelId ?? contentId
                )
            }
        }
        .fullScreenCover(isPresented: $showChapterList) {
            TVChapterNavigationView(contentId: contentId) { chapter in
                showChapterList = false
                if let startTime = chapter.startTime {
                    Task { await mediaPlayer.seek(to: startTime) }
                }
            }
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
                },
                onDismiss: { showSpeedControl = false }
            )
        }
        .fullScreenCover(isPresented: $showCatchUp) {
            if let vm = catchUpVM {
                TVCatchUpView(
                    viewModel: vm,
                    channelId: channelId ?? contentId,
                    onSeek: { time in
                        showCatchUp = false
                        Task { await mediaPlayer.seek(to: time) }
                    },
                    onDismiss: { showCatchUp = false }
                )
            }
        }
        .fullScreenCover(isPresented: $showCompanion) {
            TVAICompanionView(
                contentId: contentId,
                onDismiss: { showCompanion = false }
            )
        }
        .fullScreenCover(isPresented: $showCharacterSelection) {
            TVCharacterSelectionView(
                characters: dialogueVM?.availableCharacters ?? [],
                onSelect: { character in
                    showCharacterSelection = false
                    Task { await startDialogue(with: character) }
                },
                onDismiss: { showCharacterSelection = false }
            )
        }
        .fullScreenCover(isPresented: $showQuiz) {
            TVQuizOverlayView(
                contentId: contentId,
                profileId: authManager.user?.id,
                onDismiss: { showQuiz = false }
            )
        }
    }

    // MARK: - Trivia Overlay

    @ViewBuilder
    private var triviaOverlay: some View {
        if interactionVM?.activeMoment == nil, let vm = triviaVM {
            TVTriviaFactsOverlayView(
                viewModel: vm,
                contentId: contentId,
                currentTime: mediaPlayer.currentTime,
                isSubtitlesActive: selectedSubtitleLanguage != nil || liveSubtitlesVM?.isEnabled == true,
                currentLanguage: selectedAILanguage,
                onDismiss: { vm.dismissFact() }
            )
        }
    }

    // MARK: - Playback Controls Overlay

    private var playbackControlsOverlay: some View {
        TVPlaybackControlsOverlay(
            isPlaying: mediaPlayer.state == .playing,
            hasChapters: hasChapters,
            currentPosition: mediaPlayer.currentTime,
            isVisible: showPlaybackOverlay,
            onPlayPause: { mediaPlayer.togglePlayPause() },
            onSkipBackward30: { Task { await mediaPlayer.skipBackward(seconds: 30) } },
            onSkipForward30: { Task { await mediaPlayer.skipForward(seconds: 30) } },
            onPreviousChapter: { skipToPreviousChapter() },
            onNextChapter: { skipToNextChapter() },
            onStartOver: { startOver() },
            onInteraction: { resetOverlayTimer() }
        )
    }

    private func resetOverlayTimer() {
        overlayHideTask?.cancel()
        showPlaybackOverlay = true
        overlayHideTask = Task {
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            await MainActor.run { showPlaybackOverlay = false }
        }
    }

    private func startOver() {
        Task {
            await mediaPlayer.seek(to: 0)
            mediaPlayer.play()
        }
    }

    // MARK: - Progress Bar

    private var playerProgressBar: some View {
        VStack(spacing: TVDesignTokens.Spacing.xs) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    // Track
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 6)

                    // Buffered
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.3))
                        .frame(
                            width: geo.size.width * bufferedFraction,
                            height: 6
                        )

                    // Progress (with seek preview)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(DesignTokens.Primary.p400)
                        .frame(
                            width: geo.size.width * (seekPreviewPosition != nil
                                ? seekPreviewPosition! / max(mediaPlayer.duration, 1)
                                : progressFraction),
                            height: 6
                        )

                    // Seek indicator
                    if seekPreviewPosition != nil {
                        Circle()
                            .fill(DesignTokens.Primary.p300)
                            .frame(width: 12, height: 12)
                            .offset(x: geo.size.width * (seekPreviewPosition! / max(mediaPlayer.duration, 1)) - 6)
                    }
                }
            }
            .frame(height: 6)
            .focusable()
            .focusEffectDisabled()
            .onMoveCommand { direction in
                switch direction {
                case .left:
                    let current = seekPreviewPosition ?? mediaPlayer.currentTime
                    seekPreviewPosition = max(0, current - 10)
                case .right:
                    let current = seekPreviewPosition ?? mediaPlayer.currentTime
                    seekPreviewPosition = min(mediaPlayer.duration, current + 10)
                default:
                    break
                }
            }
            .onPlayPauseCommand {
                if let pos = seekPreviewPosition {
                    Task {
                        await mediaPlayer.seek(to: pos)
                        seekPreviewPosition = nil
                    }
                }
            }
            .onExitCommand {
                seekPreviewPosition = nil
            }

            HStack {
                Text(formatTime(mediaPlayer.currentTime))
                    .font(.system(size: TVDesignTokens.FontSize.sm).monospacedDigit())
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                if mediaPlayer.duration > 0 {
                    Text("-\(formatTime(mediaPlayer.duration - mediaPlayer.currentTime))")
                        .font(.system(size: TVDesignTokens.FontSize.sm).monospacedDigit())
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private var progressFraction: CGFloat {
        guard mediaPlayer.duration > 0 else { return 0 }
        return min(CGFloat(mediaPlayer.currentTime / mediaPlayer.duration), 1.0)
    }

    private var bufferedFraction: CGFloat {
        guard mediaPlayer.duration > 0 else { return 0 }
        return min(CGFloat(mediaPlayer.bufferedTime / mediaPlayer.duration), 1.0)
    }

    private func formatTime(_ seconds: TimeInterval) -> String {
        guard seconds.isFinite, seconds >= 0 else { return "00:00" }
        let total = Int(seconds)
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }

    // MARK: - Subtitle Overlay (VOD)

    @ViewBuilder
    private var subtitleOverlay: some View {
        if !splitModeEnabled, !isLive,
           let vm = subtitlesVM, vm.activeCue != nil {
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

    // MARK: - Live Subtitle Overlay

    @ViewBuilder
    private var liveSubtitleOverlay: some View {
        if isLive, let vm = liveSubtitlesVM, vm.isEnabled, vm.showOverlay {
            TVLiveSubtitleOverlayView(
                translatedText: vm.activeCueText,
                originalText: vm.originalCueText ?? "",
                isVisible: vm.showOverlay
            )
        }
    }

    // MARK: - Split Subtitle Overlay

    @ViewBuilder
    private var splitSubtitleOverlay: some View {
        if splitModeEnabled, splitLanguages.count == 2 {
            TVSplitSubtitleOverlayView(
                currentTime: mediaPlayer.currentTime,
                primaryCues: primarySubtitleCues,
                secondaryCues: secondarySubtitleCues,
                primaryLanguage: splitLanguages[0],
                secondaryLanguage: splitLanguages[1],
                layout: splitLayout,
                primaryModeLabel: activeModeLabel(for: splitLanguages[0]),
                secondaryModeLabel: activeModeLabel(for: splitLanguages[1])
            )
        }
    }

    // MARK: - Translation Overlay

    @ViewBuilder
    private var translationOverlay: some View {
        if let vm = subtitlesVM, vm.showTranslation,
           let translation = vm.translation {
            TVTranslationPopoverView(
                translation: translation,
                onDismiss: { vm.dismissTranslation() }
            )
        }
    }

    // MARK: - Catch-Up Auto-Prompt Overlay

    @ViewBuilder
    private var catchUpAutoPromptOverlay: some View {
        if let vm = catchUpVM, vm.showAutoPrompt, isLive {
            TVCatchUpAutoPromptView(
                programName: nil,
                creditCost: repos.configuration.catchUpCreditCost,
                creditBalance: vm.creditBalance,
                autoDismissSeconds: repos.configuration.catchUpAutoPromptSeconds,
                onAccept: {
                    Task {
                        await vm.fetchSummary(
                            channelId: channelId ?? contentId,
                            windowMinutes: repos.configuration.catchUpDefaultWindowMinutes,
                            targetLanguage: selectedAILanguage
                        )
                    }
                },
                onDecline: {
                    vm.dismissAutoPrompt(channelId: channelId ?? contentId)
                }
            )
        }
    }

    // MARK: - Free-Form Dialogue Overlay

    @ViewBuilder
    private var dialogueOverlay: some View {
        if showDialogueOverlay,
           let vm = dialogueVM,
           let character = vm.selectedCharacter,
           let imgUrl = avatarImageUrl {
            TVAvatarDialogueOverlayView(
                avatarImageUrl: imgUrl,
                character: character,
                viewModel: vm,
                onDismiss: {
                    Task { await dismissDialogue() }
                }
            )
        }
    }

    private func openCharacterSelection() async {
        if dialogueVM == nil {
            dialogueVM = AvatarDialogueViewModel(
                repository: repos.avatarMeshRepository
            )
        }
        await dialogueVM?.loadCharacters(contentId: contentId)
        showCharacterSelection = true
    }

    private func startDialogue(with character: ContentCharacter) async {
        guard let profileId = authManager.activeProfile?.id else { return }

        let avatarId: String
        do {
            let status = try await repos.avatarMeshRepository
                .fetchAvatarStatus(avatarId: "any")
            avatarId = status.avatarId
        } catch {
            return
        }

        await dialogueVM?.startSession(
            contentId: contentId,
            profileId: profileId,
            avatarId: avatarId,
            character: character,
            currentTimestamp: mediaPlayer.currentTime
        )
        duckVolume()
        showDialogueOverlay = true
    }

    private func dismissDialogue() async {
        restoreVolume()
        showDialogueOverlay = false
        await dialogueVM?.endSession()
    }

    // MARK: - Interactive Moment Overlay

    @ViewBuilder
    private var interactiveMomentOverlay: some View {
        if let vm = interactionVM,
           let moment = vm.activeMoment,
           let videoUrl = moment.lipsyncVideoUrl,
           let imgUrl = avatarImageUrl {
            TVInteractiveMomentOverlayView(
                avatarVideoUrl: videoUrl,
                avatarImageUrl: imgUrl,
                characterVideoUrl: moment.characterResponseVideoUrl,
                characterImageUrl: moment.characterFrameUrl,
                onDismiss: { restoreVolume(); vm.dismiss() }
            )
            .onAppear { duckVolume() }
        }

        if showNoAvatarWarning {
            noAvatarWarningBanner
        }
    }

    private func duckVolume() {
        let duckedLevel: Float = 0.15
        volumeBeforeDuck = mediaPlayer.avPlayer.volume
        mediaPlayer.avPlayer.volume = duckedLevel
    }

    private func restoreVolume() {
        let target = volumeBeforeDuck ?? 1.0
        withAnimation {
            mediaPlayer.avPlayer.volume = target
        }
        volumeBeforeDuck = nil
    }

    private var noAvatarWarningBanner: some View {
        VStack {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t("settings.interactiveMomentsNoAvatar"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
            )
            Spacer()
        }
        .padding(.top, TVDesignTokens.Spacing.xxl)
        .transition(.move(edge: .top).combined(with: .opacity))
        .onAppear {
            Task {
                try? await Task.sleep(for: .seconds(5))
                withAnimation { showNoAvatarWarning = false }
            }
        }
    }

    // MARK: - Stream Loading Views

    private var streamLoadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
            Text(localization.t("player.loadingStream"))
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

    // MARK: - Subtitle Selection (VOD)

    private func handleSubtitleSelection(_ language: String?) {
        selectedSubtitleLanguage = language

        if splitModeEnabled {
            splitModeEnabled = false
            splitLanguages = []
            primarySubtitleCues = []
            secondarySubtitleCues = []
        }

        if let language {
            if subtitlesVM == nil {
                subtitlesVM = InteractiveSubtitlesViewModel(
                    repository: repos.subtitle,
                    offlineCache: repos.offlineCache
                )
            }
            Task {
                await subtitlesVM?.loadCues(
                    contentId: contentId, language: language
                )
                // Save subtitle preference for VOD content
                if !isLive {
                    await saveSubtitlePreference(language: language)
                }
            }
        } else {
            subtitlesVM = nil
        }
    }

    // MARK: - Live Feature Toggles

    private func toggleLiveTranslation() {
        if liveSubtitlesVM?.isEnabled == true {
            liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
        } else {
            // Disable dubbing (mutual exclusivity)
            if liveDubbingVM?.isEnabled == true {
                liveDubbingVM?.toggleDubbing(channelId: contentId)
            }
            liveSubtitlesVM?.selectLanguage(
                selectedAILanguage, channelId: contentId
            )
            liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
        }
    }

    private func toggleLiveDubbing() {
        guard let vm = liveDubbingVM else { return }

        if !vm.isEnabled {
            // Disable subtitles (mutual exclusivity)
            if liveSubtitlesVM?.isEnabled == true {
                liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
            }
            vm.selectLanguage(selectedAILanguage, channelId: contentId)
        }
        vm.toggleDubbing(channelId: contentId)
    }

    private func toggleLiveTrivia() {
        guard let vm = triviaVM else { return }

        if vm.isEnabled {
            vm.disconnectLiveTrivia()
        } else {
            let triviaWS = LiveTriviaWebSocketService(
                configuration: repos.configuration,
                authTokenProvider: repos.authTokenProvider
            )
            vm.toggleTrivia(
                channelId: contentId,
                language: selectedAILanguage,
                webSocketService: triviaWS
            )
        }
    }

    private func handleAILanguageChange(_ newLanguage: String) {
        selectedAILanguage = newLanguage

        if liveSubtitlesVM?.isEnabled == true {
            liveSubtitlesVM?.selectLanguage(
                newLanguage, channelId: contentId
            )
        }
        if liveDubbingVM?.isEnabled == true {
            liveDubbingVM?.selectLanguage(
                newLanguage, channelId: contentId
            )
        }
    }

    // MARK: - Split Subtitles

    private func activeModeLabel(for languageCode: String) -> String? {
        guard let vm = subtitlesVM else { return nil }
        switch languageCode {
        case "he" where vm.hebrewMode != .standard:
            return vm.hebrewMode.displayName
        case "en" where vm.englishMode != .standard:
            return vm.englishMode.displayName
        default:
            return nil
        }
    }

    private func loadSplitSubtitleCues() async {
        guard splitLanguages.count == 2 else { return }

        let repo = repos.subtitle
        async let primaryResult = repo.fetchCues(
            contentId: contentId, language: splitLanguages[0],
            hebrewMode: nil, englishMode: nil
        )
        async let secondaryResult = repo.fetchCues(
            contentId: contentId, language: splitLanguages[1],
            hebrewMode: nil, englishMode: nil
        )

        do {
            let (primary, secondary) = try await (
                primaryResult, secondaryResult
            )
            primarySubtitleCues = primary.cues ?? []
            secondarySubtitleCues = secondary.cues ?? []
        } catch {
            splitModeEnabled = false
        }
    }

    // MARK: - Lifecycle

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
            // Call avPlayer.play() directly because MediaPlayer.play() guards
            // on state.canPlay which excludes .loading. AVPlayer handles
            // pre-ready playback natively and will auto-play once buffered.
            mediaPlayer.avPlayer.play()
            isResolvingStream = false

            await loadAvailableLanguages()

            // Load resume position and subtitle preferences for VOD
            if !isLive {
                await loadResumePosition()
                await loadSubtitlePreference()

                // Seek to resume position if available
                if initialPosition > 0 {
                    await mediaPlayer.seek(to: initialPosition)
                }

                // Start periodic progress tracking
                startProgressTracking()
            }
        } catch let error as StreamResolutionError {
            streamError = error.errorDescription
                ?? localization.t("player.streamLoadFailed")
            isResolvingStream = false
        } catch {
            if let message = error.userFriendlyMessage {
                streamError = message
            }
            isResolvingStream = false
        }
    }

    private func fetchStreamURL() async throws -> String {
        switch contentType {
        case .liveTV:
            let channel = try await repos.liveTV.fetchChannelDetail(
                id: channelId ?? contentId
            )
            let stream = try await repos.media.fetchLiveStream(
                channelId: channelId ?? contentId
            )
            guard let url = stream.url ?? channel.streamUrl,
                  !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url

        case .radio:
            let stream = try await repos.media.fetchRadioStream(
                stationId: contentId
            )
            guard let url = stream.url, !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url

        case .podcast:
            let detail = try await repos.podcasts.fetchPodcastDetail(
                id: contentId
            )
            let audioURLStr = detail.episodes?.first?.audioUrl
                ?? detail.latestEpisode?.audioUrl
            guard let url = audioURLStr, !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url

        case .vod, .audiobook:
            let detail = try await repos.content.fetchContentDetail(
                id: contentId
            )
            let stream = try await repos.media.fetchStream(
                contentId: contentId, quality: nil
            )
            // Match iOS: fall back to content detail streamUrl/directUrl
            guard let url = stream.url ?? detail.streamUrl ?? detail.directUrl
                    ?? stream.streamUrl ?? stream.directUrl,
                  !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url
        }
    }

    private func loadAvailableLanguages() async {
        // Live TV channels don't have subtitle data in the Content collection
        guard contentType != .liveTV else {
            availableSubtitleLanguages = []
            return
        }

        do {
            let detail = try await repos.content.fetchContentDetail(
                id: contentId
            )
            availableSubtitleLanguages =
                detail.availableSubtitleLanguages ?? []
        } catch {
            availableSubtitleLanguages = []
        }
    }

    private func initializeViewModels() {
        BayitLogger(category: "TVPlayerView").warning(
            "initializeViewModels called: isLive=\(isLive), contentId=\(contentId)"
        )
        // Catch-up for live content when user is beta
        if isLive, authManager.user?.isBetaUser == true {
            let vm = CatchUpViewModel(repository: repos.liveTV)
            catchUpVM = vm
            Task {
                await vm.checkAvailability(
                    channelId: channelId ?? contentId,
                    isBetaUser: true
                )
            }
        }

        // Trivia for all content types
        triviaVM = TriviaFactsViewModel(
            repository: repos.trivia,
            offlineCache: repos.offlineCache
        )

        if !isLive {
            // VOD: load trivia facts from REST API
            Task {
                await triviaVM?.loadFacts(
                    contentId: contentId, language: selectedAILanguage
                )
            }
        }

        // Interactive moments -- gated by preference + persona
        if !isLive {
            Task { await initializeInteractiveMoments() }
        }

        // Live dubbing
        let dubbingWS = LiveDubbingWebSocketService(
            configuration: repos.configuration,
            authTokenProvider: repos.authTokenProvider
        )
        webSocketService = dubbingWS
        liveDubbingVM = LiveDubbingViewModel(
            repository: repos.liveDubbing,
            webSocketService: dubbingWS,
            authManager: authManager
        )

        // Live subtitles
        if isLive {
            let subtitleWS = LiveSubtitlesWebSocketService(
                configuration: repos.configuration,
                authTokenProvider: repos.authTokenProvider
            )
            liveSubtitlesVM = LiveSubtitlesViewModel(
                webSocketService: subtitleWS
            )
        }
    }

    private func initializeInteractiveMoments() async {
        let logger = BayitLogger(category: "TVPlayerView")

        // 1. Check user preference
        do {
            let prefsResponse = try await repos.settings.fetchPreferences()
            let enabled = prefsResponse.preferences?
                .interactiveMomentsEnabled ?? false
            guard enabled else {
                logger.info("Interactive moments disabled in preferences")
                return
            }
        } catch {
            logger.warning("Failed to fetch preferences: \(error)")
            return
        }

        // 2. Verify Creatify persona avatar exists
        do {
            let status = try await repos.avatarMeshRepository
                .fetchAvatarStatus(avatarId: "any")
            guard let imageUrl = status.avatarImageUrl,
                  status.status == "ready" else {
                logger.info("Avatar not ready: \(status.status)")
                await MainActor.run {
                    withAnimation { showNoAvatarWarning = true }
                }
                return
            }
            avatarImageUrl = imageUrl
        } catch {
            logger.warning("Avatar fetch failed: \(error)")
            await MainActor.run {
                withAnimation { showNoAvatarWarning = true }
            }
            return
        }

        // 3. Load interactive moments from API
        let vm = VODInteractionViewModel(
            repository: repos.avatarMeshRepository
        )
        await vm.loadMoments(contentId: contentId)
        guard !vm.moments.isEmpty else {
            logger.info("No interactive moments for content")
            return
        }
        interactionVM = vm
        logger.info(
            "Interactive moments enabled: \(vm.moments.count) moments"
        )
    }

    @MainActor
    private func cleanup() {
        progressTrackingTask?.cancel()
        progressTrackingTask = nil
        Task { await saveProgress() }
        mediaPlayer.pause()
        liveDubbingVM?.cleanup()
        liveSubtitlesVM?.cleanup()
        triviaVM?.disconnectLiveTrivia()
        catchUpVM?.reset()
        catchUpVM = nil
        interactionVM = nil
        if dialogueVM?.isActive == true {
            Task { await dialogueVM?.endSession() }
        }
        dialogueVM = nil
    }

    // MARK: - Progress Tracking

    @MainActor
    private func loadResumePosition() async {
        do {
            let history = try await repos.media.fetchContinueWatching()
            if let item = history.items.first(where: { $0.id == contentId }) {
                initialPosition = item.position ?? 0
            }
        } catch {
            // Resume position is optional - continue without it
        }
    }

    @MainActor
    private func startProgressTracking() {
        progressTrackingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(progressIntervalSeconds))
                guard !Task.isCancelled else { break }
                await saveProgress()
            }
        }
    }

    @MainActor
    private func saveProgress() async {
        guard mediaPlayer.currentTime > 0, mediaPlayer.duration > 0 else { return }

        let request = WatchProgressRequest(
            contentId: contentId,
            contentType: contentType.rawValue,
            position: mediaPlayer.currentTime,
            duration: mediaPlayer.duration
        )

        do {
            _ = try await repos.media.updateProgress(request: request)
        } catch {
            // Progress save failures are non-critical
        }
    }

    // MARK: - Subtitle Preferences

    @MainActor
    private func loadSubtitlePreference() async {
        do {
            let response = try await repos.subtitle.fetchPreferences(contentId: contentId)
            if let language = response.language, !language.isEmpty {
                // Auto-select saved subtitle preference
                handleSubtitleSelection(language)
            }
        } catch {
            // Subtitle preferences are optional - continue without them
        }
    }

    @MainActor
    private func saveSubtitlePreference(language: String) async {
        let update = SubtitlePreferencesUpdate(
            contentId: contentId,
            language: language
        )

        do {
            try await repos.subtitle.updatePreferences(update)
        } catch {
            // Preference save failures are non-critical
        }
    }

    // MARK: - Chapter Navigation

    @State private var chapters: [Chapter] = []

    @MainActor
    private func loadChapters() async {
        do {
            chapters = try await repos.chapter.fetchChapters(contentId: contentId)
            hasChapters = !chapters.isEmpty
        } catch {
            chapters = []
            hasChapters = false
        }
    }

    private func skipToPreviousChapter() {
        guard !chapters.isEmpty else { return }
        let currentTime = mediaPlayer.currentTime

        // Find the previous chapter (last chapter with startTime < currentTime - 3 seconds)
        let previousChapter = chapters
            .filter { ($0.startTime ?? 0) < currentTime - 3 }
            .last

        if let chapter = previousChapter, let startTime = chapter.startTime {
            Task { await mediaPlayer.seek(to: startTime) }
        } else if let firstChapter = chapters.first, let startTime = firstChapter.startTime {
            // If no previous chapter, go to the beginning of first chapter
            Task { await mediaPlayer.seek(to: startTime) }
        }
    }

    private func skipToNextChapter() {
        guard !chapters.isEmpty else { return }
        let currentTime = mediaPlayer.currentTime

        // Find the next chapter (first chapter with startTime > currentTime)
        let nextChapter = chapters
            .first { ($0.startTime ?? 0) > currentTime }

        if let chapter = nextChapter, let startTime = chapter.startTime {
            Task { await mediaPlayer.seek(to: startTime) }
        }
    }

}
