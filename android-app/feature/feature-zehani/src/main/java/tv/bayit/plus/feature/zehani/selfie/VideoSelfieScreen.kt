package tv.bayit.plus.feature.zehani.selfie

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

private val CAMERA_PREVIEW_HEIGHT = 400.dp

@Composable
fun VideoSelfieRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: VideoSelfieViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val recordingDuration by viewModel.recordingDuration.collectAsStateWithLifecycle()
    val pinInput by viewModel.pinInput.collectAsStateWithLifecycle()

    VideoSelfieScreen(
        uiState = uiState,
        recordingDuration = recordingDuration,
        pinInput = pinInput,
        onStartRecording = viewModel::startRecording,
        onStopRecording = viewModel::stopRecording,
        onUpdatePin = viewModel::updatePin,
        onConfirmWithPin = viewModel::confirmWithPin,
        onRetake = viewModel::retake,
        onRetry = viewModel::retry,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun VideoSelfieScreen(
    uiState: VideoSelfieUiState,
    recordingDuration: Long,
    pinInput: String,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    onUpdatePin: (String) -> Unit,
    onConfirmWithPin: () -> Unit,
    onRetake: () -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Video Selfie",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        Column(
            modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            when (uiState) {
                is VideoSelfieUiState.Ready -> ReadyContent(onStartRecording = onStartRecording)
                is VideoSelfieUiState.Recording -> RecordingContent(duration = recordingDuration, onStopRecording = onStopRecording)
                is VideoSelfieUiState.PinEntry -> PinEntryContent(pinInput = pinInput, onUpdatePin = onUpdatePin, onConfirm = onConfirmWithPin, onRetake = onRetake)
                is VideoSelfieUiState.Processing -> ProcessingContent()
                is VideoSelfieUiState.Complete -> CompleteContent(resultUrl = uiState.resultUrl, onRetake = onRetake)
                is VideoSelfieUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
            }
        }
    }
}

@Composable
private fun ReadyContent(onStartRecording: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Box(modifier = Modifier.fillMaxWidth().height(CAMERA_PREVIEW_HEIGHT), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "Camera", style = MaterialTheme.typography.displayLarge, color = DesignTokens.Colors.Text.muted)
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    Text(text = "Camera Preview", style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Text.secondary)
                }
            }
            GlassButton(text = "Start Recording", onClick = onStartRecording, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun RecordingContent(duration: Long, onStopRecording: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                Box(modifier = Modifier.size(16.dp))
                Text(text = "REC ${formatDuration(duration)}", style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Semantic.error, fontWeight = FontWeight.Bold)
            }
            Box(modifier = Modifier.fillMaxWidth().height(CAMERA_PREVIEW_HEIGHT))
            GlassButton(text = "Stop Recording", onClick = onStopRecording, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun PinEntryContent(pinInput: String, onUpdatePin: (String) -> Unit, onConfirm: () -> Unit, onRetake: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = "Enter your PIN to create avatar", style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
            GlassTextField(
                value = pinInput,
                onValueChange = onUpdatePin,
                label = "PIN",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                visualTransformation = PasswordVisualTransformation(),
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                GlassButton(text = "Retake", onClick = onRetake, isPrimary = false, modifier = Modifier.weight(1f))
                GlassButton(text = "Confirm", onClick = onConfirm, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun ProcessingContent() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            GlassLoadingIndicator()
            Text(text = "Creating your avatar...", style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Text.secondary)
        }
    }
}

@Composable
private fun CompleteContent(resultUrl: String, onRetake: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            if (resultUrl.isNotBlank()) {
                CachedAsyncImage(url = resultUrl, contentDescription = "Avatar Preview", modifier = Modifier.fillMaxWidth().height(CAMERA_PREVIEW_HEIGHT))
            } else {
                Text(text = "Avatar created successfully", style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.success)
            }
            GlassButton(text = "Create Another", onClick = onRetake, isPrimary = false, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
        Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
        GlassButton(text = "Retry", onClick = onRetry)
    }
}

private fun formatDuration(seconds: Long): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return String.format("%02d:%02d", mins, secs)
}
