package tv.bayit.plus.feature.zehani.avatar

import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import tv.bayit.plus.core.model.zehani.AvatarMesh
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
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "GLB Mesh Viewer",
                    color = DesignTokens.Colors.Text.muted,
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text = "Status: ${state.mesh.status}",
                    color = DesignTokens.Colors.Text.secondary,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        MeshInfoCard(mesh = state.mesh)

        ControlsCard(
            state = state,
            onRotate = onRotate,
            onZoom = onZoom,
            onToggleAnimation = onToggleAnimation,
        )
    }
}

// MeshInfoCard, ControlsCard, AvatarInfoRow are in Avatar3DScreen+Cards.kt

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
