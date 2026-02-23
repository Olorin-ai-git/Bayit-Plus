import AVKit
import BayitAuth
import BayitCast
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

    // Pause & Ask state
    @State var showPauseAskOverlay = false
    @State var hasVoiceClone = false
    @State var hasInteractiveCharacters = false

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
                castSessionManager.updateContent(
                    id: contentId,
                    title: viewModel.title ?? contentId
                )
            }
            .onDisappear { performCleanup() }
            .onChange(of: viewModel.player.currentTime) { _, newTime in
                handleTimeChange(newTime)
            }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active, isPiPActive {
                    isPiPActive = false
                }
            }
            .sheet(isPresented: $showSplitLanguagePicker) { splitLanguagePickerSheet }
            .sheet(isPresented: $showCharacterSheet) { characterSelectionSheet }
            .sheet(isPresented: $showDubbingControls) { dubbingControlsSheet }
            .sheet(isPresented: $showAILanguagePicker) { aiLanguagePickerSheet }
            .sheet(isPresented: $showQualitySelector) { qualitySelectorSheet }
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
