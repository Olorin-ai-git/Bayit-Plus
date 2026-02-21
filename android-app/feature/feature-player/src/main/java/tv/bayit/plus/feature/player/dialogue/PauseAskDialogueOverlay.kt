package tv.bayit.plus.feature.player.dialogue

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Root composable and phase router for the Pause-to-Ask dialogue flow.
 *
 * Renders a full-screen scrim with animated visibility and dispatches to
 * the appropriate sub-composable based on the current [PauseAskPhase].
 * Matches the iOS `PauseAskDialogueOverlayView` for feature parity.
 */
@Composable
fun PauseAskDialogueOverlay(
    isVisible: Boolean,
    phase: PauseAskPhase,
    characters: List<ContentCharacter>,
    selectedCharacter: ContentCharacter?,
    pauseAskResponse: PauseAskResponse?,
    onCharacterSelected: (ContentCharacter) -> Unit,
    onSendQuestion: (String) -> Unit,
    onPhaseAdvance: (PauseAskPhase) -> Unit,
    onResetPauseAsk: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(DesignTokens.Colors.Background.primary.copy(alpha = SCRIM_ALPHA)),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.lg,
                        backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                    )
                    .padding(DesignTokens.Spacing.base),
            ) {
                when (phase) {
                    PauseAskPhase.SELECTING -> PauseAskCharacterSelection(
                        characters = characters,
                        onCharacterSelected = onCharacterSelected,
                        onResume = onDismiss,
                    )

                    PauseAskPhase.INPUT -> {
                        selectedCharacter?.let {
                            PauseAskInputPanel(
                                characterName = it.name,
                                onSend = onSendQuestion,
                            )
                        }
                    }

                    PauseAskPhase.POLISHING -> PolishingContent()

                    PauseAskPhase.USER_SPEAKING,
                    PauseAskPhase.TRANSITION,
                    PauseAskPhase.CHARACTER_SPEAKING -> {
                        pauseAskResponse?.let {
                            PauseAskVideoPhase(
                                phase = phase,
                                response = it,
                                onPhaseAdvance = onPhaseAdvance,
                            )
                        }
                    }

                    PauseAskPhase.IDLE -> IdleContent(
                        onAskAgain = {
                            onResetPauseAsk()
                            onPhaseAdvance(PauseAskPhase.SELECTING)
                        },
                        onResume = onDismiss,
                    )
                }
            }
        }
    }
}

@Composable
private fun PolishingContent() {
    Column(
        modifier = Modifier.padding(DesignTokens.Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        GlassSpinner(size = SpinnerSize.LARGE)

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Text(
            text = bayitString("player.pauseAsk.processing"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.md,
        )
    }
}

@Composable
private fun IdleContent(onAskAgain: () -> Unit, onResume: () -> Unit) {
    Column(
        modifier = Modifier.padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = bayitString("player.pauseAsk.title"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            GlassButton(
                text = bayitString("player.pauseAsk.askAgain"),
                onClick = onAskAgain,
                isPrimary = true,
            )
            GlassButton(
                text = bayitString("player.pauseAsk.resume"),
                onClick = onResume,
                isPrimary = false,
            )
        }
    }
}

private const val SCRIM_ALPHA = 0.7f
