package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun HomeRoute(
    onNavigateToContent: (String, String) -> Unit,
    onNavigateToPlayer: (String, String) -> Unit,
    onNavigateToChannel: (String) -> Unit,
    onNavigateToRadio: (String) -> Unit,
    onNavigateToYoungsters: () -> Unit,
    onNavigateToJerusalem: () -> Unit,
    onNavigateToTelAviv: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    HomeScreen(
        uiState = uiState,
        onSpotlightClick = { item -> onNavigateToPlayer(item.id, item.type.orEmpty()) },
        onContentClick = { item -> onNavigateToContent(item.id, item.type.orEmpty()) },
        onCollectionClick = { id -> onNavigateToContent(id, "collection") },
        onChannelClick = onNavigateToChannel,
        onRadioClick = onNavigateToRadio,
        onYoungstersClick = onNavigateToYoungsters,
        onJerusalemClick = onNavigateToJerusalem,
        onTelAvivClick = onNavigateToTelAviv,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun HomeScreen(
    uiState: HomeUiState,
    onSpotlightClick: (SpotlightItem) -> Unit,
    onContentClick: (ContentItem) -> Unit,
    onCollectionClick: (String) -> Unit,
    onChannelClick: (String) -> Unit,
    onRadioClick: (String) -> Unit,
    onYoungstersClick: () -> Unit,
    onJerusalemClick: () -> Unit,
    onTelAvivClick: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is HomeUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is HomeUiState.Success -> HomeSuccessContent(
            uiState = uiState,
            onSpotlightClick = onSpotlightClick,
            onContentClick = onContentClick,
            onCollectionClick = onCollectionClick,
            onChannelClick = onChannelClick,
            onRadioClick = onRadioClick,
            onYoungstersClick = onYoungstersClick,
            onJerusalemClick = onJerusalemClick,
            onTelAvivClick = onTelAvivClick,
            onRefresh = onRefresh,
            modifier = modifier,
        )
        is HomeUiState.Error -> ErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun ErrorSection(
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
