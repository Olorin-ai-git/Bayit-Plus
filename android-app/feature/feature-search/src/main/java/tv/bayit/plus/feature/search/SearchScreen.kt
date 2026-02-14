package tv.bayit.plus.feature.search

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun SearchRoute(
    onNavigateToContent: (String, String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    SearchScreen(
        uiState = uiState,
        onQueryChange = viewModel::onQueryChange,
        onFilterClick = viewModel::selectFilter,
        onSuggestionClick = viewModel::onSuggestionClick,
        onContentClick = { item ->
            val type = item.type ?: if (item.isSeries == true) "series" else "movie"
            onNavigateToContent(item.id, type)
        },
        modifier = modifier,
    )
}

@Composable
internal fun SearchScreen(
    uiState: SearchUiState,
    onQueryChange: (String) -> Unit,
    onFilterClick: (SearchFilter) -> Unit,
    onSuggestionClick: (String) -> Unit,
    onContentClick: (ContentItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassSearchBar(
            query = uiState.query,
            onQueryChange = onQueryChange,
            modifier = Modifier.padding(
                horizontal = DesignTokens.Spacing.base,
                vertical = DesignTokens.Spacing.sm,
            ),
        )

        FilterChipRow(
            selectedFilter = uiState.selectedFilter,
            onFilterClick = onFilterClick,
        )

        if (uiState.suggestions.isNotEmpty() && uiState.query.isNotBlank()) {
            SuggestionsSection(
                suggestions = uiState.suggestions,
                onSuggestionClick = onSuggestionClick,
            )
        }

        when {
            uiState.isSearching -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    GlassSpinner(size = SpinnerSize.MEDIUM)
                }
            }
            uiState.errorMessage != null -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = uiState.errorMessage,
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.Colors.Semantic.error,
                    )
                }
            }
            uiState.results.isNotEmpty() -> {
                SearchResultsGrid(
                    results = uiState.results,
                    onContentClick = onContentClick,
                )
            }
            uiState.query.isBlank() && uiState.popularSearches.isNotEmpty() -> {
                PopularSearchesSection(
                    popularSearches = uiState.popularSearches,
                    onSuggestionClick = onSuggestionClick,
                )
            }
        }
    }
}
