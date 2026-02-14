package tv.bayit.plus.feature.zehani.avatar

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val AVATAR_VIEWPORT_SIZE = 320.dp

@Composable
fun Avatar3DRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: Avatar3DViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    Avatar3DScreen(
        uiState = uiState,
        onRotate = viewModel::rotate,
        onZoom = viewModel::zoom,
        onToggleAnimation = viewModel::toggleAnimation,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun Avatar3DScreen(
    uiState: Avatar3DUiState,
    onRotate: (Float, Float) -> Unit,
    onZoom: (Float) -> Unit,
    onToggleAnimation: () -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "3D Avatar")
        when (uiState) {
            is Avatar3DUiState.Loading -> GlassLoadingIndicator()
            is Avatar3DUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
            is Avatar3DUiState.Success -> Avatar3DContent(
                state = uiState,
                onRotate = onRotate,
                onZoom = onZoom,
                onToggleAnimation = onToggleAnimation,
            )
        }
    }
}

@Composable
private fun Avatar3DContent(
    state: Avatar3DUiState.Success,
    onRotate: (Float, Float) -> Unit,
    onZoom: (Float) -> Unit,
    onToggleAnimation: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
    ) {
        var dragX by remember { mutableStateOf(0f) }
        var dragY by remember { mutableStateOf(0f) }

        Box(
            modifier = Modifier
                .size(AVATAR_VIEWPORT_SIZE)
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.lg,
                    backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                )
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        dragX += dragAmount.x
                        dragY += dragAmount.y
                        onRotate(dragY / 2f, dragX / 2f)
                    }
                }
                .pointerInput(Unit) {
                    detectTapGestures(
                        onDoubleTap = { onZoom(if (state.zoomLevel > 1f) 1f else 1.5f) },
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "3D Avatar\nRotate: Drag\nZoom: Double-tap",
                color = DesignTokens.Colors.Text.muted,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                Text(
                    text = "Controls",
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    GlassButton(
                        text = if (state.isAnimating) "Pause" else "Animate",
                        onClick = onToggleAnimation,
                        modifier = Modifier.weight(1f),
                    )
                    GlassButton(
                        text = "Reset",
                        onClick = { onRotate(0f, 0f); onZoom(1f) },
                        isPrimary = false,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                InfoRow("Rotation X", "${state.rotationX.toInt()}°")
                InfoRow("Rotation Y", "${state.rotationY.toInt()}°")
                InfoRow("Zoom", "${(state.zoomLevel * 100).toInt()}%")
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text = label, color = DesignTokens.Colors.Text.secondary, fontSize = DesignTokens.FontSize.sm)
        Text(text = value, color = DesignTokens.Colors.Text.primary, fontSize = DesignTokens.FontSize.sm, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodyLarge)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
