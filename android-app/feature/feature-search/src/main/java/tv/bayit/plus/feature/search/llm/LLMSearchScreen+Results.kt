package tv.bayit.plus.feature.search.llm

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun SearchActionRow(
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
internal fun AiSuggestionsRow(suggestions: List<String>, onSuggestionClick: (String) -> Unit) {
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
internal fun AiAnswerCard(answer: String) {
    GlassCard {
        Column {
            Text(
                "AI Answer",
                fontWeight = FontWeight.SemiBold,
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.sm,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(text = answer, color = DesignTokens.Colors.Text.primary, fontSize = DesignTokens.FontSize.base)
        }
    }
}

@Composable
internal fun LLMResultCard(item: LLMResultItem, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(modifier = Modifier.fillMaxWidth()) {
            item.thumbnail?.let { url ->
                CachedAsyncImage(
                    url = url,
                    contentDescription = item.title,
                    modifier = Modifier.aspectRatio(16f / 9f).weight(0.4f),
                )
            }
            Column(modifier = Modifier.weight(0.6f).padding(start = DesignTokens.Spacing.sm)) {
                Text(
                    text = item.title,
                    fontWeight = FontWeight.Medium,
                    color = DesignTokens.Colors.Text.primary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                item.type?.let {
                    Text(
                        it.replaceFirstChar { c -> c.uppercaseChar() },
                        color = DesignTokens.Colors.Text.muted,
                        fontSize = DesignTokens.FontSize.xs,
                    )
                }
                item.relevanceExplanation?.let {
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                    Text(
                        it,
                        color = DesignTokens.Colors.Primary.light,
                        fontSize = DesignTokens.FontSize.xs,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
internal fun HistoryHeader(onClearHistory: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "Recent AI Searches",
            fontWeight = FontWeight.SemiBold,
            color = DesignTokens.Colors.Text.primary,
            style = MaterialTheme.typography.titleMedium,
        )
        GlassButton(text = "Clear", onClick = onClearHistory, isPrimary = false)
    }
}
