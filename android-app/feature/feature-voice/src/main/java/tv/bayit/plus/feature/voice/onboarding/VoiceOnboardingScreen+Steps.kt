package tv.bayit.plus.feature.voice.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun WelcomeVoiceStep(
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
                            else "voiceOnboarding.recording.micButton",
                        ),
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Text(
                    text = bayitString(
                        if (isRecording) "voiceOnboarding.recording.tapToStop"
                        else "voiceOnboarding.recording.tapToStart",
                    ),
                    color = DesignTokens.Colors.Text.secondary,
                    style = MaterialTheme.typography.bodyMedium,
                )
                GlassButton(
                    text = bayitString(
                        if (isRecording) "voiceOnboarding.recording.stopButton"
                        else "voiceOnboarding.recording.recordButton",
                    ),
                    onClick = if (isRecording) onStopRecording else onStartRecording,
                )
            }
        }
    }
}

@Composable
internal fun TrainingVoiceStep() {
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
internal fun CompletionVoiceStep() {
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
