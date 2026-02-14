package tv.bayit.plus.feature.missions.story

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val GRID_COLUMNS = 2

@Composable
fun StarStoryRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: StarStoryViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    StarStoryScreen(
        uiState = uiState,
        onStoryClick = viewModel::markAsViewed,
        onReaction = viewModel::reactToStory,
        onRefresh = viewModel::refresh,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun StarStoryScreen(
    uiState: StarStoryUiState,
    onStoryClick: (String) -> Unit,
    onReaction: (String, String) -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is StarStoryUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is StarStoryUiState.Success -> StarStoryContent(
            uiState = uiState,
            onStoryClick = onStoryClick,
            onReaction = onReaction,
            onRefresh = onRefresh,
            modifier = modifier,
        )
        is StarStoryUiState.Error -> StarStoryErrorSection(
            message = uiState.message,
            onRetry = onRetry,
            modifier = modifier,
        )
    }
}

@Composable
private fun StarStoryContent(
    uiState: StarStoryUiState.Success,
    onStoryClick: (String) -> Unit,
    onReaction: (String, String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    PullToRefreshBox(
        isRefreshing = uiState.isRefreshing,
        onRefresh = onRefresh,
        modifier = modifier,
    ) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(GRID_COLUMNS),
            contentPadding = PaddingValues(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            modifier = Modifier.fillMaxSize(),
        ) {
            item(key = "story_header", span = { GridItemSpan(GRID_COLUMNS) }) {
                StoryHeader()
            }
            if (uiState.starProfiles.isNotEmpty()) {
                item(key = "profiles_row", span = { GridItemSpan(GRID_COLUMNS) }) {
                    StarProfilesRow(profiles = uiState.starProfiles)
                }
            }
            items(items = uiState.stories, key = { it.id }) { story ->
                StoryGridItem(
                    story = story,
                    onClick = { onStoryClick(story.id) },
                    onReaction = { reaction -> onReaction(story.id, reaction) },
                )
            }
        }
    }
}

@Composable
private fun StarStoryErrorSection(
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
