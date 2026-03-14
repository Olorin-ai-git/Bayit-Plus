package tv.bayit.plus.feature.player

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.SleepTimerBanner
import tv.bayit.plus.designsystem.component.SleepTimerPickerSheet
import tv.bayit.plus.feature.onboarding.TooltipManager
import tv.bayit.plus.feature.player.dialogue.AvatarDialogueOverlay
import tv.bayit.plus.feature.player.dialogue.CharacterSelectionSheet
import tv.bayit.plus.feature.player.dialogue.ContentCharacter
import tv.bayit.plus.feature.player.dialogue.DialogueExchange
import tv.bayit.plus.feature.player.dialogue.AvatarPlacement
import tv.bayit.plus.feature.player.dialogue.InteractiveMomentOverlay
import tv.bayit.plus.feature.player.dialogue.PauseAskDialogueOverlay
import tv.bayit.plus.feature.player.dialogue.PauseAskPhase
import tv.bayit.plus.feature.player.dialogue.PauseAskResponse

/**
 * Dialogue, moment, and sleep-timer overlays rendered on top of the video surface.
 *
 * All positioned overlays receive pre-resolved [Modifier]s so this composable
 * remains independent of the parent [BoxScope].
 */
@Composable
internal fun PlayerScreenDialogueOverlays(
    state: PlayerUiState.Ready,
    extendedState: PlayerExtendedState,
    dialogueIsActive: Boolean,
    dialogueCharacter: ContentCharacter?,
    dialogueExchanges: List<DialogueExchange>,
    dialogueIsSending: Boolean,
    dialoguePlacement: AvatarPlacement?,
    pauseAskPhase: PauseAskPhase,
    pauseAskResponse: PauseAskResponse?,
    pauseAskError: String? = null,
    showSleepTimerPicker: Boolean,
    momentModifier: Modifier,
    sleepTimerBannerModifier: Modifier,
    onStartDialogue: ((ContentCharacter) -> Unit)?,
    onSendDialogueMessage: ((String) -> Unit)?,
    onDismissDialogue: (() -> Unit)?,
    onDismissVodInteractionSheet: (() -> Unit)?,
    onSendPauseAskQuestion: ((String) -> Unit)?,
    onAdvancePauseAskPhase: ((PauseAskPhase) -> Unit)?,
    onResetPauseAsk: (() -> Unit)?,
    onDismissPauseAsk: (() -> Unit)?,
    onDismissMoment: (() -> Unit)?,
    onExtendSleepTimer: (Int) -> Unit,
    onCancelSleepTimer: () -> Unit,
    onStartSleepTimer: (Int) -> Unit,
    onHideSleepTimerPicker: () -> Unit,
    tooltipManager: TooltipManager? = null,
    isPlaying: Boolean = false,
) {
    if (tooltipManager != null) {
        LiveDubbingTooltipOverlay(
            tooltipManager = tooltipManager,
            isLiveContent = state.isLiveContent,
        )
        VodPauseAskTooltipOverlay(
            tooltipManager = tooltipManager,
            isPlaying = isPlaying,
            isLiveContent = state.isLiveContent,
        )
    }
    if (extendedState.showVodInteractionSheet) {
        CharacterSelectionSheet(
            characters = extendedState.vodInteractionCharacters,
            onCharacterSelected = { character -> onStartDialogue?.invoke(character) },
            onDismiss = { onDismissVodInteractionSheet?.invoke() },
        )
    }

    AvatarDialogueOverlay(
        isActive = dialogueIsActive && !extendedState.showPauseAskOverlay,
        selectedCharacter = dialogueCharacter,
        avatarUrl = extendedState.avatarImageUrl,
        exchanges = dialogueExchanges,
        isSending = dialogueIsSending,
        mainPlayer = state.exoPlayer,
        avatarPlacement = dialoguePlacement,
        onSendMessage = { text -> onSendDialogueMessage?.invoke(text) },
        onClose = { onDismissDialogue?.invoke() },
    )

    PauseAskDialogueOverlay(
        isVisible = extendedState.showPauseAskOverlay,
        phase = pauseAskPhase,
        characters = extendedState.vodInteractionCharacters,
        selectedCharacter = dialogueCharacter,
        pauseAskResponse = pauseAskResponse,
        errorMessage = pauseAskError,
        onCharacterSelected = { character ->
            onStartDialogue?.invoke(character)
            onAdvancePauseAskPhase?.invoke(PauseAskPhase.INPUT)
        },
        onSendQuestion = { text -> onSendPauseAskQuestion?.invoke(text) },
        onPhaseAdvance = { phase -> onAdvancePauseAskPhase?.invoke(phase) },
        onResetPauseAsk = { onResetPauseAsk?.invoke() },
        onDismiss = { onDismissPauseAsk?.invoke() },
        onResumePlayback = { state.exoPlayer?.play() },
        onPausePlayback = { state.exoPlayer?.pause() },
    )

    InteractiveMomentOverlay(
        moment = extendedState.activeMoment,
        mainPlayer = state.exoPlayer,
        avatarImageUrl = extendedState.avatarImageUrl,
        onDismiss = { onDismissMoment?.invoke() },
        modifier = momentModifier,
    )

    if (!state.isLiveContent) {
        SleepTimerBanner(
            isVisible = extendedState.isSleepTimerActive,
            remainingSeconds = extendedState.sleepTimerRemainingSeconds,
            onExtend = onExtendSleepTimer,
            onCancel = onCancelSleepTimer,
            modifier = sleepTimerBannerModifier,
        )
    }

    if (showSleepTimerPicker) {
        SleepTimerPickerSheet(
            activeDurationMinutes = extendedState.sleepTimerDurationMinutes,
            onSelect = onStartSleepTimer,
            onCancel = onHideSleepTimerPicker,
        )
    }
}
