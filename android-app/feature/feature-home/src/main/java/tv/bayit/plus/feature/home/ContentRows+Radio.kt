package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.designsystem.component.GlassContentCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun RadioStationsRow(
    stations: List<RadioStationItem>,
    onStationClick: (String) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        SectionRowHeaderWithAction(title = bayitString("radio.title"), onShowAllClick = onShowAllClick)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = stations, key = { it.id }) { station ->
                GlassContentCard(
                    imageUrl = station.logo,
                    title = station.name,
                    subtitle = station.currentSong ?: station.currentShow,
                    cardWidth = 140.dp,
                    aspectRatio = 1f,
                    onClick = { onStationClick(station.id) },
                )
            }
        }
    }
}
