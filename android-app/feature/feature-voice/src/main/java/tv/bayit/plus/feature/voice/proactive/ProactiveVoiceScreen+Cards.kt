package tv.bayit.plus.feature.voice.proactive

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.core.model.ProactiveVoiceSuggestion
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun SuggestionList(
    suggestions: List<ProactiveVoiceSuggestion>,
    onSuggestionTap: (String) -> Unit,
    onDismiss: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (suggestions.isEmpty()) {
        Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                text = bayitString("proactiveVoice.empty"),
                color = DesignTokens.Colors.Text.muted,
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
            )
        }
        return
    }
    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        items(suggestions, key = { it.id }) { suggestion ->
            SuggestionCard(
                suggestion = suggestion,
                onTap = { onSuggestionTap(suggestion.contentId) },
                onDismiss = { onDismiss(suggestion.id) },
            )
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
    }
}

@Composable
internal fun SuggestionCard(
    suggestion: ProactiveVoiceSuggestion,
    onTap: () -> Unit,
    onDismiss: () -> Unit,
) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { role = Role.Button }
            .clickable(onClick = onTap),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            ) {
                Text(
                    text = suggestion.title,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.md,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                suggestion.subtitle?.let { sub ->
                    Text(
                        text = sub,
                        color = DesignTokens.Colors.Text.secondary,
                        fontSize = DesignTokens.FontSize.sm,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Text(
                    text = suggestion.contentType,
                    color = DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.xs,
                )
            }
            GlassButton(
                text = bayitString("common.dismiss"),
                onClick = onDismiss,
                isPrimary = false,
            )
        }
    }
}

@Composable
internal fun ProactiveVoiceErrorContent(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
        ) {
            Text(
                text = message,
                color = DesignTokens.Colors.Semantic.error,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
