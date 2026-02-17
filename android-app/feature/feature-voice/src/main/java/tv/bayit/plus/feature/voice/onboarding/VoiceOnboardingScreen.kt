package tv.bayit.plus.feature.voice.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val MIC_BUTTON_SIZE = 80.dp

@Composable
fun VoiceOnboardingRoute(
    onComplete: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: VoiceOnboardingViewModel = hiltViewModel(),
) {
    val currentStep by viewModel.currentStep.collectAsStateWithLifecycle()
    val isRecording by viewModel.isRecording.collectAsStateWithLifecycle()
    val isProcessing by viewModel.isProcessing.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val isCompleted by viewModel.isCompleted.collectAsStateWithLifecycle()

    LaunchedEffect(isCompleted) {
        if (isCompleted) {
            onComplete()
        }
    }

    VoiceOnboardingScreen(
        currentStep = currentStep,
        totalSteps = viewModel.getTotalSteps(),
        isRecording = isRecording,
        isProcessing = isProcessing,
        errorMessage = errorMessage,
        onStartRecording = viewModel::startRecording,
        onStopRecording = { viewModel.stopRecording(ByteArray(0)) },
        onNextStep = viewModel::nextStep,
        onPreviousStep = viewModel::previousStep,
        onComplete = viewModel::completeOnboarding,
        onDismissError = viewModel::dismissError,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun VoiceOnboardingScreen(
    currentStep: Int,
    totalSteps: Int,
    isRecording: Boolean,
    isProcessing: Boolean,
    errorMessage: String?,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    onNextStep: () -> Unit,
    onPreviousStep: () -> Unit,
    onComplete: () -> Unit,
    onDismissError: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("voiceOnboarding.title"))

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
                text = bayitString("voiceOnboarding.stepProgress", mapOf(
                    "step" to (currentStep + 1).toString(),
                    "total" to totalSteps.toString()
                )),
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.Colors.Text.muted,
            )

            Spacer(Modifier.height(DesignTokens.Spacing.md))

            when (currentStep) {
                0 -> WelcomeVoiceStep(isRecording, isProcessing, onStartRecording, onStopRecording)
                1 -> TrainingVoiceStep()
                2 -> CompletionVoiceStep()
            }

            Spacer(Modifier.weight(1f))

            errorMessage?.let {
                Text(
                    text = it,
                    color = DesignTokens.Colors.Semantic.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            if (!isProcessing && currentStep > 0) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    GlassButton(
                        text = bayitString("voiceOnboarding.buttons.back"),
                        onClick = onPreviousStep,
                        isPrimary = false,
                        modifier = Modifier.weight(1f),
                    )
                    GlassButton(
                        text = bayitString(
                            if (currentStep == totalSteps - 1) "voiceOnboarding.buttons.finish"
                            else "voiceOnboarding.buttons.next"
                        ),
                        onClick = if (currentStep == totalSteps - 1) onComplete else onNextStep,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun WelcomeVoiceStep(
    isRecording: Boolean,
    isProcessing: Boolean,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                Text(
                    text = bayitString("voiceOnboarding.welcome.title"),
                    style = MaterialTheme.typography.titleLarge,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = bayitString("voiceOnboarding.welcome.description"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                    textAlign = TextAlign.Center,
                )
            }
        }

        if (isProcessing) {
            GlassSpinner(size = SpinnerSize.LARGE)
        } else {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                androidx.compose.foundation.layout.Box(
                    modifier = Modifier
                        .size(MIC_BUTTON_SIZE)
                        .glassMorphism(
                            cornerRadius = DesignTokens.Radius.full,
                            backgroundColor = if (isRecording) DesignTokens.Colors.Semantic.error
                            else DesignTokens.Colors.Primary.base,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = bayitString(
                            if (isRecording) "voiceOnboarding.recording.recButton"
                            else "voiceOnboarding.recording.micButton"
                        ),
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Text(
                    text = bayitString(
                        if (isRecording) "voiceOnboarding.recording.tapToStop"
                        else "voiceOnboarding.recording.tapToStart"
                    ),
                    color = DesignTokens.Colors.Text.secondary,
                    style = MaterialTheme.typography.bodyMedium,
                )
                GlassButton(
                    text = bayitString(
                        if (isRecording) "voiceOnboarding.recording.stopButton"
                        else "voiceOnboarding.recording.recordButton"
                    ),
                    onClick = if (isRecording) onStopRecording else onStartRecording,
                )
            }
        }
    }
}

@Composable
private fun TrainingVoiceStep() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = bayitString("voiceOnboarding.training.title"),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = bayitString("voiceOnboarding.training.message"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            GlassSpinner(size = SpinnerSize.MEDIUM)
        }
    }
}

@Composable
private fun CompletionVoiceStep() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = bayitString("voiceOnboarding.completion.title"),
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            Text(
                text = bayitString("voiceOnboarding.completion.message"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
                textAlign = TextAlign.Center,
            )
        }
    }
}
