package tv.bayit.plus.feature.tv.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.tv.material3.Text
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTVButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

@Composable
fun TVHomeRoute(
    onContentClick: (contentId: String, contentType: String) -> Unit,
    onSearchClick: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TVHomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    TVHomeScreen(
        uiState = uiState,
        onContentClick = onContentClick,
        onSearchClick = onSearchClick,
        onRetry = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun TVHomeScreen(
    uiState: TVHomeUiState,
    onContentClick: (contentId: String, contentType: String) -> Unit,
    onSearchClick: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is TVHomeUiState.Loading -> LoadingState(modifier)
        is TVHomeUiState.Error -> ErrorState(uiState.message, onRetry, modifier)
        is TVHomeUiState.Success -> ContentState(uiState.rows, onContentClick, modifier)
    }
}

@Composable
private fun LoadingState(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        GlassLoadingIndicator()
    }
}

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val retryLabel = bayitString("retry")

    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
        ) {
            Text(
                text = message,
                color = DesignTokens.Colors.Semantic.error,
                fontSize = TVDesignTokens.FontSize.bodyLarge,
                fontWeight = FontWeight.Medium,
            )
            GlassTVButton(
                text = retryLabel,
                onClick = onRetry,
            )
        }
    }
}

@Composable
private fun ContentState(
    rows: List<TVContentRowData>,
    onContentClick: (contentId: String, contentType: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val heroRow = rows.firstOrNull { it.rowType == TVRowType.HERO }
    val contentRows = rows.filter { it.rowType != TVRowType.HERO }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
    ) {
        if (heroRow != null) {
            val heroItems = heroRow.items.filterIsInstance<ContentItem>()
            if (heroItems.isNotEmpty()) {
                item(key = heroRow.rowId) {
                    TVHeroCarousel(
                        items = heroItems,
                        onItemClick = { item ->
                            onContentClick(item.id, item.contentType.orEmpty())
                        },
                    )
                }
            }
        }

        items(
            items = contentRows,
            key = { it.rowId },
        ) { row ->
            TVContentRow(
                title = row.title,
                items = row.items.filterIsInstance<ContentItem>(),
                onItemClick = { item ->
                    onContentClick(item.id, item.contentType.orEmpty())
                },
                modifier = Modifier.padding(top = TVDesignTokens.Spacing.sectionPadding),
            )
        }
    }
}
