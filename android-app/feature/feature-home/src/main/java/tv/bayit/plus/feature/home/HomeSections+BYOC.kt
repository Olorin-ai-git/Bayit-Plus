package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.byoc.models.BYOCCapabilities
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun BYOCOnboardingCard(
    onConnectSources: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.lg),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = null,
                    tint = DesignTokens.Colors.Primary.p400,
                    modifier = Modifier.size(28.dp),
                )
                Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                Text(
                    text = bayitString("byoc.home.title"),
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                )
            }
            Text(
                text = bayitString("byoc.home.subtitle"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
            SourceTypeIconsRow()
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            GlassButton(
                text = bayitString("byoc.home.connectButton"),
                onClick = onConnectSources,
            )
        }
    }
}

@Composable
private fun SourceTypeIconsRow(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BYOCSourceType.entries.forEach { sourceType ->
            Text(
                text = sourceType.name,
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.Colors.Primary.p300,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

@Composable
internal fun BYOCContentRow(
    sourceName: String,
    items: List<BYOCContentItem>,
    capabilities: BYOCCapabilities?,
    onItemClick: (BYOCContentItem) -> Unit,
    onShowAll: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        SectionRowHeaderWithAction(
            title = sourceName,
            onShowAllClick = onShowAll,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items, key = { it.id }) { item ->
                BYOCContentCard(
                    item = item,
                    capabilities = capabilities,
                    onClick = { onItemClick(item) },
                )
            }
        }
    }
}

@Composable
private fun BYOCContentCard(
    item: BYOCContentItem,
    capabilities: BYOCCapabilities?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(
        modifier = modifier.width(160.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
            CachedAsyncImage(
                url = item.thumbnailUrl.orEmpty(),
                contentDescription = item.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(90.dp),
            )
            Text(
                text = item.title,
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.primary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (capabilities != null) {
                AICapabilityBadges(capabilities = capabilities)
            }
            GlassButton(
                text = bayitString("common.play"),
                onClick = onClick,
            )
        }
    }
}

@Composable
private fun AICapabilityBadges(
    capabilities: BYOCCapabilities,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        if (capabilities.dubbing) {
            Icon(
                imageVector = Icons.Default.Translate,
                contentDescription = bayitString("byoc.home.aiFeatures.dubbing"),
                tint = DesignTokens.Colors.Primary.p400,
                modifier = Modifier.size(16.dp),
            )
        }
        if (capabilities.liveSubtitles) {
            Icon(
                imageVector = Icons.Default.Subtitles,
                contentDescription = bayitString("byoc.home.aiFeatures.subtitles"),
                tint = DesignTokens.Colors.Primary.p400,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}
