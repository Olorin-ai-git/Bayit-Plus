package tv.bayit.plus.feature.player.chapters

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ChaptersRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ChaptersViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    ChaptersScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onSkipToChapter = viewModel::skipToChapter,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun ChaptersScreen(
    uiState: ChaptersUiState,
    onNavigateBack: () -> Unit,
    onSkipToChapter: (Int) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Chapters",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is ChaptersUiState.Loading -> GlassLoadingIndicator()
            is ChaptersUiState.Error -> ChaptersErrorContent(message = uiState.message, onRetry = onRetry)
            is ChaptersUiState.Success -> ChaptersContent(
                chapters = uiState.chapters,
                thumbnails = uiState.thumbnails,
                onSkipToChapter = onSkipToChapter,
            )
        }
    }
}

@Composable
private fun ChaptersContent(
    chapters: List<Any>,
    thumbnails: List<Any>,
    onSkipToChapter: (Int) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.sm)) }
        itemsIndexed(items = chapters, key = { index, _ -> index }) { index, chapter ->
            val thumbnailUrl = thumbnails.getOrNull(index)?.toString()
            ChapterRow(
                chapter = chapter,
                index = index,
                thumbnailUrl = thumbnailUrl,
                onClick = { onSkipToChapter(index) },
            )
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun ChapterRow(
    chapter: Any,
    index: Int,
    thumbnailUrl: String?,
    onClick: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            CachedAsyncImage(
                url = thumbnailUrl,
                contentDescription = "Chapter ${index + 1}",
                modifier = Modifier.width(DesignTokens.Spacing.xxxl * 2).height(DesignTokens.Spacing.xxxl),
            )
            Spacer(Modifier.width(DesignTokens.Spacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Chapter ${index + 1}",
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Primary.light,
                )
                Text(
                    text = chapter.toString(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun ChaptersErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
