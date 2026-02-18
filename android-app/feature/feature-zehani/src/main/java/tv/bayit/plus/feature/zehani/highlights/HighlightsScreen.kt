package tv.bayit.plus.feature.zehani.highlights

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import tv.bayit.plus.core.model.zehani.HighlightReel
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun HighlightsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HighlightsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.shareEvents.collect { shareToken ->
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, shareToken)
            }
            context.startActivity(Intent.createChooser(intent, "Share Highlight"))
        }
    }

    LaunchedEffect(Unit) {
        viewModel.sendResult.collect { result ->
            if (result is SendResult.Success) {
                Toast.makeText(context, "Sent to ${result.sentCount} family contacts", Toast.LENGTH_SHORT).show()
            }
        }
    }

    HighlightsScreen(
        uiState = uiState,
        onRefresh = viewModel::refresh,
        onGenerate = viewModel::generateReel,
        onShareReel = viewModel::shareReel,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun HighlightsScreen(
    uiState: HighlightsUiState,
    onRefresh: () -> Unit,
    onGenerate: () -> Unit,
    onShareReel: (HighlightReel) -> Unit,
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
                onGenerate = onGenerate,
                onShareReel = onShareReel,
            )
        }
    }
}

@Composable
private fun HighlightsContent(
    highlights: List<HighlightReel>,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onGenerate: () -> Unit,
    onShareReel: (HighlightReel) -> Unit,
) {
    PullToRefreshBox(isRefreshing = isRefreshing, onRefresh = onRefresh) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            item { GlassButton(text = "Generate New Reel", onClick = onGenerate, modifier = Modifier.fillMaxWidth()) }

            if (highlights.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.xxl), contentAlignment = Alignment.Center) {
                        Text(text = "No highlights yet", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }

            items(highlights, key = { it.id }) { reel ->
                ReelCard(reel = reel, onShare = { onShareReel(reel) })
            }
        }
    }
}

@Composable
private fun ReelCard(reel: HighlightReel, onShare: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            if (reel.thumbnailUrl != null) {
                AsyncImage(
                    model = reel.thumbnailUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = formatReelDate(reel.createdAt),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = reel.status,
                    style = MaterialTheme.typography.bodySmall,
                    color = when (reel.status) {
                        "ready" -> DesignTokens.Colors.Semantic.success
                        "generating" -> DesignTokens.Colors.Primary.base
                        else -> DesignTokens.Colors.Text.muted
                    },
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Text(
                text = "${reel.momentCount} moments",
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.secondary,
            )
            if (reel.shareToken != null && reel.status == "ready") {
                GlassButton(
                    text = "Send to Family",
                    onClick = onShare,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

private fun formatReelDate(createdAt: String): String = try {
    val instant = Instant.parse(createdAt)
    val formatter = DateTimeFormatter.ofPattern("MMM d, yyyy").withZone(ZoneId.systemDefault())
    formatter.format(instant)
} catch (_: Exception) { createdAt }

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
