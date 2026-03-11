package tv.bayit.plus.feature.player.search

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.SceneSearchResult
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.player.ui.formatTimestamp

/**
 * Scene search screen for finding and seeking to specific moments.
 * Collects state from [SceneSearchViewModel] and delegates search
 * execution to the repository layer.
 */
@Composable
fun SceneSearchScreen(
    channelId: String,
    onSeekTo: (Long) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SceneSearchViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val query by viewModel.query.collectAsStateWithLifecycle()

    LaunchedEffect(channelId) {
        viewModel.setChannelId(channelId)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.base),
    ) {
        Text(
            text = bayitString("player.scene_search"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        GlassSearchBar(
            query = query,
            onQueryChange = viewModel::onQueryChanged,
            placeholder = bayitString("player.search_placeholder"),
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        SceneSearchContent(
            uiState = uiState,
            onSeekTo = onSeekTo,
        )
    }
}

@Composable
private fun SceneSearchContent(
    uiState: SceneSearchUiState,
    onSeekTo: (Long) -> Unit,
) {
    when (uiState) {
        is SceneSearchUiState.Idle -> Unit
        is SceneSearchUiState.Loading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(
                    color = DesignTokens.Colors.Primary.base,
                )
            }
        }
        is SceneSearchUiState.Results -> {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(
                    DesignTokens.Spacing.sm,
                ),
            ) {
                items(
                    uiState.items,
                    key = { "${it.contentId}-${it.timestampMs}" },
                ) { result ->
                    SceneResultRow(
                        result = result,
                        onClick = { onSeekTo(result.timestampMs) },
                    )
                }
            }
        }
        is SceneSearchUiState.Error -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = uiState.message,
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.base,
                )
            }
        }
    }
}

@Composable
private fun SceneResultRow(
    result: SceneSearchResult,
    onClick: () -> Unit,
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = result.title,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.base,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = result.timestampFormatted,
                    color = DesignTokens.Colors.Primary.light,
                    fontSize = DesignTokens.FontSize.sm,
                )
            }
            result.contextText?.let { context ->
                Spacer(
                    modifier = Modifier.height(DesignTokens.Spacing.xs),
                )
                Text(
                    text = context,
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.sm,
                )
            }
        }
    }
}
