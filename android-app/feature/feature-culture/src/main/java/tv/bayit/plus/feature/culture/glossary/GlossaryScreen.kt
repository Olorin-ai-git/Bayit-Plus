package tv.bayit.plus.feature.culture.glossary

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlossaryRoute(
    onNavigateToTerm: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: GlossaryViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    GlossaryScreen(
        uiState = uiState,
        searchQuery = searchQuery,
        onSearchQueryChange = viewModel::updateSearchQuery,
        onTermClick = onNavigateToTerm,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun GlossaryScreen(
    uiState: GlossaryUiState,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onTermClick: (String) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("culture.glossary.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is GlossaryUiState.Loading -> GlassLoadingIndicator()
            is GlossaryUiState.Error -> GlossaryErrorContent(message = uiState.message, onRetry = onRetry)
            is GlossaryUiState.Success -> GlossaryContent(
                groupedTerms = uiState.groupedTerms,
                searchQuery = searchQuery,
                onSearchQueryChange = onSearchQueryChange,
                onTermClick = onTermClick,
            )
        }
    }
}

@Composable
private fun GlossaryContent(
    groupedTerms: Map<String, List<Any>>,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onTermClick: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item {
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            GlassSearchBar(
                query = searchQuery,
                onQueryChange = onSearchQueryChange,
                placeholder = bayitString("culture.glossary.searchPlaceholder"),
            )
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
        }
        groupedTerms.forEach { (letter, terms) ->
            item(key = "header_$letter") {
                Text(
                    text = letter,
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Primary.light,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(vertical = DesignTokens.Spacing.xs),
                )
            }
            items(items = terms, key = { it.hashCode() }) { term ->
                GlassCard(modifier = Modifier.fillMaxWidth().clickable { onTermClick(term.hashCode().toString()) }) {
                    Text(
                        text = term.toString(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.primary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun GlossaryErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
