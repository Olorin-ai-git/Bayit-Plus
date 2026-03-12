import AVKit
import BayitAuth
import BayitCast
import BayitCore
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
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(RepositoryProvider.self) var repositories
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization
    @Environment(DownloadManager.self) var downloadManager
    @Environment(CastSessionManager.self) var castSessionManager
    @Environment(\.scenePhase) var scenePhase
    @Environment(\.appConfiguration) var appConfiguration

    @State var viewModel: MediaPlayerViewModel
    @State var showControls = true
    @State var controlsTimer: Task<Void, Never>?
    @State var nowPlayingService = NowPlayingService()
    @State var remoteCommandService = RemoteCommandService()
    @State var dubbingMixer = DubbingMixer()
    @State var isDubbingEnabled = false
    @State var playerWidth: CGFloat = 0
    @State var showSubtitlePicker = false
    @State var subtitlesVM: InteractiveSubtitlesViewModel?
    @State var selectedSubtitleLanguage: String?
    @State var subtitleLoadTask: Task<Void, Never>?
    @State var playbackUpdateTask: Task<Void, Never>?
    @State var triviaVM: TriviaFactsViewModel?
    @State var liveDubbingVM: LiveDubbingViewModel?
    @State var liveSubtitlesVM: LiveSubtitlesViewModel?

    // Recording state
    @State var isRecording = false
    @State var recordingSessionId: String?
    @State var recordingStartTime: Date?
    @State var recordingDuration: TimeInterval = 0
    @State var recordingTimer: Task<Void, Never>?
    @State var showRecordingError = false
    @State var recordingErrorMessage: String?

    /// Dubbing controls state
    @State var showDubbingControls = false

    // VOD interaction state
    @State var interactionVM: VODInteractionViewModel?
    @State var avatarImageUrl: String?
    @State var resolvedAvatarId: String?
    @State var showNoAvatarWarning = false
    @State var volumeBeforeDuck: Float?

    // Free-form dialogue state
    @State var dialogueVM: AvatarDialogueViewModel?
    @State var voiceService: VoiceInteractionService?
    @State var showCharacterSheet = false
    @State var showDialogueOverlay = false

    /// Cultural context state
    @State var culturalContextVM: CulturalContextViewModel?

    // Pause & Ask state
    @State var showPauseAskOverlay = false
    @State var hasVoiceClone = false
    @State var hasInteractiveCharacters = false

    /// TalkBack state
    @State var talkBackVM: TalkBackViewModel?

    // Shared interaction state (Phase 3 WS4)
    @State var sharedVM: SharedInteractionViewModel?
    @State var showSharedInteraction = false

    /// Catch-up ViewModel (shared across overlays)
    @State var catchUpVM: CatchUpViewModel?

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
    @Environment(TooltipManager.self) var tooltipManager

    // VOD AI credit flow state
    @State var vodUsageCache = VODAIUsageCache()
    @State var pendingVODFeature: VODAIFeature?
    @State var showVODCreditConfirm = false
    @State var vodCreditBalance: CreditBalance?
    @State var showVODCreditToast = false
    @State var vodCreditToastRemaining: Int = 0
    @State var vodCreditToastIsLow = false

    let interactionRewindThreshold: TimeInterval = 3
    let interactionSeekOffset: TimeInterval = 5
    @State var selectedSecondaryLanguage: String?
    @State var showAILanguagePicker = false

    // Split subtitle state
    @State var splitModeEnabled = false
    @State var splitLanguages: [String] = []
    @State var showSplitLanguagePicker = false
    @State var splitLayout: SplitSubtitleLayout = .stacked
    @State var primarySubtitleCues: [SubtitleCue] = []
    @State var secondarySubtitleCues: [SubtitleCue] = []

    /// PiP state
    @State var isPiPActive = false

    /// First BYOC play overlay
    @State var showFirstBYOCOverlay = false

    // Quality & playback rate
    @State var showQualitySelector = false
    @State var showPlaybackRateMenu = false

    let contentId: String
    let contentType: ContentType
    let resume: Bool

    init(contentId: String, contentType: ContentType, resume: Bool = false,
         player: MediaPlayer,
         repository: any MediaRepository, contentRepository: any ContentRepository,
         liveTVRepository: any LiveTVRepository, radioRepository: any RadioRepository,
         podcastRepository: any PodcastRepository, audiobookRepository: any AudiobookRepository,
         widgetSync: WidgetDataSyncService,
         downloadManager: DownloadManager? = nil,
         progressIntervalSeconds: TimeInterval)
    {
        self.contentId = contentId
        self.contentType = contentType
        self.resume = resume
        _viewModel = State(initialValue: MediaPlayerViewModel(
            contentId: contentId,
            contentType: contentType,
            player: player,
            repository: repository,
            contentRepository: contentRepository,
            liveTVRepository: liveTVRepository,
            radioRepository: radioRepository,
            podcastRepository: podcastRepository,
            audiobookRepository: audiobookRepository,
            widgetSync: widgetSync,
            downloadManager: downloadManager,
            progressIntervalSeconds: progressIntervalSeconds
        ))
    }

    var body: some View {
        playerZStack
            .gesture(
                DragGesture(minimumDistance: 60, coordinateSpace: .local)
                    .onEnded { value in
                        let isDownward = value.translation.height > 100
                        let isNarrow = abs(value.translation.width) < 80
                        if isDownward, isNarrow {
                            coordinator.dismissFullscreen()
                        }
                    },
                including: mediaContentType.isLive ? .all : .subviews
            )
            .statusBarHidden(true)
            .onAppear { requestLandscapeOrientation() }
            .task {
                UIApplication.shared.isIdleTimerDisabled = true
                await viewModel.load()
                initializeViewModels()
                handleFirstBYOCPlayIfNeeded()
                castSessionManager.updateContent(
                    id: contentId,
                    title: viewModel.title ?? contentId
                )
            }
            .onDisappear { performCleanup() }
            .onChange(of: viewModel.player.currentTime) { _, newTime in
                handleTimeChange(newTime)
            }
            .onChange(of: subtitlesVM?.activeText) { _, newText in
                guard !mediaContentType.isLive, let vm = culturalContextVM else { return }
                Task { await vm.detectReferences(text: newText ?? "") }
            }
            .onChange(of: scenePhase) { _, newPhase in
                // Do NOT force-close PiP when returning to foreground.
                // The user may tap the PiP window to restore the player,
                // which triggers scenePhase -> .active. Forcing isPiPActive
                // to false here kills PiP before the restore handler fires.
                if newPhase == .background, !isPiPActive {
                    viewModel.player.pause()
                }
            }
            .sheet(isPresented: $showSplitLanguagePicker) { splitLanguagePickerSheet }
            .sheet(isPresented: $showCharacterSheet) { characterSelectionSheet }
            .sheet(
                isPresented: Binding(
                    get: { culturalContextVM?.showExplanationSheet ?? false },
                    set: { if !$0 { culturalContextVM?.dismissExplanation() } }
                )
            ) {
                if let data = culturalContextVM?.selectedReference {
                    CulturalExplanationSheet(data: data) {
                        culturalContextVM?.dismissExplanation()
                    }
                }
            }
            .sheet(isPresented: $showDubbingControls) { dubbingControlsSheet }
            .sheet(isPresented: $showAILanguagePicker) { aiLanguagePickerSheet }
            .sheet(isPresented: $showQualitySelector) { qualitySelectorSheet }
            .sheet(isPresented: $showVODCreditConfirm) {
                if let feature = pendingVODFeature {
                    AIFeatureCreditConfirmSheet(
                        feature: feature,
                        currentBalance: vodCreditBalance?.remainingCredits ?? 0,
                        onConfirm: { confirmVODCreditDeduction() },
                        onCancel: {
                            showVODCreditConfirm = false
                            pendingVODFeature = nil
                        }
                    )
                }
            }
            .overlay(alignment: .top) {
                if showVODCreditToast {
                    CreditToastView(
                        remainingCredits: vodCreditToastRemaining,
                        isLow: vodCreditToastIsLow
                    )
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        Task {
                            try? await Task.sleep(for: .seconds(3))
                            withAnimation { showVODCreditToast = false }
                        }
                    }
                }
            }
            .confirmationDialog(
                localization.t("player.playbackSpeed"),
                isPresented: $showPlaybackRateMenu,
                titleVisibility: .visible
            ) {
                ForEach(playbackRateButtons, id: \.self) { rate in
                    Button(rate == 1.0 ? localization.t("player.speedNormal") : "\(rate)x") {
                        viewModel.player.setRate(Float(rate))
                        viewModel.preferences.preferredPlaybackRate = Float(rate)
                    }
                }
            }
            .alert(localization.t("player.recordingError"), isPresented: $showRecordingError) {
                Button(localization.t("common.ok"), role: .cancel) {}
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
                Button(localization.t("common.ok"), role: .cancel) {}
            } message: {
                Text(liveSubtitlesVM?.error ?? localization.t("subtitles.quotaExceeded.message"))
            }
    }
}
