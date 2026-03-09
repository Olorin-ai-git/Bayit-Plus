package tv.bayit.plus.feature.tv.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.tv.material3.Text
import tv.bayit.plus.designsystem.component.GlassTVButton
import tv.bayit.plus.designsystem.component.GlassTVCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

/**
 * Entry point composable for the TV search feature.
 * Connects the ViewModel to [TVSearchScreen] and delegates navigation events upward.
 */
@Composable
fun TVSearchRoute(
    onContentClick: (contentId: String, contentType: String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TVSearchViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    TVSearchScreen(
        uiState = uiState,
        onQueryChange = viewModel::onQueryChange,
        onContentClick = onContentClick,
        onBack = onBack,
        modifier = modifier,
    )
}

@Composable
internal fun TVSearchScreen(
    uiState: TVSearchUiState,
    onQueryChange: (String) -> Unit,
    onContentClick: (contentId: String, contentType: String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(TVDesignTokens.Spacing.screenPadding),
        verticalArrangement = Arrangement.spacedBy(TVDesignTokens.Spacing.rowSpacing),
    ) {
        SearchBar(
            query = uiState.query,
            onQueryChange = onQueryChange,
            onBack = onBack,
        )

        when {
            uiState.isLoading -> LoadingState()
            uiState.results.isEmpty() -> EmptyState(uiState.query)
            else -> ResultsList(
                results = uiState.results,
                onContentClick = onContentClick,
            )
        }
    }
}

@Composable
private fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onBack: () -> Unit,
) {
    val searchHint = bayitString("search_hint")

    androidx.compose.material3.OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = {
            Text(
                text = searchHint,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = TVDesignTokens.FontSize.body,
            )
        },
        singleLine = true,
        colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DesignTokens.Colors.Glass.borderFocus,
            unfocusedBorderColor = DesignTokens.Colors.Glass.border,
            focusedTextColor = DesignTokens.Colors.Text.primary,
            unfocusedTextColor = DesignTokens.Colors.Text.primary,
            cursorColor = DesignTokens.Colors.Glass.borderFocus,
        ),
    )
}

@Composable
private fun ResultsList(
    results: List<TVSearchResultItem>,
    onContentClick: (contentId: String, contentType: String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = TVDesignTokens.Spacing.itemSpacing),
        verticalArrangement = Arrangement.spacedBy(TVDesignTokens.Spacing.itemSpacing),
    ) {
        items(
            items = results,
            key = { item: TVSearchResultItem -> item.id },
        ) { item ->
            GlassTVCard(
                title = item.title,
                thumbnailUrl = item.thumbnailUrl,
                subtitle = item.subtitle,
                isLive = item.isLive,
                onClick = { onContentClick(item.id, item.contentType) },
                width = TVDesignTokens.Card.landscapeWidth,
                height = TVDesignTokens.Card.landscapeHeight,
            )
        }
    }
}

@Composable
private fun EmptyState(query: String) {
    val noResultsTemplate = bayitString("search_no_results")
    val message = if (query.isBlank()) {
        bayitString("search_prompt")
    } else {
        noResultsTemplate.replace("{query}", query)
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = message,
            color = DesignTokens.Colors.Text.secondary,
            fontSize = TVDesignTokens.FontSize.bodyLarge,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        tv.bayit.plus.designsystem.component.GlassLoadingIndicator()
    }
}
