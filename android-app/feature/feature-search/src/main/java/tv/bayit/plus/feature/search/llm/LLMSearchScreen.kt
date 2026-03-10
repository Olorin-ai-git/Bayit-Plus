package tv.bayit.plus.feature.search.llm

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun LLMSearchRoute(
    onNavigateToContent: (String, String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: LLMSearchViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LLMSearchScreen(
        uiState = uiState,
        onQueryChange = viewModel::onQueryChange,
        onSubmitSearch = viewModel::submitSearch,
        onSuggestionClick = viewModel::onSuggestionClick,
        onAskQuestion = { viewModel.askQuestion(uiState.query) },
        onClearHistory = viewModel::clearHistory,
        onResultClick = { item ->
            onNavigateToContent(item.id, item.type.orEmpty().ifEmpty { "movie" })
        },
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun LLMSearchScreen(
    uiState: LLMSearchUiState,
    onQueryChange: (String) -> Unit,
    onSubmitSearch: () -> Unit,
    onSuggestionClick: (String) -> Unit,
    onAskQuestion: () -> Unit,
    onClearHistory: () -> Unit,
    onResultClick: (LLMResultItem) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("search.llm.title"))

        GlassSearchBar(
            query = uiState.query,
            onQueryChange = onQueryChange,
            placeholder = bayitString("search.llm.placeholder"),
            modifier = Modifier.padding(
                horizontal = DesignTokens.Spacing.base,
                vertical = DesignTokens.Spacing.sm,
            ),
        )

        if (uiState.query.isNotBlank()) {
            SearchActionRow(
                onSearch = onSubmitSearch,
                onAsk = onAskQuestion,
                isSearching = uiState.isSearching,
                isAsking = uiState.isAskingQuestion,
            )
        }

        if (uiState.suggestions.isNotEmpty() && uiState.query.isNotBlank()) {
            AiSuggestionsRow(suggestions = uiState.suggestions, onSuggestionClick = onSuggestionClick)
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            if (uiState.answer != null) {
                item(key = "ai-answer") {
                    AiAnswerCard(answer = uiState.answer)
                }
            }

            if (uiState.isSearching) {
                item(key = "loading") {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        GlassSpinner(size = SpinnerSize.MEDIUM)
                    }
                }
            }

            if (uiState.errorMessage != null) {
                item(key = "error") {
                    Text(
                        text = uiState.errorMessage,
                        color = DesignTokens.Colors.Semantic.error,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            items(uiState.results, key = { it.id }) { result ->
                LLMResultCard(item = result, onClick = { onResultClick(result) })
            }

            if (uiState.query.isBlank() && uiState.historyEntries.isNotEmpty()) {
                item(key = "history-header") {
                    HistoryHeader(onClearHistory = onClearHistory)
                }
                items(uiState.historyEntries, key = { it.query + it.searchedAt }) { entry ->
                    Text(
                        text = entry.query,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.secondary,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSuggestionClick(entry.query) }
                            .padding(vertical = DesignTokens.Spacing.sm),
                    )
                }
            }
        }
    }
}
