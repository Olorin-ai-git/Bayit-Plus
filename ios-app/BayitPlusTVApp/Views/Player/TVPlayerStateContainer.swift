import BayitAuth
import BayitBYOC
import BayitCore
import BayitMedia
import Foundation
import Observation

/// Groups all mutable state for TVPlayerView into a single @Observable container.
/// This keeps the coordinator view lean and allows extensions to share state cleanly.
@Observable
final class TVPlayerStateContainer {
    // MARK: - ViewModels

    var subtitlesVM: InteractiveSubtitlesViewModel?
    var liveDubbingVM: LiveDubbingViewModel?
    var liveSubtitlesVM: LiveSubtitlesViewModel?
    var triviaVM: TriviaFactsViewModel?
    var webSocketService: LiveDubbingWebSocketService?
    var catchUpVM: CatchUpViewModel?
    var interactionVM: VODInteractionViewModel?
    var avatarImageUrl: String?
    var resolvedAvatarId: String?
    var showNoAvatarWarning = false

    // MARK: - Free-form Dialogue

    var dialogueVM: AvatarDialogueViewModel?
    var voiceService: TVVoiceInteractionService?
    var showCharacterSelection = false

    // MARK: - Pause & Ask

    var showPauseAskOverlay = false
    var hasVoiceClone = false

    // MARK: - Interactive Subtitles

    var interactiveSubtitleVM: TVWordInteractionViewModel?
    var showVocabulary = false

    // MARK: - SharePlay

    var sharePlayService: TVSharePlayService?
    var showSharePlayOverlay = false

    // MARK: - Shared Interaction (Phase 3 WS4)

    var sharedVM: SharedInteractionViewModel?
    var showSharedInteraction = false

    // MARK: - Panel Visibility

    var showSubtitleLanguagePicker = false
    var showSubtitleSettings = false
    var showDubbingControls = false
    var showChapterList = false
    var showAudioTracks = false
    var showSpeedControl = false
    var showControlButtons = true
    var overlayHideTask: Task<Void, Never>?
    var isDockFocused = false
    var showSplitLanguagePicker = false
    var showAILanguagePicker = false
    var showCatchUp = false
    var showCompanion = false
    var showQuiz = false
    var volumeBeforeDuck: Float?

    // MARK: - Playback State

    var selectedSubtitleLanguage: String?
    var selectedAILanguage: String = "en"
    var selectedAudioTrackId: String?
    var playbackSpeed: Float = 1.0
    var audioTracks: [AudioTrack] = []
    var isResolvingStream = true
    var streamError: String?
    var initialPosition: TimeInterval = 0
    var progressTrackingTask: Task<Void, Never>?
    var seekPreviewPosition: TimeInterval?

    // MARK: - Split Subtitle State

    var splitModeEnabled = false
    var splitLanguages: [String] = []
    var splitLayout: SplitSubtitleLayout = .stacked
    var primarySubtitleCues: [SubtitleCue] = []
    var secondarySubtitleCues: [SubtitleCue] = []
    var splitPrimaryHebrewMode: SubtitleHebrewMode = .standard
    var splitPrimaryEnglishMode: SubtitleEnglishMode = .standard
    var splitSecondaryHebrewMode: SubtitleHebrewMode = .standard
    var splitSecondaryEnglishMode: SubtitleEnglishMode = .standard

    // MARK: - Split Subtitle AI Availability

    /// Per-language AI availability, independent of the active subtitle language.
    /// Loaded at content start so split picker shows all generated variants.
    var splitHasNikud = false
    var splitHasShoresh = false
    var splitHasHeblish = false
    var splitHasEngrew = false

    // MARK: - Available Languages

    var availableSubtitleLanguages: [String] = []
    var hasChapters = false

    // MARK: - Chapters

    var chapters: [Chapter] = []

    // MARK: - BYOC

    var byocCapabilities: BYOCCapabilities = .none
    var byocStreamUrl: String?
}
