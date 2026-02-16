package tv.bayit.plus.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassModal
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

    LaunchedEffect(Unit) {
        viewModel.refreshOnboardingStatus()
    }

    GlassModal(
        onDismissRequest = onDismiss,
        modifier = modifier,
    ) {
        when {
            isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(400.dp),
                    contentAlignment = Alignment.Center
                ) {
                    GlassLoadingIndicator()
                }
            }
            !isOnboardingComplete -> {
                OnboardingPrompt(
                    onStartOnboarding = {
                        onDismiss()
                        onNavigateToOnboarding()
                    },
                    onDismiss = onDismiss
                )
            }
            else -> {
                ChatbotRoute(
                    onNavigateBack = onDismiss,
                    modifier = Modifier.fillMaxHeight(0.8f)
                )
            }
        }
    }
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
