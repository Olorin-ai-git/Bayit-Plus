package tv.bayit.plus.feature.search.llm

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.component.GlassTopBar
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
        GlassTopBar(title = "AI Search")

        GlassSearchBar(
            query = uiState.query,
            onQueryChange = onQueryChange,
            placeholder = "Describe what you want to watch...",
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

@Composable
private fun SearchActionRow(
    onSearch: () -> Unit,
    onAsk: () -> Unit,
    isSearching: Boolean,
    isAsking: Boolean,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.base),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassButton(
            text = "Search",
            onClick = onSearch,
            enabled = !isSearching,
            modifier = Modifier.weight(1f),
        )
        GlassButton(
            text = "Ask AI",
            onClick = onAsk,
            enabled = !isAsking,
            isPrimary = false,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun AiSuggestionsRow(suggestions: List<String>, onSuggestionClick: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        modifier = Modifier.padding(vertical = DesignTokens.Spacing.xs),
    ) {
        items(suggestions, key = { it }) { suggestion ->
            GlassChip(label = suggestion, isSelected = false, onClick = { onSuggestionClick(suggestion) })
        }
    }
}

@Composable
private fun AiAnswerCard(answer: String) {
    GlassCard {
        Column {
            Text("AI Answer", fontWeight = FontWeight.SemiBold, color = DesignTokens.Colors.Primary.light, fontSize = DesignTokens.FontSize.sm)
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(text = answer, color = DesignTokens.Colors.Text.primary, fontSize = DesignTokens.FontSize.base)
        }
    }
}

@Composable
private fun LLMResultCard(item: LLMResultItem, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(modifier = Modifier.fillMaxWidth()) {
            item.thumbnail?.let { url ->
                CachedAsyncImage(url = url, contentDescription = item.title, modifier = Modifier.aspectRatio(16f / 9f).weight(0.4f))
            }
            Column(modifier = Modifier.weight(0.6f).padding(start = DesignTokens.Spacing.sm)) {
                Text(text = item.title, fontWeight = FontWeight.Medium, color = DesignTokens.Colors.Text.primary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                item.type?.let { Text(it.replaceFirstChar { c -> c.uppercaseChar() }, color = DesignTokens.Colors.Text.muted, fontSize = DesignTokens.FontSize.xs) }
                item.relevanceExplanation?.let {
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                    Text(it, color = DesignTokens.Colors.Primary.light, fontSize = DesignTokens.FontSize.xs, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

@Composable
private fun HistoryHeader(onClearHistory: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text("Recent AI Searches", fontWeight = FontWeight.SemiBold, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
        GlassButton(text = "Clear", onClick = onClearHistory, isPrimary = false)
    }
}
