package tv.bayit.plus.feature.missions.interactive

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import tv.bayit.plus.core.model.InteractiveMissionDetail
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassProgressBar
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun InteractiveMissionRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: InteractiveMissionViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    InteractiveMissionScreen(
        uiState = uiState,
        onSubmitStep = viewModel::submitStep,
        onAbandon = {
            viewModel.abandon()
            onNavigateBack()
        },
        onRetry = viewModel::retry,
        onFinish = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun InteractiveMissionScreen(
    uiState: InteractiveMissionUiState,
    onSubmitStep: () -> Unit,
    onAbandon: () -> Unit,
    onRetry: () -> Unit,
    onFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is InteractiveMissionUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is InteractiveMissionUiState.InProgress -> InProgressSection(
            uiState = uiState,
            onSubmitStep = onSubmitStep,
            onAbandon = onAbandon,
            modifier = modifier,
        )
        is InteractiveMissionUiState.Completed -> CompletedSection(
            mission = uiState.mission,
            onFinish = onFinish,
            modifier = modifier,
        )
        is InteractiveMissionUiState.Error -> MissionErrorSection(
            message = uiState.message,
            onRetry = onRetry,
            modifier = modifier,
        )
    }
}

@Composable
private fun InProgressSection(
    uiState: InteractiveMissionUiState.InProgress,
    onSubmitStep: () -> Unit,
    onAbandon: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val mission = uiState.mission
    val currentStep = mission.steps.getOrNull(uiState.currentStepIndex)
    val totalSteps = mission.steps.size
    val progress = if (totalSteps > 0) (uiState.currentStepIndex + 1).toFloat() / totalSteps.toFloat() else 0f

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        MissionHeader(title = mission.title, stepNumber = uiState.currentStepIndex + 1, totalSteps = totalSteps)
        GlassProgressBar(progress = progress)
        currentStep?.let { step -> StepCard(step = step) }
        Spacer(modifier = Modifier.weight(1f))
        if (uiState.isSubmitting) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                GlassSpinner(size = SpinnerSize.MEDIUM)
            }
        } else {
            GlassButton(text = "Submit Step", onClick = onSubmitStep, modifier = Modifier.fillMaxWidth())
        }
        GlassButton(text = "Abandon Mission", onClick = onAbandon, isPrimary = false, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun CompletedSection(
    mission: InteractiveMissionDetail,
    onFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.base),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            GlassCard {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = "Mission Complete",
                        style = MaterialTheme.typography.headlineMedium,
                        color = DesignTokens.Colors.Semantic.success,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
                    Text(
                        text = mission.title,
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                    Text(
                        text = "${mission.totalSteps} steps completed",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                }
            }
            GlassButton(text = "Done", onClick = onFinish, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun MissionErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
