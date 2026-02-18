package tv.bayit.plus.feature.voice.commands

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import tv.bayit.plus.core.voice.VoiceState
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val ICON_SIZE = 24
private const val DISMISS_DELAY_MS = 1500L
private const val PULSE_MS = 1200
private const val CONFIDENCE_BAR_HEIGHT = 4

@Composable
fun VoiceCommandOverlay(
    onDismiss: () -> Unit,
    onPlaybackAction: (String, Map<String, String>) -> Unit,
    onNavigationAction: (String, Map<String, String>) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: VoiceCommandViewModel = hiltViewModel(),
) {
    val voiceState by viewModel.voiceState.collectAsStateWithLifecycle()
    val recognizedCommand by viewModel.recognizedCommand.collectAsStateWithLifecycle()
    val confidence by viewModel.commandConfidence.collectAsStateWithLifecycle()
    val lastExecuted by viewModel.lastExecutedAction.collectAsStateWithLifecycle()
    val transcript by viewModel.transcript.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.onPlaybackAction = onPlaybackAction
        viewModel.onNavigationAction = onNavigationAction
    }

    LaunchedEffect(lastExecuted) {
        if (lastExecuted != null) { delay(DISMISS_DELAY_MS); onDismiss() }
    }

    val isVisible = voiceState == VoiceState.LISTENING ||
        voiceState == VoiceState.PROCESSING || lastExecuted != null

    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically { -it } + fadeIn(),
        exit = slideOutVertically { -it } + fadeOut(),
        modifier = modifier,
    ) {
        GlassCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.sm),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                StateIndicatorRow(voiceState, lastExecuted)
                if (transcript.isNotBlank()) {
                    Text(transcript, color = DesignTokens.Colors.Text.secondary, fontSize = DesignTokens.FontSize.sm, maxLines = 2)
                }
                if (recognizedCommand != null && confidence != null) {
                    CommandMatchDisplay(recognizedCommand, confidence, lastExecuted != null) { viewModel.executeCurrentCommand() }
                } else if (voiceState == VoiceState.LISTENING) {
                    Text(bayitString("voiceCommand.noMatch"), color = DesignTokens.Colors.Text.muted, fontSize = DesignTokens.FontSize.sm)
                }
            }
        }
    }
}

@Composable
private fun StateIndicatorRow(voiceState: VoiceState, lastExecuted: String?) {
    val transition = rememberInfiniteTransition(label = "voiceCommandPulse")
    val isAnimating = voiceState == VoiceState.LISTENING || voiceState == VoiceState.PROCESSING
    val pulseAlpha by transition.animateFloat(
        initialValue = 0.7f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(tween(PULSE_MS), RepeatMode.Reverse),
        label = "stateAlpha",
    )
    val pulseScale by transition.animateFloat(
        initialValue = 1.0f, targetValue = 1.15f,
        animationSpec = infiniteRepeatable(tween(PULSE_MS), RepeatMode.Reverse),
        label = "stateScale",
    )
    val iconMod = if (isAnimating) Modifier.size(ICON_SIZE.dp).scale(pulseScale).alpha(pulseAlpha)
    else Modifier.size(ICON_SIZE.dp)

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        when {
            lastExecuted != null -> Icon(Icons.Default.Check, null, iconMod, DesignTokens.Colors.Semantic.success)
            voiceState == VoiceState.PROCESSING -> Icon(Icons.Default.Settings, null, iconMod, DesignTokens.Colors.Primary.light)
            else -> Icon(Icons.Default.Mic, null, iconMod, DesignTokens.Colors.Primary.base)
        }
        Text(
            text = when {
                lastExecuted != null -> bayitString("voiceCommand.executing")
                voiceState == VoiceState.PROCESSING -> bayitString("voiceCommand.recognized")
                else -> bayitString("voiceCommand.listening")
            },
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun CommandMatchDisplay(
    command: String?,
    confidence: Float?,
    isExecuted: Boolean,
    onExecute: () -> Unit,
) {
    if (command == null || confidence == null) return

    LaunchedEffect(command) { if (!isExecuted) onExecute() }

    val accentColor = if (isExecuted) DesignTokens.Colors.Semantic.success else DesignTokens.Colors.Primary.light

    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(command, color = accentColor, fontSize = DesignTokens.FontSize.md, fontWeight = FontWeight.Bold)
            if (isExecuted) {
                Spacer(Modifier.width(DesignTokens.Spacing.sm))
                Icon(Icons.Default.Check, null, Modifier.size(DesignTokens.Spacing.base), DesignTokens.Colors.Semantic.success)
            }
        }
        Box(Modifier.fillMaxWidth().height(CONFIDENCE_BAR_HEIGHT.dp).clip(RoundedCornerShape(DesignTokens.Radius.sm))) {
            LinearProgressIndicator(
                progress = { confidence },
                modifier = Modifier.fillMaxWidth(),
                color = if (isExecuted) DesignTokens.Colors.Semantic.success else DesignTokens.Colors.Primary.base,
                trackColor = DesignTokens.Colors.Glass.bgMedium,
            )
        }
    }
}
