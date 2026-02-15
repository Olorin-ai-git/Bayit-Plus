package tv.bayit.plus.feature.social.grandparent

import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

private val THUMBNAIL_SIZE = 120.dp

@Composable
fun NewsClipRoute(
    onNavigateToPlayer: (String, String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: NewsClipViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    NewsClipScreen(
        uiState = uiState,
        onClipClick = { clipId, title -> onNavigateToPlayer(clipId, title) },
        onShareClick = viewModel::shareClip,
        onRefresh = viewModel::refresh,
        onRetry = viewModel::retry,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun NewsClipScreen(
    uiState: NewsClipUiState,
    onClipClick: (String, String) -> Unit,
    onShareClick: (String) -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "News Clips",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )

        when (uiState) {
            is NewsClipUiState.Loading -> GlassLoadingIndicator()
            is NewsClipUiState.Success -> SuccessContent(
                clips = uiState.clips,
                isRefreshing = uiState.isRefreshing,
                onClipClick = onClipClick,
                onShareClick = onShareClick,
                onRefresh = onRefresh,
            )
            is NewsClipUiState.Empty -> EmptyContent()
            is NewsClipUiState.Error -> ErrorContent(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@Composable
private fun SuccessContent(clips: List<NewsClipItem>, isRefreshing: Boolean, onClipClick: (String, String) -> Unit, onShareClick: (String) -> Unit, onRefresh: () -> Unit) {
    PullToRefreshBox(isRefreshing = isRefreshing, onRefresh = onRefresh) {
        LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base), verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            item(key = "header_spacer") { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
            items(items = clips, key = { it.id }) { clip ->
                NewsClipCard(clip = clip, onClick = { onClipClick(clip.id, clip.title) }, onShareClick = { onShareClick(clip.id) })
            }
            item(key = "footer_spacer") { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
        }
    }
}

@Composable
private fun NewsClipCard(clip: NewsClipItem, onClick: () -> Unit, onShareClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            CachedAsyncImage(url = clip.thumbnailUrl, contentDescription = clip.title, modifier = Modifier.size(THUMBNAIL_SIZE))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                Text(text = clip.title, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    Text(text = clip.source, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.secondary)
                    Text(text = "·", style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
                    Text(text = clip.duration, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.secondary)
                }
                Text(text = clip.publishedAt, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
            }
            IconButton(onClick = onShareClick) {
                Icon(Icons.Default.Share, contentDescription = "Share", tint = DesignTokens.Colors.Text.secondary)
            }
        }
    }
}

@Composable
private fun EmptyContent() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text = "No news clips available", style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Text.secondary)
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
