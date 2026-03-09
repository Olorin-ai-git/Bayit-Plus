package tv.bayit.plus.feature.audiobooks

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.Audiobook
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun AudiobooksRoute(
    onNavigateToAudiobook: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AudiobooksViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    AudiobooksScreen(
        uiState = uiState,
        onAudiobookClick = { audiobook -> onNavigateToAudiobook(audiobook.id) },
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun AudiobooksScreen(
    uiState: AudiobooksUiState,
    onAudiobookClick: (Audiobook) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is AudiobooksUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is AudiobooksUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier,
            ) {
                LazyVerticalGridContent(
                    audiobooks = uiState.audiobooks,
                    onAudiobookClick = onAudiobookClick,
                )
            }
        }
        is AudiobooksUiState.Error -> AudiobooksErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun LazyVerticalGridContent(
    audiobooks: List<Audiobook>,
    onAudiobookClick: (Audiobook) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        contentPadding = PaddingValues(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        modifier = modifier.fillMaxSize(),
    ) {
        items(
            items = audiobooks,
            key = { it.id },
        ) { audiobook ->
            AudiobookGridItem(
                audiobook = audiobook,
                onClick = { onAudiobookClick(audiobook) },
            )
        }
    }
}

@Composable
private fun AudiobookGridItem(
    audiobook: Audiobook,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val label = listOfNotNull(audiobook.title, audiobook.author?.let { "by $it" }).joinToString(", ")
    GlassCard(modifier = modifier.semantics { contentDescription = label }.clickable(onClick = onClick)) {
        Column {
            CachedAsyncImage(
                url = audiobook.thumbnail ?: audiobook.backdrop,
                contentDescription = audiobook.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            audiobook.title?.let { title ->
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            audiobook.author?.let { author ->
                Text(
                    text = author,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.secondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            audiobook.narrator?.let { narrator ->
                Text(
                    text = narrator,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun AudiobooksErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
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
