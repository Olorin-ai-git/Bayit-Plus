package tv.bayit.plus.feature.zehani.mirror

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val CAMERA_PREVIEW_SIZE = 240.dp

@Composable
fun MagicMirrorRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MagicMirrorViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    MagicMirrorScreen(
        uiState = uiState,
        onCapturePhoto = viewModel::identifyFromCapture,
        onResetCamera = viewModel::resetToCamera,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun MagicMirrorScreen(
    uiState: MagicMirrorUiState,
    onCapturePhoto: (ByteArray) -> Unit,
    onResetCamera: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Magic Mirror")
        when (uiState) {
            is MagicMirrorUiState.CameraReady -> CameraPreviewSection(
                onCapturePhoto = onCapturePhoto,
            )
            is MagicMirrorUiState.Processing -> ProcessingSection()
            is MagicMirrorUiState.ResultReady -> ResultSection(
                result = uiState.identificationResult,
                onReset = onResetCamera,
            )
            is MagicMirrorUiState.PersonDetail -> PersonDetailSection(
                person = uiState.person,
                onReset = onResetCamera,
            )
            is MagicMirrorUiState.Error -> ErrorSection(
                message = uiState.message,
                onRetry = onResetCamera,
            )
        }
    }
}

@Composable
private fun CameraPreviewSection(onCapturePhoto: (ByteArray) -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
    ) {
        Text(
            text = "Point the camera at a face to identify the person",
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Text.secondary,
            textAlign = TextAlign.Center,
        )
        Box(
            modifier = Modifier
                .size(CAMERA_PREVIEW_SIZE)
                .clip(CircleShape)
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.full,
                    backgroundColor = DesignTokens.Colors.Glass.bgMedium,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "Camera Preview",
                color = DesignTokens.Colors.Text.muted,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(text = "Capture", onClick = { onCapturePhoto(ByteArray(0)) })
    }
}

@Composable
private fun ProcessingSection() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            GlassLoadingIndicator()
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(
                text = "Analyzing face...",
                color = DesignTokens.Colors.Text.secondary,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Composable
private fun ResultSection(result: Any, onReset: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                Text(
                    text = "Identification Result",
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = result.toString(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
        }
        GlassButton(text = "Scan Again", onClick = onReset)
    }
}

@Composable
private fun PersonDetailSection(person: Any, onReset: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                Text(
                    text = "Person Details",
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = person.toString(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
        }
        GlassButton(text = "New Scan", onClick = onReset)
    }
}

@Composable
private fun ErrorSection(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = "Try Again", onClick = onRetry)
        }
    }
}
