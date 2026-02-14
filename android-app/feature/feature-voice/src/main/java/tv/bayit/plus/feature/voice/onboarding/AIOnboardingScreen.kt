package tv.bayit.plus.feature.voice.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun AIOnboardingRoute(
    onComplete: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AIOnboardingViewModel = hiltViewModel(),
) {
    val currentStep by viewModel.currentStep.collectAsStateWithLifecycle()
    val isProcessing by viewModel.isProcessing.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()

    AIOnboardingScreen(
        currentStep = currentStep,
        totalSteps = viewModel.getTotalSteps(),
        isProcessing = isProcessing,
        errorMessage = errorMessage,
        onNextStep = viewModel::nextStep,
        onPreviousStep = viewModel::previousStep,
        onComplete = {
            viewModel.completeOnboarding()
            onComplete()
        },
        onDismissError = viewModel::dismissError,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun AIOnboardingScreen(
    currentStep: Int,
    totalSteps: Int,
    isProcessing: Boolean,
    errorMessage: String?,
    onNextStep: () -> Unit,
    onPreviousStep: () -> Unit,
    onComplete: () -> Unit,
    onDismissError: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "AI Assistant Setup")

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
        ) {
            LinearProgressIndicator(
                progress = { (currentStep + 1) / totalSteps.toFloat() },
                modifier = Modifier.fillMaxWidth(),
                color = DesignTokens.Colors.Primary.base,
            )

            Text(
                text = "Step ${currentStep + 1} of $totalSteps",
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.Colors.Text.muted,
            )

            Spacer(Modifier.height(DesignTokens.Spacing.md))

            when (currentStep) {
                0 -> WelcomeStep()
                1 -> PermissionsStep()
                2 -> PersonalizationStep()
                3 -> CompletionStep()
            }

            Spacer(Modifier.weight(1f))

            errorMessage?.let {
                Text(
                    text = it,
                    color = DesignTokens.Colors.Semantic.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            if (isProcessing) {
                GlassSpinner(size = SpinnerSize.MEDIUM, modifier = Modifier.align(Alignment.CenterHorizontally))
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    if (currentStep > 0) {
                        GlassButton(
                            text = "Back",
                            onClick = onPreviousStep,
                            isPrimary = false,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    GlassButton(
                        text = if (currentStep == totalSteps - 1) "Finish" else "Next",
                        onClick = if (currentStep == totalSteps - 1) onComplete else onNextStep,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun WelcomeStep() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = "Welcome to AI Assistant",
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "Your AI companion for semantic search, chatbot assistance, and intelligent recommendations.",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun PermissionsStep() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(
                text = "Permissions",
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "The AI Assistant needs access to:\n\n• Your viewing history (for personalized recommendations)\n• Search queries (to improve results)\n• Preferences (to tailor responses)",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun PersonalizationStep() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(
                text = "Personalization",
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "The AI will learn from your interactions to provide:\n\n• Better content recommendations\n• More accurate search results\n• Contextual chatbot responses",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun CompletionStep() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = "All Set!",
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "Your AI Assistant is ready to help you discover and enjoy content.",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
                textAlign = TextAlign.Center,
            )
        }
    }
}
