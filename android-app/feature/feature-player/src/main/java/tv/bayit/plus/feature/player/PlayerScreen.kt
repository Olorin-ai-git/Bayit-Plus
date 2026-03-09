package tv.bayit.plus.feature.player

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.flow.update
import tv.bayit.plus.feature.player.dialogue.AvatarDialogueViewModel
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.feature.player.dialogue.PauseAskPhase
import tv.bayit.plus.feature.player.dialogue.endSession
import tv.bayit.plus.feature.player.dialogue.sendMessage

/**
 * Navigation entry-point for the Player screen.
 *
 * Owns the [PlayerViewModel] lifecycle through Hilt, triggers content loading via
 * [PlayerRouteLifecycleEffects], manages orientation via [PlayerRouteOrientationEffect],
 * and saves progress on back navigation.
 */
@Composable
fun PlayerRoute(
    contentId: String,
    contentType: String,
    resumePositionMs: Long = 0L,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PlayerViewModel = hiltViewModel(),
    dialogueViewModel: AvatarDialogueViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val playerState by viewModel.playerState.collectAsStateWithLifecycle()
    val isControlsVisible by viewModel.isControlsVisible.collectAsStateWithLifecycle()
    val positionMs by viewModel.playbackPositionMs.collectAsStateWithLifecycle()
    val durationMs by viewModel.totalDurationMs.collectAsStateWithLifecycle()
    val subtitleState by viewModel.subtitleState.collectAsStateWithLifecycle()
    val dubbingState by viewModel.dubbingState.collectAsStateWithLifecycle()
    val triviaState by viewModel.triviaState.collectAsStateWithLifecycle()
    val triviaProgress by viewModel.triviaProgress.collectAsStateWithLifecycle()
    val aiPanelState by viewModel.aiPanelState.collectAsStateWithLifecycle()
    val extendedState by viewModel.extendedState.collectAsStateWithLifecycle()
    val dialogueCharacter by dialogueViewModel.selectedCharacter.collectAsStateWithLifecycle()
    val dialogueIsActive by dialogueViewModel.isActive.collectAsStateWithLifecycle()
    val dialogueExchanges by dialogueViewModel.exchanges.collectAsStateWithLifecycle()
    val dialogueIsSending by dialogueViewModel.isSending.collectAsStateWithLifecycle()
    val dialoguePlacement by dialogueViewModel.avatarPlacement.collectAsStateWithLifecycle()
    val pauseAskPhase by dialogueViewModel.pauseAskPhase.collectAsStateWithLifecycle()
    val pauseAskResponse by dialogueViewModel.pauseAskResponse.collectAsStateWithLifecycle()

    var showLanguagePicker by remember { mutableStateOf(false) }
    var showSubtitlePicker by remember { mutableStateOf(false) }
    var showSplitSubtitlePicker by remember { mutableStateOf(false) }
    var showOpenSubtitles by remember { mutableStateOf(false) }
    var showSleepTimerPicker by remember { mutableStateOf(false) }

    LaunchedEffect(extendedState.shouldDismissOpenSubtitles) {
        if (extendedState.shouldDismissOpenSubtitles) {
            showOpenSubtitles = false
            showSubtitlePicker = true
            viewModel._extendedState.update { it.copy(shouldDismissOpenSubtitles = false) }
        }
    }

    val context = LocalContext.current

    PlayerRouteLifecycleEffects(viewModel, contentId, contentType, resumePositionMs)
    PlayerRouteOrientationEffect(extendedState.isFullscreen, context)

    BackHandler {
        viewModel.saveProgress()
        onNavigateBack()
    }

    PlayerScreen(
        uiState = uiState,
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
        showLanguagePicker = showLanguagePicker,
        showSubtitlePicker = showSubtitlePicker,
        showSplitSubtitlePicker = showSplitSubtitlePicker,
        showOpenSubtitles = showOpenSubtitles,
        onShowLanguagePicker = { showLanguagePicker = true },
        onHideLanguagePicker = { showLanguagePicker = false },
        onShowSubtitlePicker = { showSubtitlePicker = true },
        onHideSubtitlePicker = { showSubtitlePicker = false },
        onToggleControls = viewModel::toggleControls,
        onPlayPause = viewModel::togglePlayPause,
        onSeek = viewModel::seekToFraction,
        onToggleAIPanel = viewModel::toggleAIPanel,
        onToggleSubtitles = viewModel::toggleLiveSubtitles,
        onToggleDubbing = viewModel::toggleLiveDubbing,
        onToggleTrivia = viewModel::toggleLiveTrivia,
        onSelectLanguage = viewModel::selectAILanguage,
        onSelectSubtitleLanguage = viewModel::selectSubtitleLanguage,
        onToggleSplitMode = {
            if (!extendedState.isSplitSubtitleMode) {
                showSplitSubtitlePicker = true
                showSubtitlePicker = false
            } else {
                viewModel.toggleSplitSubtitleMode()
            }
        },
        onShowOpenSubtitles = {
            showOpenSubtitles = true
            showSubtitlePicker = false
        },
        onHideSplitSubtitlePicker = { showSplitSubtitlePicker = false },
        onHideOpenSubtitles = { showOpenSubtitles = false },
        onSelectPrimaryLanguage = viewModel::selectPrimarySubtitleLanguage,
        onSelectSecondaryLanguage = viewModel::selectSecondarySubtitleLanguage,
        onSelectSplitLayout = viewModel::selectSplitSubtitleLayout,
        onFetchExternalSubtitles = viewModel::fetchExternalSubtitles,
        onSelectExternalSubtitle = viewModel::selectExternalSubtitle,
        onDismissTrivia = {
            viewModel.dismissTriviaFact()
            viewModel.dismissVodTrivia()
        },
        onTriviaFollowUp = {
            viewModel.requestTriviaFollowUp()
            viewModel.requestVodTriviaFollowUp()
        },
        onToggleVodTrivia = viewModel::toggleVodTrivia,
        onHideOmriOverlay = viewModel::hideOmriOverlay,
        onSkipBackward = viewModel::seekBackward,
        onSkipForward = viewModel::seekForward,
        onRestart = viewModel::restartContent,
        onVolumeChange = viewModel::setVolume,
        onSpeedChange = viewModel::setPlaybackSpeed,
        onInteract = viewModel::startVodInteraction,
        onPreviousInteraction = viewModel::navigateToPreviousInteraction,
        onNextInteraction = viewModel::navigateToNextInteraction,
        onDismissVodInteractionSheet = viewModel::dismissVodInteractionSheet,
        onStartDialogue = { character ->
            viewModel.dismissVodInteractionSheet()
            val profileId = extendedState.profileId ?: return@PlayerScreen
            val avatarId = extendedState.avatarId ?: return@PlayerScreen
            dialogueViewModel.startSession(
                contentId = contentId,
                profileId = profileId,
                avatarId = avatarId,
                character = character,
                timestamp = positionMs / 1000.0,
            )
        },
        onSendDialogueMessage = { text -> dialogueViewModel.sendMessage(text) },
        onDismissDialogue = { dialogueViewModel.endSession() },
        onDismissPauseAsk = {
            dialogueViewModel.resetPauseAsk()
            viewModel.dismissPauseAsk()
        },
        onSendPauseAskQuestion = dialogueViewModel::sendPauseAskMessage,
        onAdvancePauseAskPhase = dialogueViewModel::advancePauseAskPhase,
        onResetPauseAsk = dialogueViewModel::resetPauseAsk,
        onDismissMoment = viewModel::dismissMoment,
        pauseAskPhase = pauseAskPhase,
        pauseAskResponse = pauseAskResponse,
        dialogueIsActive = dialogueIsActive,
        dialogueCharacter = dialogueCharacter,
        dialogueExchanges = dialogueExchanges,
        dialogueIsSending = dialogueIsSending,
        dialoguePlacement = dialoguePlacement,
        showSleepTimerPicker = showSleepTimerPicker,
        onHideSleepTimerPicker = { showSleepTimerPicker = false },
        onStartSleepTimer = { minutes ->
            viewModel.startSleepTimer(minutes)
            showSleepTimerPicker = false
        },
        onExtendSleepTimer = viewModel::extendSleepTimer,
        onCancelSleepTimer = viewModel::cancelSleepTimer,
        onToggleFullscreen = viewModel::toggleFullscreen,
        onCastClick = viewModel::onCastClick,
        onDismissSubtitleBanner = viewModel::dismissSubtitleBanner,
        onSetHebrewMode = viewModel::setHebrewSubtitleMode,
        onSetEnglishMode = viewModel::setEnglishSubtitleMode,
        tooltipManager = viewModel.tooltipManager,
        isPlaying = playerState is PlayerState.Playing,
        onBack = {
            viewModel.saveProgress()
            onNavigateBack()
        },
        modifier = modifier,
    )
}
