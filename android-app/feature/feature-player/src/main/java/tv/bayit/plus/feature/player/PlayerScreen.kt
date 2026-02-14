package tv.bayit.plus.feature.player

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.ui.PlayerView
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val VIDEO_ASPECT_RATIO = 16f / 9f
private const val PLAYER_CONTROL_TIMEOUT_MS = 3000

/**
 * Navigation entry-point for the Player screen.
 *
 * Owns the [PlayerViewModel] lifecycle through Hilt, triggers content
 * loading via [DisposableEffect], and saves progress on back navigation.
 */
@Composable
fun PlayerRoute(
    contentId: String,
    contentType: String,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PlayerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val playerState by viewModel.playerState.collectAsStateWithLifecycle()

    DisposableEffect(contentId) {
        viewModel.loadContent(contentId, contentType)
        onDispose { viewModel.release() }
    }

    BackHandler {
        viewModel.saveProgress()
        onNavigateBack()
    }

    PlayerScreen(
        uiState = uiState,
        playerState = playerState,
        onBack = {
            viewModel.saveProgress()
            onNavigateBack()
        },
        modifier = modifier,
    )
}

@Composable
private fun PlayerScreen(
    uiState: PlayerUiState,
    playerState: PlayerState,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        when (uiState) {
            is PlayerUiState.Loading -> GlassLoadingIndicator()
            is PlayerUiState.Ready -> ReadyContent(uiState, playerState, onBack)
            is PlayerUiState.Error -> ErrorContent(uiState.message, onBack)
        }
    }
}

@Composable
private fun ReadyContent(
    state: PlayerUiState.Ready,
    playerState: PlayerState,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(VIDEO_ASPECT_RATIO)
                .background(Color.Black),
        ) {
            state.exoPlayer?.let { player ->
                AndroidView(
                    factory = { context ->
                        PlayerView(context).apply {
                            this.player = player
                            useController = true
                            controllerShowTimeoutMs = PLAYER_CONTROL_TIMEOUT_MS
                        }
                    },
                    modifier = Modifier.fillMaxSize(),
                )
            }

            if (playerState is PlayerState.Buffering) {
                GlassSpinner(
                    size = SpinnerSize.LARGE,
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(DesignTokens.Spacing.sm),
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Navigate back",
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(DesignTokens.TouchTarget.minimum),
                )
            }
        }

        MetadataSection(title = state.title, description = state.description)
    }
}

@Composable
private fun MetadataSection(
    title: String,
    description: String?,
) {
    Column(modifier = Modifier.padding(DesignTokens.Spacing.base)) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
            color = DesignTokens.Colors.Text.primary,
        )
        description?.let { desc ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(
                text = desc,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun ErrorContent(
    message: String,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.xl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = message,
            color = DesignTokens.Colors.Semantic.error,
            style = MaterialTheme.typography.bodyLarge,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(text = "Go Back", onClick = onBack)
    }
}
