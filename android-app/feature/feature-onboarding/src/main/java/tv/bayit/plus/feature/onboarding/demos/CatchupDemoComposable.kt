// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

private val TILE_WIDTH = 160.dp
private val TILE_HEIGHT = 100.dp

private data class ProgramTile(
    val nameResId: Int,
    val timeResId: Int,
    val summaryResId: Int,
)

private val PROGRAM_TILES = listOf(
    ProgramTile(R.string.demo_catchup_program_1, R.string.demo_catchup_time_1, R.string.demo_catchup_summary_1),
    ProgramTile(R.string.demo_catchup_program_2, R.string.demo_catchup_time_2, R.string.demo_catchup_summary_2),
    ProgramTile(R.string.demo_catchup_program_3, R.string.demo_catchup_time_3, R.string.demo_catchup_summary_3),
    ProgramTile(R.string.demo_catchup_program_4, R.string.demo_catchup_time_4, R.string.demo_catchup_summary_4),
    ProgramTile(R.string.demo_catchup_program_5, R.string.demo_catchup_time_5, R.string.demo_catchup_summary_5),
)

@Composable
fun CatchupDemoComposable(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedIndex by remember { mutableIntStateOf(-1) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        DemoTopBar(
            label = stringResource(R.string.demo_banner_label),
            onClose = onClose,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

        Text(
            text = stringResource(R.string.demo_catchup_timeline_label),
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base),
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            itemsIndexed(PROGRAM_TILES) { index, tile ->
                ProgramTileCard(
                    tile = tile,
                    isSelected = index == selectedIndex,
                    onClick = { selectedIndex = if (selectedIndex == index) -1 else index },
                )
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))

        AnimatedVisibility(
            visible = selectedIndex >= 0,
            enter = fadeIn() + slideInVertically { it / 2 },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = DesignTokens.Spacing.base),
        ) {
            val tile = PROGRAM_TILES.getOrNull(selectedIndex)
            if (tile != null) {
                SummaryCard(tile)
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        GlassButton(
            text = stringResource(R.string.demo_close),
            onClick = onClose,
            isPrimary = false,
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.base),
        )
    }
}

@Composable
private fun ProgramTileCard(tile: ProgramTile, isSelected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(DesignTokens.Radius.md)
    val borderColor = if (isSelected) {
        DesignTokens.Colors.Primary.light
    } else {
        DesignTokens.Colors.Glass.border
    }
    val bgColor = if (isSelected) {
        DesignTokens.Colors.Glass.purpleStrong
    } else {
        DesignTokens.Colors.Glass.bg
    }

    Box(
        modifier = Modifier
            .width(TILE_WIDTH)
            .height(TILE_HEIGHT)
            .clip(shape)
            .background(bgColor, shape)
            .border(1.dp, borderColor, shape)
            .clickable(onClick = onClick)
            .padding(DesignTokens.Spacing.md),
    ) {
        Column(verticalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxSize()) {
            Text(
                text = stringResource(tile.timeResId),
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.Colors.Text.muted,
            )
            Text(
                text = stringResource(tile.nameResId),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun SummaryCard(tile: ProgramTile) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            Text(
                text = stringResource(R.string.demo_catchup_summary_title),
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = stringResource(tile.nameResId),
                style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = stringResource(tile.summaryResId),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}
