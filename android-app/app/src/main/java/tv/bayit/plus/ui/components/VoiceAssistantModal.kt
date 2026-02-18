package tv.bayit.plus.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.voice.VoiceState
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.voice.chatbot.ChatbotRoute
import tv.bayit.plus.ui.viewmodel.VoiceAssistantViewModel

@Composable
fun VoiceAssistantModal(
    onDismiss: () -> Unit,
    onNavigateToOnboarding: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: VoiceAssistantViewModel = hiltViewModel(),
) {
    val isOnboardingComplete by viewModel.isOnboardingComplete.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val voiceState by viewModel.voiceState.collectAsStateWithLifecycle()
    val transcript by viewModel.transcript.collectAsStateWithLifecycle()
    val responseText by viewModel.responseText.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.refreshOnboardingStatus() }
    DisposableEffect(Unit) { onDispose { viewModel.interrupt() } }

    GlassModal(onDismissRequest = onDismiss, modifier = modifier) {
        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxWidth().height(400.dp),
                    contentAlignment = Alignment.Center,
                ) { GlassLoadingIndicator() }
            }
            !isOnboardingComplete -> {
                OnboardingPrompt(
                    onStartOnboarding = { onDismiss(); onNavigateToOnboarding() },
                    onDismiss = onDismiss,
                )
            }
            else -> {
                VoiceAssistantContent(
                    voiceState = voiceState,
                    transcript = transcript,
                    responseText = responseText,
                    onStartListening = { viewModel.startListening() },
                    onCommit = { viewModel.commitTranscript() },
                    onInterrupt = { viewModel.interrupt() },
                    onNavigateBack = onDismiss,
                )
            }
        }
    }
}

@Composable
private fun VoiceAssistantContent(
    voiceState: VoiceState,
    transcript: String,
    responseText: String,
    onStartListening: () -> Unit,
    onCommit: () -> Unit,
    onInterrupt: () -> Unit,
    onNavigateBack: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth().fillMaxHeight(0.8f).padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString("voiceAssistant.modal.title"),
            style = MaterialTheme.typography.titleLarge,
            color = DesignTokens.Colors.Text.primary,
        )
        Spacer(Modifier.weight(1f))
        if (responseText.isNotBlank()) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Text(text = responseText, color = DesignTokens.Colors.Text.primary)
            }
        }
        if (transcript.isNotBlank() && voiceState == VoiceState.LISTENING) {
            Text(text = transcript, color = DesignTokens.Colors.Text.secondary)
        }
        Text(
            text = bayitString(voiceStateLabel(voiceState)),
            color = DesignTokens.Colors.Text.muted,
        )
        Box(
            modifier = Modifier.size(80.dp).clip(CircleShape).glassMorphism(
                cornerRadius = DesignTokens.Radius.full,
                backgroundColor = when (voiceState) {
                    VoiceState.LISTENING -> DesignTokens.Colors.Semantic.error
                    VoiceState.PROCESSING -> DesignTokens.Colors.Primary.light
                    VoiceState.SPEAKING -> DesignTokens.Colors.Primary.dark
                    else -> DesignTokens.Colors.Primary.base
                },
            ).clickable {
                when (voiceState) {
                    VoiceState.IDLE, VoiceState.ERROR -> onStartListening()
                    VoiceState.LISTENING -> onCommit()
                    else -> onInterrupt()
                }
            },
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = if (voiceState == VoiceState.LISTENING) Icons.Default.Stop else Icons.Default.Mic,
                contentDescription = bayitString("voiceAssistant.fabLabel"),
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(36.dp),
            )
        }
        Spacer(Modifier.weight(1f))
    }
}

private fun voiceStateLabel(state: VoiceState): String = when (state) {
    VoiceState.IDLE -> "voiceAssistant.state.idle"
    VoiceState.LISTENING -> "voiceAssistant.state.listening"
    VoiceState.PROCESSING -> "voiceAssistant.state.processing"
    VoiceState.SPEAKING -> "voiceAssistant.state.speaking"
    VoiceState.ERROR -> "voiceAssistant.state.error"
}

@Composable
private fun OnboardingPrompt(
    onStartOnboarding: () -> Unit,
    onDismiss: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString("voiceAssistant.modal.setupRequired"),
            style = MaterialTheme.typography.titleLarge,
            color = DesignTokens.Colors.Text.primary,
        )
        Text(
            text = bayitString("voiceAssistant.modal.setupMessage"),
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Text.secondary,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))
        GlassButton(
            text = bayitString("voiceAssistant.modal.startSetup"),
            onClick = onStartOnboarding,
            modifier = Modifier.fillMaxWidth()
        )
        GlassButton(
            text = bayitString("voiceAssistant.modal.cancel"),
            onClick = onDismiss,
            isPrimary = false,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
