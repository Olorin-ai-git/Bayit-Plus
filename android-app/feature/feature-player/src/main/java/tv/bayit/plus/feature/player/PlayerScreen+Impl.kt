package tv.bayit.plus.feature.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.TooltipManager
import tv.bayit.plus.feature.player.dialogue.AvatarPlacement
import tv.bayit.plus.feature.player.dialogue.ContentCharacter
import tv.bayit.plus.feature.player.dialogue.DialogueExchange
import tv.bayit.plus.feature.player.dialogue.PauseAskPhase
import tv.bayit.plus.feature.player.dialogue.PauseAskResponse
import tv.bayit.plus.feature.player.live.AIFeaturesPanelState
import tv.bayit.plus.feature.player.live.LiveDubbingUiState
import tv.bayit.plus.feature.player.live.LiveSubtitleUiState
import tv.bayit.plus.feature.player.live.LiveTriviaUiState

@Composable
internal fun PlayerScreen(
    uiState: PlayerUiState,
    playerState: PlayerState,
    isControlsVisible: Boolean,
    positionMs: Long,
    durationMs: Long,
    subtitleState: LiveSubtitleUiState,
    dubbingState: LiveDubbingUiState,
    triviaState: LiveTriviaUiState,
    triviaProgress: Float,
    aiPanelState: AIFeaturesPanelState,
    extendedState: PlayerExtendedState,
    showLanguagePicker: Boolean,
    showSubtitlePicker: Boolean,
    showSplitSubtitlePicker: Boolean,
    showOpenSubtitles: Boolean,
    onShowLanguagePicker: () -> Unit,
    onHideLanguagePicker: () -> Unit,
    onShowSubtitlePicker: () -> Unit,
    onHideSubtitlePicker: () -> Unit,
    onToggleControls: () -> Unit,
    onPlayPause: () -> Unit,
    onSeek: (Float) -> Unit,
    onToggleAIPanel: () -> Unit,
    onToggleSubtitles: () -> Unit,
    onToggleDubbing: () -> Unit,
    onToggleTrivia: () -> Unit,
    onSelectLanguage: (String) -> Unit,
    onSelectSubtitleLanguage: (String) -> Unit,
    onToggleSplitMode: () -> Unit,
    onShowOpenSubtitles: () -> Unit,
    onHideSplitSubtitlePicker: () -> Unit,
    onHideOpenSubtitles: () -> Unit,
    onSelectPrimaryLanguage: (String) -> Unit,
    onSelectSecondaryLanguage: (String) -> Unit,
    onSelectSplitLayout: (tv.bayit.plus.core.model.SplitSubtitleLayout) -> Unit,
    onFetchExternalSubtitles: () -> Unit,
    onSelectExternalSubtitle: (tv.bayit.plus.core.model.ImportedTrack) -> Unit,
    onDismissTrivia: () -> Unit,
    onTriviaFollowUp: () -> Unit,
    onToggleVodTrivia: () -> Unit,
    onHideOmriOverlay: () -> Unit,
    onSkipBackward: () -> Unit,
    onSkipForward: () -> Unit,
    onRestart: () -> Unit,
    onVolumeChange: (Float) -> Unit,
    onSpeedChange: (Float) -> Unit,
    onInteract: (() -> Unit)? = null,
    onPreviousInteraction: (() -> Unit)? = null,
    onNextInteraction: (() -> Unit)? = null,
    onDismissVodInteractionSheet: (() -> Unit)? = null,
    onStartDialogue: ((ContentCharacter) -> Unit)? = null,
    onSendDialogueMessage: ((String) -> Unit)? = null,
    onDismissDialogue: (() -> Unit)? = null,
    onDismissPauseAsk: (() -> Unit)? = null,
    onSendPauseAskQuestion: ((String) -> Unit)? = null,
    onAdvancePauseAskPhase: ((PauseAskPhase) -> Unit)? = null,
    onResetPauseAsk: (() -> Unit)? = null,
    onDismissMoment: (() -> Unit)? = null,
    pauseAskPhase: PauseAskPhase = PauseAskPhase.IDLE,
    pauseAskResponse: PauseAskResponse? = null,
    dialogueIsActive: Boolean = false,
    dialogueCharacter: ContentCharacter? = null,
    dialogueExchanges: List<DialogueExchange> = emptyList(),
    dialogueIsSending: Boolean = false,
    dialoguePlacement: AvatarPlacement? = null,
    showSleepTimerPicker: Boolean,
    onHideSleepTimerPicker: () -> Unit,
    onStartSleepTimer: (Int) -> Unit,
    onExtendSleepTimer: (Int) -> Unit,
    onCancelSleepTimer: () -> Unit,
    onToggleFullscreen: () -> Unit,
    onCastClick: () -> Unit = {},
    onBack: () -> Unit,
    tooltipManager: TooltipManager? = null,
    isPlaying: Boolean = false,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize().background(DesignTokens.Colors.Background.primary)) {
        when (uiState) {
            is PlayerUiState.Loading -> GlassLoadingIndicator()
            is PlayerUiState.Ready -> {
                ReadyContent(
                    state = uiState,
                    playerState = playerState,
                    isControlsVisible = isControlsVisible,
                    positionMs = positionMs,
                    durationMs = durationMs,
                    subtitleState = subtitleState,
                    dubbingState = dubbingState,
                    triviaState = triviaState,
                    triviaProgress = triviaProgress,
                    aiPanelState = aiPanelState,
                    extendedState = extendedState,
                    onToggleControls = onToggleControls,
                    onPlayPause = onPlayPause,
                    onSeek = onSeek,
                    onToggleAIPanel = onToggleAIPanel,
                    onToggleSubtitles = onToggleSubtitles,
                    onToggleDubbing = onToggleDubbing,
                    onToggleTrivia = onToggleTrivia,
                    onShowLanguagePicker = onShowLanguagePicker,
                    onShowSubtitlePicker = onShowSubtitlePicker,
                    onDismissTrivia = onDismissTrivia,
                    onTriviaFollowUp = onTriviaFollowUp,
                    onToggleVodTrivia = onToggleVodTrivia,
                    onHideOmriOverlay = onHideOmriOverlay,
                    onSkipBackward = onSkipBackward,
                    onSkipForward = onSkipForward,
                    onRestart = onRestart,
                    onVolumeChange = onVolumeChange,
                    onSpeedChange = onSpeedChange,
                    onBack = onBack,
                    onToggleFullscreen = onToggleFullscreen,
                    onInteract = onInteract,
                    onPreviousInteraction = onPreviousInteraction,
                    onNextInteraction = onNextInteraction, hasInteractiveMoments = extendedState.interactiveMoments.isNotEmpty(),
                    isCastAvailable = extendedState.isCastAvailable,
                    isCastConnected = extendedState.isCastConnected,
                    onCastClick = onCastClick,
                )
                PlayerScreenDialogueOverlays(
                    state = uiState,
                    extendedState = extendedState,
                    dialogueIsActive = dialogueIsActive,
                    dialogueCharacter = dialogueCharacter,
                    dialogueExchanges = dialogueExchanges,
                    dialogueIsSending = dialogueIsSending,
                    dialoguePlacement = dialoguePlacement,
                    pauseAskPhase = pauseAskPhase,
                    pauseAskResponse = pauseAskResponse,
                    showSleepTimerPicker = showSleepTimerPicker,
                    momentModifier = Modifier.align(Alignment.BottomCenter),
                    sleepTimerBannerModifier = Modifier.align(Alignment.TopCenter).padding(top = DesignTokens.Spacing.xl),
                    onStartDialogue = onStartDialogue,
                    onSendDialogueMessage = onSendDialogueMessage,
                    onDismissDialogue = onDismissDialogue,
                    onDismissVodInteractionSheet = onDismissVodInteractionSheet,
                    onSendPauseAskQuestion = onSendPauseAskQuestion,
                    onAdvancePauseAskPhase = onAdvancePauseAskPhase,
                    onResetPauseAsk = onResetPauseAsk,
                    onDismissPauseAsk = onDismissPauseAsk,
                    onDismissMoment = onDismissMoment,
                    onExtendSleepTimer = onExtendSleepTimer,
                    onCancelSleepTimer = onCancelSleepTimer,
                    onStartSleepTimer = onStartSleepTimer,
                    onHideSleepTimerPicker = onHideSleepTimerPicker,
                    tooltipManager = tooltipManager,
                    isPlaying = isPlaying,
                )
                PlayerScreenPickerSheets(
                    extendedState = extendedState,
                    aiPanelState = aiPanelState,
                    showLanguagePicker = showLanguagePicker,
                    showSubtitlePicker = showSubtitlePicker,
                    showSplitSubtitlePicker = showSplitSubtitlePicker,
                    showOpenSubtitles = showOpenSubtitles,
                    onSelectLanguage = onSelectLanguage,
                    onHideLanguagePicker = onHideLanguagePicker,
                    onSelectSubtitleLanguage = onSelectSubtitleLanguage,
                    onHideSubtitlePicker = onHideSubtitlePicker,
                    onToggleSplitMode = onToggleSplitMode,
                    onShowOpenSubtitles = onShowOpenSubtitles,
                    onSelectPrimaryLanguage = onSelectPrimaryLanguage,
                    onSelectSecondaryLanguage = onSelectSecondaryLanguage,
                    onSelectSplitLayout = onSelectSplitLayout,
                    onHideSplitSubtitlePicker = onHideSplitSubtitlePicker,
                    onFetchExternalSubtitles = onFetchExternalSubtitles,
                    onSelectExternalSubtitle = onSelectExternalSubtitle,
                    onHideOpenSubtitles = onHideOpenSubtitles,
                )
            }
            is PlayerUiState.Error -> ErrorContent(uiState.message, onBack)
        }
    }
}
