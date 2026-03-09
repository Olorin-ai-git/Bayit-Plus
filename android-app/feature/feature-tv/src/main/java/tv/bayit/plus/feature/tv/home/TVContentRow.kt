package tv.bayit.plus.feature.tv.home

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.tv.material3.Text
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.designsystem.component.GlassTVCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

@Composable
fun TVContentRow(
    title: String,
    items: List<ContentItem>,
    onItemClick: (ContentItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    val localizedTitle = bayitString(title)

    Column(modifier = modifier) {
        Text(
            text = localizedTitle,
            color = DesignTokens.Colors.Text.primary,
            fontSize = TVDesignTokens.FontSize.title,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(
                start = TVDesignTokens.Spacing.screenPadding,
                bottom = TVDesignTokens.Spacing.itemSpacing,
            ),
        )

        LazyRow(
            state = listState,
            contentPadding = PaddingValues(horizontal = TVDesignTokens.Spacing.screenPadding),
        ) {
            items(
                items = items,
                key = { it.id },
            ) { item ->
                GlassTVCard(
                    title = item.title.orEmpty(),
                    thumbnailUrl = item.thumbnail.orEmpty(),
                    subtitle = item.contentType.orEmpty(),
                    onClick = { onItemClick(item) },
                    width = TVDesignTokens.Card.landscapeWidth,
                    height = TVDesignTokens.Card.landscapeHeight,
                    modifier = Modifier.padding(end = TVDesignTokens.Spacing.itemSpacing),
                )
            }
        }
    }
}
