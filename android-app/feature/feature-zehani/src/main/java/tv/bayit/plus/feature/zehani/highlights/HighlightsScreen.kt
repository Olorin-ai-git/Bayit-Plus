package tv.bayit.plus.feature.zehani.highlights

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun HighlightsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HighlightsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    HighlightsScreen(
        uiState = uiState,
        onRefresh = viewModel::refresh,
        onShare = viewModel::shareHighlight,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun HighlightsScreen(
    uiState: HighlightsUiState,
    onRefresh: () -> Unit,
    onShare: (String) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Highlights")
        when (uiState) {
            is HighlightsUiState.Loading -> GlassLoadingIndicator()
            is HighlightsUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
            is HighlightsUiState.Success -> HighlightsContent(
                highlights = uiState.highlights,
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                onShare = onShare,
            )
        }
    }
}

@Composable
private fun HighlightsContent(
    highlights: List<Any>,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onShare: (String) -> Unit,
) {
    PullToRefreshBox(isRefreshing = isRefreshing, onRefresh = onRefresh) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            if (highlights.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.xxl), contentAlignment = Alignment.Center) {
                        Text(
                            text = "No highlights yet.\nUse Magic Mirror to identify faces!",
                            color = DesignTokens.Colors.Text.muted,
                            style = MaterialTheme.typography.bodyLarge,
                        )
                    }
                }
            }

            items(highlights, key = { it.hashCode() }) { highlight ->
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                        Text(
                            text = highlight.toString(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = DesignTokens.Colors.Text.primary,
                            fontWeight = FontWeight.Medium,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                        ) {
                            GlassButton(
                                text = "Share",
                                onClick = { onShare(highlight.hashCode().toString()) },
                                modifier = Modifier.weight(1f),
                            )
                            GlassButton(
                                text = "Details",
                                onClick = { },
                                isPrimary = false,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }
        }
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
