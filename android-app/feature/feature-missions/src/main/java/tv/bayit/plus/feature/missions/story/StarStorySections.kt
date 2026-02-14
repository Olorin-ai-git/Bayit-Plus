package tv.bayit.plus.feature.missions.story

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
import tv.bayit.plus.core.model.StarStory
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val REACTION_LIKE = "like"
private const val REACTION_LOVE = "love"
private const val REACTION_WOW = "wow"

@Composable
internal fun StoryHeader(modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = "Star Stories",
                style = MaterialTheme.typography.headlineMedium,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = "Behind the scenes with your favorite stars",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
internal fun StarProfilesRow(profiles: List<Any>, modifier: Modifier = Modifier) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.xs),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        modifier = modifier,
    ) {
        items(items = profiles, key = { it.hashCode() }) {
            GlassCard {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(horizontal = DesignTokens.Spacing.sm),
                ) {
                    Text(
                        text = "Star",
                        style = MaterialTheme.typography.labelMedium,
                        color = DesignTokens.Colors.Primary.light,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
internal fun StoryGridItem(
    story: StarStory,
    onClick: () -> Unit,
    onReaction: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.clickable(onClick = onClick)) {
        Column {
            CachedAsyncImage(
                url = story.thumbnailUrl,
                contentDescription = story.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = story.title,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            story.description?.let { desc ->
                Text(
                    text = desc,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.secondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            ReactionRow(onReaction = onReaction)
        }
    }
}

@Composable
private fun ReactionRow(
    onReaction: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        GlassButton(text = "Like", onClick = { onReaction(REACTION_LIKE) }, isPrimary = false)
        GlassButton(text = "Love", onClick = { onReaction(REACTION_LOVE) }, isPrimary = false)
        GlassButton(text = "Wow", onClick = { onReaction(REACTION_WOW) }, isPrimary = false)
    }
}
