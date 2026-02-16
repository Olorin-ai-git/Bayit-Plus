package tv.bayit.plus.feature.player.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.player.ui.formatTimestamp

/**
 * Scene search screen for finding and seeking to specific moments.
 */
@Composable
fun SceneSearchScreen(
    results: List<SceneSearchResult>,
    onSearch: (String) -> Unit,
    onSeekTo: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    var query by remember { mutableStateOf("") }

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
            onQueryChange = { newQuery ->
                query = newQuery
                onSearch(newQuery)
            },
            placeholder = bayitString("player.search_placeholder"),
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            items(results, key = { it.timestampMs }) { result ->
                SceneResultRow(
                    result = result,
                    onClick = { onSeekTo(result.timestampMs) },
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
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
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
                    text = formatTimestamp(result.timestampMs),
                    color = DesignTokens.Colors.Primary.light,
                    fontSize = DesignTokens.FontSize.sm,
                )
            }
            result.description?.let { desc ->
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                Text(
                    text = desc,
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.sm,
                )
            }
        }
    }
}

data class SceneSearchResult(
    val timestampMs: Long,
    val title: String,
    val description: String? = null,
)
