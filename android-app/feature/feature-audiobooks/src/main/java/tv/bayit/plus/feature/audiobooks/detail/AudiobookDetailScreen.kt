package tv.bayit.plus.feature.audiobooks.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Navigation entry-point for the Audiobook Detail screen.
 */
@Composable
fun AudiobookDetailRoute(
    onNavigateToPlayer: (String, String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AudiobookDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    AudiobookDetailScreen(
        uiState = uiState,
        onPlay = { audiobookId -> onNavigateToPlayer(audiobookId, "audiobook") },
        onChapterPlay = { chapterId -> onNavigateToPlayer(chapterId, "audiobook_chapter") },
        onBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun AudiobookDetailScreen(
    uiState: AudiobookDetailUiState,
    onPlay: (String) -> Unit,
    onChapterPlay: (String) -> Unit,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        when (uiState) {
            is AudiobookDetailUiState.Loading -> GlassLoadingIndicator()
            is AudiobookDetailUiState.Error -> AudiobookErrorContent(uiState.message, onBack, onRetry)
            is AudiobookDetailUiState.Success -> AudiobookSuccessContent(
                state = uiState,
                onPlay = onPlay,
                onChapterPlay = onChapterPlay,
                onBack = onBack,
            )
        }
    }
}

@Composable
private fun AudiobookSuccessContent(
    state: AudiobookDetailUiState.Success,
    onPlay: (String) -> Unit,
    onChapterPlay: (String) -> Unit,
    onBack: () -> Unit,
) {
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item { AudiobookHeroSection(state, onBack) }
        item { AudiobookMetadataSection(state) }
        item { AudiobookActionSection(state.audiobookId, state.bookmarkCount, onPlay) }
        if (state.chapters.isNotEmpty()) {
            item { ChapterListHeader(state.chapters.size) }
        }
        if (state.isLoadingChapters) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(DesignTokens.Spacing.xxxxl),
                    contentAlignment = Alignment.Center,
                ) {
                    GlassSpinner(size = SpinnerSize.MEDIUM)
                }
            }
        } else {
            items(items = state.chapters, key = { it.stableId }) { chapter ->
                ChapterRow(chapter = chapter, onPlay = { onChapterPlay(chapter.stableId) })
            }
        }
    }
}
